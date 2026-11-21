package com.kvnetflix.mobile.ui.screens

import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsTopHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed as gridItemsIndexed
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AspectRatio
import androidx.compose.material.icons.filled.Crop169
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PictureInPicture
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.min
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.text.Cue
import androidx.media3.common.text.CueGroup
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import com.kvnetflix.mobile.data.model.Category
import com.kvnetflix.mobile.data.model.MovieDetail
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.adaptive.LocalWindowState
import com.kvnetflix.mobile.ui.adaptive.findActivity
import com.kvnetflix.mobile.ui.components.CompactMovieRow
import com.kvnetflix.mobile.ui.components.EpisodeGrid
import com.kvnetflix.mobile.ui.components.HorizontalMovieCard
import com.kvnetflix.mobile.ui.components.MovieRow
import com.kvnetflix.mobile.ui.theme.GreenMatch
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.util.Constants
import com.kvnetflix.mobile.util.stripHtml
import com.kvnetflix.mobile.viewmodel.PlayerUiState
import com.kvnetflix.mobile.viewmodel.PlayerViewModel
import kotlinx.coroutines.delay
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
    isInPip: Boolean = false,
    onBack: () -> Unit,
    onMovieClick: (String) -> Unit = {},
    onCategoryClick: (String) -> Unit = {},
    onEnterPip: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = KvTheme.colors
    val context = LocalContext.current
    val activity = context.findActivity()
    val windowState = LocalWindowState.current

    var isFullscreen by rememberSaveable { mutableStateOf(false) }
    var isTheater by rememberSaveable { mutableStateOf(false) }
    var dismissedTabletop by rememberSaveable { mutableStateOf(false) }
    var isControlsVisible by remember { mutableStateOf(true) }
    var userPaused by rememberSaveable { mutableStateOf(false) }
    var isFallbackToEmbed by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(windowState.isTabletop) {
        if (windowState.isTabletop) dismissedTabletop = false
    }

    val canToggleTheater = windowState.isLandscapeTwoPaneWatch && !windowState.isTabletop
    val theaterMode = isTheater && canToggleTheater

    // Reset user pause state when changing episode
    LaunchedEffect(uiState.currentEpisode) {
        userPaused = false
    }

    // Black status bar strip above player with white icons during watch; restore on exit
    DisposableEffect(activity) {
        val window = activity?.window
        if (window != null) {
            val controller = WindowCompat.getInsetsController(window, window.decorView)
            val prevLight = controller.isAppearanceLightStatusBars
            @Suppress("DEPRECATION")
            val prevStatusColor = window.statusBarColor
            controller.isAppearanceLightStatusBars = false
            @Suppress("DEPRECATION")
            window.statusBarColor = android.graphics.Color.BLACK
            onDispose {
                controller.isAppearanceLightStatusBars = prevLight
                @Suppress("DEPRECATION")
                window.statusBarColor = prevStatusColor
            }
        } else {
            onDispose {}
        }
    }

    // Hide/show system bars on fullscreen toggle without locking portrait afterwards
    LaunchedEffect(isFullscreen) {
        val window = activity?.window ?: return@LaunchedEffect
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        if (isFullscreen) {
            controller.hide(WindowInsetsCompat.Type.systemBars())
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                window.attributes.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
            activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            activity?.window?.let { window ->
                WindowCompat.getInsetsController(window, window.decorView)
                    .show(WindowInsetsCompat.Type.systemBars())
            }
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    BackHandler(enabled = isFullscreen) {
        isFullscreen = false
    }

    LaunchedEffect(isControlsVisible) {
        if (isControlsVisible) {
            delay(4000)
            isControlsVisible = false
        }
    }

    LaunchedEffect(slug, episode) {
        viewModel.loadPlayer(slug, episode, userRepo)
    }

    // Hoisted ExoPlayer instance so folding/unfolding, rotating, or toggling theater/fullscreen
    // transfers the active player surface seamlessly without resetting playback.
    val exoPlayer = remember {
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
    val retryHandler = remember { Handler(Looper.getMainLooper()) }

    var isPlaying by remember { mutableStateOf(false) }
    var isBuffering by remember { mutableStateOf(false) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var playbackSpeed by rememberSaveable { mutableFloatStateOf(1f) }
    var seekFlash by remember { mutableStateOf<String?>(null) }
    var speedMenuOpen by remember { mutableStateOf(false) }
    var dragging by remember { mutableStateOf(false) }
    var currentCues by remember { mutableStateOf<List<Cue>>(emptyList()) }

    LaunchedEffect(playbackSpeed) {
        exoPlayer.setPlaybackSpeed(playbackSpeed)
    }

    LaunchedEffect(seekFlash) {
        if (seekFlash != null) {
            delay(750)
            seekFlash = null
        }
    }

    DisposableEffect(exoPlayer) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                isBuffering = playbackState == Player.STATE_BUFFERING
            }

            override fun onIsPlayingChanged(isNowPlaying: Boolean) {
                isPlaying = isNowPlaying
                if (isNowPlaying) {
                    userPaused = false
                }
            }

            override fun onCues(cueGroup: CueGroup) {
                currentCues = cueGroup.cues
            }

            override fun onPlayerError(error: PlaybackException) {
                Log.e(
                    "WatchScreen",
                    "ExoPlayer error (attempt ${exoRetryCount + 1}/$maxRetries): ${error.message}",
                    error
                )
                if (exoRetryCount < maxRetries && !isFallbackToEmbed) {
                    exoRetryCount++
                    exoPlayer.stop()
                    retryHandler.postDelayed({
                        reprepareStream?.invoke()
                    }, 1_000L)
                } else {
                    Log.e("WatchScreen", "Max retries reached, switching to WebView embed")
                    isFallbackToEmbed = true
                }
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            retryHandler.removeCallbacksAndMessages(null)
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    LaunchedEffect(isControlsVisible, isBuffering, isPlaying) {
        while (true) {
            if (!dragging) {
                positionMs = exoPlayer.currentPosition.coerceAtLeast(0L)
            }
            durationMs = exoPlayer.duration.coerceAtLeast(0L)
            delay(500)
        }
    }

    val currentSource = uiState.source
    val shouldUseEmbed = currentSource != null && (currentSource.isEmbed || isFallbackToEmbed)

    LaunchedEffect(uiState.source, uiState.currentEpisode) {
        isFallbackToEmbed = false
    }

    LaunchedEffect(shouldUseEmbed) {
        if (shouldUseEmbed) {
            retryHandler.removeCallbacksAndMessages(null)
            exoPlayer.stop()
            exoPlayer.clearMediaItems()
        }
    }

    LaunchedEffect(uiState.source, uiState.subtitles, uiState.currentEpisode, isFallbackToEmbed) {
        val source = uiState.source ?: return@LaunchedEffect
        if (source.isEmbed || isFallbackToEmbed) {
            if (userRepo != null) {
                viewModel.saveToHistory(userRepo)
            }
            return@LaunchedEffect
        }
        if (source.streamUrl.isEmpty()) return@LaunchedEffect
        try {
            exoRetryCount = 0
            retryHandler.removeCallbacksAndMessages(null)
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(30_000)
                .setAllowCrossProtocolRedirects(true)
            val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)

            val subtitleConfigs = uiState.subtitles.map { sub ->
                MediaItem.SubtitleConfiguration.Builder(Uri.parse(sub.url))
                    .setMimeType(MimeTypes.TEXT_VTT)
                    .setLanguage(sub.lang)
                    .setLabel(sub.label)
                    .setSelectionFlags(
                        if (sub.default || sub.lang.equals("vi", ignoreCase = true)) C.SELECTION_FLAG_DEFAULT else 0
                    )
                    .build()
            }

            val mediaItem = MediaItem.Builder()
                .setUri(source.streamUrl)
                .apply {
                    if (source.streamUrl.contains(".m3u8", ignoreCase = true)) {
                        setMimeType(MimeTypes.APPLICATION_M3U8)
                    }
                }
                .setSubtitleConfigurations(subtitleConfigs)
                .build()

            exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters
                .buildUpon()
                .setPreferredTextLanguage("vi")
                .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                .build()

            val mediaSourceFactory = DefaultMediaSourceFactory(dataSourceFactory)

            val prepare: () -> Unit = {
                exoPlayer.setMediaSource(mediaSourceFactory.createMediaSource(mediaItem))
                exoPlayer.prepare()
                exoPlayer.playWhenReady = !userPaused
            }
            reprepareStream = prepare
            prepare()

            if (userRepo != null) {
                viewModel.saveToHistory(userRepo)
            }
        } catch (e: Exception) {
            Log.e("WatchScreen", "Player setup error", e)
            isFallbackToEmbed = true
        }
    }

    if (uiState.isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.bgPrimary)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = colors.textPrimary
                )
            }
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(color = colors.accent)
                Spacer(modifier = Modifier.height(12.dp))
                Text("Loading stream...", color = colors.textSecondary, fontSize = 14.sp)
            }
        }
        return
    }

    if (uiState.error != null && uiState.source == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.bgPrimary)
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = colors.textPrimary
                )
            }
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = uiState.error ?: "Error loading stream",
                    color = Color.Red,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(14.dp))
                Button(
                    onClick = { viewModel.retryStream() },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.accent)
                ) {
                    Text("Retry", color = colors.onAccent, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                }
            }
        }
        return
    }

    val hasEpisodes = (uiState.movie?.episodes?.size ?: 0) > 0
    val hasPrevEpisode = hasEpisodes && uiState.currentEpisode > 1
    val maxEpisodeNumber = uiState.movie?.episodes?.maxOfOrNull { it.number } ?: uiState.currentEpisode
    val hasNextEpisode = hasEpisodes && uiState.currentEpisode < maxEpisodeNumber

    val seekBy: (Long) -> Unit = { deltaMs ->
        val target = (exoPlayer.currentPosition + deltaMs)
            .coerceIn(0L, durationMs.takeIf { it > 0 } ?: Long.MAX_VALUE)
        exoPlayer.seekTo(target)
        positionMs = target
    }

    // Shared player surface composable: renders either WebView embed or ExoPlayer + controls
    val playerContent: @Composable (Modifier, Boolean) -> Unit = { playerModifier, hideOverlayControls ->
        Box(modifier = playerModifier.background(Color.Black)) {
            if (shouldUseEmbed) {
                val embedSource = currentSource ?: return@Box
                val webView = remember(context, embedSource.streamUrl) {
                    WebView(context).apply {
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        settings.mediaPlaybackRequiresUserGesture = false
                        settings.useWideViewPort = true
                        settings.loadWithOverviewMode = true
                        settings.userAgentString =
                            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"

                        webChromeClient = WebChromeClient()
                        webViewClient = object : WebViewClient() {
                            override fun shouldInterceptRequest(
                                view: WebView?,
                                request: WebResourceRequest?
                            ): WebResourceResponse? {
                                val url = request?.url?.toString()
                                    ?: return super.shouldInterceptRequest(view, request)
                                if (AD_BLOCK_DOMAINS.any { url.contains(it, ignoreCase = true) }) {
                                    return WebResourceResponse(
                                        "text/plain",
                                        "UTF-8",
                                        ByteArrayInputStream(ByteArray(0))
                                    )
                                }
                                return super.shouldInterceptRequest(view, request)
                            }

                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                view?.evaluateJavascript(AD_BLOCK_JS, null)
                                if (!userPaused) {
                                    view?.evaluateJavascript(AUTO_PLAY_JS, null)
                                }
                            }

                            override fun onReceivedSslError(
                                view: WebView?,
                                handler: SslErrorHandler?,
                                error: android.net.http.SslError?
                            ) {
                                handler?.proceed()
                            }
                        }

                        loadUrl(embedSource.streamUrl)
                    }
                }

                DisposableEffect(webView) {
                    onDispose {
                        (webView.parent as? ViewGroup)?.removeView(webView)
                        webView.destroy()
                    }
                }

                AndroidView(
                    factory = {
                        (webView.parent as? ViewGroup)?.removeView(webView)
                        webView
                    },
                    modifier = Modifier.fillMaxSize()
                )

                if (!hideOverlayControls && !isInPip) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color(0xB3000000), Color.Transparent)
                                )
                            )
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                            .align(Alignment.TopStart),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = {
                                if (isFullscreen) {
                                    isFullscreen = false
                                } else {
                                    onBack()
                                }
                            },
                            modifier = Modifier.size(44.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                "Back",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.weight(1f))
                        if (!isFullscreen && canToggleTheater) {
                            IconButton(
                                onClick = { isTheater = !isTheater },
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(
                                    imageVector = if (theaterMode) Icons.Default.AspectRatio else Icons.Default.Crop169,
                                    contentDescription = if (theaterMode) "Default view" else "Theater mode",
                                    tint = if (theaterMode) colors.accent else Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }
                        IconButton(
                            onClick = { isFullscreen = !isFullscreen },
                            modifier = Modifier.size(44.dp)
                        ) {
                            Icon(
                                if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                "Fullscreen",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }
            } else if (currentSource != null) {
                val barsVisible = isControlsVisible && !hideOverlayControls && !isInPip

                AndroidView(
                    factory = { ctx ->
                        PlayerView(ctx).apply {
                            this.player = exoPlayer
                            useController = false
                            keepScreenOn = true
                            setKeepContentOnPlayerReset(true)
                            setShutterBackgroundColor(android.graphics.Color.TRANSPARENT)
                            subtitleView?.visibility = View.GONE
                        }
                    },
                    update = { view ->
                        if (view.player !== exoPlayer) {
                            view.player = exoPlayer
                        }
                    },
                    onRelease = { view ->
                        view.player = null
                    },
                    modifier = Modifier.fillMaxSize()
                )

                // Elevated Subtitle Overlay
                if (currentCues.isNotEmpty() && !isInPip) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(
                                bottom = if (barsVisible) {
                                    if (isFullscreen) 110.dp else 94.dp
                                } else {
                                    if (isFullscreen) 48.dp else 16.dp
                                }
                            ),
                        contentAlignment = Alignment.BottomCenter
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(horizontal = 24.dp)
                        ) {
                            currentCues.forEach { cue ->
                                cue.text?.let { text ->
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xB3000000), RoundedCornerShape(4.dp))
                                            .padding(horizontal = 12.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = text.toString(),
                                            color = Color.White,
                                            fontSize = if (isFullscreen) 18.sp else 14.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            textAlign = TextAlign.Center,
                                            lineHeight = if (isFullscreen) 24.sp else 18.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Gesture layer: single tap toggles controls, double-tap seeks +-10s
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(hideOverlayControls) {
                            detectTapGestures(
                                onTap = {
                                    if (!hideOverlayControls) {
                                        isControlsVisible = !isControlsVisible
                                    }
                                },
                                onDoubleTap = { offset ->
                                    val goBack = offset.x < size.width / 2f
                                    seekBy(if (goBack) -10_000L else 10_000L)
                                    seekFlash = if (goBack) "back" else "forward"
                                }
                            )
                        }
                )

                // Double-tap seek feedback
                if (seekFlash != null && !isInPip) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
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
                if (isBuffering && !isInPip) {
                    CircularProgressIndicator(
                        color = colors.accent,
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(44.dp)
                    )
                }

                // Top bar: gradient scrim + back / title / theater / PiP / fullscreen
                AnimatedVisibility(
                    visible = barsVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color(0xE6000000), Color(0x33000000), Color.Transparent)
                            )
                        )
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(
                                horizontal = 8.dp,
                                vertical = if (isFullscreen) 6.dp else 2.dp
                            ),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = {
                                if (isFullscreen) {
                                    isFullscreen = false
                                } else {
                                    onBack()
                                }
                            },
                            modifier = Modifier.size(if (isFullscreen) 44.dp else 40.dp)
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.ArrowBack,
                                "Back",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = uiState.movie?.title ?: "",
                                color = Color.White,
                                fontSize = if (isFullscreen) 15.sp else 14.sp,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (hasEpisodes) {
                                Text(
                                    text = "Episode ${uiState.currentEpisode}",
                                    color = Color.White.copy(alpha = 0.72f),
                                    fontSize = 11.sp
                                )
                            }
                        }

                        if (!isFullscreen && canToggleTheater) {
                            IconButton(
                                onClick = { isTheater = !isTheater },
                                modifier = Modifier.size(40.dp)
                            ) {
                                Icon(
                                    imageVector = if (theaterMode) Icons.Default.AspectRatio else Icons.Default.Crop169,
                                    contentDescription = if (theaterMode) "Default view" else "Theater mode",
                                    tint = if (theaterMode) colors.accent else Color.White,
                                    modifier = Modifier.size(21.dp)
                                )
                            }
                        }

                        IconButton(
                            onClick = onEnterPip,
                            modifier = Modifier.size(if (isFullscreen) 44.dp else 40.dp)
                        ) {
                            Icon(
                                Icons.Default.PictureInPicture,
                                "PiP",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }

                        IconButton(
                            onClick = { isFullscreen = !isFullscreen },
                            modifier = Modifier.size(if (isFullscreen) 44.dp else 40.dp)
                        ) {
                            Icon(
                                if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                "Fullscreen",
                                tint = Color.White,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }

                // Bottom controls: seek bar, time, speed, transport buttons
                AnimatedVisibility(
                    visible = barsVisible,
                    enter = fadeIn(),
                    exit = fadeOut(),
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color(0x4D000000), Color(0xE6000000))
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
                                fontSize = 11.sp
                            )
                            Slider(
                                value = positionMs.toFloat()
                                    .coerceIn(0f, if (durationMs > 0) durationMs.toFloat() else 1f),
                                onValueChange = {
                                    dragging = true
                                    positionMs = it.toLong()
                                },
                                onValueChangeFinished = {
                                    dragging = false
                                    if (durationMs > 0) exoPlayer.seekTo(positionMs)
                                },
                                valueRange = 0f..(if (durationMs > 0) durationMs.toFloat() else 1f),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(if (isFullscreen) 36.dp else 28.dp)
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
                                fontSize = 11.sp
                            )
                            Box {
                                TextButton(
                                    onClick = { speedMenuOpen = true },
                                    contentPadding = PaddingValues(horizontal = 6.dp)
                                ) {
                                    Text(
                                        text = playbackSpeedLabel(playbackSpeed),
                                        color = if (playbackSpeed != 1f) colors.accent else Color.White,
                                        fontSize = 11.sp,
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

                            IconButton(
                                onClick = { isFullscreen = !isFullscreen },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(
                                    if (isFullscreen) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                    "Toggle Fullscreen",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }

                        // Transport row
                        val transportSize = if (isFullscreen) 48.dp else 40.dp
                        val playSize = if (isFullscreen) 64.dp else 48.dp
                        val transportIconSize = if (isFullscreen) 26.dp else 22.dp
                        val playIconSize = if (isFullscreen) 34.dp else 28.dp

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(
                                    start = 16.dp,
                                    end = 16.dp,
                                    top = 2.dp,
                                    bottom = if (isFullscreen) 20.dp else 8.dp
                                ),
                            horizontalArrangement = Arrangement.Center,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(
                                onClick = {
                                    if (hasPrevEpisode) viewModel.changeEpisode(uiState.currentEpisode - 1)
                                },
                                modifier = Modifier
                                    .size(transportSize)
                                    .alpha(if (hasPrevEpisode) 1f else 0.35f),
                                enabled = hasPrevEpisode
                            ) {
                                Icon(
                                    Icons.Default.SkipPrevious,
                                    "Previous episode",
                                    tint = Color.White,
                                    modifier = Modifier.size(transportIconSize)
                                )
                            }
                            IconButton(
                                onClick = { seekBy(-10_000L) },
                                modifier = Modifier.size(transportSize)
                            ) {
                                Icon(
                                    Icons.Default.FastRewind,
                                    "Back 10 seconds",
                                    tint = Color.White,
                                    modifier = Modifier.size(transportIconSize)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(
                                onClick = {
                                    if (exoPlayer.isPlaying) {
                                        exoPlayer.pause()
                                        userPaused = true
                                    } else {
                                        exoPlayer.play()
                                        userPaused = false
                                    }
                                },
                                modifier = Modifier
                                    .size(playSize)
                                    .background(Color(0xCC000000), CircleShape)
                                    .border(1.dp, Color.White.copy(alpha = 0.35f), CircleShape)
                            ) {
                                Icon(
                                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    "Play / Pause",
                                    tint = Color.White,
                                    modifier = Modifier.size(playIconSize)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            IconButton(
                                onClick = { seekBy(10_000L) },
                                modifier = Modifier.size(transportSize)
                            ) {
                                Icon(
                                    Icons.Default.FastForward,
                                    "Forward 10 seconds",
                                    tint = Color.White,
                                    modifier = Modifier.size(transportIconSize)
                                )
                            }
                            IconButton(
                                onClick = {
                                    if (hasNextEpisode) viewModel.changeEpisode(uiState.currentEpisode + 1)
                                },
                                modifier = Modifier
                                    .size(transportSize)
                                    .alpha(if (hasNextEpisode) 1f else 0.35f),
                                enabled = hasNextEpisode
                            ) {
                                Icon(
                                    Icons.Default.SkipNext,
                                    "Next episode",
                                    tint = Color.White,
                                    modifier = Modifier.size(transportIconSize)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    val movie = uiState.movie

    val movieInfoBlock: @Composable (Modifier) -> Unit = { mod ->
        if (movie != null) {
            WatchMovieInfoCard(
                movie = movie,
                isSaved = uiState.isSaved,
                onToggleSave = {
                    if (userRepo != null) viewModel.toggleMyList(userRepo)
                },
                modifier = mod
            )
        }
    }

    val episodesBlock: @Composable (Dp) -> Unit = { horizontalPadding ->
        if (movie != null && !movie.episodes.isNullOrEmpty()) {
            WatchEpisodesSection(
                movie = movie,
                uiState = uiState,
                onEpisodeClick = { ep -> viewModel.changeEpisode(ep.number) },
                onServerChange = { server -> viewModel.changeServer(server) },
                horizontalPadding = horizontalPadding
            )
        }
    }

    val genresBlock: @Composable (Dp) -> Unit = { horizontalPadding ->
        if (uiState.genres.isNotEmpty()) {
            WatchGenresSection(
                genres = uiState.genres,
                language = language,
                onCategoryClick = onCategoryClick,
                horizontalPadding = horizontalPadding
            )
        }
    }

    val tabletopSubtitle = remember(movie, uiState.currentEpisode, hasEpisodes) {
        buildString {
            if (hasEpisodes) append("Episode ${uiState.currentEpisode}")
            movie?.year?.takeIf { it > 0 }?.let { yr ->
                if (isNotEmpty()) append(" • ")
                append(yr)
            }
        }
    }

    // ---- 5 Responsive Layout Branches ----
    when {
        isFullscreen || isInPip -> {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                playerContent(Modifier.fillMaxSize(), isInPip)
            }
        }

        windowState.isTabletop -> {
            // 1. Flex / Tabletop mode (half-opened horizontal hinge)
            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                val topPaneHeight = if (windowState.hingeTopDp > 120f) {
                    windowState.hingeTopDp.dp
                } else {
                    maxHeight * 0.5f
                }
                Column(modifier = Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(topPaneHeight)
                            .background(Color.Black)
                            .statusBarsPadding()
                    ) {
                        playerContent(Modifier.fillMaxSize(), !dismissedTabletop && !shouldUseEmbed)
                    }
                    if (windowState.hingeHeightDp > 0f) {
                        Spacer(modifier = Modifier.height(windowState.hingeHeightDp.dp))
                    }
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    ) {
                        if (!dismissedTabletop && !shouldUseEmbed) {
                            KvTabletopVideoControls(
                                player = exoPlayer,
                                title = movie?.title.orEmpty(),
                                subtitle = tabletopSubtitle,
                                hasPrevEpisode = hasPrevEpisode,
                                hasNextEpisode = hasNextEpisode,
                                playbackSpeed = playbackSpeed,
                                onPlaybackSpeedChange = { playbackSpeed = it },
                                onPreviousEpisode = {
                                    if (hasPrevEpisode) viewModel.changeEpisode(uiState.currentEpisode - 1)
                                },
                                onNextEpisode = {
                                    if (hasNextEpisode) viewModel.changeEpisode(uiState.currentEpisode + 1)
                                },
                                onFullscreen = { isFullscreen = true },
                                onClose = { dismissedTabletop = true },
                                onUserPausedChanged = { userPaused = it },
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(colors.bgPrimary)
                                    .navigationBarsPadding()
                            ) {
                                if (!shouldUseEmbed) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(horizontal = 16.dp, vertical = 8.dp),
                                        horizontalArrangement = Arrangement.End
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(18.dp))
                                                .background(colors.bgTertiary)
                                                .border(1.dp, colors.borderPrimary, RoundedCornerShape(18.dp))
                                                .clickable { dismissedTabletop = false }
                                                .padding(horizontal = 12.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Filled.Tune,
                                                contentDescription = null,
                                                tint = colors.accent,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Text(
                                                text = "Show video controls",
                                                color = colors.textPrimary,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Medium
                                            )
                                        }
                                    }
                                }

                                LazyVerticalGrid(
                                    columns = GridCells.Fixed(2),
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxWidth(),
                                    contentPadding = PaddingValues(bottom = 24.dp)
                                ) {
                                    gridWatchDetailsItems(
                                        movie = movie,
                                        uiState = uiState,
                                        language = language,
                                        movieInfoBlock = movieInfoBlock,
                                        episodesBlock = episodesBlock,
                                        genresBlock = genresBlock,
                                        onMovieClick = onMovieClick
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        windowState.isFoldablePortraitWatch -> {
            // 2. Unfolded Foldable Portrait (600-839dp)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colors.bgPrimary)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black)
                        .windowInsetsTopHeight(WindowInsets.statusBars)
                )
                BoxWithConstraints(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                ) {
                    val playerHeight = min(maxWidth * 9f / 16f, maxHeight * 0.52f)
                    Column(modifier = Modifier.fillMaxSize()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(playerHeight)
                                .background(Color.Black),
                            contentAlignment = Alignment.Center
                        ) {
                            playerContent(Modifier.fillMaxSize(), false)
                        }
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .navigationBarsPadding(),
                            contentPadding = PaddingValues(bottom = 24.dp)
                        ) {
                            gridWatchDetailsItems(
                                movie = movie,
                                uiState = uiState,
                                language = language,
                                movieInfoBlock = movieInfoBlock,
                                episodesBlock = episodesBlock,
                                genresBlock = genresBlock,
                                onMovieClick = onMovieClick
                            )
                        }
                    }
                }
            }
        }

        windowState.isLandscapeTwoPaneWatch -> {
            // 3. Unfolded Foldable Landscape / Book Posture / Tablet Watch Screen
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colors.bgPrimary)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black)
                        .windowInsetsTopHeight(WindowInsets.statusBars)
                )

                val sidePanelContent: LazyListScope.() -> Unit = {
                    if (movie != null && !movie.episodes.isNullOrEmpty()) {
                        item {
                            episodesBlock(0.dp)
                            Spacer(modifier = Modifier.height(10.dp))
                        }
                    }
                    if (uiState.recommendations.isNotEmpty()) {
                        item {
                            WatchRecommendationsHeader(
                                language = language,
                                horizontalPadding = 0.dp
                            )
                        }
                        itemsIndexed(
                            items = uiState.recommendations,
                            key = { idx, rec -> "rec_${rec.slug}_$idx" }
                        ) { _, rec ->
                            CompactMovieRow(
                                movie = rec,
                                onClick = { onMovieClick(rec.slug) }
                            )
                        }
                    }
                }

                if (theaterMode) {
                    // Theater: full-width pinned player on top, info + elevated side panel below
                    BoxWithConstraints(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                    ) {
                        val playerHeight = min(maxWidth * 9f / 16f, maxHeight * 0.72f)
                        val playerWidth = playerHeight * 16f / 9f
                        Column(modifier = Modifier.fillMaxSize()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(playerHeight)
                                    .background(Color.Black),
                                contentAlignment = Alignment.Center
                            ) {
                                playerContent(
                                    Modifier
                                        .width(playerWidth)
                                        .fillMaxHeight(),
                                    false
                                )
                            }
                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth()
                                    .navigationBarsPadding()
                            ) {
                                LazyColumn(
                                    modifier = Modifier
                                        .weight(0.62f)
                                        .fillMaxHeight(),
                                    contentPadding = PaddingValues(bottom = 24.dp)
                                ) {
                                    item { movieInfoBlock(Modifier.padding(16.dp)) }
                                    item { genresBlock(16.dp) }
                                }
                                Surface(
                                    modifier = Modifier
                                        .weight(0.38f)
                                        .fillMaxHeight()
                                        .padding(start = 8.dp, end = 10.dp, top = 8.dp),
                                    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                                    color = colors.bgSecondary
                                ) {
                                    LazyColumn(
                                        modifier = Modifier.fillMaxSize(),
                                        contentPadding = PaddingValues(14.dp),
                                        verticalArrangement = Arrangement.spacedBy(10.dp),
                                        content = sidePanelContent
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // Default 2-pane landscape: player + info left, elevated episodes + related right
                    val useHingeSplit = windowState.isBook && windowState.hingeStartDp > 200f
                    Row(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .navigationBarsPadding()
                    ) {
                        val leftModifier = if (useHingeSplit) {
                            Modifier.width(windowState.hingeStartDp.dp)
                        } else {
                            Modifier.weight(0.62f)
                        }
                        BoxWithConstraints(modifier = leftModifier.fillMaxHeight()) {
                            val playerHeight = min(maxWidth * 9f / 16f, maxHeight * 0.62f)
                            val playerWidth = playerHeight * 16f / 9f
                            Column(modifier = Modifier.fillMaxSize()) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(playerHeight)
                                        .background(Color.Black),
                                    contentAlignment = Alignment.Center
                                ) {
                                    playerContent(
                                        Modifier
                                            .width(playerWidth)
                                            .fillMaxHeight(),
                                        false
                                    )
                                }
                                LazyColumn(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxWidth(),
                                    contentPadding = PaddingValues(bottom = 24.dp)
                                ) {
                                    item { movieInfoBlock(Modifier.padding(16.dp)) }
                                    item { genresBlock(16.dp) }
                                }
                            }
                        }

                        if (useHingeSplit && windowState.hingeWidthDp > 0f) {
                            Spacer(modifier = Modifier.width(windowState.hingeWidthDp.dp))
                        }

                        val rightModifier = if (useHingeSplit) {
                            Modifier.weight(1f)
                        } else {
                            Modifier.weight(0.38f)
                        }
                        Surface(
                            modifier = rightModifier
                                .fillMaxHeight()
                                .padding(start = 8.dp, end = 10.dp, top = 8.dp),
                            shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
                            color = colors.bgSecondary
                        ) {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
                                contentPadding = PaddingValues(14.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                                content = sidePanelContent
                            )
                        }
                    }
                }
            }
        }

        else -> {
            // 4. Compact phones (< 600dp)
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colors.bgPrimary)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color.Black)
                        .windowInsetsTopHeight(WindowInsets.statusBars)
                )
                playerContent(
                    Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f),
                    false
                )
                LazyColumn(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .navigationBarsPadding(),
                    contentPadding = PaddingValues(bottom = 24.dp)
                ) {
                    item { movieInfoBlock(Modifier.padding(16.dp)) }
                    if (movie != null && !movie.episodes.isNullOrEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(4.dp))
                            episodesBlock(16.dp)
                        }
                    }
                    if (uiState.recommendations.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            MovieRow(
                                title = if (language == "vi") "Có thể bạn cũng thích" else "You May Also Like",
                                movies = uiState.recommendations,
                                onClick = { onMovieClick(it.slug) }
                            )
                        }
                    }
                    if (uiState.genres.isNotEmpty()) {
                        item {
                            Spacer(modifier = Modifier.height(20.dp))
                            genresBlock(16.dp)
                        }
                    }
                }
            }
        }
    }
}

private fun LazyGridScope.gridWatchDetailsItems(
    movie: MovieDetail?,
    uiState: PlayerUiState,
    language: String,
    movieInfoBlock: @Composable (Modifier) -> Unit,
    episodesBlock: @Composable (Dp) -> Unit,
    genresBlock: @Composable (Dp) -> Unit,
    onMovieClick: (String) -> Unit
) {
    item(span = { GridItemSpan(maxLineSpan) }) {
        movieInfoBlock(Modifier.padding(16.dp))
    }
    if (movie != null && !movie.episodes.isNullOrEmpty()) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            episodesBlock(16.dp)
            Spacer(modifier = Modifier.height(12.dp))
        }
    }
    if (uiState.genres.isNotEmpty()) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            genresBlock(16.dp)
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
    if (uiState.recommendations.isNotEmpty()) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            WatchRecommendationsHeader(
                language = language,
                horizontalPadding = 16.dp,
                modifier = Modifier.padding(bottom = 8.dp)
            )
        }
        gridItemsIndexed(
            items = uiState.recommendations,
            key = { idx, rec -> "grec_${rec.slug}_$idx" }
        ) { idx, rec ->
            HorizontalMovieCard(
                movie = rec,
                onClick = { onMovieClick(rec.slug) },
                width = null,
                modifier = Modifier.padding(
                    start = if (idx % 2 == 0) 16.dp else 6.dp,
                    end = if (idx % 2 == 0) 6.dp else 16.dp,
                    bottom = 12.dp
                )
            )
        }
    }
}

@Composable
private fun WatchMovieInfoCard(
    movie: MovieDetail,
    isSaved: Boolean,
    onToggleSave: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    var expandedDesc by remember(movie.slug) { mutableStateOf(false) }

    Box(
        modifier = modifier
            .fillMaxWidth()
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
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 26.sp
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        movie.quality?.takeIf { it.isNotBlank() }?.let { quality ->
                            Box(
                                modifier = Modifier
                                    .background(colors.accent, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = quality,
                                    color = colors.onAccent,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        movie.year?.takeIf { it > 0 }?.let { year ->
                            Text(
                                text = "$year",
                                color = colors.textDim,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(
                            text = "98% Match",
                            color = GreenMatch,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                IconButton(onClick = onToggleSave) {
                    Icon(
                        imageVector = if (isSaved) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                        contentDescription = "Save",
                        tint = if (isSaved) colors.accent else colors.textPrimary,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            if (!movie.originalTitle.isNullOrBlank() && movie.originalTitle != movie.title) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = movie.originalTitle,
                    color = colors.textDim,
                    fontSize = 13.sp
                )
            }

            if (movie.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = movie.description.stripHtml(),
                    color = colors.textSecondary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    maxLines = if (expandedDesc) Int.MAX_VALUE else 4,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.clickable { expandedDesc = !expandedDesc }
                )
            }
        }
    }
}

@Composable
private fun WatchEpisodesSection(
    movie: MovieDetail,
    uiState: PlayerUiState,
    onEpisodeClick: (com.kvnetflix.mobile.data.model.Episode) -> Unit,
    onServerChange: (String) -> Unit,
    horizontalPadding: Dp
) {
    val colors = KvTheme.colors
    val episodes = movie.episodes ?: return
    val filteredCount = if (uiState.selectedServer.isNotEmpty()) {
        episodes.count { it.serverName == uiState.selectedServer }
    } else {
        episodes.size
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = horizontalPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(18.dp)
                    .background(colors.accent, RoundedCornerShape(2.dp))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Episodes",
                color = colors.textPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "$filteredCount total",
                color = colors.textDim,
                fontSize = 13.sp
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        EpisodeGrid(
            episodes = episodes,
            currentEpisode = uiState.currentEpisode,
            onEpisodeClick = onEpisodeClick,
            servers = uiState.servers,
            selectedServer = uiState.selectedServer,
            onServerChange = onServerChange,
            horizontalPadding = horizontalPadding
        )
    }
}

@Composable
private fun WatchGenresSection(
    genres: List<Category>,
    language: String,
    onCategoryClick: (String) -> Unit,
    horizontalPadding: Dp
) {
    val colors = KvTheme.colors
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(horizontal = horizontalPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(18.dp)
                    .background(colors.accent, RoundedCornerShape(2.dp))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = if (language == "vi") "Thể loại" else "Categories",
                color = colors.textPrimary,
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
        }
        Spacer(modifier = Modifier.height(10.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState())
                .padding(horizontal = horizontalPadding),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            genres.forEach { genre ->
                val label = Constants.GENRES.find { it.id == genre.Slug }?.let {
                    if (language == "vi") it.vi else it.en
                } ?: genre.Name

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(20.dp))
                        .background(colors.bgSecondary)
                        .border(1.dp, colors.borderSubtle, RoundedCornerShape(20.dp))
                        .clickable { onCategoryClick(genre.Slug) }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = label,
                        color = colors.textSecondary,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

@Composable
private fun WatchRecommendationsHeader(
    language: String,
    horizontalPadding: Dp,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = horizontalPadding),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .width(3.dp)
                .height(18.dp)
                .background(colors.accent, RoundedCornerShape(2.dp))
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (language == "vi") "Có thể bạn cũng thích" else "You May Also Like",
            color = colors.textPrimary,
            fontSize = 17.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

private fun formatPlaybackTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0L)
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}

private fun playbackSpeedLabel(speed: Float): String {
    val str = if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()
    return "${str}x"
}
