import SwiftUI

public struct MyListView: View {
    public let onMovieClick: (Movie) -> Void
    public let onWatchClick: (String, Int) -> Void
    public let onSignInClick: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared
    @State private var selectedSegment: Int = 0 // 0: Bookmarks, 1: History
    @State private var showClearAlert: Bool = false

    public init(
        onMovieClick: @escaping (Movie) -> Void,
        onWatchClick: @escaping (String, Int) -> Void,
        onSignInClick: @escaping () -> Void
    ) {
        self.onMovieClick = onMovieClick
        self.onWatchClick = onWatchClick
        self.onSignInClick = onSignInClick
    }

    public var body: some View {
        ZStack {
            KvColor.darkBg.ignoresSafeArea()

            VStack(spacing: 0) {
                // Header & Segmented Picker
                headerView

                // Non-authenticated sync banner
                if !userStore.isAuthenticated {
                    guestSyncBanner
                }

                // Segment Content
                if selectedSegment == 0 {
                    bookmarksView
                } else {
                    watchHistoryView
                }
            }
        }
        .alert(
            userStore.language == "vi" ? "Xác nhận xóa" : "Confirm Clear",
            isPresented: $showClearAlert
        ) {
            Button(userStore.language == "vi" ? "Hủy" : "Cancel", role: .cancel) {}
            Button(userStore.language == "vi" ? "Xóa hết" : "Clear All", role: .destructive) {
                if selectedSegment == 0 {
                    userStore.clearSavedMovies()
                } else {
                    userStore.clearWatchHistory()
                }
            }
        } message: {
            Text(
                selectedSegment == 0
                    ? (userStore.language == "vi" ? "Bạn có chắc muốn xóa tất cả phim đã lưu?" : "Clear all saved movies?")
                    : (userStore.language == "vi" ? "Bạn có chắc muốn xóa toàn bộ lịch sử xem?" : "Clear all watch history?")
            )
        }
    }

    // MARK: - Header & Segmented Picker
    private var headerView: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(userStore.language == "vi" ? "Bộ sưu tập của tôi" : "My Library")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)

                Spacer()

                let currentListNotEmpty = (selectedSegment == 0 && !userStore.savedMovies.isEmpty) ||
                                          (selectedSegment == 1 && !userStore.watchHistory.isEmpty)
                if currentListNotEmpty {
                    Button(action: { showClearAlert = true }) {
                        Text(userStore.language == "vi" ? "Xóa tất cả" : "Clear All")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(KvColor.textMuted)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)

            // Segmented Picker (Custom Netflix Style)
            HStack(spacing: 0) {
                segmentButton(
                    title: userStore.language == "vi" ? "Danh sách lưu (\(userStore.savedMovies.count))" : "My List (\(userStore.savedMovies.count))",
                    index: 0
                )
                segmentButton(
                    title: userStore.language == "vi" ? "Lịch sử xem (\(userStore.watchHistory.count))" : "Watch History (\(userStore.watchHistory.count))",
                    index: 1
                )
            }
            .background(Color.white.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .padding(.horizontal, 16)
            .padding(.bottom, 10)
        }
    }

    private func segmentButton(title: String, index: Int) -> some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                selectedSegment = index
            }
        }) {
            Text(title)
                .font(.system(size: 14, weight: selectedSegment == index ? .bold : .medium))
                .foregroundColor(selectedSegment == index ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(
                    Group {
                        if selectedSegment == index {
                            RoundedRectangle(cornerRadius: 8, style: .continuous)
                                .fill(KvColor.yellow)
                        } else {
                            Color.clear
                        }
                    }
                )
        }
    }

    // MARK: - Guest Sync Banner
    private var guestSyncBanner: some View {
        HStack(spacing: 12) {
            Image(systemName: "icloud.slash")
                .foregroundColor(KvColor.yellow)
                .font(.system(size: 20))

            VStack(alignment: .leading, spacing: 2) {
                Text(userStore.language == "vi" ? "Đăng nhập để đồng bộ" : "Sign in to sync")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.white)
                Text(userStore.language == "vi" ? "Đồng bộ danh sách và lịch sử xem với TV và Web." : "Sync bookmarks and watch history with TV & Web.")
                    .font(.system(size: 11))
                    .foregroundColor(KvColor.textMuted)
            }

            Spacer()

            Button(action: onSignInClick) {
                Text(userStore.language == "vi" ? "Đăng nhập" : "Sign In")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(KvColor.yellow)
                    .clipShape(Capsule())
            }
        }
        .padding(12)
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    // MARK: - Bookmarks Grid
    @ViewBuilder
    private var bookmarksView: some View {
        if userStore.savedMovies.isEmpty {
            emptyStateView(
                iconName: "bookmark",
                title: userStore.language == "vi" ? "Chưa có phim lưu" : "No Saved Movies",
                message: userStore.language == "vi" ? "Hãy thêm phim bạn yêu thích vào danh sách để xem sau." : "Add movies you like to watch them later."
            )
        } else {
            ScrollView(.vertical, showsIndicators: false) {
                let columns = [
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10),
                    GridItem(.flexible(), spacing: 10)
                ]

                LazyVGrid(columns: columns, spacing: 14) {
                    ForEach(userStore.savedMovies) { movie in
                        MovieCardView(
                            movie: movie,
                            width: (UIScreen.main.bounds.width - 52) / 3,
                            onClick: { onMovieClick(movie) }
                        )
                        .contextMenu {
                            Button(role: .destructive) {
                                userStore.removeSavedMovie(slug: movie.slug)
                            } label: {
                                Label(userStore.language == "vi" ? "Xóa khỏi danh sách" : "Remove", systemImage: "trash")
                            }
                            Button {
                                onWatchClick(movie.slug, 1)
                            } label: {
                                Label(userStore.language == "vi" ? "Xem ngay" : "Play Now", systemImage: "play.fill")
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 80)
            }
        }
    }

    // MARK: - Watch History List
    @ViewBuilder
    private var watchHistoryView: some View {
        if userStore.watchHistory.isEmpty {
            emptyStateView(
                iconName: "clock.arrow.circlepath",
                title: userStore.language == "vi" ? "Chưa có lịch sử xem" : "No Watch History",
                message: userStore.language == "vi" ? "Các phim bạn đang xem sẽ hiển thị tại đây để tiếp tục bất cứ lúc nào." : "Movies you watch will appear here so you can resume anytime."
            )
        } else {
            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(spacing: 12) {
                    ForEach(userStore.watchHistory) { movie in
                        historyRow(for: movie)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 80)
            }
        }
    }

    private func historyRow(for movie: Movie) -> some View {
        Button(action: {
            onWatchClick(movie.slug, movie.currentEpisode ?? 1)
        }) {
            HStack(spacing: 12) {
                // Horizontal backdrop thumbnail with progress bar
                ZStack(alignment: .bottomLeading) {
                    let targetUrl = ApiClient.shared.imageProxyUrl(
                        for: movie.backdrop ?? movie.thumbnail,
                        width: 320
                    )

                    AsyncImage(url: targetUrl) { phase in
                        switch phase {
                        case .success(let img):
                            img
                                .resizable()
                                .scaledToFill()
                                .frame(width: 120, height: 70)
                                .clipped()
                        default:
                            Rectangle()
                                .fill(KvColor.darkTertiary)
                                .frame(width: 120, height: 70)
                                .overlay(
                                    Image(systemName: "film")
                                        .foregroundColor(KvColor.yellow.opacity(0.8))
                                )
                        }
                    }

                    // Play overlay circle
                    Circle()
                        .fill(Color.black.opacity(0.6))
                        .frame(width: 28, height: 28)
                        .overlay(
                            Image(systemName: "play.fill")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white)
                                .offset(x: 1)
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

                    // Bottom progress indicator
                    if let progress = movie.progress, progress > 0 {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Rectangle()
                                    .fill(Color.white.opacity(0.3))
                                    .frame(height: 3)
                                Rectangle()
                                    .fill(KvColor.yellow)
                                    .frame(width: geo.size.width * CGFloat(min(max(progress, 0.0), 1.0)), height: 3)
                            }
                        }
                        .frame(height: 3)
                    }
                }
                .frame(width: 120, height: 70)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                // Metadata
                VStack(alignment: .leading, spacing: 4) {
                    Text(movie.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 8) {
                        if let ep = movie.currentEpisode {
                            Text("Tập \(ep)")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(KvColor.yellow)
                        }
                        if let pct = movie.progress, pct > 0 {
                            Text("\(Int(pct * 100))%")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(KvColor.textMuted)
                        }
                    }
                }

                Spacer()

                // Delete single history item
                Button(action: {
                    withAnimation {
                        userStore.removeHistoryItem(slug: movie.slug)
                    }
                }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(KvColor.textMuted)
                        .padding(8)
                }
            }
            .padding(10)
            .background(KvColor.darkSecondary)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle())
    }

    // MARK: - Empty State View
    private func emptyStateView(iconName: String, title: String, message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: iconName)
                .font(.system(size: 50))
                .foregroundColor(KvColor.textMuted.opacity(0.5))

            Text(title)
                .font(.kvTitle3)
                .foregroundColor(.white)

            Text(message)
                .font(.kvBody)
                .foregroundColor(KvColor.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
