import Foundation
import Combine

@MainActor
public final class MyListViewModel: ObservableObject {
    @Published public private(set) var savedMovies: [Movie] = []
    @Published public private(set) var watchHistory: [Movie] = []
    @Published public private(set) var exploreMovies: [Movie] = []
    @Published public private(set) var isLoadingExplore: Bool = false

    private let userRepo = UserDataRepository.shared
    private let movieRepo = MovieRepository.shared
    private var cancellables = Set<AnyCancellable>()

    public init() {
        setupObservers()
        loadExplore()
    }

    private func setupObservers() {
        userRepo.$myList
            .receive(on: DispatchQueue.main)
            .sink { [weak self] list in
                self?.savedMovies = list
            }
            .store(in: &cancellables)

        userRepo.$watchHistory
            .receive(on: DispatchQueue.main)
            .sink { [weak self] history in
                self?.watchHistory = history
            }
            .store(in: &cancellables)
    }

    public func loadExplore() {
        isLoadingExplore = true
        Task {
            do {
                let movies = try await movieRepo.exploreMovies()
                self.exploreMovies = movies
                self.isLoadingExplore = false
            } catch {
                self.isLoadingExplore = false
                print("[MyListViewModel] Failed to load explore recommendations: \(error)")
            }
        }
    }

    public func removeFromMyList(slug: String) {
        userRepo.removeFromMyList(slug: slug)
    }

    public func removeFromHistory(slug: String) {
        // Creates a placeholder or removes directly
        var updated = userRepo.watchHistory.filter { $0.slug != slug }
        // Directly update user repository watch history
        if let data = try? JSONEncoder().encode(updated) {
            UserDefaults.standard.set(data, forKey: "kv_user_watch_history")
        }
        userRepo.clearProgress(slug: slug)
    }

    public func refresh() {
        loadExplore()
        Task {
            await userRepo.syncWithRemote()
        }
    }
}
