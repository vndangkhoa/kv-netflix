import SwiftUI
import Combine

public struct SearchScreen: View {
    public let onMovieClick: (Movie) -> Void

    @StateObject private var viewModel = SearchViewModel()
    @ObservedObject private var userStore = UserDataStore.shared
    @FocusState private var isSearchFocused: Bool

    public init(onMovieClick: @escaping (Movie) -> Void) {
        self.onMovieClick = onMovieClick
    }

    public var body: some View {
        ZStack {
            KvColor.darkBg.ignoresSafeArea()

            VStack(spacing: 0) {
                // 1. Search Bar
                searchBarHeader

                // 2. Filter Chips (Genres & Countries)
                filterChipsBar

                // 3. Search Content (Results, Suggestions, or Explore)
                searchBody
            }
        }
        .onAppear {
            if viewModel.exploreMovies.isEmpty {
                Task {
                    await viewModel.loadExplore()
                }
            }
        }
    }

    // MARK: - Search Bar Header
    private var searchBarHeader: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(KvColor.yellow)
                    .font(.system(size: 16, weight: .semibold))

                TextField(
                    userStore.language == "vi" ? "Tìm phim, diễn viên, thể loại..." : "Search movies, cast, genres...",
                    text: $viewModel.query
                )
                .focused($isSearchFocused)
                .foregroundColor(.white)
                .font(.system(size: 15))
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .submitLabel(.search)
                .onSubmit {
                    viewModel.performSearch()
                }

                if !viewModel.query.isEmpty {
                    Button(action: {
                        viewModel.clearSearch()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(KvColor.textMuted)
                            .font(.system(size: 16))
                    }
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(KvColor.darkSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isSearchFocused ? KvColor.yellow.opacity(0.5) : KvColor.borderLight, lineWidth: 1)
            )

            if isSearchFocused {
                Button(action: {
                    isSearchFocused = false
                    if viewModel.query.isEmpty {
                        viewModel.clearSearch()
                    }
                }) {
                    Text(userStore.language == "vi" ? "Hủy" : "Cancel")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundColor(KvColor.yellow)
                }
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .padding(.bottom, 8)
        .animation(.spring(response: 0.3, dampingFraction: 0.75), value: isSearchFocused)
    }

    // MARK: - Filter Chips Bar
    private var filterChipsBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // Genres chips
                ForEach(AppConstants.genres.prefix(8), id: \.id) { genre in
                    let isSelected = (viewModel.selectedFilter == genre.id)
                    Button(action: {
                        withAnimation {
                            viewModel.toggleFilter(genre.id, queryText: userStore.language == "vi" ? genre.vi : genre.en)
                        }
                    }) {
                        Text(userStore.language == "vi" ? genre.vi : genre.en)
                            .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(isSelected ? KvColor.yellow : Color.white.opacity(0.08))
                            .clipShape(Capsule())
                    }
                }

                // Country chips
                ForEach(AppConstants.countries.prefix(4), id: \.id) { country in
                    let isSelected = (viewModel.selectedFilter == country.id)
                    Button(action: {
                        withAnimation {
                            viewModel.toggleFilter(country.id, queryText: userStore.language == "vi" ? country.vi : country.en)
                        }
                    }) {
                        Text(userStore.language == "vi" ? country.vi : country.en)
                            .font(.system(size: 12, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(isSelected ? KvColor.yellow : Color.white.opacity(0.08))
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
    }

    // MARK: - Body Content
    @ViewBuilder
    private var searchBody: some View {
        if viewModel.isLoading {
            VStack(spacing: 12) {
                ProgressView().tint(KvColor.yellow).scaleEffect(1.2)
                Text(userStore.language == "vi" ? "Đang tìm kiếm..." : "Searching...")
                    .font(.kvSubheadline)
                    .foregroundColor(KvColor.textMuted)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.hasSearched && viewModel.results.isEmpty {
            emptyResultsView
        } else if !viewModel.results.isEmpty {
            resultsGridView(movies: viewModel.results, title: userStore.language == "vi" ? "Kết quả tìm kiếm" : "Search Results")
        } else {
            // Default Explore / Trending view when nothing searched yet
            resultsGridView(
                movies: viewModel.exploreMovies,
                title: userStore.language == "vi" ? "Phổ biến nhất" : "Popular Searches"
            )
        }
    }

    // MARK: - Results Grid View
    private func resultsGridView(movies: [Movie], title: String) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 14) {
                Text(title)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                let columns = [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10)
                ]

                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(movies) { movie in
                        MovieCardView(
                            movie: movie,
                            width: (UIScreen.main.bounds.width - 52) / 3,
                            onClick: {
                                isSearchFocused = false
                                onMovieClick(movie)
                            }
                        )
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 80)
            }
        }
        .scrollDismissesKeyboard(.immediately)
    }

    // MARK: - Empty State View
    private var emptyResultsView: some View {
        VStack(spacing: 14) {
            Image(systemName: "film.stack")
                .font(.system(size: 54))
                .foregroundColor(KvColor.textMuted.opacity(0.6))
                .padding(.bottom, 4)

            Text(userStore.language == "vi" ? "Không tìm thấy kết quả" : "No Results Found")
                .font(.kvTitle3)
                .foregroundColor(.white)

            Text(
                userStore.language == "vi"
                    ? "Hãy thử tìm bằng từ khóa khác hoặc duyệt các thể loại gợi ý."
                    : "Try searching with other keywords or explore genres above."
            )
            .font(.kvBody)
            .foregroundColor(KvColor.textMuted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - SearchViewModel with Debounce
@MainActor
public final class SearchViewModel: ObservableObject {
    @Published public var query: String = ""
    @Published public var selectedFilter: String? = nil
    @Published public var results: [Movie] = []
    @Published public var exploreMovies: [Movie] = []
    @Published public var isLoading: Bool = false
    @Published public var hasSearched: Bool = false

    private var searchTask: Task<Void, Never>? = nil
    private var cancellables = Set<AnyCancellable>()

    public init() {
        // Debounce query changes with 350ms delay
        $query
            .removeDuplicates()
            .debounce(for: .milliseconds(350), scheduler: DispatchQueue.main)
            .sink { [weak self] newQuery in
                guard let self = self else { return }
                if newQuery.trimmingCharacters(in: .whitespaces).count >= 2 {
                    self.performSearch(text: newQuery)
                } else if newQuery.isEmpty {
                    self.results = []
                    self.hasSearched = false
                }
            }
            .store(in: &cancellables)
    }

    public func toggleFilter(_ filterId: String, queryText: String) {
        if selectedFilter == filterId {
            selectedFilter = nil
            clearSearch()
        } else {
            selectedFilter = filterId
            query = queryText
            performSearch(text: queryText)
        }
    }

    public func performSearch(text: String? = nil) {
        let searchText = (text ?? query).trimmingCharacters(in: .whitespaces)
        guard !searchText.isEmpty else { return }

        searchTask?.cancel()
        searchTask = Task {
            self.isLoading = true
            self.hasSearched = true
            do {
                let items = try await ApiClient.shared.searchVideos(query: searchText, page: 1)
                if !Task.isCancelled {
                    self.results = items
                    self.isLoading = false
                }
            } catch {
                if !Task.isCancelled {
                    self.results = []
                    self.isLoading = false
                }
            }
        }
    }

    public func loadExplore() async {
        do {
            let items = try await ApiClient.shared.exploreMovies()
            self.exploreMovies = items
        } catch {
            // Fallback to home movies if explore endpoint fails
            if let home = try? await ApiClient.shared.getHomeVideos(category: nil, page: 1) {
                self.exploreMovies = home
            }
        }
    }

    public func clearSearch() {
        query = ""
        results = []
        hasSearched = false
        selectedFilter = nil
        searchTask?.cancel()
    }
}
