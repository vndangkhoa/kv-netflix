import Foundation

// MARK: - Core Movie Models

/// Primary Movie entity representing catalog items, search results, and list items.
public struct Movie: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var originalTitle: String?
    public var slug: String
    public var thumbnail: String
    public var backdrop: String?
    public var quality: String?
    public var year: Int?
    public var category: String
    public var time: String?
    public var lang: String?
    public var rating: String?
    public var duration: Int?
    public var genre: String?
    public var description: String?
    public var director: String?
    public var country: String?
    public var cast: [String]?
    public var provider: String?
    public var episodes: [Episode]?
    public var trailerURL: String?
    public var progress: Float?
    public var currentEpisode: Int?

    public init(
        id: String = "",
        title: String = "",
        originalTitle: String? = nil,
        slug: String = "",
        thumbnail: String = "",
        backdrop: String? = nil,
        quality: String? = nil,
        year: Int? = nil,
        category: String = "",
        time: String? = nil,
        lang: String? = nil,
        rating: String? = nil,
        duration: Int? = nil,
        genre: String? = nil,
        description: String? = nil,
        director: String? = nil,
        country: String? = nil,
        cast: [String]? = nil,
        provider: String? = nil,
        episodes: [Episode]? = nil,
        trailerURL: String? = nil,
        progress: Float? = nil,
        currentEpisode: Int? = nil
    ) {
        self.id = id.isEmpty ? slug : id
        self.title = title
        self.originalTitle = originalTitle
        self.slug = slug
        self.thumbnail = thumbnail
        self.backdrop = backdrop
        self.quality = quality
        self.year = year
        self.category = category
        self.time = time
        self.lang = lang
        self.rating = rating
        self.duration = duration
        self.genre = genre
        self.description = description
        self.director = director
        self.country = country
        self.cast = cast
        self.provider = provider
        self.episodes = episodes
        self.trailerURL = trailerURL
        self.progress = progress
        self.currentEpisode = currentEpisode
    }

    enum CodingKeys: String, CodingKey {
        case id, title, originalTitle, slug, thumbnail, backdrop, quality, year
        case category, time, lang, rating, duration, genre, description, director
        case country, cast, provider, episodes, trailerURL, progress
        case currentEpisode = "currentEpisode"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let rawId = try? container.decode(String.self, forKey: .id)
        let rawSlug = (try? container.decode(String.self, forKey: .slug)) ?? ""
        self.slug = rawSlug
        self.id = (rawId != nil && !rawId!.isEmpty) ? rawId! : rawSlug
        self.title = (try? container.decode(String.self, forKey: .title)) ?? ""
        self.originalTitle = try? container.decode(String.self, forKey: .originalTitle)
        self.thumbnail = (try? container.decode(String.self, forKey: .thumbnail)) ?? ""
        self.backdrop = try? container.decode(String.self, forKey: .backdrop)
        self.quality = try? container.decode(String.self, forKey: .quality)

        // Decode year flexibly (Int or String)
        if let y = try? container.decode(Int.self, forKey: .year) {
            self.year = y
        } else if let yStr = try? container.decode(String.self, forKey: .year), let y = Int(yStr) {
            self.year = y
        } else {
            self.year = nil
        }

        self.category = (try? container.decode(String.self, forKey: .category)) ?? ""
        self.time = try? container.decode(String.self, forKey: .time)
        self.lang = try? container.decode(String.self, forKey: .lang)
        self.rating = try? container.decode(String.self, forKey: .rating)

        // Decode duration flexibly
        if let d = try? container.decode(Int.self, forKey: .duration) {
            self.duration = d
        } else if let dStr = try? container.decode(String.self, forKey: .duration), let d = Int(dStr) {
            self.duration = d
        } else {
            self.duration = nil
        }

        self.genre = try? container.decode(String.self, forKey: .genre)
        self.description = try? container.decode(String.self, forKey: .description)
        self.director = try? container.decode(String.self, forKey: .director)
        self.country = try? container.decode(String.self, forKey: .country)
        self.cast = try? container.decode([String].self, forKey: .cast)
        self.provider = try? container.decode(String.self, forKey: .provider)
        self.episodes = try? container.decode([Episode].self, forKey: .episodes)
        self.trailerURL = try? container.decode(String.self, forKey: .trailerURL)
        self.progress = try? container.decode(Float.self, forKey: .progress)
        self.currentEpisode = try? container.decode(Int.self, forKey: .currentEpisode)
    }
}

/// Detailed movie information including cast members and available servers.
public struct MovieDetail: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var originalTitle: String?
    public var slug: String
    public var thumbnail: String
    public var backdrop: String?
    public var quality: String?
    public var year: Int?
    public var category: String
    public var description: String
    public var rating: String?
    public var duration: Int?
    public var genre: String?
    public var director: String?
    public var country: String?
    public var cast: [String]?
    public var castDetails: [CastMember]?
    public var provider: String?
    public var episodes: [Episode]?
    public var trailerURL: String?

    public init(
        id: String = "",
        title: String = "",
        originalTitle: String? = nil,
        slug: String = "",
        thumbnail: String = "",
        backdrop: String? = nil,
        quality: String? = nil,
        year: Int? = nil,
        category: String = "",
        description: String = "",
        rating: String? = nil,
        duration: Int? = nil,
        genre: String? = nil,
        director: String? = nil,
        country: String? = nil,
        cast: [String]? = nil,
        castDetails: [CastMember]? = nil,
        provider: String? = nil,
        episodes: [Episode]? = nil,
        trailerURL: String? = nil
    ) {
        self.id = id.isEmpty ? slug : id
        self.title = title
        self.originalTitle = originalTitle
        self.slug = slug
        self.thumbnail = thumbnail
        self.backdrop = backdrop
        self.quality = quality
        self.year = year
        self.category = category
        self.description = description
        self.rating = rating
        self.duration = duration
        self.genre = genre
        self.director = director
        self.country = country
        self.cast = cast
        self.castDetails = castDetails
        self.provider = provider
        self.episodes = episodes
        self.trailerURL = trailerURL
    }

    public func toMovie() -> Movie {
        Movie(
            id: id,
            title: title,
            originalTitle: originalTitle,
            slug: slug,
            thumbnail: thumbnail,
            backdrop: backdrop,
            quality: quality,
            year: year,
            category: category,
            rating: rating,
            duration: duration,
            genre: genre,
            description: description,
            director: director,
            country: country,
            cast: cast,
            provider: provider,
            episodes: episodes,
            trailerURL: trailerURL
        )
    }
}

// MARK: - Cast & Actor Models

public struct CastMember: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { slug ?? name }
    public var name: String
    public var avatar: String?
    public var character: String?
    public var slug: String?

    public init(name: String, avatar: String? = nil, character: String? = nil, slug: String? = nil) {
        self.name = name
        self.avatar = avatar
        self.character = character
        self.slug = slug
    }
}

public struct Actor: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { slug }
    public var slug: String
    public var name: String
    public var avatar: String
    public var region: String
    public var role: String?
    public var filmCount: Int?

    public init(slug: String, name: String, avatar: String, region: String, role: String? = nil, filmCount: Int? = nil) {
        self.slug = slug
        self.name = name
        self.avatar = avatar
        self.region = region
        self.role = role
        self.filmCount = filmCount
    }
}

public struct ActorDetail: Codable, Hashable, Equatable, Sendable {
    public var actor: Actor
    public var otherNames: String?
    public var bio: String?
    public var gender: String?
    public var birthday: String?
    public var movies: [Movie]

    public init(actor: Actor, otherNames: String? = nil, bio: String? = nil, gender: String? = nil, birthday: String? = nil, movies: [Movie] = []) {
        self.actor = actor
        self.otherNames = otherNames
        self.bio = bio
        self.gender = gender
        self.birthday = birthday
        self.movies = movies
    }
}

// MARK: - Playback, Episodes, and Subtitles

public struct Episode: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { "\(serverName)_\(number)_\(url)" }
    public var number: Int
    public var title: String
    public var url: String
    public var serverName: String
    public var embedUrl: String?
    public var subtitles: [SubtitleTrack]?

    public init(
        number: Int = 0,
        title: String = "",
        url: String = "",
        serverName: String = "",
        embedUrl: String? = nil,
        subtitles: [SubtitleTrack]? = nil
    ) {
        self.number = number
        self.title = title
        self.url = url
        self.serverName = serverName
        self.embedUrl = embedUrl
        self.subtitles = subtitles
    }

    enum CodingKeys: String, CodingKey {
        case number, title, url
        case serverName = "serverName"
        case embedUrl = "embedUrl"
        case subtitles
    }
}

public struct SubtitleTrack: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { url }
    public var label: String
    public var lang: String
    public var url: String
    public var isDefault: Bool

    public init(label: String = "", lang: String = "", url: String = "", isDefault: Bool = false) {
        self.label = label
        self.lang = lang
        self.url = url
        self.isDefault = isDefault
    }

    enum CodingKeys: String, CodingKey {
        case label, lang, url
        case isDefault = "default"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.label = (try? container.decode(String.self, forKey: .label)) ?? ""
        self.lang = (try? container.decode(String.self, forKey: .lang)) ?? ""
        self.url = (try? container.decode(String.self, forKey: .url)) ?? ""
        self.isDefault = (try? container.decode(Bool.self, forKey: .isDefault)) ?? false
    }
}

public struct VideoSource: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { streamUrl }
    public var streamUrl: String
    public var resolution: String
    public var formatId: String
    public var isEmbed: Bool
    public var title: String?
    public var thumbnail: String?
    public var duration: Int?

    public init(
        streamUrl: String = "",
        resolution: String = "HD",
        formatId: String = "hls",
        isEmbed: Bool = false,
        title: String? = nil,
        thumbnail: String? = nil,
        duration: Int? = nil
    ) {
        self.streamUrl = streamUrl
        self.resolution = resolution
        self.formatId = formatId
        self.isEmbed = isEmbed
        self.title = title
        self.thumbnail = thumbnail
        self.duration = duration
    }

    enum CodingKeys: String, CodingKey {
        case streamUrl = "url"
        case resolution
        case formatId = "format_id"
        case isEmbed = "is_embed"
        case title, thumbnail, duration
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.streamUrl = (try? container.decode(String.self, forKey: .streamUrl)) ?? ""
        self.resolution = (try? container.decode(String.self, forKey: .resolution)) ?? "HD"
        self.formatId = (try? container.decode(String.self, forKey: .formatId)) ?? "hls"
        
        // Handle is_embed or camelCase isEmbed
        if let embed = try? container.decode(Bool.self, forKey: .isEmbed) {
            self.isEmbed = embed
        } else {
            let alt = try? decoder.container(keyedBy: DynamicCodingKey.self)
            self.isEmbed = (try? alt?.decode(Bool.self, forKey: DynamicCodingKey("isEmbed")!)) ?? false
        }

        self.title = try? container.decode(String.self, forKey: .title)
        self.thumbnail = try? container.decode(String.self, forKey: .thumbnail)
        self.duration = try? container.decode(Int.self, forKey: .duration)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(streamUrl, forKey: .streamUrl)
        try container.encode(resolution, forKey: .resolution)
        try container.encode(formatId, forKey: .formatId)
        try container.encode(isEmbed, forKey: .isEmbed)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(thumbnail, forKey: .thumbnail)
        try container.encodeIfPresent(duration, forKey: .duration)
    }
}

public struct ExtractRequest: Codable, Hashable, Equatable, Sendable {
    public var url: String
    public init(url: String) { self.url = url }
}

// MARK: - Category & Navigation

public struct Category: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { slug }
    public var name: String
    public var slug: String

    public init(name: String, slug: String) {
        self.name = name
        self.slug = slug
    }

    enum CodingKeys: String, CodingKey {
        case nameCapitalized = "Name"
        case slugCapitalized = "Slug"
        case nameLower = "name"
        case slugLower = "slug"
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let n = try? container.decode(String.self, forKey: .nameCapitalized),
           let s = try? container.decode(String.self, forKey: .slugCapitalized) {
            self.name = n
            self.slug = s
        } else if let n = try? container.decode(String.self, forKey: .nameLower),
                  let s = try? container.decode(String.self, forKey: .slugLower) {
            self.name = n
            self.slug = s
        } else {
            self.name = ""
            self.slug = ""
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .nameCapitalized)
        try container.encode(slug, forKey: .slugCapitalized)
    }
}

// MARK: - Authentication & User Profile

public struct UserProfile: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: Int
    public var name: String
    public var email: String

    public init(id: Int, name: String, email: String) {
        self.id = id
        self.name = name
        self.email = email
    }
}

public struct AuthResponse: Codable, Hashable, Equatable, Sendable {
    public var token: String
    public var user: UserProfile

    public init(token: String, user: UserProfile) {
        self.token = token
        self.user = user
    }
}

// MARK: - Device Pairing & Management

public struct Device: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: Int
    public var name: String
    public var isPaired: Bool
    public var createdAt: String?
    public var code: String?
    public var expiresAt: String?

    public init(
        id: Int = 0,
        name: String = "",
        isPaired: Bool = false,
        createdAt: String? = nil,
        code: String? = nil,
        expiresAt: String? = nil
    ) {
        self.id = id
        self.name = name
        self.isPaired = isPaired
        self.createdAt = createdAt
        self.code = code
        self.expiresAt = expiresAt
    }

    enum CodingKeys: String, CodingKey {
        case id, name
        case isPaired = "is_paired"
        case createdAt = "created_at"
        case code
        case expiresAt = "expires_at"
    }
}

public struct DeviceCodeResponse: Codable, Hashable, Equatable, Sendable {
    public var code: String
    public var expiresAt: String?

    enum CodingKeys: String, CodingKey {
        case code
        case expiresAt = "expires_at"
    }

    public init(code: String, expiresAt: String? = nil) {
        self.code = code
        self.expiresAt = expiresAt
    }
}

public struct DeviceStatusResponse: Codable, Hashable, Equatable, Sendable {
    public var status: String
    public var token: String?
    public var user: UserProfile?

    public init(status: String, token: String? = nil, user: UserProfile? = nil) {
        self.status = status
        self.token = token
        self.user = user
    }
}

public struct PairDeviceResponse: Codable, Hashable, Equatable, Sendable {
    public var token: String
    public var device: Device?
    public var user: UserProfile?

    public init(token: String, device: Device? = nil, user: UserProfile? = nil) {
        self.token = token
        self.device = device
        self.user = user
    }
}

public struct RecoveryKeyResponse: Codable, Hashable, Equatable, Sendable {
    public var key: String
    public var createdAt: String?

    enum CodingKeys: String, CodingKey {
        case key
        case createdAt = "created_at"
    }

    public init(key: String, createdAt: String? = nil) {
        self.key = key
        self.createdAt = createdAt
    }
}

public struct StatusResponse: Codable, Hashable, Equatable, Sendable {
    public var status: String?
    public var error: String?

    public init(status: String? = nil, error: String? = nil) {
        self.status = status
        self.error = error
    }
}

// MARK: - Remote Synchronization Models

public struct RemoteSavedMovie: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { movieId }
    public var movieId: String
    public var title: String
    public var slug: String
    public var thumbnail: String
    public var backdrop: String?
    public var year: Int?
    public var category: String?
    public var quality: String?
    public var director: String?
    public var cast: String?
    public var savedAt: String?

    public init(
        movieId: String,
        title: String,
        slug: String,
        thumbnail: String,
        backdrop: String? = nil,
        year: Int? = nil,
        category: String? = nil,
        quality: String? = nil,
        director: String? = nil,
        cast: String? = nil,
        savedAt: String? = nil
    ) {
        self.movieId = movieId
        self.title = title
        self.slug = slug
        self.thumbnail = thumbnail
        self.backdrop = backdrop
        self.year = year
        self.category = category
        self.quality = quality
        self.director = director
        self.cast = cast
        self.savedAt = savedAt
    }

    enum CodingKeys: String, CodingKey {
        case movieId = "movie_id"
        case title, slug, thumbnail, backdrop, year, category, quality, director, cast
        case savedAt = "saved_at"
    }

    public func toMovie() -> Movie {
        Movie(
            id: movieId,
            title: title,
            slug: slug,
            thumbnail: thumbnail,
            backdrop: backdrop,
            quality: quality,
            year: year,
            category: category ?? "",
            director: director
        )
    }
}

public struct RemoteWatchHistory: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { movieId }
    public var movieId: String
    public var title: String
    public var slug: String
    public var thumbnail: String
    public var backdrop: String?
    public var year: Int?
    public var category: String?
    public var genre: String?
    public var country: String?
    public var quality: String?
    public var currentEpisode: Int
    public var watchedTimestamp: Int
    public var duration: Int
    public var progress: Double
    public var watchedAt: String?

    public init(
        movieId: String,
        title: String,
        slug: String,
        thumbnail: String,
        backdrop: String? = nil,
        year: Int? = nil,
        category: String? = nil,
        genre: String? = nil,
        country: String? = nil,
        quality: String? = nil,
        currentEpisode: Int = 1,
        watchedTimestamp: Int = 0,
        duration: Int = 0,
        progress: Double = 0.0,
        watchedAt: String? = nil
    ) {
        self.movieId = movieId
        self.title = title
        self.slug = slug
        self.thumbnail = thumbnail
        self.backdrop = backdrop
        self.year = year
        self.category = category
        self.genre = genre
        self.country = country
        self.quality = quality
        self.currentEpisode = currentEpisode
        self.watchedTimestamp = watchedTimestamp
        self.duration = duration
        self.progress = progress
        self.watchedAt = watchedAt
    }

    enum CodingKeys: String, CodingKey {
        case movieId = "movie_id"
        case title, slug, thumbnail, backdrop, year, category, genre, country, quality
        case currentEpisode = "current_episode"
        case watchedTimestamp = "watched_timestamp"
        case duration, progress
        case watchedAt = "watched_at"
    }

    public func toMovie() -> Movie {
        Movie(
            id: movieId,
            title: title,
            slug: slug,
            thumbnail: thumbnail,
            backdrop: backdrop,
            quality: quality,
            year: year,
            category: category ?? "",
            genre: genre,
            country: country,
            progress: Float(progress),
            currentEpisode: currentEpisode
        )
    }
}

public struct WatchProgress: Identifiable, Codable, Hashable, Equatable, Sendable {
    public var id: String { "\(slug)_\(episode)" }
    public var slug: String
    public var episode: Int
    public var position: Double
    public var duration: Double
    public var updatedAt: Date

    public init(
        slug: String,
        episode: Int,
        position: Double,
        duration: Double,
        updatedAt: Date = Date()
    ) {
        self.slug = slug
        self.episode = episode
        self.position = position
        self.duration = duration
        self.updatedAt = updatedAt
    }

    /// Progress ratio between 0.0 and 1.0
    public var percentage: Double {
        guard duration > 0 else { return 0.0 }
        return min(1.0, max(0.0, position / duration))
    }

    /// Video is considered completed if 90% or more has been watched, or within 30s of end
    public var isCompleted: Bool {
        if duration <= 0 { return false }
        if percentage >= 0.90 { return true }
        if duration > 60 && (duration - position) <= 30 { return true }
        return false
    }
}

public struct BulkSyncRequest: Codable, Hashable, Equatable, Sendable {
    public var savedMovies: [RemoteSavedMovie]
    public var watchHistory: [RemoteWatchHistory]

    enum CodingKeys: String, CodingKey {
        case savedMovies = "saved_movies"
        case watchHistory = "watch_history"
    }

    public init(savedMovies: [RemoteSavedMovie] = [], watchHistory: [RemoteWatchHistory] = []) {
        self.savedMovies = savedMovies
        self.watchHistory = watchHistory
    }
}

public struct BulkSyncResponse: Codable, Hashable, Equatable, Sendable {
    public var savedMovies: [RemoteSavedMovie]
    public var watchHistory: [RemoteWatchHistory]

    enum CodingKeys: String, CodingKey {
        case savedMovies = "saved_movies"
        case watchHistory = "watch_history"
    }

    public init(savedMovies: [RemoteSavedMovie] = [], watchHistory: [RemoteWatchHistory] = []) {
        self.savedMovies = savedMovies
        self.watchHistory = watchHistory
    }
}

public struct HomeResponse: Codable, Hashable, Equatable, Sendable {
    public var items: [Movie]
    public var totalPages: Int
    public var currentPage: Int

    public init(items: [Movie] = [], totalPages: Int = 1, currentPage: Int = 1) {
        self.items = items
        self.totalPages = totalPages
        self.currentPage = currentPage
    }
}

public enum SortOption: String, CaseIterable, Identifiable, Sendable {
    case latest = "latest"
    case mostView = "most_view"
    case hot = "hot"
    case year = "year"
    case rating = "rating"
    case title = "title"

    public static var newest: SortOption { .latest }

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .latest: return "Mới nhất"
        case .mostView: return "Xem nhiều"
        case .hot: return "Hot tuần"
        case .year: return "Năm phát hành"
        case .rating: return "Đánh giá cao"
        case .title: return "Tên phim (A-Z)"
        }
    }

    public var labelVi: String { title }

    public var labelEn: String {
        switch self {
        case .latest: return "Latest"
        case .mostView: return "Most Viewed"
        case .hot: return "Hot This Week"
        case .year: return "Release Year"
        case .rating: return "Top Rated"
        case .title: return "Title (A-Z)"
        }
    }

    public var localizedVi: String { title }
}

// MARK: - Dynamic Coding Key Helper

internal struct DynamicCodingKey: CodingKey {
    var stringValue: String
    init?(stringValue: String) { self.stringValue = stringValue }
    var intValue: Int? { nil }
    init?(intValue: Int) { nil }
    init(_ string: String) { self.stringValue = string }
}
