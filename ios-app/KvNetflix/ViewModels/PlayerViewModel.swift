import Foundation
import AVFoundation
import Combine
import MediaPlayer

public enum PlaybackState: Equatable {
    case idle
    case loading
    case playing
    case paused
    case buffering
    case error(String)
    case ended
}

@MainActor
public final class PlayerViewModel: ObservableObject {
    // MARK: - Published Properties

    @Published public private(set) var movie: MovieDetail?
    @Published public private(set) var currentEpisode: Int = 1
    @Published public private(set) var selectedServer: String = ""
    @Published public private(set) var servers: [String] = []
    @Published public private(set) var source: VideoSource?
    @Published public private(set) var subtitles: [SubtitleTrack] = []
    @Published public private(set) var selectedSubtitle: SubtitleTrack?
    @Published public private(set) var playbackState: PlaybackState = .idle
    @Published public private(set) var isEmbed: Bool = false
    @Published public private(set) var isInMyList: Bool = false

    // Timing & Playback
    @Published public var currentTime: Double = 0
    @Published public var duration: Double = 0
    @Published public var playbackSpeed: Float = 1.0
    @Published public var availableSpeeds: [Float] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
    @Published public var availableQualities: [String] = ["Auto", "1080p", "720p", "480p", "360p"]
    @Published public var selectedQuality: String = "Auto"

    // Auto next episode countdown
    @Published public var showAutoNextOverlay: Bool = false
    @Published public var autoNextCountdown: Int = 5
    @Published public private(set) var nextEpisode: Episode?

    // Recommendations & Related
    @Published public private(set) var recommendations: [Movie] = []

    // Player instance
    public let player = AVPlayer()

    // MARK: - Private State & Dependencies

    private let movieRepo = MovieRepository.shared
    private let userRepo = UserDataRepository.shared
    private var cancellables = Set<AnyCancellable>()

    private var timeObserverToken: Any?
    private var playerItemCancellables = Set<AnyCancellable>()
    private var stallCheckTimer: Timer?
    private var historyReportTimer: Timer?
    private var autoNextTimer: Timer?

    private var pendingSeekTime: Double = 0
    private var failedServers = Set<String>()
    private var lastAutoSwitchTime: Date = .distantPast
    private var isUserSeeking: Bool = false
    private var userWantsPause: Bool = false

    // MARK: - Initialization & Deinitialization

    public init() {
        setupAudioSession()
        setupPlayerObservers()
        setupRemoteCommandCenter()
    }

    deinit {
        cleanup()
    }

    public func cleanup() {
        if let token = timeObserverToken {
            player.removeTimeObserver(token)
            timeObserverToken = nil
        }
        player.pause()
        player.replaceCurrentItem(with: nil)
        stallCheckTimer?.invalidate()
        stallCheckTimer = nil
        historyReportTimer?.invalidate()
        historyReportTimer = nil
        autoNextTimer?.invalidate()
        autoNextTimer = nil
        playerItemCancellables.removeAll()
        cancellables.removeAll()
        clearNowPlaying()
    }

    // MARK: - Audio Session Configuration

    private func setupAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .moviePlayback, options: [.allowAirPlay])
            try session.setActive(true)
        } catch {
            print("[PlayerViewModel] Failed to configure AVAudioSession: \(error.localizedDescription)")
        }

        player.allowsExternalPlayback = true
        player.usesExternalPlaybackWhileExternalScreenIsActive = true
    }

    // MARK: - Player Observers

    private func setupPlayerObservers() {
        // Observe periodic time updates (every 250ms)
        let interval = CMTime(seconds: 0.25, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self, !self.isUserSeeking else { return }
            self.currentTime = time.seconds.isFinite ? max(0, time.seconds) : 0
            self.checkNearEndAutoNext()
            self.updateNowPlayingPlaybackValues()
        }

        // Observe player timeControlStatus
        player.publisher(for: \.timeControlStatus)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                guard let self = self else { return }
                switch status {
                case .playing:
                    if self.playbackState != .playing {
                        self.playbackState = .playing
                        self.userWantsPause = false
                        self.stopStallTimer()
                    }
                case .paused:
                    if self.playbackState == .playing {
                        self.playbackState = .paused
                    }
                case .waitingToPlayAtSpecifiedRate:
                    if self.playbackState != .loading && self.playbackState != .ended {
                        self.playbackState = .buffering
                        self.startStallTimer()
                    }
                @unknown default:
                    break
                }
            }
            .store(in: &cancellables)

        // Periodic Watch History Reporting every 10 seconds
        historyReportTimer = Timer.scheduledTimer(withTimeInterval: 10.0, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.reportWatchProgress()
            }
        }
    }

    private func setupItemObservers(for item: AVPlayerItem) {
        playerItemCancellables.removeAll()

        // Status observer
        item.publisher(for: \.status)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                guard let self = self else { return }
                switch status {
                case .readyToPlay:
                    self.duration = item.duration.seconds.isFinite ? max(0, item.duration.seconds) : 0
                    self.stopStallTimer()

                    if self.pendingSeekTime > 0 {
                        let target = max(0, self.pendingSeekTime - 1.5)
                        self.pendingSeekTime = 0
                        self.seek(to: target) {
                            if !self.userWantsPause {
                                self.player.play()
                                self.player.rate = self.playbackSpeed
                            }
                        }
                    } else {
                        // Check if saved progress exists
                        if let slug = self.movie?.slug,
                           let progress = self.userRepo.getProgress(slug: slug),
                           progress.episode == self.currentEpisode,
                           progress.position > 10 {
                            let target = max(0, progress.position - 5)
                            self.seek(to: target) {
                                if !self.userWantsPause {
                                    self.player.play()
                                    self.player.rate = self.playbackSpeed
                                }
                            }
                        } else {
                            if !self.userWantsPause {
                                self.player.play()
                                self.player.rate = self.playbackSpeed
                            }
                        }
                    }
                    self.playbackState = .playing
                    self.updateNowPlayingInfo()

                case .failed:
                    let err = item.error?.localizedDescription ?? "Playback failed"
                    print("[PlayerViewModel] Player item failed: \(err)")
                    self.handlePlaybackFailure(reason: "AVPlayerItem failed: \(err)")

                case .unknown:
                    break
                @unknown default:
                    break
                }
            }
            .store(in: &playerItemCancellables)

        // Buffer empty & likely to keep up observers
        item.publisher(for: \.isPlaybackBufferEmpty)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isEmpty in
                guard let self = self else { return }
                if isEmpty && self.playbackState == .playing {
                    self.playbackState = .buffering
                    self.startStallTimer()
                }
            }
            .store(in: &playerItemCancellables)

        item.publisher(for: \.isPlaybackLikelyToKeepUp)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] likely in
                guard let self = self else { return }
                if likely {
                    self.stopStallTimer()
                    if self.playbackState == .buffering && !self.userWantsPause {
                        self.playbackState = .playing
                        self.player.play()
                        self.player.rate = self.playbackSpeed
                    }
                }
            }
            .store(in: &playerItemCancellables)

        // End of stream notification
        NotificationCenter.default.publisher(for: .AVPlayerItemDidPlayToEndTime, object: item)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self = self else { return }
                self.playbackState = .ended
                self.reportWatchProgress()
                self.triggerAutoNextEpisode()
            }
            .store(in: &playerItemCancellables)

        // Playback stalled notification
        NotificationCenter.default.publisher(for: .AVPlayerItemPlaybackStalled, object: item)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                guard let self = self else { return }
                print("[PlayerViewModel] AVPlayerItemPlaybackStalled received")
                self.playbackState = .buffering
                self.startStallTimer()
            }
            .store(in: &playerItemCancellables)

        // Failed to play to end time notification
        NotificationCenter.default.publisher(for: .AVPlayerItemFailedToPlayToEndTime, object: item)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notif in
                guard let self = self else { return }
                let error = notif.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
                let msg = error?.localizedDescription ?? "Stream interrupted"
                self.handlePlaybackFailure(reason: "Failed to play: \(msg)")
            }
            .store(in: &playerItemCancellables)
    }

    // MARK: - Multi-Server Auto-Failover Logic

    private func startStallTimer() {
        stopStallTimer()
        stallCheckTimer = Timer.scheduledTimer(withTimeInterval: 6.0, repeats: false) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                if self.playbackState == .buffering && !self.userWantsPause {
                    print("[PlayerViewModel] Buffering stall timeout reached (6s), triggering auto-failover")
                    self.triggerAutoFailover(reason: "Buffering stall timeout")
                }
            }
        }
    }

    private func stopStallTimer() {
        stallCheckTimer?.invalidate()
        stallCheckTimer = nil
    }

    private func handlePlaybackFailure(reason: String) {
        stopStallTimer()
        if !triggerAutoFailover(reason: reason) {
            playbackState = .error(reason)
        }
    }

    @discardableResult
    public func triggerAutoFailover(reason: String) -> Bool {
        let now = Date()
        guard now.timeIntervalSince(lastAutoSwitchTime) > 2.0 else {
            return false
        }

        guard let movie = movie else { return false }

        // Record failed server
        if !selectedServer.isEmpty {
            failedServers.insert(selectedServer)
        }

        // Save current timestamp to resume seamlessly
        if currentTime > 0 {
            pendingSeekTime = currentTime
        }

        // Determine candidate servers for current episode
        let candidates = movie.episodes?
            .filter { $0.number == currentEpisode && !$0.url.isEmpty }
            .map { $0.serverName }
            .filter { !$0.isEmpty } ?? []

        var alternatives = candidates.filter { $0 != selectedServer && !failedServers.contains($0) }
        if alternatives.isEmpty {
            alternatives = candidates.filter { $0 != selectedServer }
        }

        guard let nextServer = alternatives.first else {
            print("[PlayerViewModel] Auto-failover: No alternative server found for episode \(currentEpisode)")
            // If all servers failed, try fallback to embed if available
            if let ep = movie.episodes?.first(where: { $0.number == currentEpisode }),
               !isEmbed && !ep.url.isEmpty {
                print("[PlayerViewModel] Falling back to Web embed player")
                loadEmbedFallback(url: ep.url)
                return true
            }
            return false
        }

        print("[PlayerViewModel] Auto-failover triggered (\(reason)): switching from '\(selectedServer)' to '\(nextServer)' at \(currentTime)s")
        lastAutoSwitchTime = now
        selectedServer = nextServer
        loadStream(movie: movie, episode: currentEpisode, serverName: nextServer)
        return true
    }

    // MARK: - Stream Loading & Resolution

    public func loadMovie(slug: String, episode: Int = 1) {
        if movie?.slug == slug && currentEpisode == episode && source != nil {
            return
        }

        playbackState = .loading
        currentEpisode = episode
        failedServers.removeAll()
        pendingSeekTime = 0
        dismissAutoNext()

        Task {
            do {
                let detail = try await movieRepo.getMovieDetail(slug: slug)
                self.movie = detail
                self.isInMyList = userRepo.isInMyList(slug: slug)

                let serverList = Array(Set(detail.episodes?.map { $0.serverName }.filter { !$0.isEmpty } ?? [])).sorted()
                self.servers = serverList
                let initialServer = serverList.first ?? ""
                self.selectedServer = initialServer

                self.loadStream(movie: detail, episode: episode, serverName: initialServer)

                // Precompute next episode
                self.computeNextEpisode()

                // Load background recommendations
                self.loadRecommendations()
            } catch {
                self.playbackState = .error(error.localizedDescription)
            }
        }
    }

    public func changeEpisode(to episode: Int) {
        guard let movie = movie else { return }
        dismissAutoNext()
        reportWatchProgress()
        currentEpisode = episode
        pendingSeekTime = 0
        playbackState = .loading
        source = nil
        subtitles = []
        computeNextEpisode()
        loadStream(movie: movie, episode: episode, serverName: selectedServer)
    }

    public func changeServer(to server: String) {
        guard let movie = movie else { return }
        dismissAutoNext()
        selectedServer = server
        playbackState = .loading
        if currentTime > 0 {
            pendingSeekTime = currentTime
        }
        source = nil
        subtitles = []
        loadStream(movie: movie, episode: currentEpisode, serverName: server)
    }

    public func retryStream() {
        guard let movie = movie else { return }
        playbackState = .loading
        loadStream(movie: movie, episode: currentEpisode, serverName: selectedServer)
    }

    private func loadStream(movie: MovieDetail, episode: Int, serverName: String) {
        guard let episodes = movie.episodes, !episodes.isEmpty else {
            playbackState = .error("No episodes available")
            return
        }

        let ep = episodes.first { $0.number == episode && (serverName.isEmpty || $0.serverName == serverName) }
            ?? episodes.first { $0.number == episode }
            ?? episodes.first

        guard let targetEp = ep, !targetEp.url.isEmpty else {
            playbackState = .error("No stream available for episode \(episode)")
            return
        }

        var subs = targetEp.subtitles ?? []

        Task {
            // Fetch sidecar subtitles if empty and embedUrl exists
            if subs.isEmpty, let embedUrl = targetEp.embedUrl, !embedUrl.isEmpty {
                do {
                    subs = try await movieRepo.getStreamSubtitles(embedUrl: embedUrl)
                } catch {
                    print("[PlayerViewModel] Failed to fetch sidecar subtitles: \(error)")
                }
            }

            self.subtitles = subs
            self.selectedSubtitle = subs.first { $0.isDefault || $0.lang.lowercased().hasPrefix("vi") }

            let realUrl = self.extractRealStreamUrl(rawUrl: targetEp.url)
            let isDirectHls = realUrl.lowercased().contains(".m3u8") && !realUrl.lowercased().contains("embed.php")

            if isDirectHls {
                let proxied = ApiClient.shared.proxyUrl(for: realUrl)
                let videoSource = VideoSource(streamUrl: proxied, resolution: "HD", formatId: "hls", isEmbed: false)
                self.source = videoSource
                self.isEmbed = false
                self.preparePlayer(url: proxied)
            } else {
                // Try backend extraction
                do {
                    let extracted = try await self.movieRepo.extractVideo(url: realUrl)
                    let extractedUrl = self.extractRealStreamUrl(rawUrl: extracted.streamUrl)
                    let extractedHls = extractedUrl.lowercased().contains(".m3u8") &&
                                       !extractedUrl.lowercased().contains("embed.php") &&
                                       extracted.formatId != "embed"

                    if extractedHls && !extractedUrl.isEmpty {
                        let proxied = ApiClient.shared.proxyUrl(for: extractedUrl)
                        let videoSource = VideoSource(
                            streamUrl: proxied,
                            resolution: extracted.resolution.isEmpty ? "HD" : extracted.resolution,
                            formatId: extracted.formatId,
                            isEmbed: false
                        )
                        self.source = videoSource
                        self.isEmbed = false
                        self.preparePlayer(url: proxied)
                    } else if extracted.isEmbed || extracted.formatId == "embed" {
                        self.loadEmbedFallback(url: extracted.streamUrl.isEmpty ? targetEp.url : extracted.streamUrl)
                    } else if !extracted.streamUrl.isEmpty {
                        let videoSource = VideoSource(
                            streamUrl: extracted.streamUrl,
                            resolution: extracted.resolution,
                            formatId: extracted.formatId,
                            isEmbed: false
                        )
                        self.source = videoSource
                        self.isEmbed = false
                        self.preparePlayer(url: extracted.streamUrl)
                    } else {
                        self.loadEmbedFallback(url: targetEp.url)
                    }
                } catch {
                    print("[PlayerViewModel] Extraction error, falling back to embed: \(error)")
                    self.loadEmbedFallback(url: targetEp.url)
                }
            }
        }
    }

    private func loadEmbedFallback(url: String) {
        self.isEmbed = true
        self.source = VideoSource(streamUrl: url, resolution: "Embed", formatId: "embed", isEmbed: true)
        self.playbackState = .playing
        self.player.pause()
        self.player.replaceCurrentItem(with: nil)
    }

    private func preparePlayer(url: String) {
        guard let streamURL = URL(string: url) else {
            playbackState = .error("Invalid stream URL")
            return
        }

        // Custom headers for HLS streaming
        let headers: [String: String] = [
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        ]
        let asset = AVURLAsset(url: streamURL, options: ["AVURLAssetHTTPHeaderFieldsKey": headers])
        let item = AVPlayerItem(asset: asset)
        item.preferredForwardBufferDuration = 15

        setupItemObservers(for: item)
        player.replaceCurrentItem(with: item)
        player.actionAtItemEnd = .pause
    }

    private func extractRealStreamUrl(rawUrl: String) -> String {
        guard let url = URL(string: rawUrl),
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
              let queryItems = components.queryItems else {
            return rawUrl
        }
        if let param = queryItems.first(where: { $0.name == "url" })?.value,
           param.hasPrefix("http://") || param.hasPrefix("https://") {
            return param
        }
        return rawUrl
    }

    // MARK: - Playback Controls

    public func play() {
        userWantsPause = false
        player.play()
        player.rate = playbackSpeed
        playbackState = .playing
        updateNowPlayingPlaybackValues()
    }

    public func pause() {
        userWantsPause = true
        player.pause()
        playbackState = .paused
        stopStallTimer()
        reportWatchProgress()
        updateNowPlayingPlaybackValues()
    }

    public func togglePlayPause() {
        if playbackState == .playing {
            pause()
        } else {
            play()
        }
    }

    public func seekBy(offset: Double) {
        let target = max(0, min(duration, currentTime + offset))
        seek(to: target)
    }

    public func seek(to targetTime: Double, completion: (() -> Void)? = nil) {
        let cmTime = CMTime(seconds: targetTime, preferredTimescale: 600)
        isUserSeeking = true
        currentTime = targetTime

        player.seek(to: cmTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                self.isUserSeeking = false
                if finished {
                    self.updateNowPlayingPlaybackValues()
                    completion?()
                }
            }
        }
    }

    public func setSpeed(_ speed: Float) {
        playbackSpeed = speed
        if playbackState == .playing {
            player.rate = speed
        }
        updateNowPlayingPlaybackValues()
    }

    public func selectSubtitleTrack(_ track: SubtitleTrack?) {
        selectedSubtitle = track
    }

    // MARK: - Auto Next Episode Logic

    private func computeNextEpisode() {
        guard let episodes = movie?.episodes else {
            nextEpisode = nil
            return
        }
        let sameServer = episodes.filter { $0.serverName == selectedServer }
        let targetList = sameServer.isEmpty ? episodes : sameServer
        nextEpisode = targetList.first { $0.number == currentEpisode + 1 }
    }

    private func checkNearEndAutoNext() {
        guard nextEpisode != nil, duration > 0, !showAutoNextOverlay else { return }
        let remaining = duration - currentTime
        // If remaining is within 30 seconds (or 10% if short video)
        let threshold: Double = duration > 600 ? 45.0 : 20.0
        if remaining <= threshold && remaining > 5.0 {
            triggerAutoNextEpisode()
        }
    }

    public func triggerAutoNextEpisode() {
        guard nextEpisode != nil, !showAutoNextOverlay else { return }
        showAutoNextOverlay = true
        autoNextCountdown = 5

        autoNextTimer?.invalidate()
        autoNextTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            Task { @MainActor [weak self] in
                guard let self = self else {
                    timer.invalidate()
                    return
                }
                if self.autoNextCountdown > 1 {
                    self.autoNextCountdown -= 1
                } else {
                    timer.invalidate()
                    self.playNextNow()
                }
            }
        }
    }

    public func playNextNow() {
        guard let next = nextEpisode else { return }
        dismissAutoNext()
        changeEpisode(to: next.number)
    }

    public func dismissAutoNext() {
        autoNextTimer?.invalidate()
        autoNextTimer = nil
        showAutoNextOverlay = false
    }

    // MARK: - Watch History & My List

    public func toggleMyList() {
        guard let movie = movie else { return }
        if isInMyList {
            userRepo.removeFromMyList(slug: movie.slug)
            isInMyList = false
        } else {
            userRepo.addToMyList(movie.toMovie())
            isInMyList = true
        }
    }

    public func reportWatchProgress() {
        guard let movie = movie, duration > 0 else { return }
        userRepo.updateWatchProgress(
            movie: movie.toMovie(),
            episode: currentEpisode,
            position: currentTime,
            duration: duration
        )
    }

    private func loadRecommendations() {
        Task {
            do {
                let items = try await movieRepo.exploreMovies()
                self.recommendations = items.filter { $0.slug != self.movie?.slug }
            } catch {
                print("[PlayerViewModel] Failed to load recommendations: \(error)")
            }
        }
    }

    // MARK: - Now Playing Info & Remote Command Center

    private func setupRemoteCommandCenter() {
        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.isEnabled = true
        commandCenter.playCommand.addTarget { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.play()
            }
            return .success
        }

        commandCenter.pauseCommand.isEnabled = true
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.pause()
            }
            return .success
        }

        commandCenter.togglePlayPauseCommand.isEnabled = true
        commandCenter.togglePlayPauseCommand.addTarget { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.togglePlayPause()
            }
            return .success
        }

        commandCenter.skipForwardCommand.isEnabled = true
        commandCenter.skipForwardCommand.preferredIntervals = [10]
        commandCenter.skipForwardCommand.addTarget { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.seekBy(offset: 10)
            }
            return .success
        }

        commandCenter.skipBackwardCommand.isEnabled = true
        commandCenter.skipBackwardCommand.preferredIntervals = [10]
        commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
            Task { @MainActor [weak self] in
                self?.seekBy(offset: -10)
            }
            return .success
        }

        commandCenter.changePlaybackPositionCommand.isEnabled = true
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            Task { @MainActor [weak self] in
                self?.seek(to: event.positionTime)
            }
            return .success
        }
    }

    private func updateNowPlayingInfo() {
        guard let movie = movie else { return }
        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = movie.title
        nowPlayingInfo[MPMediaItemPropertyArtist] = "KV-Netflix"
        nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = "Episode \(currentEpisode)"
        nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = (playbackState == .playing) ? playbackSpeed : 0.0

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo

        // Fetch artwork asynchronously
        if let backdrop = movie.backdrop ?? movie.thumbnail.isEmpty ? nil : movie.thumbnail,
           let url = URL(string: backdrop) {
            URLSession.shared.dataTask(with: url) { data, _, _ in
                guard let data = data, let image = UIImage(data: data) else { return }
                DispatchQueue.main.async {
                    var currentInfo = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                    let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                    currentInfo[MPMediaItemPropertyArtwork] = artwork
                    MPNowPlayingInfoCenter.default().nowPlayingInfo = currentInfo
                }
            }.resume()
        }
    }

    private func updateNowPlayingPlaybackValues() {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = (playbackState == .playing) ? playbackSpeed : 0.0
        info[MPMediaItemPropertyPlaybackDuration] = duration
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
}
