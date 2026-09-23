import SwiftUI
import AVKit
import MediaPlayer

public struct WatchView: View {
    @StateObject public var viewModel: PlayerViewModel
    public let slug: String
    public let initialEpisode: Int
    public var onBack: (() -> Void)?

    @State private var showControls: Bool = true
    @State private var controlsTimer: Timer?
    @State private var seekFlashText: String?
    @State private var showSpeedSheet: Bool = false
    @State private var showServerDrawer: Bool = false
    @State private var showEpisodeDrawer: Bool = false
    @State private var showSubtitleSheet: Bool = false
    @State private var isDraggingSlider: Bool = false
    @State private var sliderValue: Double = 0
    @State private var triggerPiP: Bool = false

    // Accent theme color
    private let accentColor = Color(red: 229/255, green: 9/255, blue: 20/255) // Netflix Red / Yellow Accent

    public init(slug: String, initialEpisode: Int = 1, onBack: (() -> Void)? = nil) {
        self.slug = slug
        self.initialEpisode = initialEpisode
        self.onBack = onBack
        _viewModel = StateObject(wrappedValue: PlayerViewModel())
    }

    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                Color.black.ignoresSafeArea()

                if viewModel.isEmbed, let streamUrl = viewModel.source?.streamUrl {
                    // Embed Web Player Fallback with custom Ad-Blocker
                    AdBlockWebView(urlString: streamUrl, onBack: onBack)
                        .ignoresSafeArea()

                    // Minimal top bar for embed player
                    VStack {
                        embedTopBar
                        Spacer()
                    }
                } else {
                    // Native AVPlayer layer
                    PlayerLayerView(player: viewModel.player, triggerPiP: $triggerPiP)
                        .ignoresSafeArea()

                    // Gestures overlay (single tap = toggle controls, double tap = seek ±10s)
                    gestureOverlay(geometry: geometry)

                    // Elevated Subtitles View
                    elevatedSubtitleView

                    // Double-tap seek flash HUD
                    if let flash = seekFlashText {
                        seekFlashHUD(text: flash)
                    }

                    // Buffering Indicator
                    if viewModel.playbackState == .buffering {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(1.5)
                    }

                    // Main Controls Overlay
                    if showControls {
                        controlsOverlay
                            .transition(.opacity)
                    }

                    // Auto Next Episode Countdown Overlay
                    if viewModel.showAutoNextOverlay, let next = viewModel.nextEpisode {
                        autoNextEpisodeCard(next: next)
                    }

                    // Error overlay
                    if case .error(let msg) = viewModel.playbackState {
                        errorOverlay(message: msg)
                    }
                }
            }
            .statusBar(hidden: !showControls)
            .onAppear {
                viewModel.loadMovie(slug: slug, episode: initialEpisode)
                resetControlsTimer()
            }
            .onDisappear {
                viewModel.cleanup()
                controlsTimer?.invalidate()
            }
            .sheet(isPresented: $showSpeedSheet) {
                speedSelectionSheet
            }
            .sheet(isPresented: $showServerDrawer) {
                serverSelectionSheet
            }
            .sheet(isPresented: $showEpisodeDrawer) {
                episodeSelectionSheet
            }
            .sheet(isPresented: $showSubtitleSheet) {
                subtitleSelectionSheet
            }
        }
    }

    // MARK: - Gestures Layer

    private func gestureOverlay(geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            // Left half: Double tap seeks -10s
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(count: 2) {
                    triggerSeek(offset: -10, text: "-10s")
                }
                .onTapGesture(count: 1) {
                    toggleControls()
                }

            // Right half: Double tap seeks +10s
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(count: 2) {
                    triggerSeek(offset: 10, text: "+10s")
                }
                .onTapGesture(count: 1) {
                    toggleControls()
                }
        }
        .ignoresSafeArea()
    }

    private func triggerSeek(offset: Double, text: String) {
        viewModel.seekBy(offset: offset)
        seekFlashText = text
        withAnimation {
            showControls = true
        }
        resetControlsTimer()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
            if self.seekFlashText == text {
                self.seekFlashText = nil
            }
        }
    }

    private func toggleControls() {
        withAnimation(.easeInOut(duration: 0.25)) {
            showControls.toggle()
        }
        if showControls {
            resetControlsTimer()
        } else {
            controlsTimer?.invalidate()
        }
    }

    private func resetControlsTimer() {
        controlsTimer?.invalidate()
        controlsTimer = Timer.scheduledTimer(withTimeInterval: 4.0, repeats: false) { _ in
            Task { @MainActor in
                if self.viewModel.playbackState == .playing && !self.isDraggingSlider {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        self.showControls = false
                    }
                }
            }
        }
    }

    // MARK: - Overlays & HUDs

    private func seekFlashHUD(text: String) -> some View {
        Text(text)
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(Color.black.opacity(0.75))
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Color.white.opacity(0.3), lineWidth: 1))
            .shadow(radius: 6)
    }

    private var elevatedSubtitleView: some View {
        VStack {
            Spacer()
            if let sub = viewModel.selectedSubtitle {
                // Elevation offset adjusts based on whether bottom control bar is visible
                Text("[\(sub.label.isEmpty ? sub.lang.uppercased() : sub.label)]")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white.opacity(0.85))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.75))
                    .cornerRadius(6)
                    .padding(.bottom, showControls ? 120 : 40)
                    .animation(.easeInOut(duration: 0.25), value: showControls)
            }
        }
    }

    // MARK: - Main Controls Overlay

    private var controlsOverlay: some View {
        VStack(spacing: 0) {
            // Top Bar
            topControlsBar

            Spacer()

            // Center Transport Buttons
            centerTransportBar

            Spacer()

            // Bottom Bar: Slider, Timers, Buttons
            bottomControlsBar
        }
        .background(
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.black.opacity(0.85),
                    Color.black.opacity(0.2),
                    Color.clear,
                    Color.black.opacity(0.2),
                    Color.black.opacity(0.85)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
        )
    }

    // MARK: - Top Controls Bar

    private var topControlsBar: some View {
        HStack(spacing: 16) {
            Button(action: {
                viewModel.cleanup()
                onBack?()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.movie?.title ?? "")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text("Episode \(viewModel.currentEpisode)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.7))

                    if !viewModel.selectedServer.isEmpty {
                        Text("• \(viewModel.selectedServer)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }

            Spacer()

            // Picture in Picture
            if AVPictureInPictureController.isPictureInPictureSupported() {
                Button(action: {
                    triggerPiP = true
                }) {
                    Image(systemName: "pip.enter")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(width: 36, height: 36)
                }
            }

            // AirPlay 2 Picker
            AirPlayRoutePickerView()
                .frame(width: 32, height: 32)

            // Server Selector
            Button(action: {
                showServerDrawer = true
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "server.rack")
                        .font(.system(size: 15))
                    Text(viewModel.selectedServer.isEmpty ? "Server" : viewModel.selectedServer)
                        .font(.system(size: 13, weight: .semibold))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.white.opacity(0.2))
                .cornerRadius(8)
            }

            // My List bookmark button
            Button(action: {
                viewModel.toggleMyList()
            }) {
                Image(systemName: viewModel.isInMyList ? "checkmark.circle.fill" : "plus.circle")
                    .font(.system(size: 22))
                    .foregroundColor(viewModel.isInMyList ? accentColor : .white)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
    }

    // MARK: - Center Transport Controls

    private var centerTransportBar: some View {
        HStack(spacing: 36) {
            // Previous episode button
            Button(action: {
                if viewModel.currentEpisode > 1 {
                    viewModel.changeEpisode(to: viewModel.currentEpisode - 1)
                }
            }) {
                Image(systemName: "backward.end.fill")
                    .font(.system(size: 26))
                    .foregroundColor(viewModel.currentEpisode > 1 ? .white : .white.opacity(0.3))
            }
            .disabled(viewModel.currentEpisode <= 1)

            // Skip backward 10s
            Button(action: {
                triggerSeek(offset: -10, text: "-10s")
            }) {
                Image(systemName: "gobackward.10")
                    .font(.system(size: 34))
                    .foregroundColor(.white)
            }

            // Play / Pause Primary Button
            Button(action: {
                viewModel.togglePlayPause()
                resetControlsTimer()
            }) {
                ZStack {
                    Circle()
                        .fill(Color.black.opacity(0.6))
                        .frame(width: 72, height: 72)
                        .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 1.5))

                    Image(systemName: viewModel.playbackState == .playing ? "pause.fill" : "play.fill")
                        .font(.system(size: 34))
                        .foregroundColor(.white)
                }
            }

            // Skip forward 10s
            Button(action: {
                triggerSeek(offset: 10, text: "+10s")
            }) {
                Image(systemName: "goforward.10")
                    .font(.system(size: 34))
                    .foregroundColor(.white)
            }

            // Next episode button
            Button(action: {
                if let next = viewModel.nextEpisode {
                    viewModel.changeEpisode(to: next.number)
                }
            }) {
                Image(systemName: "forward.end.fill")
                    .font(.system(size: 26))
                    .foregroundColor(viewModel.nextEpisode != nil ? .white : .white.opacity(0.3))
            }
            .disabled(viewModel.nextEpisode == nil)
        }
    }

    // MARK: - Bottom Controls Bar

    private var bottomControlsBar: some View {
        VStack(spacing: 8) {
            // Time & Scrub Slider
            HStack(spacing: 12) {
                Text(formatTime(isDraggingSlider ? sliderValue : viewModel.currentTime))
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.9))

                Slider(
                    value: Binding(
                        get: {
                            isDraggingSlider ? sliderValue : viewModel.currentTime
                        },
                        set: { newVal in
                            isDraggingSlider = true
                            sliderValue = newVal
                        }
                    ),
                    in: 0...max(1, viewModel.duration),
                    onEditingChanged: { editing in
                        if !editing {
                            viewModel.seek(to: sliderValue) {
                                isDraggingSlider = false
                            }
                            resetControlsTimer()
                        }
                    }
                )
                .accentColor(accentColor)

                Text(formatTime(max(0, viewModel.duration - (isDraggingSlider ? sliderValue : viewModel.currentTime))))
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))
            }
            .padding(.horizontal, 16)

            // Secondary Buttons Row (Speed, Episodes, Subtitles)
            HStack(spacing: 24) {
                // Speed Button
                Button(action: {
                    showSpeedSheet = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "gauge.with.needle")
                            .font(.system(size: 14))
                        Text(formatSpeed(viewModel.playbackSpeed))
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.white)
                }

                Spacer()

                // Subtitles Button
                Button(action: {
                    showSubtitleSheet = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "captions.bubble")
                            .font(.system(size: 15))
                        Text(viewModel.selectedSubtitle?.label ?? "Subtitles")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                }

                // Episodes Drawer Button
                Button(action: {
                    showEpisodeDrawer = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "rectangle.stack")
                            .font(.system(size: 15))
                        Text("Episodes")
                            .font(.system(size: 13, weight: .medium))
                    }
                    .foregroundColor(.white)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 16)
        }
    }

    // MARK: - Auto Next Episode Card

    private func autoNextEpisodeCard(next: Episode) -> some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text("Up Next in \(viewModel.autoNextCountdown)s")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(accentColor)
                        Spacer()
                        Button(action: {
                            viewModel.dismissAutoNext()
                        }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }

                    Text("Episode \(next.number): \(next.title.isEmpty ? "Next Episode" : next.title)")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(.white)
                        .lineLimit(1)

                    HStack(spacing: 12) {
                        Button(action: {
                            viewModel.playNextNow()
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "play.fill")
                                    .font(.system(size: 12))
                                Text("Play Now")
                                    .font(.system(size: 14, weight: .bold))
                            }
                            .foregroundColor(.black)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.white)
                            .cornerRadius(8)
                        }

                        Button(action: {
                            viewModel.dismissAutoNext()
                        }) {
                            Text("Cancel")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white.opacity(0.8))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                        }
                    }
                }
                .padding(16)
                .background(Color(red: 26/255, green: 27/255, blue: 36/255).opacity(0.95))
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.white.opacity(0.15), lineWidth: 1))
                .frame(maxWidth: 320)
                .padding(20)
            }
        }
    }

    // MARK: - Embed Top Bar

    private var embedTopBar: some View {
        HStack {
            Button(action: {
                viewModel.cleanup()
                onBack?()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
            }

            Text(viewModel.movie?.title ?? "")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white)
                .lineLimit(1)

            Spacer()

            Button(action: {
                showServerDrawer = true
            }) {
                Text(viewModel.selectedServer.isEmpty ? "Server" : viewModel.selectedServer)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 12)
        .background(
            LinearGradient(
                colors: [Color.black.opacity(0.8), Color.clear],
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }

    // MARK: - Error Overlay

    private func errorOverlay(message: String) -> some View {
        ZStack {
            Color.black.opacity(0.85).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.yellow)

                Text("Playback Error")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)

                Text(message)
                    .font(.system(size: 14))
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)

                HStack(spacing: 16) {
                    Button(action: {
                        viewModel.retryStream()
                    }) {
                        Text("Retry")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 10)
                            .background(accentColor)
                            .cornerRadius(8)
                    }

                    if viewModel.servers.count > 1 {
                        Button(action: {
                            viewModel.triggerAutoFailover(reason: "Manual retry failover")
                        }) {
                            Text("Next Server")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 20)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.2))
                                .cornerRadius(8)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Sheets

    private var speedSelectionSheet: some View {
        NavigationView {
            List {
                ForEach(viewModel.availableSpeeds, id: \.self) { speed in
                    Button(action: {
                        viewModel.setSpeed(speed)
                        showSpeedSheet = false
                    }) {
                        HStack {
                            Text(formatSpeed(speed))
                                .foregroundColor(.primary)
                            Spacer()
                            if viewModel.playbackSpeed == speed {
                                Image(systemName: "checkmark")
                                    .foregroundColor(accentColor)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Playback Speed")
            .navigationBarItems(trailing: Button("Done") { showSpeedSheet = false })
        }
    }

    private var serverSelectionSheet: some View {
        NavigationView {
            List {
                ForEach(viewModel.servers, id: \.self) { server in
                    Button(action: {
                        viewModel.changeServer(to: server)
                        showServerDrawer = false
                    }) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(server)
                                    .foregroundColor(.primary)
                                    .font(.system(size: 16, weight: .medium))
                            }
                            Spacer()
                            if viewModel.selectedServer == server {
                                Image(systemName: "checkmark")
                                    .foregroundColor(accentColor)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select Server")
            .navigationBarItems(trailing: Button("Done") { showServerDrawer = false })
        }
    }

    private var episodeSelectionSheet: some View {
        NavigationView {
            let episodes = viewModel.movie?.episodes ?? []
            let filtered = episodes.filter { viewModel.selectedServer.isEmpty || $0.serverName == viewModel.selectedServer }
            let displayList = filtered.isEmpty ? episodes : filtered

            List {
                ForEach(displayList) { ep in
                    Button(action: {
                        viewModel.changeEpisode(to: ep.number)
                        showEpisodeDrawer = false
                    }) {
                        HStack(spacing: 12) {
                            Text("Ep \(ep.number)")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(viewModel.currentEpisode == ep.number ? accentColor : .primary)
                                .frame(width: 50, alignment: .leading)

                            Text(ep.title.isEmpty ? "Episode \(ep.number)" : ep.title)
                                .font(.system(size: 14))
                                .foregroundColor(.primary)
                                .lineLimit(1)

                            Spacer()

                            if viewModel.currentEpisode == ep.number {
                                Image(systemName: "play.circle.fill")
                                    .foregroundColor(accentColor)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Episodes")
            .navigationBarItems(trailing: Button("Done") { showEpisodeDrawer = false })
        }
    }

    private var subtitleSelectionSheet: some View {
        NavigationView {
            List {
                Button(action: {
                    viewModel.selectSubtitleTrack(nil)
                    showSubtitleSheet = false
                }) {
                    HStack {
                        Text("Off")
                            .foregroundColor(.primary)
                        Spacer()
                        if viewModel.selectedSubtitle == nil {
                            Image(systemName: "checkmark")
                                .foregroundColor(accentColor)
                        }
                    }
                }

                ForEach(viewModel.subtitles) { track in
                    Button(action: {
                        viewModel.selectSubtitleTrack(track)
                        showSubtitleSheet = false
                    }) {
                        HStack {
                            Text(track.label.isEmpty ? track.lang.uppercased() : track.label)
                                .foregroundColor(.primary)
                            Spacer()
                            if viewModel.selectedSubtitle?.url == track.url {
                                Image(systemName: "checkmark")
                                    .foregroundColor(accentColor)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Subtitles")
            .navigationBarItems(trailing: Button("Done") { showSubtitleSheet = false })
        }
    }

    // MARK: - Helpers

    private func formatTime(_ seconds: Double) -> String {
        guard seconds.isFinite && seconds >= 0 else { return "00:00" }
        let total = Int(seconds)
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        } else {
            return String(format: "%02d:%02d", m, s)
        }
    }

    private func formatSpeed(_ speed: Float) -> String {
        if speed.truncatingRemainder(dividingBy: 1.0) == 0 {
            return "\(Int(speed))x"
        } else {
            return "\(speed)x"
        }
    }
}

// MARK: - AVPlayerLayer & PiP UIKit Wrapper

public struct PlayerLayerView: UIViewRepresentable {
    public let player: AVPlayer
    @Binding public var triggerPiP: Bool

    public init(player: AVPlayer, triggerPiP: Binding<Bool> = .constant(false)) {
        self.player = player
        self._triggerPiP = triggerPiP
    }

    public func makeUIView(context: Context) -> PlayerContainerView {
        let view = PlayerContainerView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        view.setupPiP()
        return view
    }

    public func updateUIView(_ uiView: PlayerContainerView, context: Context) {
        if uiView.playerLayer.player != player {
            uiView.playerLayer.player = player
        }
        if triggerPiP {
            uiView.togglePiP()
            DispatchQueue.main.async {
                triggerPiP = false
            }
        }
    }
}

public final class PlayerContainerView: UIView, AVPictureInPictureControllerDelegate {
    public override static var layerClass: AnyClass {
        AVPlayerLayer.self
    }

    public var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    private var pipController: AVPictureInPictureController?

    public func setupPiP() {
        if AVPictureInPictureController.isPictureInPictureSupported() {
            pipController = AVPictureInPictureController(playerLayer: playerLayer)
            pipController?.delegate = self
        }
    }

    public func togglePiP() {
        guard let pip = pipController else { return }
        if pip.isPictureInPictureActive {
            pip.stopPictureInPicture()
        } else {
            pip.startPictureInPicture()
        }
    }
}

// MARK: - Native AirPlay Route Picker Wrapper

public struct AirPlayRoutePickerView: UIViewRepresentable {
    public init() {}

    public func makeUIView(context: Context) -> AVRoutePickerView {
        let picker = AVRoutePickerView()
        picker.tintColor = .white
        picker.activeTintColor = UIColor(red: 229/255, green: 9/255, blue: 20/255, alpha: 1.0)
        picker.prioritizesVideoDevices = true
        return picker
    }

    public func updateUIView(_ uiView: AVRoutePickerView, context: Context) {}
}
