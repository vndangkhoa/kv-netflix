import SwiftUI

public struct HeroCarouselView: View {
    public let movies: [Movie]
    public let onPlay: (Movie) -> Void
    public let onMyList: (Movie) -> Void
    public let onSelect: ((Movie) -> Void)?

    @State private var currentIndex: Int = 0
    @State private var timer = Timer.publish(every: 7, on: .main, in: .common).autoconnect()
    @ObservedObject private var userStore = UserDataStore.shared

    public init(
        movies: [Movie],
        onPlay: @escaping (Movie) -> Void,
        onMyList: @escaping (Movie) -> Void,
        onSelect: ((Movie) -> Void)? = nil
    ) {
        self.movies = movies
        self.onPlay = onPlay
        self.onMyList = onMyList
        self.onSelect = onSelect
    }

    public var body: some View {
        if movies.isEmpty {
            EmptyView()
        } else {
            ZStack(alignment: .bottom) {
                // TabView carousel with swipe & auto-scroll
                TabView(selection: $currentIndex) {
                    ForEach(movies.indices, id: \.self) { index in
                        let movie = movies[index]
                        heroBanner(for: movie)
                            .tag(index)
                    }
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .frame(height: 480)
                .onReceive(timer) { _ in
                    guard movies.count > 1 else { return }
                    withAnimation(.easeInOut(duration: 0.6)) {
                        currentIndex = (currentIndex + 1) % movies.count
                    }
                }

                // Dot Indicators overlay
                if movies.count > 1 {
                    HStack(spacing: 6) {
                        ForEach(movies.indices, id: \.self) { idx in
                            Capsule()
                                .fill(idx == currentIndex ? KvColor.yellow : Color.white.opacity(0.35))
                                .frame(width: idx == currentIndex ? 20 : 6, height: 6)
                                .animation(.spring(response: 0.35, dampingFraction: 0.7), value: currentIndex)
                        }
                    }
                    .padding(.trailing, 20)
                    .padding(.bottom, 16)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .frame(height: 480)
            .background(Color.black)
        }
    }

    @ViewBuilder
    private func heroBanner(for movie: Movie) -> some View {
        ZStack(alignment: .bottomLeading) {
            // Background Image with proxy
            GeometryReader { geo in
                let targetUrl = ApiClient.shared.imageProxyUrl(
                    for: movie.backdrop ?? movie.thumbnail,
                    width: 1280
                )

                AsyncImage(url: targetUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: geo.size.width, height: geo.size.height)
                            .clipped()
                    case .failure:
                        fallbackImage(geo: geo, title: movie.title)
                    case .empty:
                        Rectangle()
                            .fill(KvColor.darkTertiary)
                            .overlay(ProgressView().tint(KvColor.yellow))
                    @unknown default:
                        Rectangle().fill(KvColor.darkTertiary)
                    }
                }
            }

            // Top Vignette (for navbar readability)
            LinearGradient(
                colors: [Color.black.opacity(0.85), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 120)
            .frame(maxHeight: .infinity, alignment: .top)

            // Left Vignette (for text readability on wide screens)
            LinearGradient(
                colors: [Color.black.opacity(0.8), Color.clear],
                startPoint: .leading,
                endPoint: .trailing
            )
            .frame(width: 280)
            .frame(maxWidth: .infinity, alignment: .leading)

            // Bottom Fade Gradient (blends smoothly into home background)
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.0),
                    .init(color: Color.black.opacity(0.4), location: 0.5),
                    .init(color: KvColor.darkBg, location: 1.0)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 240)

            // Movie Info & Controls Content
            VStack(alignment: .leading, spacing: 8) {
                // Title
                Text(movie.title)
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .shadow(color: .black.opacity(0.8), radius: 6, x: 0, y: 2)

                // Match, Year, Quality
                HStack(spacing: 10) {
                    Text("98% Match")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(KvColor.greenMatch)

                    if let year = movie.year {
                        Text("\(year)")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.75))
                    }

                    if let quality = movie.quality, !quality.isEmpty {
                        Text(quality.uppercased())
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                    }

                    if let lang = movie.lang, !lang.isEmpty {
                        Text(lang)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(.white.opacity(0.6))
                    }
                }

                // Original Title if different
                if let orig = movie.originalTitle, !orig.isEmpty, orig != movie.title {
                    Text(orig)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))
                        .lineLimit(1)
                }

                Spacer().frame(height: 8)

                // Buttons: Watch Now & My List
                HStack(spacing: 12) {
                    // Watch Now
                    Button(action: { onPlay(movie) }) {
                        HStack(spacing: 6) {
                            Image(systemName: "play.fill")
                                .font(.system(size: 14, weight: .bold))
                            Text("Xem ngay")
                                .font(.system(size: 15, weight: .bold))
                        }
                        .foregroundColor(Color(red: 0.08, green: 0.08, blue: 0.1))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 11)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                    .shadow(color: .black.opacity(0.3), radius: 4, x: 0, y: 2)

                    // My List (Bookmark Toggle)
                    let isSaved = userStore.isMovieSaved(slug: movie.slug)
                    Button(action: {
                        userStore.toggleSaveMovie(movie)
                        onMyList(movie)
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: isSaved ? "checkmark" : "plus")
                                .font(.system(size: 14, weight: .semibold))
                            Text(isSaved ? "Đã lưu" : "Danh sách")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 11)
                        .background(Color.white.opacity(0.18))
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(Color.white.opacity(0.2), lineWidth: 1)
                        )
                    }

                    // Info button
                    if let onSelect = onSelect {
                        Button(action: { onSelect(movie) }) {
                            Image(systemName: "info.circle")
                                .font(.system(size: 20, weight: .medium))
                                .foregroundColor(.white)
                                .padding(10)
                                .background(Color.white.opacity(0.18))
                                .clipShape(Circle())
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 46)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onSelect?(movie)
        }
    }

    private func fallbackImage(geo: GeometryProxy, title: String) -> some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.15, green: 0.16, blue: 0.2), Color(red: 0.08, green: 0.09, blue: 0.12)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(spacing: 8) {
                Image(systemName: "film")
                    .font(.system(size: 40))
                    .foregroundColor(KvColor.yellow.opacity(0.7))
                Text(title)
                    .font(.kvSubheadline)
                    .foregroundColor(.white.opacity(0.8))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 30)
            }
        }
        .frame(width: geo.size.width, height: geo.size.height)
    }
}
