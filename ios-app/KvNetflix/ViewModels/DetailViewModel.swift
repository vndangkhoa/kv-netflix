import Foundation
import Combine

@MainActor
public final class DetailViewModel: ObservableObject {
    @Published public private(set) var movie: MovieDetail?
    @Published public private(set) var isLoading: Bool = true
    @Published public private(set) var error: String? = nil
    @Published public private(set) var isInMyList: Bool = false
    @Published public var selectedServer: String = ""
    @Published public private(set) var servers: [String] = []
    @Published public private(set) var relatedMovies: [Movie] = []

    private let movieRepo = MovieRepository.shared
    private let userRepo = UserDataRepository.shared

    public init() {}

    public var episodesForSelectedServer: [Episode] {
        guard let episodes = movie?.episodes else { return [] }
        if selectedServer.isEmpty {
            return episodes
        }
        let filtered = episodes.filter { $0.serverName == selectedServer }
        return filtered.isEmpty ? episodes : filtered
    }

    public func loadMovie(slug: String) {
        isLoading = true
        error = nil

        Task {
            do {
                let detail = try await movieRepo.getMovieDetail(slug: slug)
                self.movie = detail
                self.isInMyList = userRepo.isInMyList(slug: slug)

                let serverList = Array(Set(detail.episodes?.map { $0.serverName }.filter { !$0.isEmpty } ?? [])).sorted()
                self.servers = serverList
                self.selectedServer = serverList.first ?? ""
                self.isLoading = false

                // Load related / explore movies
                self.loadRelatedMovies(currentSlug: slug)
            } catch {
                self.isLoading = false
                self.error = error.localizedDescription
            }
        }
    }

    public func selectServer(_ server: String) {
        self.selectedServer = server
    }

    public func toggleMyList() {
        guard let movie = movie else { return }
        if isInMyList {
            userRepo.removeFromMyList(slug: movie.slug)
            isInMyList = false
        } else {
            userRepo.addToMyList(movie.toMovie())
            isInMyList = true
        }
    }

    private func loadRelatedMovies(currentSlug: String) {
        Task {
            do {
                let items = try await movieRepo.exploreMovies()
                self.relatedMovies = items.filter { $0.slug != currentSlug }
            } catch {
                print("[DetailViewModel] Error loading related movies: \(error)")
            }
        }
    }
}
