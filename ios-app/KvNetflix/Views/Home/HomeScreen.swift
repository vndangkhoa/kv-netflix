import SwiftUI

public struct HomeScreen: View {
    public let onMovieClick: (Movie) -> Void
    public let onWatchClick: (String, Int) -> Void
    public let onCategoryClick: (String) -> Void

    @StateObject private var viewModel = HomeViewModel()
    @ObservedObject private var userStore = UserDataStore.shared

    public init(
        onMovieClick: @escaping (Movie) -> Void,
        onWatchClick: @escaping (String, Int) -> Void,
        onCategoryClick: @escaping (String) -> Void
    ) {
        self.onMovieClick = onMovieClick
        self.onWatchClick = onWatchClick
        self.onCategoryClick = onCategoryClick
    }

    public var body: some View {
        ZStack(alignment: .top) {
            KvColor.darkBg.ignoresSafeArea()

            if viewModel.isLoading && viewModel.heroMovies.isEmpty {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                        .tint(KvColor.yellow)
                    Text("Đang tải nội dung...")
                        .font(.kvSubheadline)
                        .foregroundColor(KvColor.textMuted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = viewModel.errorMessage, viewModel.heroMovies.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 44))
                        .foregroundColor(KvColor.yellow)
                    Text(error)
                        .font(.kvBody)
                        .foregroundColor(KvColor.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button(action: { Task { await viewModel.loadHomeData() } }) {
                        Text("Thử lại")
                            .font(.kvHeadline)
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(KvColor.yellow)
                            .clipShape(Capsule())
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 20) {
                        // 1. Hero Carousel Banner
                        if !viewModel.heroMovies.isEmpty {
                            HeroCarouselView(
                                movies: viewModel.heroMovies,
                                onPlay: { movie in
                                    onWatchClick(movie.slug, 1)
                                },
                                onMyList: { movie in
                                    userStore.toggleSaveMovie(movie)
                                },
                                onSelect: { movie in
                                    onMovieClick(movie)
                                }
                            )
                        }

                        // 2. Category Filter Chips (Horizontal)
                        categoryChipsView

                        // 3. Category Filtered Content (if a specific category is chosen)
                        if let activeCategory = viewModel.selectedCategory {
                            categoryFilteredSection(categorySlug: activeCategory)
                        } else {
                            // 4. Default Home Shelves
                            defaultHomeSections
                        }
                    }
                    .padding(.bottom, 80)
                }
                .refreshable {
                    await viewModel.refresh()
                }
            }
        }
        .task {
            if viewModel.heroMovies.isEmpty {
                await viewModel.loadHomeData()
            }
        }
    }

    // MARK: - Category Chips
    private var categoryChipsView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                // "All" chip
                let isAll = (viewModel.selectedCategory == nil)
                Button(action: {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                        viewModel.selectCategory(nil)
                    }
                }) {
                    Text(userStore.language == "vi" ? "Tất cả" : "All")
                        .font(.system(size: 13, weight: isAll ? .bold : .medium))
                        .foregroundColor(isAll ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(isAll ? KvColor.yellow : Color.white.opacity(0.1))
                        .clipShape(Capsule())
                }

                // Standard Categories: Phim Lẻ, Phim Bộ, Hoạt Hình, TV Shows, K-drama, C-drama
                ForEach(AppConstants.categories, id: \.id) { cat in
                    let isSelected = (viewModel.selectedCategory == cat.id)
                    Button(action: {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                            viewModel.selectCategory(isSelected ? nil : cat.id)
                        }
                    }) {
                        Text(userStore.language == "vi" ? cat.vi : cat.en)
                            .font(.system(size: 13, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(isSelected ? KvColor.yellow : Color.white.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Default Home Sections
    @ViewBuilder
    private var defaultHomeSections: some View {
        // Continue Watching Row (from Watch History)
        if !userStore.watchHistory.isEmpty {
            MovieRowView(
                title: userStore.language == "vi" ? "Tiếp tục xem" : "Continue Watching",
                movies: userStore.watchHistory,
                isHorizontal: true,
                onMovieClick: { movie in
                    onWatchClick(movie.slug, movie.currentEpisode ?? 1)
                }
            )
        }

        // My List Row (Bookmarks)
        if !userStore.savedMovies.isEmpty {
            MovieRowView(
                title: userStore.language == "vi" ? "Danh sách của bạn" : "My List",
                movies: userStore.savedMovies,
                isHorizontal: false,
                onMovieClick: { movie in
                    onMovieClick(movie)
                }
            )
        }

        // Categorized Shelves from Backend
        ForEach(viewModel.shelves, id: \.title) { shelf in
            MovieRowView(
                title: shelf.title,
                movies: shelf.movies,
                isHorizontal: shelf.isHorizontal,
                onMovieClick: { movie in
                    onMovieClick(movie)
                },
                onSeeAllClick: {
                    if let catSlug = shelf.categorySlug {
                        viewModel.selectCategory(catSlug)
                    }
                }
            )
        }
    }

    // MARK: - Category Filtered Grid Section
    @ViewBuilder
    private func categoryFilteredSection(categorySlug: String) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            // Header with Sort Picker
            HStack {
                let catName = AppConstants.categories.first { $0.id == categorySlug }
                Text(userStore.language == "vi" ? (catName?.vi ?? categorySlug) : (catName?.en ?? categorySlug))
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                Menu {
                    ForEach(SortOption.allCases) { opt in
                        Button(action: { viewModel.sortOption = opt }) {
                            HStack {
                                Text(userStore.language == "vi" ? opt.labelVi : opt.labelEn)
                                if viewModel.sortOption == opt {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(userStore.language == "vi" ? viewModel.sortOption.labelVi : viewModel.sortOption.labelEn)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(KvColor.yellow)
                        Image(systemName: "arrow.up.arrow.down")
                            .font(.system(size: 11))
                            .foregroundColor(KvColor.yellow)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }
            .padding(.horizontal, 16)

            if viewModel.isCategoryLoading {
                VStack {
                    ProgressView().tint(KvColor.yellow)
                    Text("Đang tải phim...")
                        .font(.kvCaption)
                        .foregroundColor(KvColor.textMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 40)
            } else {
                // Responsive 3-Column Poster Grid
                let columns = [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10)
                ]

                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(viewModel.sortedCategoryMovies.indices, id: \.self) { idx in
                        let movie = viewModel.sortedCategoryMovies[idx]
                        MovieCardView(
                            movie: movie,
                            width: (UIScreen.main.bounds.width - 52) / 3,
                            rank: (idx < 10) ? idx + 1 : nil,
                            onClick: { onMovieClick(movie) }
                        )
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }
}
