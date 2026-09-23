import Foundation

public final class MovieRepository {
    public static let shared = MovieRepository()
    private let api = ApiClient.shared

    public init() {}

    public func getHomeVideos(category: String? = nil, page: Int = 1) async throws -> HomeResponse {
        let items = try await api.getHomeVideos(category: category, page: page)
        return HomeResponse(items: items, totalPages: 10, currentPage: page)
    }

    public func searchVideos(query: String, page: Int = 1) async throws -> HomeResponse {
        let items = try await api.searchVideos(query: query, page: page)
        return HomeResponse(items: items, totalPages: 1, currentPage: page)
    }

    public func getMovieDetail(slug: String) async throws -> MovieDetail {
        return try await api.getMovieDetail(slug: slug)
    }

    public func extractVideo(url: String) async throws -> VideoSource {
        return try await api.extractVideo(url: url)
    }

    public func getStreamSubtitles(embedUrl: String) async throws -> [SubtitleTrack] {
        return try await api.getStreamSubtitles(embedUrl: embedUrl)
    }

    public func getGenres() async throws -> [Category] {
        return try await api.getGenres()
    }

    public func getCountries() async throws -> [Category] {
        return try await api.getCountries()
    }

    public func exploreMovies() async throws -> [Movie] {
        return try await api.exploreMovies()
    }
}
