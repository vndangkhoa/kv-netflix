import Foundation

/// Production-ready network client for the KV-Netflix API.
/// Thread-safe Swift 6 actor leveraging async/await `URLSession`, request interceptors, and Keychain token injection.
public actor ApiClient {
    public static let shared = ApiClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 60
        config.waitsForConnectivity = true
        config.requestCachePolicy = .useProtocolCachePolicy
        
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Nonisolated Synchronous Properties

    /// Active authentication token backed by the Keychain.
    public nonisolated var authToken: String? {
        get { KeychainManager.shared.authToken }
        set { KeychainManager.shared.authToken = newValue }
    }

    /// Base URL for the KV-Netflix API server.
    public nonisolated var baseUrl: String {
        get {
            let stored = KeychainManager.shared.serverUrl
            if let stored = stored, !stored.isEmpty {
                return stored.hasSuffix("/") ? stored : "\(stored)/"
            }
            return AppConfig.defaultServerUrl
        }
        set {
            let normalized = newValue.hasSuffix("/") ? newValue : "\(newValue)/"
            KeychainManager.shared.serverUrl = normalized
        }
    }

    public func setAuthToken(_ token: String?) {
        KeychainManager.shared.authToken = token
    }

    public func setBaseUrl(_ url: String) {
        let normalized = url.hasSuffix("/") ? url : "\(url)/"
        KeychainManager.shared.serverUrl = normalized
    }

    // MARK: - Interceptor & Request Building

    private func buildURLRequest(
        endpoint: String,
        method: String,
        queryParams: [String: String]?,
        bodyData: Data?
    ) throws -> URLRequest {
        let base = baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        let cleanEndpoint = endpoint.hasPrefix("/") ? String(endpoint.dropFirst()) : endpoint
        guard var components = URLComponents(string: "\(base)/\(cleanEndpoint)") else {
            throw URLError(.badURL)
        }

        if let queryParams = queryParams, !queryParams.isEmpty {
            var items = components.queryItems ?? []
            for (key, value) in queryParams {
                items.append(URLQueryItem(name: key, value: value))
            }
            components.queryItems = items
        }

        guard let url = components.url else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        // Interceptors: Header Injection
        request.setValue(AppConfig.userAgent, forHTTPHeaderField: "User-Agent")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let token = authToken, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let bodyData = bodyData {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = bodyData
        }

        return request
    }

    // MARK: - Generic Network Requests

    public func request<T: Decodable>(
        endpoint: String,
        method: String = "GET",
        queryParams: [String: String]? = nil,
        body: (any Encodable)? = nil
    ) async throws -> T {
        var bodyData: Data? = nil
        if let body = body {
            bodyData = try encoder.encode(body)
        }

        let urlRequest = try buildURLRequest(
            endpoint: endpoint,
            method: method,
            queryParams: queryParams,
            bodyData: bodyData
        )

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorText = (try? decoder.decode(StatusResponse.self, from: data))?.error
                ?? String(data: data, encoding: .utf8)
                ?? "HTTP \(httpResponse.statusCode)"
            throw NSError(domain: "ApiClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorText])
        }

        return try decoder.decode(T.self, from: data)
    }

    public func execute(
        endpoint: String,
        method: String = "POST",
        queryParams: [String: String]? = nil,
        body: (any Encodable)? = nil
    ) async throws {
        var bodyData: Data? = nil
        if let body = body {
            bodyData = try encoder.encode(body)
        }

        let urlRequest = try buildURLRequest(
            endpoint: endpoint,
            method: method,
            queryParams: queryParams,
            bodyData: bodyData
        )

        let (data, response) = try await session.data(for: urlRequest)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorText = (try? decoder.decode(StatusResponse.self, from: data))?.error
                ?? String(data: data, encoding: .utf8)
                ?? "HTTP \(httpResponse.statusCode)"
            throw NSError(domain: "ApiClient", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: errorText])
        }
    }

    // MARK: - 1. Public Content APIs

    public func getHomeVideos(category: String? = nil, page: Int = 1) async throws -> [Movie] {
        var params: [String: String] = ["page": "\(page)"]
        if let cat = category, !cat.isEmpty {
            params["category"] = cat
        }
        return try await request(endpoint: ApiRoutes.homeVideos, queryParams: params)
    }

    public func searchVideos(query: String, page: Int = 1) async throws -> [Movie] {
        let params: [String: String] = ["q": query, "page": "\(page)"]
        return try await request(endpoint: ApiRoutes.searchVideos, queryParams: params)
    }

    public func getMovieDetail(slug: String) async throws -> MovieDetail {
        return try await request(endpoint: ApiRoutes.movieDetail(slug: slug))
    }

    public func extractVideo(url: String) async throws -> VideoSource {
        let body = ExtractRequest(url: url)
        return try await request(endpoint: ApiRoutes.extract, method: "POST", body: body)
    }

    public func getStreamSubtitles(embedUrl: String) async throws -> [SubtitleTrack] {
        return try await request(endpoint: ApiRoutes.streamSubtitles, queryParams: ["embedUrl": embedUrl])
    }

    public func getGenres() async throws -> [Category] {
        return try await request(endpoint: ApiRoutes.genres)
    }

    public func getCountries() async throws -> [Category] {
        return try await request(endpoint: ApiRoutes.countries)
    }

    public func getActors() async throws -> [Actor] {
        return try await request(endpoint: ApiRoutes.actors)
    }

    public func getActorDetail(slug: String) async throws -> ActorDetail {
        return try await request(endpoint: ApiRoutes.actorDetail(slug: slug))
    }

    // MARK: - 2. Auth APIs

    public func register(name: String, email: String, password: String) async throws -> AuthResponse {
        struct RegisterBody: Encodable {
            let name: String
            let email: String
            let password: String
        }
        let res: AuthResponse = try await request(
            endpoint: ApiRoutes.register,
            method: "POST",
            body: RegisterBody(name: name, email: email, password: password)
        )
        KeychainManager.shared.authToken = res.token
        KeychainManager.shared.userProfile = res.user
        return res
    }

    public func login(email: String, password: String) async throws -> AuthResponse {
        struct LoginBody: Encodable {
            let email: String
            let password: String
        }
        let res: AuthResponse = try await request(
            endpoint: ApiRoutes.login,
            method: "POST",
            body: LoginBody(email: email, password: password)
        )
        KeychainManager.shared.authToken = res.token
        KeychainManager.shared.userProfile = res.user
        return res
    }

    public func getMe() async throws -> UserProfile {
        let profile: UserProfile = try await request(endpoint: ApiRoutes.me)
        KeychainManager.shared.userProfile = profile
        return profile
    }

    public func resetPassword(email: String, recoveryKey: String, newPassword: String) async throws -> StatusResponse {
        struct ResetBody: Encodable {
            let key: String
            let new_password: String
        }
        return try await request(
            endpoint: ApiRoutes.resetPassword,
            method: "POST",
            body: ResetBody(key: recoveryKey, new_password: newPassword)
        )
    }

    // MARK: - 3. Device Pairing APIs

    public func generateDeviceCode(deviceName: String = "iOS Device", deviceType: String = "ios") async throws -> DeviceCodeResponse {
        struct CodeBody: Encodable {
            let device_name: String
            let device_type: String
        }
        return try await request(
            endpoint: ApiRoutes.deviceCode,
            method: "POST",
            body: CodeBody(device_name: deviceName, device_type: deviceType)
        )
    }

    public func checkDeviceStatus(code: String) async throws -> DeviceStatusResponse {
        let res: DeviceStatusResponse = try await request(
            endpoint: ApiRoutes.deviceStatus,
            queryParams: ["code": code]
        )
        if res.status == "paired", let token = res.token, let user = res.user {
            KeychainManager.shared.authToken = token
            KeychainManager.shared.userProfile = user
        }
        return res
    }

    public func pairDevice(code: String) async throws -> PairDeviceResponse {
        struct PairBody: Encodable {
            let code: String
        }
        return try await request(
            endpoint: ApiRoutes.devicePair,
            method: "POST",
            body: PairBody(code: code)
        )
    }

    public func loginWithCode(code: String) async throws -> AuthResponse {
        struct LinkLoginBody: Encodable {
            let code: String
        }
        let res: AuthResponse = try await request(
            endpoint: ApiRoutes.deviceLinkLogin,
            method: "POST",
            body: LinkLoginBody(code: code)
        )
        KeychainManager.shared.authToken = res.token
        KeychainManager.shared.userProfile = res.user
        return res
    }

    public func generateLinkCode() async throws -> DeviceCodeResponse {
        return try await request(endpoint: ApiRoutes.deviceLinkCode, method: "POST")
    }

    // MARK: - 4. Account Management APIs

    public func getDevices() async throws -> [Device] {
        return try await request(endpoint: ApiRoutes.devices)
    }

    public func removeDevice(deviceId: Int) async throws -> StatusResponse {
        struct RemoveBody: Encodable {
            let device_id: Int
        }
        return try await request(
            endpoint: ApiRoutes.devices,
            method: "DELETE",
            body: RemoveBody(device_id: deviceId)
        )
    }

    public func changePassword(oldPassword: String, newPassword: String) async throws -> StatusResponse {
        struct ChangePasswordBody: Encodable {
            let current_password: String
            let new_password: String
        }
        return try await request(
            endpoint: ApiRoutes.changePassword,
            method: "POST",
            body: ChangePasswordBody(current_password: oldPassword, new_password: newPassword)
        )
    }

    public func generateRecoveryKey() async throws -> RecoveryKeyResponse {
        return try await request(endpoint: ApiRoutes.recoveryKey, method: "POST")
    }

    // MARK: - 5. Explore APIs

    public func exploreMovies() async throws -> [Movie] {
        return try await request(endpoint: ApiRoutes.exploreMovies)
    }

    public func exploreCategory(category: String) async throws -> [Movie] {
        return try await request(
            endpoint: ApiRoutes.exploreCategory,
            queryParams: ["category": category]
        )
    }

    // MARK: - 6. State Synchronization APIs

    public func getSavedMovies() async throws -> [RemoteSavedMovie] {
        return try await request(endpoint: ApiRoutes.savedMovies)
    }

    public func addSavedMovie(movie: Movie) async throws -> RemoteSavedMovie {
        struct SavedMoviePayload: Encodable {
            let movie_id: String
            let title: String
            let slug: String
            let thumbnail: String
            let backdrop: String?
            let year: Int?
            let category: String?
            let quality: String?
            let director: String?
            let cast: String?
        }
        let payload = SavedMoviePayload(
            movie_id: movie.id.isEmpty ? movie.slug : movie.id,
            title: movie.title,
            slug: movie.slug,
            thumbnail: movie.thumbnail,
            backdrop: movie.backdrop,
            year: movie.year,
            category: movie.category,
            quality: movie.quality,
            director: movie.director,
            cast: movie.cast?.joined(separator: ", ")
        )
        return try await request(endpoint: ApiRoutes.savedMovies, method: "POST", body: payload)
    }

    public func removeSavedMovie(movieId: String) async throws -> StatusResponse {
        return try await request(
            endpoint: ApiRoutes.savedMovies,
            method: "DELETE",
            queryParams: ["movie_id": movieId]
        )
    }

    public func getWatchHistory() async throws -> [RemoteWatchHistory] {
        return try await request(endpoint: ApiRoutes.watchHistory)
    }

    public func updateWatchProgress(
        movieId: String,
        episode: Int,
        timestamp: Int,
        duration: Int,
        progress: Double,
        title: String? = nil,
        slug: String? = nil,
        thumbnail: String? = nil,
        backdrop: String? = nil,
        year: Int? = nil,
        category: String? = nil,
        genre: String? = nil,
        country: String? = nil,
        quality: String? = nil
    ) async throws -> RemoteWatchHistory {
        struct WatchHistoryPayload: Encodable {
            let movie_id: String
            let title: String
            let slug: String
            let thumbnail: String
            let backdrop: String?
            let year: Int?
            let category: String?
            let genre: String?
            let country: String?
            let quality: String?
            let current_episode: Int
            let watched_timestamp: Int
            let duration: Int
            let progress: Double
        }
        let payload = WatchHistoryPayload(
            movie_id: movieId,
            title: title ?? "",
            slug: slug ?? movieId,
            thumbnail: thumbnail ?? "",
            backdrop: backdrop,
            year: year,
            category: category,
            genre: genre,
            country: country,
            quality: quality,
            current_episode: episode,
            watched_timestamp: timestamp,
            duration: duration,
            progress: progress
        )
        return try await request(endpoint: ApiRoutes.watchHistory, method: "POST", body: payload)
    }

    public func updateWatchProgress(
        movie: Movie,
        episode: Int,
        progress: Double,
        duration: Int
    ) async throws -> RemoteWatchHistory {
        let position = Int(progress * Double(duration))
        return try await updateWatchProgress(
            movieId: movie.id.isEmpty ? movie.slug : movie.id,
            episode: episode,
            timestamp: position,
            duration: duration,
            progress: progress,
            title: movie.title,
            slug: movie.slug,
            thumbnail: movie.thumbnail,
            backdrop: movie.backdrop,
            year: movie.year,
            category: movie.category,
            genre: movie.genre,
            country: movie.country,
            quality: movie.quality
        )
    }

    public func bulkSync(data: BulkSyncRequest) async throws -> BulkSyncResponse {
        return try await request(endpoint: ApiRoutes.bulkSync, method: "POST", body: data)
    }

    public func bulkSync(data: [String: [Movie]]) async throws -> [String: [Movie]] {
        return try await request(endpoint: ApiRoutes.bulkSync, method: "POST", body: data)
    }

    // MARK: - Nonisolated URL Utilities

    /// Converts a video stream URL to route through the backend streaming proxy.
    public nonisolated func proxyUrl(for streamUrl: String) -> String {
        let base = baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let encoded = streamUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return streamUrl
        }
        return "\(base)/api/stream?url=\(encoded)"
    }

    /// Converts an image URL to route through the backend image optimization proxy.
    public nonisolated func imageProxyUrl(for urlString: String, width: Int = 400) -> URL? {
        guard !urlString.isEmpty else { return nil }
        if urlString.hasPrefix("http://localhost") || urlString.hasPrefix("https://nf.khoavo.myds.me") {
            return URL(string: urlString)
        }
        let base = baseUrl.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard let encoded = urlString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) else {
            return URL(string: urlString)
        }
        return URL(string: "\(base)/api/images/proxy?url=\(encoded)&width=\(width)")
    }
}
