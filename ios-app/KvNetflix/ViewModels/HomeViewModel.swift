import Foundation
import Combine
import SwiftUI

// MARK: - HomeViewModel
@MainActor
public final class HomeViewModel: ObservableObject {
    public struct Shelf: Identifiable {
        public var id: String { title }
        public var title: String
        public var movies: [Movie]
        public var isHorizontal: Bool
        public var categorySlug: String?

        public init(title: String, movies: [Movie], isHorizontal: Bool = false, categorySlug: String? = nil) {
            self.title = title
            self.movies = movies
            self.isHorizontal = isHorizontal
            self.categorySlug = categorySlug
        }
    }

    @Published public var heroMovies: [Movie] = []
    @Published public var shelves: [Shelf] = []
    @Published public var selectedCategory: String? = nil
    @Published public var categoryMovies: [Movie] = []
    @Published public var isCategoryLoading: Bool = false
    @Published public var sortOption: SortOption = .latest
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String? = nil

    public init() {}

    public var sortedCategoryMovies: [Movie] {
        switch sortOption {
        case .latest:
            return categoryMovies
        case .mostView, .hot:
            return categoryMovies.shuffled()
        case .year:
            return categoryMovies.sorted { ($0.year ?? 0) > ($1.year ?? 0) }
        case .rating:
            return categoryMovies.sorted { ($0.rating ?? "0") > ($1.rating ?? "0") }
        case .title:
            return categoryMovies.sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
        }
    }

    public func setSortOption(_ option: SortOption) {
        self.sortOption = option
    }

    public func selectCategory(_ slug: String?) {
        self.selectedCategory = slug
        if let slug = slug {
            Task {
                await loadCategoryMovies(slug: slug)
            }
        }
    }

    public func refresh() async {
        await loadHomeData()
        if let slug = selectedCategory {
            await loadCategoryMovies(slug: slug)
        }
    }

    public func loadHomeData() async {
        self.isLoading = true
        self.errorMessage = nil

        do {
            async let homeCall = ApiClient.shared.getHomeVideos(category: nil, page: 1)
            async let singleCall = ApiClient.shared.getHomeVideos(category: "phim-le", page: 1)
            async let seriesCall = ApiClient.shared.getHomeVideos(category: "phim-bo", page: 1)
            async let animeCall = ApiClient.shared.getHomeVideos(category: "hoat-hinh", page: 1)
            async let exploreCall = ApiClient.shared.exploreMovies()

            let (homeMovies, singleMovies, seriesMovies, animeMovies, exploreList) = try await (
                homeCall, singleCall, seriesCall, animeCall, (try? exploreCall) ?? []
            )

            // Select 5-6 top items for Hero Carousel
            self.heroMovies = Array(homeMovies.prefix(6))

            // Build Shelves
            var newShelves: [Shelf] = []

            if !homeMovies.isEmpty {
                newShelves.append(
                    Shelf(
                        title: "Top 10 Phim Hôm Nay",
                        movies: Array(homeMovies.prefix(10)),
                        isHorizontal: false,
                        categorySlug: nil
                    )
                )
            }

            if !seriesMovies.isEmpty {
                newShelves.append(
                    Shelf(
                        title: "Phim Bộ Đang Thịnh Hành",
                        movies: seriesMovies,
                        isHorizontal: false,
                        categorySlug: "phim-bo"
                    )
                )
            }

            if !singleMovies.isEmpty {
                newShelves.append(
                    Shelf(
                        title: "Phim Lẻ Mới Nhất",
                        movies: singleMovies,
                        isHorizontal: false,
                        categorySlug: "phim-le"
                    )
                )
            }

            if !animeMovies.isEmpty {
                newShelves.append(
                    Shelf(
                        title: "Hoạt Hình Nổi Bật",
                        movies: animeMovies,
                        isHorizontal: false,
                        categorySlug: "hoat-hinh"
                    )
                )
            }

            if !exploreList.isEmpty {
                newShelves.append(
                    Shelf(
                        title: "Gợi Ý Cho Bạn",
                        movies: exploreList,
                        isHorizontal: true,
                        categorySlug: nil
                    )
                )
            }

            self.shelves = newShelves
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }

    public func loadCategoryMovies(slug: String) async {
        self.isCategoryLoading = true
        do {
            let list = try await ApiClient.shared.getHomeVideos(category: slug, page: 1)
            self.categoryMovies = list
            self.isCategoryLoading = false
        } catch {
            self.isCategoryLoading = false
        }
    }
}
