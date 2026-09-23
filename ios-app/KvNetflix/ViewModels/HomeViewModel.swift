import Foundation
import Combine

public enum SortOption: String, CaseIterable, Identifiable {
    case latest = "Latest"
    case mostView = "Most View"
    case hot = "Hot of the Week"

    public var id: String { rawValue }

    public var localizedVi: String {
        switch self {
        case .latest: return "Mới nhất"
        case .mostView: return "Xem nhiều"
        case .hot: return "Hot tuần"
        }
    }
}

@MainActor
public final class HomeViewModel: ObservableObject {
    @Published public private(set) var heroMovies: [Movie] = []
    @Published public private(set) var watchedMovies: [Movie] = []
    @Published public private(set) var myListMovies: [Movie] = []
    @Published public private(set) var recommendedMovies: [Movie] = []
    @Published public private(set) var categoryMovies: [String: [Movie]] = [:]
    @Published public private(set) var latestMovies: [Movie] = []
    @Published public private(set) var allCategoryMovies: [Movie] = []
    @Published public private(set) var genres: [Category] = []
    @Published public private(set) var currentCategory: String?
    @Published public var sortOption: SortOption = .latest
    @Published public private(set) var isLoading: Bool = true
    @Published public private(set) var error: String?

    private let movieRepo = MovieRepository.shared
    private let userRepo = UserDataRepository.shared
    private var cancellables = Set<AnyCancellable>()

    public let mainCategories: [(slug: String, name: String)] = [
        ("phim-le", "Phim Lẻ"),
        ("phim-bo", "Phim Bộ"),
        ("phim-long-tieng", "Phim Lồng Tiếng"),
        ("hoat-hinh", "Hoạt Hình"),
        ("tv-shows", "TV Shows"),
        ("han-quoc", "K-drama"),
        ("trung-quoc", "C-drama"),
        ("viet-nam", "Phim Việt Nam")
    ]

    public init() {
        setupUserDataObservers()
        loadGenres()
        loadHome()
    }

    private func setupUserDataObservers() {
        userRepo.$watchHistory
            .receive(on: DispatchQueue.main)
            .sink { [weak self] history in
                self?.watchedMovies = history
            }
            .store(in: &cancellables)

        userRepo.$myList
            .receive(on: DispatchQueue.main)
            .sink { [weak self] list in
                self?.myListMovies = list
            }
            .store(in: &cancellables)
    }

    public func setSortOption(_ option: SortOption) {
        self.sortOption = option
        self.allCategoryMovies = sortMovies(allCategoryMovies, option: option)
    }

    private func sortMovies(_ list: [Movie], option: SortOption) -> [Movie] {
        switch option {
        case .latest:
            return list.sorted { ($0.year ?? 0) > ($1.year ?? 0) }
        case .mostView:
            return list.shuffled()
        case .hot:
            return list.shuffled()
        }
    }

    public func loadGenres() {
        Task {
            do {
                self.genres = try await movieRepo.getGenres()
            } catch {
                print("[HomeViewModel] Failed to load genres: \(error)")
            }
        }
    }

    public func loadHome(category: String? = nil) {
        isLoading = true
        error = nil
        currentCategory = category
        allCategoryMovies = []

        Task {
            do {
                if let cat = category, !cat.isEmpty {
                    // Load category specific content
                    let allMovies = try await loadAllPagesForCategory(categorySlug: cat)
                    let sorted = sortMovies(allMovies, option: sortOption)
                    self.allCategoryMovies = sorted
                    self.heroMovies = Array(allMovies.prefix(5))
                    self.recommendedMovies = Array(allMovies.shuffled().prefix(10))
                    self.latestMovies = allMovies
                    self.isLoading = false
                } else {
                    // Load all main categories concurrently
                    var results: [String: [Movie]] = [:]

                    await withTaskGroup(of: (String, [Movie]).self) { group in
                        for cat in self.mainCategories {
                            group.addTask {
                                do {
                                    let res = try await self.movieRepo.getHomeVideos(category: cat.slug, page: 1)
                                    return (cat.name, res.items)
                                } catch {
                                    return (cat.name, [])
                                }
                            }
                        }

                        for await (name, items) in group {
                            if !items.isEmpty {
                                results[name] = items
                            }
                        }
                    }

                    let allFlattened = results.values.flatMap { $0 }
                    var uniqueLatest: [Movie] = []
                    var seen = Set<String>()
                    for m in allFlattened {
                        if !seen.contains(m.slug) {
                            seen.insert(m.slug)
                            uniqueLatest.append(m)
                        }
                    }

                    if uniqueLatest.isEmpty {
                        // Fallback general load
                        let generalRes = try await movieRepo.getHomeVideos(category: nil, page: 1)
                        uniqueLatest = generalRes.items
                    }

                    if uniqueLatest.isEmpty {
                        self.error = "No content available"
                        self.isLoading = false
                    } else {
                        let firstCatName = self.mainCategories.first?.name ?? ""
                        let heroItems = results[firstCatName]?.prefix(5).map { $0 } ?? Array(uniqueLatest.prefix(5))

                        self.categoryMovies = results
                        self.heroMovies = Array(heroItems)
                        self.recommendedMovies = Array(uniqueLatest.shuffled().prefix(15))
                        self.latestMovies = Array(uniqueLatest.prefix(20))
                        self.isLoading = false
                    }
                }
            } catch {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    private func loadAllPagesForCategory(categorySlug: String, maxPages: Int = 5) async throws -> [Movie] {
        let firstPage = try await movieRepo.getHomeVideos(category: categorySlug, page: 1)
        if firstPage.items.isEmpty { return [] }

        var allItems = firstPage.items
        for page in 2...maxPages {
            do {
                let next = try await movieRepo.getHomeVideos(category: categorySlug, page: page)
                if next.items.isEmpty { break }
                allItems.append(contentsOf: next.items)
            } catch {
                break
            }
        }

        var unique: [Movie] = []
        var seen = Set<String>()
        for m in allItems {
            if !seen.contains(m.slug) {
                seen.insert(m.slug)
                unique.append(m)
            }
        }
        return unique
    }

    public func refresh() {
        loadHome(category: currentCategory)
    }
}
