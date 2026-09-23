import Foundation
import Combine

/// Actor-based synchronization lock preventing race conditions between local mutations and remote API synchronization.
private actor SyncLock {
    private var isLocked: Bool = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    func lock() async {
        if !isLocked {
            isLocked = true
            return
        }
        await withCheckedContinuation { continuation in
            waiters.append(continuation)
        }
    }

    func unlock() {
        if !waiters.isEmpty {
            let next = waiters.removeFirst()
            next.resume()
        } else {
            isLocked = false
        }
    }

    func withLock<T: Sendable>(_ operation: @Sendable () async throws -> T) async throws -> T {
        await lock()
        defer { unlock() }
        return try await operation()
    }
}

/// Central state synchronization repository for KV-Netflix user data.
/// Manages local offline caching, Keychain-secured credentials, reactive `@Published` properties,
/// `AsyncStream` observables, and bidirectional remote sync with the backend.
@MainActor
public final class UserDataRepository: ObservableObject {
    public static let shared = UserDataRepository()

    // MARK: - Dependencies & Keys
    private let api = ApiClient.shared
    private let keychain = KeychainManager.shared
    private let userDefaults = UserDefaults.standard

    private let myListKey = StorageKeys.myList
    private let watchHistoryKey = StorageKeys.watchHistory
    private let watchProgressKey = StorageKeys.watchProgress
    private let userProfileKey = StorageKeys.userProfile
    private let themeKey = StorageKeys.theme
    private let languageKey = StorageKeys.language
    private let maxHistory = 50

    // Concurrency mutex protecting state merges against race conditions
    private let syncMutex = SyncLock()

    // MARK: - Published Reactive Properties
    @Published public private(set) var myList: [Movie] = [] {
        didSet {
            notifyMyListListeners(myList)
        }
    }

    @Published public private(set) var watchHistory: [Movie] = [] {
        didSet {
            notifyWatchHistoryListeners(watchHistory)
        }
    }

    @Published public private(set) var userProfile: UserProfile? {
        didSet {
            notifyUserProfileListeners(userProfile)
        }
    }

    @Published public private(set) var authToken: String? {
        didSet {
            let authenticated = (authToken != nil && !authToken!.trimmingCharacters(in: .whitespaces).isEmpty)
            if self.isAuthenticated != authenticated {
                self.isAuthenticated = authenticated
            }
        }
    }

    @Published public private(set) var isAuthenticated: Bool = false {
        didSet {
            notifyAuthListeners(isAuthenticated)
        }
    }

    @Published public var serverUrl: String
    @Published public var theme: String
    @Published public var language: String

    // MARK: - AsyncStream Continuations
    private var myListContinuations: [UUID: AsyncStream<[Movie]>.Continuation] = [:]
    private var watchHistoryContinuations: [UUID: AsyncStream<[Movie]>.Continuation] = [:]
    private var userProfileContinuations: [UUID: AsyncStream<UserProfile?>.Continuation] = [:]
    private var authContinuations: [UUID: AsyncStream<Bool>.Continuation] = [:]

    // MARK: - Initialization
    public init() {
        self.authToken = keychain.authToken
        self.userProfile = keychain.userProfile
        self.serverUrl = keychain.serverUrl ?? AppConfig.defaultServerUrl
        self.theme = userDefaults.string(forKey: themeKey) ?? "netflix"
        self.language = userDefaults.string(forKey: languageKey) ?? "vi"
        self.isAuthenticated = (authToken != nil && !authToken!.trimmingCharacters(in: .whitespaces).isEmpty)

        loadLocalData()

        // Sync initial server and token state
        let token = self.authToken
        let url = self.serverUrl
        Task {
            await api.setAuthToken(token)
            await api.setBaseUrl(url)
            if token != nil {
                await syncWithRemote()
            }
        }
    }

    // MARK: - Local Cache Loading & Persistence

    private func loadLocalData() {
        if let data = userDefaults.data(forKey: myListKey),
           let list = try? JSONDecoder().decode([Movie].self, from: data) {
            self.myList = list
        }

        if let data = userDefaults.data(forKey: watchHistoryKey),
           let history = try? JSONDecoder().decode([Movie].self, from: data) {
            self.watchHistory = history
        }

        if userProfile == nil,
           let data = userDefaults.data(forKey: userProfileKey),
           let profile = try? JSONDecoder().decode(UserProfile.self, from: data) {
            self.userProfile = profile
            keychain.userProfile = profile
        }
    }

    private func saveMyListLocally() {
        if let data = try? JSONEncoder().encode(myList) {
            userDefaults.set(data, forKey: myListKey)
        }
    }

    private func saveWatchHistoryLocally() {
        if let data = try? JSONEncoder().encode(watchHistory) {
            userDefaults.set(data, forKey: watchHistoryKey)
        }
    }

    // MARK: - Reactive AsyncStreams

    public var myListStream: AsyncStream<[Movie]> {
        AsyncStream { continuation in
            let id = UUID()
            continuation.yield(self.myList)
            self.myListContinuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.myListContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    public var watchHistoryStream: AsyncStream<[Movie]> {
        AsyncStream { continuation in
            let id = UUID()
            continuation.yield(self.watchHistory)
            self.watchHistoryContinuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.watchHistoryContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    public var userProfileStream: AsyncStream<UserProfile?> {
        AsyncStream { continuation in
            let id = UUID()
            continuation.yield(self.userProfile)
            self.userProfileContinuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.userProfileContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    public var isAuthenticatedStream: AsyncStream<Bool> {
        AsyncStream { continuation in
            let id = UUID()
            continuation.yield(self.isAuthenticated)
            self.authContinuations[id] = continuation
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.authContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    private func notifyMyListListeners(_ list: [Movie]) {
        for continuation in myListContinuations.values {
            continuation.yield(list)
        }
    }

    private func notifyWatchHistoryListeners(_ history: [Movie]) {
        for continuation in watchHistoryContinuations.values {
            continuation.yield(history)
        }
    }

    private func notifyUserProfileListeners(_ profile: UserProfile?) {
        for continuation in userProfileContinuations.values {
            continuation.yield(profile)
        }
    }

    private func notifyAuthListeners(_ authenticated: Bool) {
        for continuation in authContinuations.values {
            continuation.yield(authenticated)
        }
    }

    // MARK: - Authentication Management

    public func saveAuthData(token: String, profile: UserProfile) {
        keychain.authToken = token
        keychain.userProfile = profile
        self.authToken = token
        self.userProfile = profile
        self.isAuthenticated = true

        if let encoded = try? JSONEncoder().encode(profile) {
            userDefaults.set(encoded, forKey: userProfileKey)
        }

        Task {
            await api.setAuthToken(token)
            await syncWithRemote()
        }
    }

    public func clearAuthData() {
        keychain.authToken = nil
        keychain.userProfile = nil
        self.authToken = nil
        self.userProfile = nil
        self.isAuthenticated = false
        userDefaults.removeObject(forKey: userProfileKey)

        Task {
            await api.setAuthToken(nil)
        }
    }

    public func logout() {
        clearAuthData()
    }

    // MARK: - Remote Synchronization

    /// Merges remote saved movies and watch history with local storage using an async mutex.
    /// Ensures that local mutations made while a sync is in flight are not overwritten.
    public func syncWithRemote() async {
        guard isAuthenticated, let token = authToken, !token.isEmpty else { return }

        do {
            try await syncMutex.withLock {
                // 1. Sync Saved Movies (My List)
                let remoteSaved = try await self.api.getSavedMovies().map { $0.toMovie() }
                var mergedSaved = remoteSaved
                for local in self.myList where !remoteSaved.contains(where: { $0.slug == local.slug }) {
                    mergedSaved.append(local)
                }

                self.myList = mergedSaved
                self.saveMyListLocally()

                // 2. Sync Watch History
                let remoteHistory = try await self.api.getWatchHistory().map { $0.toMovie() }
                var mergedHistory = remoteHistory
                for local in self.watchHistory where !remoteHistory.contains(where: { $0.slug == local.slug }) {
                    mergedHistory.append(local)
                }

                self.watchHistory = Array(mergedHistory.prefix(self.maxHistory))
                self.saveWatchHistoryLocally()
            }
        } catch {
            print("[UserDataRepository] Sync with remote failed: \(error.localizedDescription)")
        }
    }

    // MARK: - My List & Bookmarks

    public func isInMyList(slug: String) -> Bool {
        return myList.contains { $0.slug == slug }
    }

    public func isMovieSaved(slug: String) -> Bool {
        return isInMyList(slug: slug)
    }

    public func toggleBookmark(_ movie: Movie) {
        if isInMyList(slug: movie.slug) {
            removeFromMyList(slug: movie.slug)
        } else {
            addToMyList(movie)
        }
    }

    public func toggleSaveMovie(_ movie: Movie) {
        toggleBookmark(movie)
    }

    public func addToMyList(_ movie: Movie) {
        if !myList.contains(where: { $0.slug == movie.slug }) {
            myList.insert(movie, at: 0)
            saveMyListLocally()
        }

        Task {
            if isAuthenticated {
                try? await syncMutex.withLock {
                    _ = try? await self.api.addSavedMovie(movie: movie)
                }
            }
        }
    }

    public func removeFromMyList(slug: String) {
        let movieId = myList.first(where: { $0.slug == slug })?.id ?? slug
        myList.removeAll { $0.slug == slug }
        saveMyListLocally()

        Task {
            if isAuthenticated {
                try? await syncMutex.withLock {
                    _ = try? await self.api.removeSavedMovie(movieId: movieId)
                }
            }
        }
    }

    // MARK: - Watch Progress & History Tracking

    /// Records playback progress for a given movie/episode.
    /// Implements 90% completion logic: when 90% or more has been watched, marks video finished
    /// and resets the resume seek position, while recording the finished state in history.
    public func saveWatchProgress(
        slug: String,
        episode: Int,
        position: Double,
        duration: Double,
        movie: Movie? = nil
    ) {
        let progressRatio = duration > 0 ? min(1.0, max(0.0, position / duration)) : 0.0
        let isFinished = duration > 0 && (progressRatio >= 0.90 || (duration > 60 && (duration - position) <= 30))

        if isFinished {
            // Clear or mark finished in progress map
            clearProgress(slug: slug, episode: episode)
        } else {
            // Save active resume position
            saveProgress(slug: slug, episode: episode, position: position, duration: duration)
        }

        // Update local Watch History list
        var targetMovie = movie ?? watchHistory.first(where: { $0.slug == slug }) ?? Movie(slug: slug)
        targetMovie.currentEpisode = episode
        targetMovie.progress = Float(isFinished ? 1.0 : progressRatio)

        var updated = watchHistory.filter { $0.slug != slug }
        updated.insert(targetMovie, at: 0)
        self.watchHistory = Array(updated.prefix(maxHistory))
        saveWatchHistoryLocally()

        // Sync progress with backend
        if isAuthenticated {
            Task {
                try? await syncMutex.withLock {
                    _ = try? await self.api.updateWatchProgress(
                        movieId: targetMovie.id.isEmpty ? targetMovie.slug : targetMovie.id,
                        episode: episode,
                        timestamp: Int(isFinished ? duration : position),
                        duration: Int(duration),
                        progress: isFinished ? 1.0 : progressRatio,
                        title: targetMovie.title,
                        slug: targetMovie.slug,
                        thumbnail: targetMovie.thumbnail,
                        backdrop: targetMovie.backdrop,
                        year: targetMovie.year,
                        category: targetMovie.category,
                        genre: targetMovie.genre,
                        country: targetMovie.country,
                        quality: targetMovie.quality
                    )
                }
            }
        }
    }

    public func updateWatchProgress(
        movie: Movie,
        episode: Int,
        position: Double,
        duration: Double
    ) {
        saveWatchProgress(
            slug: movie.slug,
            episode: episode,
            position: position,
            duration: duration,
            movie: movie
        )
    }

    public func addToHistory(_ movie: Movie) {
        var updated = watchHistory.filter { $0.slug != movie.slug }
        updated.insert(movie, at: 0)
        self.watchHistory = Array(updated.prefix(maxHistory))
        saveWatchHistoryLocally()

        if isAuthenticated {
            Task {
                try? await syncMutex.withLock {
                    _ = try? await self.api.updateWatchProgress(
                        movie: movie,
                        episode: movie.currentEpisode ?? 1,
                        progress: Double(movie.progress ?? 0.0),
                        duration: movie.duration ?? 0
                    )
                }
            }
        }
    }

    // MARK: - Progress Map Storage

    public func saveProgress(slug: String, episode: Int, position: Double, duration: Double) {
        var map = getProgressMap()
        let key = "\(slug)_\(episode)"
        map[key] = WatchProgress(slug: slug, episode: episode, position: position, duration: duration)
        if let data = try? JSONEncoder().encode(map) {
            userDefaults.set(data, forKey: watchProgressKey)
        }
    }

    public func getProgress(slug: String) -> WatchProgress? {
        let map = getProgressMap()
        // Return most recent episode progress for this slug
        return map.values.filter { $0.slug == slug }.max(by: { $0.updatedAt < $1.updatedAt })
    }

    public func getProgress(for slug: String, episode: Int) -> WatchProgress? {
        let key = "\(slug)_\(episode)"
        return getProgressMap()[key]
    }

    public func clearProgress(slug: String, episode: Int? = nil) {
        var map = getProgressMap()
        if let ep = episode {
            map.removeValue(forKey: "\(slug)_\(ep)")
        } else {
            for key in map.keys where key.hasPrefix("\(slug)_") {
                map.removeValue(forKey: key)
            }
        }
        if let data = try? JSONEncoder().encode(map) {
            userDefaults.set(data, forKey: watchProgressKey)
        }
    }

    private func getProgressMap() -> [String: WatchProgress] {
        guard let data = userDefaults.data(forKey: watchProgressKey),
              let map = try? JSONDecoder().decode([String: WatchProgress].self, from: data) else {
            return [:]
        }
        return map
    }

    // MARK: - Settings, Theme & Language

    public func setTheme(_ newTheme: String) {
        self.theme = newTheme
        userDefaults.set(newTheme, forKey: themeKey)
    }

    public func setLanguage(_ newLang: String) {
        self.language = newLang
        userDefaults.set(newLang, forKey: languageKey)
    }

    public func setServerUrl(_ newUrl: String) {
        self.serverUrl = newUrl
        keychain.serverUrl = newUrl
        Task {
            await api.setBaseUrl(newUrl)
        }
    }

    // MARK: - Device & Account Passthrough

    public func getDevices() async throws -> [Device] {
        return try await api.getDevices()
    }

    public func removeDevice(id: Int) async throws {
        _ = try await api.removeDevice(deviceId: id)
    }

    public func changePassword(current: String, new: String) async throws {
        _ = try await api.changePassword(oldPassword: current, newPassword: new)
    }

    public func generateRecoveryKey() async throws -> String? {
        let res = try await api.generateRecoveryKey()
        return res.key
    }

    public func generateLinkCode() async throws -> String? {
        let res = try await api.generateLinkCode()
        return res.code
    }
}
