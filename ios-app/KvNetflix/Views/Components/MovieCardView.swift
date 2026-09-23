import SwiftUI

public struct MovieCardView: View {
    public let movie: Movie
    public let width: CGFloat
    public let rank: Int?
    public let progress: Double?
    public let onClick: () -> Void

    public init(
        movie: Movie,
        width: CGFloat = 135,
        rank: Int? = nil,
        progress: Double? = nil,
        onClick: @escaping () -> Void
    ) {
        self.movie = movie
        self.width = width
        self.rank = rank
        self.progress = progress
        self.onClick = onClick
    }

    public var body: some View {
        Button(action: onClick) {
            ZStack(alignment: .bottomLeading) {
                // Poster Image
                let targetUrl = ApiClient.shared.imageProxyUrl(
                    for: !movie.thumbnail.isEmpty ? movie.thumbnail : movie.backdrop,
                    width: 360
                )

                AsyncImage(url: targetUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: width, height: width * 1.5)
                            .clipped()
                    case .failure:
                        fallbackPlaceholder
                    case .empty:
                        Rectangle()
                            .fill(KvColor.darkTertiary)
                            .frame(width: width, height: width * 1.5)
                            .overlay(
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .tint(KvColor.yellow.opacity(0.8))
                            )
                    @unknown default:
                        fallbackPlaceholder
                    }
                }

                // Bottom gradient for title readability
                LinearGradient(
                    colors: [Color.clear, Color.black.opacity(0.85)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 70)

                // Top-Right Quality Badge
                if let quality = movie.quality, !quality.isEmpty {
                    VStack {
                        HStack {
                            Spacer()
                            Text(quality.uppercased())
                                .font(.system(size: 9, weight: .bold))
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(KvColor.yellow)
                                .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
                                .shadow(color: .black.opacity(0.3), radius: 2)
                        }
                        Spacer()
                    }
                    .padding(6)
                }

                // Top-10 Ranking Banner
                if let rank = rank {
                    Text("\(rank)")
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .italic()
                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                        .frame(width: 32, height: 32)
                        .background(
                            LinearGradient(
                                colors: [KvColor.yellow, KvColor.yellowHover],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .clipShape(
                            UnevenRoundedRectangle(
                                topLeadingRadius: 0,
                                bottomLeadingRadius: 0,
                                bottomTrailingRadius: 8,
                                topTrailingRadius: 8
                            )
                        )
                        .padding(.bottom, 28)
                        .shadow(color: .black.opacity(0.4), radius: 3)
                }

                // Bottom Title
                VStack(alignment: .leading, spacing: 2) {
                    Text(movie.title)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let ep = movie.currentEpisode {
                        Text("Tập \(ep)")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(KvColor.yellow)
                    }
                }
                .padding(.horizontal, 8)
                .padding(.bottom, (progress != nil && progress! > 0) ? 8 : 6)

                // Bottom Playback Progress Bar
                if let progress = progress ?? movie.progress, progress > 0 {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Rectangle()
                                .fill(Color.white.opacity(0.25))
                                .frame(height: 3)

                            Rectangle()
                                .fill(KvColor.yellow)
                                .frame(width: geo.size.width * CGFloat(min(max(progress, 0.0), 1.0)), height: 3)
                        }
                    }
                    .frame(height: 3)
                }
            }
            .frame(width: width, height: width * 1.5)
            .background(KvColor.darkTertiary)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.35), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(ScaleButtonStyle())
    }

    private var fallbackPlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.15, green: 0.16, blue: 0.2), Color(red: 0.09, green: 0.1, blue: 0.13)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(spacing: 6) {
                Image(systemName: "film")
                    .font(.system(size: 26))
                    .foregroundColor(KvColor.yellow.opacity(0.8))
                Text(movie.title)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(.white.opacity(0.85))
                    .lineLimit(3)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 8)
            }
        }
        .frame(width: width, height: width * 1.5)
    }
}

// MARK: - Horizontal Movie Card (For Continue Watching / Backdrop style)
public struct HorizontalMovieCardView: View {
    public let movie: Movie
    public let width: CGFloat
    public let progress: Double?
    public let onClick: () -> Void

    public init(
        movie: Movie,
        width: CGFloat = 200,
        progress: Double? = nil,
        onClick: @escaping () -> Void
    ) {
        self.movie = movie
        self.width = width
        self.progress = progress
        self.onClick = onClick
    }

    public var body: some View {
        Button(action: onClick) {
            VStack(alignment: .leading, spacing: 6) {
                ZStack(alignment: .bottomLeading) {
                    let targetUrl = ApiClient.shared.imageProxyUrl(
                        for: movie.backdrop ?? movie.thumbnail,
                        width: 480
                    )

                    AsyncImage(url: targetUrl) { phase in
                        switch phase {
                        case .success(let img):
                            img
                                .resizable()
                                .scaledToFill()
                                .frame(width: width, height: width * 0.58)
                                .clipped()
                        case .failure, .empty:
                            Rectangle()
                                .fill(KvColor.darkTertiary)
                                .frame(width: width, height: width * 0.58)
                                .overlay(
                                    Image(systemName: "play.circle.fill")
                                        .font(.system(size: 32))
                                        .foregroundColor(KvColor.yellow.opacity(0.8))
                                )
                        @unknown default:
                            Rectangle().fill(KvColor.darkTertiary)
                        }
                    }

                    // Play icon overlay
                    Circle()
                        .fill(Color.black.opacity(0.6))
                        .frame(width: 36, height: 36)
                        .overlay(
                            Image(systemName: "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white)
                                .offset(x: 1)
                        )
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

                    // Resume progress bar
                    if let progress = progress ?? movie.progress, progress > 0 {
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
                .frame(width: width, height: width * 0.58)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )

                // Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(movie.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        if let ep = movie.currentEpisode {
                            Text("Tập \(ep)")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(KvColor.yellow)
                        }
                        if let dur = movie.time {
                            Text(dur)
                                .font(.system(size: 11, weight: .regular))
                                .foregroundColor(KvColor.textMuted)
                        }
                    }
                }
                .frame(width: width, alignment: .leading)
            }
        }
        .buttonStyle(ScaleButtonStyle())
    }
}

// MARK: - Scale Button Style
public struct ScaleButtonStyle: ButtonStyle {
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.96 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}
