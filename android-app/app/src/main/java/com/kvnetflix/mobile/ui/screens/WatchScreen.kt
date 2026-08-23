package com.kvnetflix.mobile.ui.screens

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.OrientationEventListener
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import com.kvnetflix.mobile.ui.components.MovieRow
import com.kvnetflix.mobile.util.Constants
import com.kvnetflix.mobile.util.stripHtml
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.components.EpisodeGrid
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.PlayerViewModel
import java.io.ByteArrayInputStream

private val AD_BLOCK_DOMAINS = listOf(
    "googleads.g.doubleclick.net",
    "pagead2.googlesyndication.com",
    "adservice.google.com",
    "googleadservices.com",
    "ad.doubleclick.net",
    "ad.turn.com",
    "adroll.com",
    "amazon-adsystem.com",
    "pubmatic.com",
    "adnxs.com",
    "adskeeper.com",
    "propellerads.com",
    "exoclick.com",
    "voom.mgid.com",
    "cdn.popinads.com",
    "ads.twitter.com",
    "analytics.twitter.com",
    "static.ads-twitter.com",
    "syndication.twitter.com",
    "ads.facebook.com",
    "analytics.facebook.com",
    "connect.facebook.net",
    "vsbet", "1xbet", "fun88", "w88", "m88", "fb88", "bk8", "dafabet",
    "histats.com", "onclickads.net", "popads.net", "popcash.net", "adsterra.com",
    "mc.yandex.ru", "creative", "banner", "popup", "adserver", "syndication", "opstream10"
)

private const val AD_BLOCK_JS = """
(function() {
    try {
        if (!document.getElementById('streamflow-adblock-style')) {
            var style = document.createElement('style');
            style.id = 'streamflow-adblock-style';
            style.type = 'text/css';
            style.innerHTML = `
                [class*="ad-"], [class*="ads-"], [class*="advert"], 
                [id*="ad-"], [id*="ads-"], [id*="advert"],
                .ad, .ads, .advert, .advertisement,
                [class*="popup"], [id*="popup"],
                [class*="overlay"], [id*="overlay"],
                [class*="banner"], [id*="banner"],
                [class*="vsbet"], [id*="vsbet"],
                .vsbet, .banner, .popup, .overlay,
                iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
                iframe[src*="facebook"], iframe[src*="adskeeper"],
                iframe[src*="propeller"], iframe[src*="exoclick"],
                iframe[src*="mgid"], iframe[src*="popin"],
                div[style*="z-index: 9999"], div[style*="z-index:9999"],
                div[style*="z-index: 2147483647"],
                [class*="interstitial"], [class*="preroll"],
                [class*="midroll"], [class*="postroll"] {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                    width: 0px !important;
                    height: 0px !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        var cleanAndElevateVideo = function() {
            var selectors = [
                '[class*="ad-"]', '[class*="ads-"]', '[class*="advert"]',
                '[id*="ad-"]', '[id*="ads-"]', '[id*="advert"]',
                '.ad', '.ads', '.advert', '.advertisement',
                '[class*="popup"]', '[class*="overlay"]',
                '[class*="banner"]', '[id*="banner"]',
                '[class*="vsbet"]', '.vsbet', '[id*="vsbet"]',
                'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
                'iframe[src*="facebook"]', 'iframe[src*="adskeeper"]',
                'iframe[src*="propeller"]', 'iframe[src*="exoclick"]',
                'iframe[src*="mgid"]', 'iframe[src*="popin"]',
                '[class*="skip"]', '[id*="skip"]', '.skip-ad', '.skip-btn'
            ];
            selectors.forEach(function(sel) {
                try {
                    document.querySelectorAll(sel).forEach(function(el) {
                        if (el.tagName !== 'VIDEO' && el.tagName !== 'SOURCE') {
                            el.remove();
                        }
                    });
                } catch(e) {}
            });
            document.querySelectorAll('div[style]').forEach(function(el) {
                var z = parseInt(el.style.zIndex) || 0;
                if (z > 100 && el.querySelector('video') === null) {
                    el.remove();
                }
            });

            var v = document.querySelector('video');
            if (v) {
                v.style.position = 'fixed';
                v.style.top = '0px';
                v.style.left = '0px';
                v.style.width = '100vw';
                v.style.height = '100vh';
                v.style.zIndex = '2147483647';
                v.style.objectFit = 'contain';
                v.style.backgroundColor = '#000';
                if (v.paused) {
                    v.play().catch(function(){});
                }
            }
        };

        cleanAndElevateVideo();
        if (!window.__adBlockInterval) {
            window.__adBlockInterval = setInterval(cleanAndElevateVideo, 250);
        }
    } catch(e) {}
})();
"""

private const val AUTO_PLAY_JS = """
(function() {
    try {
        var v = document.querySelector('video');
        if (v) { v.play(); }
    } catch(e) {}
})();
"""

@androidx.annotation.OptIn(UnstableApi::class)
@Composable
fun WatchScreen(
    viewModel: PlayerViewModel,
    slug: String,
    episode: Int,
    userRepo: UserDataRepository?,
    language: String = "vi",
    onBack: () -> Unit,
    onMovieClick: (String) -> Unit = {},
    onCategoryClick: (String) -> Unit = {},
    onEnterPip: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = KvTheme.colors
    var isFullscreen by remember { mutableStateOf(false) }
    var isControlsVisible by remember { mutableStateOf(true) }
    val activity = LocalContext.current as? Activity
    val context = LocalContext.current

    BackHandler(enabled = isFullscreen) {
        if (!isControlsVisible) {
            isControlsVisible = true
        } else {
            isFullscreen = false
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    LaunchedEffect(isControlsVisible) {
        if (isControlsVisible) {
            kotlinx.coroutines.delay(4000)
            isControlsVisible = false
        }
    }

    DisposableEffect(context) {
        val orientationEventListener = object : OrientationEventListener(context) {
            override fun onOrientationChanged(orientation: Int) {
                if (orientation == ORIENTATION_UNKNOWN) return
                val isLandscapeDevice = (orientation in 60..120) || (orientation in 240..300)
                val isPortraitDevice = (orientation in 0..30) || (orientation in 330..359)

                if (isLandscapeDevice && !isFullscreen) {
                    isFullscreen = true
                    activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                } else if (isPortraitDevice && isFullscreen) {
                    isFullscreen = false
                    activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                }
            }
        }
        if (orientationEventListener.canDetectOrientation()) {
            orientationEventListener.enable()
        }
        onDispose {
            orientationEventListener.disable()
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    LaunchedEffect(slug, episode) {
        viewModel.loadPlayer(slug, episode, userRepo)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Player area
            Box(
                modifier = if (isFullscreen) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxWidth()
                        .heightIn(min = 300.dp)
                        .fillMaxHeight(0.5f)
                }
                    .background(Color.Black)
            ) {
                if (uiState.isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            CircularProgressIndicator(color = colors.accent)
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Loading stream...", color = Color.White, fontSize = 14.sp)
                        }
                    }
                } else if (uiState.source != null) {
                    val context = LocalContext.current
                    val currentSource = uiState.source!!
                    var isFallbackToEmbed by remember { mutableStateOf(false) }

                    // Reset fallback when source changes
                    LaunchedEffect(uiState.source, uiState.currentEpisode) {
                        isFallbackToEmbed = false
                    }

                    val shouldUseEmbed = currentSource.isEmbed || isFallbackToEmbed

                    if (shouldUseEmbed) {
                        // WebView Embed Player
                        AndroidView(
                            factory = { ctx ->
                                WebView(ctx).apply {
                                    layoutParams = FrameLayout.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT,
                                        ViewGroup.LayoutParams.MATCH_PARENT
                                    )
                                    settings.javaScriptEnabled = true
                                    settings.domStorageEnabled = true
                                    settings.mediaPlaybackRequiresUserGesture = false
                                    settings.useWideViewPort = true
                                    settings.loadWithOverviewMode = true
                                    settings.userAgentString = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

                                    webChromeClient = WebChromeClient()
                                    webViewClient = object : WebViewClient() {
                                        override fun shouldInterceptRequest(
                                            view: WebView?,
                                            request: WebResourceRequest?
                                        ): WebResourceResponse? {
                                            val url = request?.url?.toString() ?: return super.shouldInterceptRequest(view, request)
                                            if (AD_BLOCK_DOMAINS.any { url.contains(it, ignoreCase = true) }) {
                                                return WebResourceResponse("text/plain", "UTF-8", ByteArrayInputStream(ByteArray(0)))
                                            }
                                            return super.shouldInterceptRequest(view, request)
                                        }

                                        override fun onPageFinished(view: WebView?, url: String?) {
                                            super.onPageFinished(view, url)
                                            view?.evaluateJavascript(AD_BLOCK_JS, null)
                                            view?.evaluateJavascript(AUTO_PLAY_JS, null)
                                        }

                                        override fun onReceivedSslError(
                                            view: WebView?,
                                            handler: android.webkit.SslErrorHandler?,
                                            error: android.net.http.SslError?
                                        ) {
                                            handler?.proceed()
                                        }
                                    }

                                    loadUrl(currentSource.streamUrl)
                                }
                            },
                            modifier = Modifier.fillMaxSize()
                        )

                        // Save to history
                        LaunchedEffect(currentSource) {
                            if (userRepo != null) {
                                viewModel.saveToHistory(userRepo)
                            }
                        }
                    } else {
                        // ExoPlayer with custom HTTP headers and optimized buffer
                        val player = remember {
                            val loadControl = DefaultLoadControl.Builder()
                                .setBufferDurationsMs(
                                    DefaultLoadControl.DEFAULT_MIN_BUFFER_MS,
                                    DefaultLoadControl.DEFAULT_MAX_BUFFER_MS,
                                    DefaultLoadControl.DEFAULT_BUFFER_FOR_PLAYBACK_MS,
                                    DefaultLoadControl.DEFAULT_BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS
                                )
                                .build()
                            ExoPlayer.Builder(context)
                                .setLoadControl(loadControl)
                                .build()
                        }

                        var exoRetryCount by remember { mutableIntStateOf(0) }
                        val maxRetries = 3
                        var reprepareStream by remember { mutableStateOf<(() -> Unit)?>(null) }
                        val retryHandler = remember {
                            android.os.Handler(android.os.Looper.getMainLooper())
                        }

                        LaunchedEffect(uiState.source, uiState.currentEpisode) {
                            try {
                                val source = uiState.source ?: return@LaunchedEffect
                                if (source.streamUrl.isEmpty()) return@LaunchedEffect
                                exoRetryCount = 0
                                retryHandler.removeCallbacksAndMessages(null)
                                val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                                    .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                                    .setConnectTimeoutMs(15_000)
                                    .setReadTimeoutMs(30_000)
                                    .setAllowCrossProtocolRedirects(true)
                                val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
                                val mediaItem = MediaItem.fromUri(source.streamUrl)
                                val isHls = source.streamUrl.contains(".m3u8", ignoreCase = true)

                                val prepare: () -> Unit = {
                                    if (isHls) {
                                        player.setMediaSource(
                                            HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
                                        )
                                    } else {
                                        player.setMediaItem(mediaItem)
                                    }
                                    player.prepare()
                                    player.playWhenReady = true
                                }
                                reprepareStream = prepare
                                prepare()

                                if (userRepo != null) {
                                    viewModel.saveToHistory(userRepo)
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("WatchScreen", "Player setup error", e)
                                isFallbackToEmbed = true
                            }
                        }

                        var isPlaying by remember { mutableStateOf(false) }
                        var isBuffering by remember { mutableStateOf(false) }
                        var positionMs by remember { mutableLongStateOf(0L) }
                        var durationMs by remember { mutableLongStateOf(0L) }
                        var playbackSpeed by rememberSaveable { mutableFloatStateOf(1f) }
                        var seekFlash by remember { mutableStateOf<String?>(null) }
                        var speedMenuOpen by remember { mutableStateOf(false) }
                        var dragging by remember { mutableStateOf(false) }

                        LaunchedEffect(playbackSpeed) {
                            player.setPlaybackSpeed(playbackSpeed)
                        }

                        LaunchedEffect(seekFlash) {
                            if (seekFlash != null) {
                                kotlinx.coroutines.delay(750)
                                seekFlash = null
                            }
                        }

                        DisposableEffect(player) {
                            val listener = object : androidx.media3.common.Player.Listener {
                                override fun onPlaybackStateChanged(playbackState: Int) {
                                    isBuffering = playbackState == androidx.media3.common.Player.STATE_BUFFERING
                                }

                                override fun onIsPlayingChanged(isNowPlaying: Boolean) {
                                    isPlaying = isNowPlaying
                                }

                                override fun onPlayerError(error: PlaybackException) {
                                    android.util.Log.e(
                                        "WatchScreen",
                                        "ExoPlayer error (attempt ${exoRetryCount + 1}/$maxRetries): ${error.message}",
                                        error
                                    )
                                    if (exoRetryCount < maxRetries && !isFallbackToEmbed) {
                                        exoRetryCount++
                                        player.stop()
                                        retryHandler.postDelayed({
                                            reprepareStream?.invoke()
                                        }, 1_000L)
                                    } else {
                                        android.util.Log.e("WatchScreen", "Max retries reached, switching to WebView embed")
                                        isFallbackToEmbed = true
                                    }
                                }
                            }
                            player.addListener(listener)
                            onDispose {
                                retryHandler.removeCallbacksAndMessages(null)
                                player.removeListener(listener)
                                player.release()
                            }
                        }

                        // Lightweight UI ticker: only runs while controls are visible or buffering
                        LaunchedEffect(isControlsVisible, isBuffering) {
                            while (true) {
                                if (!dragging) {
                                    positionMs = player.currentPosition
                                }
                                durationMs = player.duration.coerceAtLeast(0L)
                                kotlinx.coroutines.delay(500)
                            }
                        }

                        val hasEpisodes = (uiState.movie?.episodes?.size ?: 0) > 0
                        val hasPrevEpisode = hasEpisodes && uiState.currentEpisode > 1
                        val maxEpisodeNumber = uiState.movie?.episodes?.maxOfOrNull { it.number } ?: uiState.currentEpisode
                        val hasNextEpisode = hasEpisodes && uiState.currentEpisode < maxEpisodeNumber

                        val seekBy = { deltaMs: Long ->
                            val target = (player.currentPosition + deltaMs)
                                .coerceIn(0L, durationMs.takeIf { it > 0 } ?: Long.MAX_VALUE)
                            player.seekTo(target)
                        }

                        Box(modifier = Modifier.fillMaxSize()) {
                            AndroidView(
                                factory = { ctx ->
                                    PlayerView(ctx).apply {
                                        this.player = player
                                        useController = false
                                        keepScreenOn = true
                                    }
                                },
                                modifier = Modifier.fillMaxSize()
                            )

                            // Gesture layer: single tap toggles controls, double-tap seeks ±10s
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .pointerInput(Unit) {
                                        detectTapGestures(
                                            onTap = { isControlsVisible = !isControlsVisible },
                                            onDoubleTap = { offset ->
                                                val goBack = offset.x < size.width / 2f
                                                seekBy(if (goBack) -10_000L else 10_000L)
                                                seekFlash = if (goBack) "back" else "forward"
                                            }
                                        )
                                    }
                            )

                            // Double-tap seek feedback
                            if (seekFlash != null && activity?.isInPictureInPictureMode != true) {
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.Center)
                                        .padding(bottom = 140.dp)
                                        .background(Color(0x99000000), RoundedCornerShape(999.dp))
                                        .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(999.dp))
                                        .padding(horizontal = 16.dp, vertical = 8.dp)
                                ) {
                                    Text(
                                        if (seekFlash == "back") "-10s" else "+10s",
                                        color = Color.White,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }

                            // Buffering indicator
                            if (isBuffering) {
                                CircularProgressIndicator(
                                    color = colors.accent,
                                    modifier = Modifier
                                        .align(Alignment.Center)
                                        .size(48.dp)
                                )
                            }

                            val barsVisible = isControlsVisible && activity?.isInPictureInPictureMode != true

                            // Top bar: gradient scrim + back / title / PiP / fullscreen
                            androidx.compose.animation.AnimatedVisibility(
                                visible = barsVisible,
                                enter = fadeIn(),
                                exit = fadeOut(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color(0xE6000000), Color(0x33000000), Color.Transparent)
                                        )
                                    )
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (!isFullscreen) {
                                        IconButton(
                                            onClick = onBack,
                                            modifier = Modifier.size(44.dp)
                                        ) {
                                            Icon(
                                                Icons.AutoMirrored.Filled.ArrowBack,
                                                "Back",
                                                tint = Color.White,
                                                modifier = Modifier.size(26.dp)
                                            )
                                        }
                                    }

                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = uiState.movie?.title ?: "",
                                            color = Color.White,
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        if (hasEpisodes) {
                                            Text(
                                                text = "Episode ${uiState.currentEpisode}",
                                                color = Color.White.copy(alpha = 0.7f),
                                                fontSize = 12.sp
                                            )
                                        }
                                    }

                                    IconButton(
                                        onClick = onEnterPip,
                                        modifier = Modifier.size(44.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.PictureInPicture,
                                            "PiP",
                                            tint = Color.White,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }

                                    IconButton(
                                        onClick = {
                                            isFullscreen = !isFullscreen
                                            activity?.requestedOrientation = if (isFullscreen) {
                                                ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                                            } else {
                                                ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                                            }
                                        },
                                        modifier = Modifier.size(44.dp)
                                    ) {
                                        Icon(
                                            if (isFullscreen) Icons.Default.FullscreenExit
                                            else Icons.Default.Fullscreen,
                                            "Fullscreen",
                                            tint = Color.White,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }
                            }

                            // Bottom controls: seek bar, time, speed, transport buttons
                            androidx.compose.animation.AnimatedVisibility(
                                visible = barsVisible,
                                enter = fadeIn(),
                                exit = fadeOut(),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .align(Alignment.BottomCenter)
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, Color(0x33000000), Color(0xE6000000))
                                        )
                                    )
                            ) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    // Time + seek bar
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = formatPlaybackTime(if (positionMs > 0) positionMs else 0L),
                                            color = Color.White.copy(alpha = 0.85f),
                                            fontSize = 12.sp
                                        )
                                        Slider(
                                            value = positionMs.toFloat().coerceIn(0f, if (durationMs > 0) durationMs.toFloat() else 1f),
                                            onValueChange = {
                                                dragging = true
                                                positionMs = it.toLong()
                                            },
                                            onValueChangeFinished = {
                                                dragging = false
                                                if (durationMs > 0) player.seekTo(positionMs)
                                            },
                                            valueRange = 0f..(if (durationMs > 0) durationMs.toFloat() else 1f),
                                            modifier = Modifier
                                                .weight(1f)
                                                .padding(horizontal = 8.dp),
                                            colors = SliderDefaults.colors(
                                                thumbColor = colors.accent,
                                                activeTrackColor = colors.accent,
                                                inactiveTrackColor = Color.White.copy(alpha = 0.25f)
                                            )
                                        )
                                        Text(
                                            text = formatPlaybackTime(durationMs),
                                            color = Color.White.copy(alpha = 0.85f),
                                            fontSize = 12.sp
                                        )
                                        // Speed selector
                                        Box {
                                            TextButton(
                                                onClick = { speedMenuOpen = true },
                                                contentPadding = PaddingValues(horizontal = 8.dp)
                                            ) {
                                                Text(
                                                    text = playbackSpeedLabel(playbackSpeed),
                                                    color = Color.White,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                            DropdownMenu(
                                                expanded = speedMenuOpen,
                                                onDismissRequest = { speedMenuOpen = false }
                                            ) {
                                                listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f).forEach { spd ->
                                                    DropdownMenuItem(
                                                        text = {
                                                            Text(
                                                                playbackSpeedLabel(spd),
                                                                color = if (spd == playbackSpeed) colors.accent else Color.Unspecified,
                                                                fontWeight = if (spd == playbackSpeed) FontWeight.Bold else FontWeight.Normal
                                                            )
                                                        },
                                                        onClick = {
                                                            playbackSpeed = spd
                                                            speedMenuOpen = false
                                                        }
                                                    )
                                                }
                                            }
                                        }
                                    }

                                    // Transport row
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp)
                                            .padding(bottom = 24.dp, top = 4.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        IconButton(
                                            onClick = {
                                                if (hasPrevEpisode) viewModel.changeEpisode(uiState.currentEpisode - 1)
                                            },
                                            modifier = Modifier.size(52.dp),
                                            enabled = hasPrevEpisode
                                        ) {
                                            Icon(
                                                Icons.Default.SkipPrevious,
                                                "Previous episode",
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                        IconButton(
                                            onClick = { seekBy(-10_000L) },
                                            modifier = Modifier.size(52.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.FastRewind,
                                                "Back 10 seconds",
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                        // Play / Pause (primary)
                                        IconButton(
                                            onClick = {
                                                if (player.isPlaying) player.pause() else player.play()
                                            },
                                            modifier = Modifier
                                                .size(68.dp)
                                                .background(Color(0xCC000000), CircleShape)
                                                .border(1.dp, Color.White.copy(alpha = 0.35f), CircleShape)
                                        ) {
                                            Icon(
                                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                                "Play / Pause",
                                                tint = Color.White,
                                                modifier = Modifier.size(36.dp)
                                            )
                                        }
                                        IconButton(
                                            onClick = { seekBy(10_000L) },
                                            modifier = Modifier.size(52.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.FastForward,
                                                "Forward 10 seconds",
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                        IconButton(
                                            onClick = {
                                                if (hasNextEpisode) viewModel.changeEpisode(uiState.currentEpisode + 1)
                                            },
                                            modifier = Modifier.size(52.dp),
                                            enabled = hasNextEpisode
                                        ) {
                                            Icon(
                                                Icons.Default.SkipNext,
                                                "Next episode",
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (uiState.error != null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(uiState.error ?: "Error", color = Color.Red, fontSize = 14.sp)
                            Spacer(modifier = Modifier.height(12.dp))
                            Button(
                                onClick = { viewModel.retryStream() },
                                colors = ButtonDefaults.buttonColors(containerColor = colors.accent)
                            ) {
                                Text("Retry", color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }

            // Scrollable content below player (hidden in fullscreen)
            AnimatedVisibility(
                visible = !isFullscreen,
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                uiState.movie?.let { movie ->
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .background(colors.bgPrimary)
                    ) {
                        // Movie info card
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(colors.bgSecondary)
                                .padding(16.dp)
                        ) {
                            Column {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = movie.title,
                                            color = colors.textPrimary,
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            movie.quality?.let {
                                                Box(
                                                    modifier = Modifier
                                                        .background(
                                                            colors.accent,
                                                            RoundedCornerShape(4.dp)
                                                        )
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text(
                                                        it,
                                                        color = Color.White,
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.SemiBold
                                                    )
                                                }
                                                Spacer(modifier = Modifier.width(8.dp))
                                            }
                                            movie.year?.let {
                                                Text(
                                                    "$it",
                                                    color = colors.textDim,
                                                    fontSize = 13.sp
                                                )
                                            }
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                "98% Match",
                                                color = Color(0xFF22C55E),
                                                fontSize = 13.sp,
                                                fontWeight = FontWeight.SemiBold
                                            )
                                        }
                                    }

                                    // Save button
                                    IconButton(onClick = {
                                        if (userRepo != null) viewModel.toggleMyList(userRepo)
                                    }) {
                                        Icon(
                                            imageVector = if (uiState.isSaved) Icons.Default.Favorite
                                            else Icons.Default.FavoriteBorder,
                                            contentDescription = "Save",
                                            tint = if (uiState.isSaved) colors.accent
                                            else colors.textPrimary,
                                            modifier = Modifier.size(24.dp)
                                        )
                                    }
                                }

                                if (!movie.originalTitle.isNullOrBlank() &&
                                    movie.originalTitle != movie.title
                                ) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        movie.originalTitle,
                                        color = colors.textDim,
                                        fontSize = 13.sp
                                    )
                                }

                                if (movie.description.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        movie.description.stripHtml(),
                                        color = colors.textSecondary,
                                        fontSize = 14.sp,
                                        maxLines = 4,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Episodes
                        if (!movie.episodes.isNullOrEmpty()) {
                            val filteredCount = if (uiState.selectedServer.isNotEmpty()) {
                                movie.episodes.count { it.serverName == uiState.selectedServer }
                            } else {
                                movie.episodes.size
                            }
                            Row(
                                modifier = Modifier.padding(horizontal = 16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "Episodes",
                                    color = colors.textPrimary,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "$filteredCount total",
                                    color = colors.textDim,
                                    fontSize = 14.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            EpisodeGrid(
                                episodes = movie.episodes,
                                currentEpisode = uiState.currentEpisode,
                                onEpisodeClick = { ep ->
                                    viewModel.changeEpisode(ep.number)
                                },
                                servers = uiState.servers,
                                selectedServer = uiState.selectedServer,
                                onServerChange = { server ->
                                    viewModel.changeServer(server)
                                }
                            )
                        }

                        if (uiState.recommendations.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(24.dp))
                            MovieRow(
                                title = if (language == "vi") "Có thể bạn cũng thích" else "You May Also Like",
                                movies = uiState.recommendations,
                                onClick = { onMovieClick(it.slug) }
                            )
                        }

                        if (uiState.genres.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(24.dp))
                            Text(
                                text = if (language == "vi") "Thể loại" else "Categories",
                                color = colors.textPrimary,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 16.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .horizontalScroll(rememberScrollState())
                                    .padding(horizontal = 16.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                uiState.genres.forEach { genre ->
                                    val label = Constants.GENRES.find { it.id == genre.Slug }?.let {
                                        if (language == "vi") it.vi else it.en
                                    } ?: genre.Name

                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(20.dp))
                                            .background(colors.bgSecondary)
                                            .clickable { onCategoryClick(genre.Slug) }
                                            .padding(horizontal = 14.dp, vertical = 8.dp)
                                    ) {
                                        Text(
                                            label,
                                            color = colors.textSecondary,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}

private fun formatPlaybackTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        String.format("%d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%d:%02d", minutes, seconds)
    }
}

private fun playbackSpeedLabel(speed: Float): String {
    val str = if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()
    return "${str}x"
}
