import Foundation
import SwiftUI
import Combine

/// Convenience UI facade delegating to the unified `UserDataRepository.shared`.
/// Maintains backward compatibility for views consuming `UserDataStore`.
@MainActor
public final class UserDataStore: ObservableObject {
    public static let shared = UserDataStore()

    private let repo = UserDataRepository.shared
    private var cancellables = Set<AnyCancellable>()

    @Published public var savedMovies: [Movie] = []
    @Published public var watchHistory: [Movie] = []
    @Published public var userProfile: UserProfile?
    @Published public var authToken: String?
    @Published public var serverUrl: String
    @Published public var language: String

    public var isAuthenticated: Bool {
        repo.isAuthenticated
    }

    private init() {
        self.savedMovies = repo.myList
        self.watchHistory = repo.watchHistory
        self.userProfile = repo.userProfile
        self.authToken = repo.authToken
        self.serverUrl = repo.serverUrl
        self.language = repo.language

        // Forward repo changes
        repo.$myList
            .receive(on: DispatchQueue.main)
            .sink { [weak self] list in self?.savedMovies = list }
            .store(in: &cancellables)

        repo.$watchHistory
            .receive(on: DispatchQueue.main)
            .sink { [weak self] list in self?.watchHistory = list }
            .store(in: &cancellables)

        repo.$userProfile
            .receive(on: DispatchQueue.main)
            .sink { [weak self] profile in self?.userProfile = profile }
            .store(in: &cancellables)

        repo.$authToken
            .receive(on: DispatchQueue.main)
            .sink { [weak self] token in self?.authToken = token }
            .store(in: &cancellables)
    }

    public func saveAuth(token: String, user: UserProfile) {
        repo.saveAuthData(token: token, profile: user)
    }

    public func logout() {
        repo.clearAuthData()
    }

    public func isMovieSaved(slug: String) -> Bool {
        repo.isInMyList(slug: slug)
    }

    public func toggleSaveMovie(_ movie: Movie) {
        repo.toggleBookmark(movie)
    }

    public func removeSavedMovie(slug: String) {
        repo.removeFromMyList(slug: slug)
    }

    public func clearSavedMovies() {
        for movie in savedMovies {
            repo.removeFromMyList(slug: movie.slug)
        }
    }

    public func recordWatchProgress(
        movie: Movie,
        episode: Int,
        position: Double,
        duration: Double
    ) {
        repo.saveWatchProgress(
            slug: movie.slug,
            episode: episode,
            position: position,
            duration: duration,
            movie: movie
        )
    }

    public func removeHistoryItem(slug: String) {
        // Filter out item from repo
    }

    public func clearWatchHistory() {
        // Clear history
    }

    public func getProgress(for slug: String, episode: Int) -> WatchProgress? {
        repo.getProgress(for: slug, episode: episode)
    }

    public func syncWithBackend() async {
        await repo.syncWithRemote()
    }
}
