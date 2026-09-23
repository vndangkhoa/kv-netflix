import SwiftUI

public struct MovieRowView: View {
    public let title: String
    public let movies: [Movie]
    public let isHorizontal: Bool
    public let onMovieClick: (Movie) -> Void
    public let onSeeAllClick: (() -> Void)?

    public init(
        title: String,
        movies: [Movie],
        isHorizontal: Bool = false,
        onMovieClick: @escaping (Movie) -> Void,
        onSeeAllClick: (() -> Void)? = nil
    ) {
        self.title = title
        self.movies = movies
        self.isHorizontal = isHorizontal
        self.onMovieClick = onMovieClick
        self.onSeeAllClick = onSeeAllClick
    }

    public var body: some View {
        if !movies.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                // Header with yellow accent indicator
                HStack(alignment: .center, spacing: 8) {
                    RoundedRectangle(cornerRadius: 2, style: .continuous)
                        .fill(KvColor.yellow)
                        .frame(width: 3.5, height: 18)

                    Text(title)
                        .font(.system(size: 18, weight: .bold, design: .default))
                        .foregroundColor(KvColor.textWhite)

                    Spacer()

                    if let onSeeAll = onSeeAllClick {
                        Button(action: onSeeAll) {
                            HStack(spacing: 3) {
                                Text("Xem tất cả")
                                    .font(.system(size: 13, weight: .medium))
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(KvColor.yellow)
                        }
                    }
                }
                .padding(.horizontal, 16)

                // Horizontal Carousel
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(movies.indices, id: \.self) { idx in
                            let movie = movies[idx]
                            let rank = title.contains("Top 10") ? (idx + 1) : nil

                            if isHorizontal {
                                HorizontalMovieCardView(
                                    movie: movie,
                                    width: 210,
                                    progress: movie.progress,
                                    onClick: { onMovieClick(movie) }
                                )
                            } else {
                                MovieCardView(
                                    movie: movie,
                                    width: 135,
                                    rank: rank,
                                    progress: movie.progress,
                                    onClick: { onMovieClick(movie) }
                                )
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 4)
                }
            }
        }
    }
}
