import SwiftUI

public struct MovieDetailView: View {
    public let slug: String
    public let onWatchClick: (String, Int) -> Void
    public let onMovieClick: (Movie) -> Void
    public let onBackClick: () -> Void

    @State private var movieDetail: MovieDetail? = nil
    @State private var isLoading: Bool = true
    @State private var errorMessage: String? = nil
    @State private var isDescriptionExpanded: Bool = false
    @State private var selectedServer: String = ""

    @ObservedObject private var userStore = UserDataStore.shared

    public init(
        slug: String,
        onWatchClick: @escaping (String, Int) -> Void,
        onMovieClick: @escaping (Movie) -> Void,
        onBackClick: @escaping () -> Void
    ) {
        self.slug = slug
        self.onWatchClick = onWatchClick
        self.onMovieClick = onMovieClick
        self.onBackClick = onBackClick
    }

    public var body: some View {
        ZStack(alignment: .topLeading) {
            KvColor.darkBg.ignoresSafeArea()

            if isLoading {
                VStack(spacing: 12) {
                    ProgressView().tint(KvColor.yellow).scaleEffect(1.2)
                    Text("Đang tải thông tin phim...")
                        .font(.kvSubheadline)
                        .foregroundColor(KvColor.textMuted)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Image(systemName: "film")
                        .font(.system(size: 40))
                        .foregroundColor(KvColor.yellow)
                    Text(error)
                        .foregroundColor(KvColor.textMuted)
                    Button("Thử lại") {
                        Task { await loadDetail() }
                    }
                    .buttonStyle(KvPrimaryButtonStyle())
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let detail = movieDetail {
                detailContent(detail: detail)
            }

            // Floating Back Button
            Button(action: onBackClick) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 38, height: 38)
                    .background(Color.black.opacity(0.6))
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.white.opacity(0.15), lineWidth: 1))
            }
            .padding(.leading, 16)
            .padding(.top, 50)
        }
        .task {
            await loadDetail()
        }
    }

    @ViewBuilder
    private func detailContent(detail: MovieDetail) -> some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                // 1. Backdrop Poster with Gradient Fade
                backdropSection(detail: detail)

                // 2. Info & Action Buttons
                VStack(alignment: .leading, spacing: 14) {
                    // Title
                    Text(detail.title)
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)

                    if let orig = detail.originalTitle, !orig.isEmpty, orig != detail.title {
                        Text(orig)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(KvColor.textMuted)
                    }

                    // Metadata Row
                    HStack(spacing: 10) {
                        Text("98% Match")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(KvColor.greenMatch)

                        if let year = detail.year {
                            Text("\(year)")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))
                        }

                        if let quality = detail.quality, !quality.isEmpty {
                            Text(quality.uppercased())
                                .font(.system(size: 10, weight: .bold))
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(KvColor.yellow)
                                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                        }

                        if let dur = detail.duration {
                            Text("\(dur) phút")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(KvColor.textMuted)
                        }

                        if let rating = detail.rating, !rating.isEmpty {
                            HStack(spacing: 2) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 11))
                                    .foregroundColor(KvColor.yellow)
                                Text(rating)
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundColor(.white)
                            }
                        }
                    }

                    // Main Action Buttons
                    HStack(spacing: 12) {
                        // Play Button
                        Button(action: {
                            onWatchClick(detail.slug, 1)
                        }) {
                            HStack(spacing: 8) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 16, weight: .bold))
                                Text(userStore.language == "vi" ? "Xem phim" : "Play")
                                    .font(.system(size: 16, weight: .bold))
                            }
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(KvColor.yellow)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }

                        // Bookmark Toggle
                        let movieObj = detail.toMovie()
                        let isSaved = userStore.isMovieSaved(slug: detail.slug)
                        Button(action: {
                            userStore.toggleSaveMovie(movieObj)
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: isSaved ? "checkmark" : "plus")
                                    .font(.system(size: 16, weight: .bold))
                                Text(isSaved ? (userStore.language == "vi" ? "Đã lưu" : "Saved") : (userStore.language == "vi" ? "Lưu lại" : "My List"))
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundColor(.white)
                            .frame(width: 68, height: 48)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }

                        // Share
                        ShareLink(item: URL(string: "kvnetflix://watch/\(detail.slug)/1")!) {
                            VStack(spacing: 4) {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 16, weight: .bold))
                                Text("Chia sẻ")
                                    .font(.system(size: 10, weight: .medium))
                            }
                            .foregroundColor(.white)
                            .frame(width: 60, height: 48)
                            .background(Color.white.opacity(0.15))
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }

                    // Description
                    if !detail.description.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(detail.description)
                                .font(.system(size: 14))
                                .foregroundColor(KvColor.textSecondary)
                                .lineLimit(isDescriptionExpanded ? nil : 3)
                                .lineSpacing(4)

                            Button(action: { isDescriptionExpanded.toggle() }) {
                                Text(isDescriptionExpanded ? "Thu gọn" : "Xem thêm")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(KvColor.yellow)
                            }
                        }
                    }

                    // Cast & Crew
                    if let cast = detail.cast, !cast.isEmpty {
                        HStack(alignment: .top, spacing: 6) {
                            Text("Diễn viên:")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(KvColor.textMuted)
                            Text(cast.prefix(5).joined(separator: ", "))
                                .font(.system(size: 12))
                                .foregroundColor(KvColor.textSecondary)
                        }
                    }

                    if let director = detail.director, !director.isEmpty {
                        HStack(alignment: .top, spacing: 6) {
                            Text("Đạo diễn:")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(KvColor.textMuted)
                            Text(director)
                                .font(.system(size: 12))
                                .foregroundColor(KvColor.textSecondary)
                        }
                    }

                    Divider().background(Color.white.opacity(0.08)).padding(.vertical, 4)

                    // Episodes Section
                    if let episodes = detail.episodes, !episodes.isEmpty {
                        episodesGridSection(episodes: episodes)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 80)
            }
        }
    }

    // MARK: - Backdrop Section
    private func backdropSection(detail: MovieDetail) -> some View {
        ZStack(alignment: .bottom) {
            let targetUrl = ApiClient.shared.imageProxyUrl(
                for: detail.backdrop ?? detail.thumbnail,
                width: 1280
            )

            AsyncImage(url: targetUrl) { phase in
                switch phase {
                case .success(let img):
                    img
                        .resizable()
                        .scaledToFill()
                        .frame(height: 280)
                        .clipped()
                default:
                    Rectangle()
                        .fill(KvColor.darkTertiary)
                        .frame(height: 280)
                }
            }

            // Bottom Gradient Fade to DarkBg
            LinearGradient(
                colors: [Color.clear, KvColor.darkBg.opacity(0.8), KvColor.darkBg],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 120)
        }
        .frame(height: 280)
    }

    // MARK: - Episodes Grid Section
    private func episodesGridSection(episodes: [Episode]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(userStore.language == "vi" ? "Danh sách tập (\(episodes.count))" : "Episodes (\(episodes.count))")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Spacer()
            }

            // Episode Grid (Buttons 1, 2, 3...)
            let columns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 5)
            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(episodes) { ep in
                    Button(action: {
                        onWatchClick(slug, ep.number)
                    }) {
                        Text("\(ep.number)")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 42)
                            .background(Color.white.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 8, style: .continuous)
                                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
                            )
                    }
                    .buttonStyle(ScaleButtonStyle())
                }
            }
        }
    }

    private func loadDetail() async {
        isLoading = true
        errorMessage = nil
        do {
            let res = try await ApiClient.shared.getMovieDetail(slug: slug)
            self.movieDetail = res
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
}
