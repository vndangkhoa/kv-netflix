package com.kvnetflix.mobile.ui.screens

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.OrientationEventListener
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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

                        LaunchedEffect(uiState.source, uiState.currentEpisode) {
                            try {
                                val source = uiState.source ?: return@LaunchedEffect
                                if (source.streamUrl.isNotEmpty()) {
                                    exoRetryCount = 0
                                    val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                                        .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                                        .setConnectTimeoutMs(15_000)
                                        .setReadTimeoutMs(30_000)
                                        .setAllowCrossProtocolRedirects(true)
                                    val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
                                    val mediaItem = MediaItem.fromUri(source.streamUrl)

                                    player.addListener(object : androidx.media3.common.Player.Listener {
                                        override fun onPlayerError(error: PlaybackException) {
                                            android.util.Log.e("WatchScreen", "ExoPlayer error (attempt ${exoRetryCount + 1}/$maxRetries): ${error.message}", error)
                                            if (exoRetryCount < maxRetries && source.streamUrl.isNotEmpty()) {
                                                exoRetryCount++
                                                android.util.Log.d("WatchScreen", "Retrying ExoPlayer in 1s (attempt $exoRetryCount)")
                                                player.stop()
                                                player.setMediaSource(
                                                    if (source.streamUrl.contains(".m3u8", ignoreCase = true)) {
                                                        HlsMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
                                                    } else {
                                                        androidx.media3.common.MediaItem.fromUri(source.streamUrl).let {
                                                            player.setMediaItem(it)
                                                            return
                                                        }
                                                    }
                                                )
                                                player.prepare()
                                                player.playWhenReady = true
                                            } else {
                                                android.util.Log.e("WatchScreen", "Max retries reached, switching to WebView embed")
                                                isFallbackToEmbed = true
                                            }
                                        }
                                    })

                                    if (source.streamUrl.contains(".m3u8", ignoreCase = true)) {
                                        val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
                                            .createMediaSource(mediaItem)
                                        player.setMediaSource(hlsSource)
                                    } else {
                                        player.setMediaItem(mediaItem)
                                    }
                                    player.prepare()
                                    player.playWhenReady = true
                                }
                                if (userRepo != null) {
                                    viewModel.saveToHistory(userRepo)
                                }
                            } catch (e: Exception) {
                                android.util.Log.e("WatchScreen", "Player setup error", e)
                                isFallbackToEmbed = true
                            }
                        }

                        DisposableEffect(Unit) {
                            onDispose { player.release() }
                        }

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .clickable { isControlsVisible = !isControlsVisible }
                        ) {
                            AndroidView(
                                factory = { ctx ->
                                    PlayerView(ctx).apply {
                                        this.player = player
                                        useController = true
                                        keepScreenOn = true
                                        setControllerVisibilityListener(PlayerView.ControllerVisibilityListener { visibility ->
                                            isControlsVisible = (visibility == android.view.View.VISIBLE)
                                        })
                                    }
                                },
                                modifier = Modifier.fillMaxSize()
                            )

                            // Overlay buttons (hidden when movie controls hide or during PiP mode)
                            androidx.compose.animation.AnimatedVisibility(
                                visible = isControlsVisible && activity?.isInPictureInPictureMode != true,
                                enter = fadeIn(),
                                exit = fadeOut(),
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(8.dp)
                                    .fillMaxWidth()
                            ) {
                                Box(modifier = Modifier.fillMaxWidth()) {
                                    // Back button (left)
                                    if (!isFullscreen) {
                                        IconButton(
                                            onClick = onBack,
                                            modifier = Modifier
                                                .align(Alignment.TopStart)
                                                .size(40.dp)
                                        ) {
                                            Icon(
                                                Icons.AutoMirrored.Filled.ArrowBack,
                                                "Back",
                                                tint = Color.White,
                                                modifier = Modifier.size(24.dp)
                                            )
                                        }
                                    }

                                    // Fullscreen + PiP buttons (right)
                                    Row(
                                        modifier = Modifier.align(Alignment.TopEnd),
                                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                                    ) {
                                        IconButton(
                                            onClick = onEnterPip,
                                            modifier = Modifier.size(40.dp)
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
                                            modifier = Modifier.size(40.dp)
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
