package com.streamflow.tv.ui.screens

import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.PlayerViewModel
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
    "ad.lgappstv.com",
    "ads.lgappstv.com",
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

@OptIn(UnstableApi::class)
@kotlin.OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerScreen(
    slug: String,
    episode: Int = 1,
    server: String? = null,
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    viewModel: PlayerViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val colors = StreamFlowTheme.colors
    var isFallbackToEmbed by remember { mutableStateOf(false) }

    LaunchedEffect(slug, episode, server) {
        isFallbackToEmbed = false
        viewModel.loadPlayer(slug, episode, server)
    }

    LaunchedEffect(uiState.movie) {
        if (uiState.movie != null && userDataRepository != null) {
            viewModel.saveToHistory(userDataRepository)
        }
    }

    // ExoPlayer setup with optimized buffer
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

    // ForwardingPlayer to handle TV Remote Next/Prev episode actions
    val forwardingPlayer = remember(exoPlayer, uiState.movie, uiState.currentEpisode) {
        object : androidx.media3.common.ForwardingPlayer(exoPlayer) {
            override fun getAvailableCommands(): androidx.media3.common.Player.Commands {
                return super.getAvailableCommands().buildUpon()
                    .add(androidx.media3.common.Player.COMMAND_SEEK_TO_NEXT)
                    .add(androidx.media3.common.Player.COMMAND_SEEK_TO_PREVIOUS)
                    .add(androidx.media3.common.Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
                    .add(androidx.media3.common.Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
                    .build()
            }

            override fun hasNextMediaItem(): Boolean {
                val eps = uiState.movie?.episodes ?: return false
                if (eps.isEmpty()) return false
                val maxEp = eps.maxOf { it.number }
                return uiState.currentEpisode < maxEp
            }
            override fun hasPreviousMediaItem(): Boolean {
                val eps = uiState.movie?.episodes ?: return false
                if (eps.isEmpty()) return false
                val minEp = eps.minOf { it.number }
                return uiState.currentEpisode > minEp
            }
            override fun seekToNextMediaItem() {
                if (hasNextMediaItem()) {
                    viewModel.changeEpisode(uiState.currentEpisode + 1)
                }
            }
            override fun seekToNext() { seekToNextMediaItem() }
            override fun seekToPreviousMediaItem() {
                if (hasPreviousMediaItem()) {
                    viewModel.changeEpisode(uiState.currentEpisode - 1)
                }
            }
            override fun seekToPrevious() { seekToPreviousMediaItem() }
        }
    }

    // Configure ExoPlayer media source with retry and optimized settings
    var exoRetryCount by remember { mutableIntStateOf(0) }
    val maxRetries = 3

    LaunchedEffect(uiState.source, isFallbackToEmbed) {
        val source = uiState.source
        if (source != null && !source.isEmbed && !isFallbackToEmbed) {
            exoRetryCount = 0
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .setConnectTimeoutMs(15_000)
                .setReadTimeoutMs(30_000)
                .setAllowCrossProtocolRedirects(true)

            val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
            val mediaItem = MediaItem.fromUri(source.streamUrl)

            android.util.Log.d("PlayerScreen", "Loading ExoPlayer stream: ${source.streamUrl}")

            exoPlayer.addListener(object : androidx.media3.common.Player.Listener {
                override fun onPlayerError(error: PlaybackException) {
                    android.util.Log.e("PlayerScreen", "ExoPlayer error (attempt ${exoRetryCount + 1}/$maxRetries): ${error.message}", error)
                    if (exoRetryCount < maxRetries && source.streamUrl.isNotEmpty()) {
                        exoRetryCount++
                        android.util.Log.d("PlayerScreen", "Retrying ExoPlayer (attempt $exoRetryCount)")
                        exoPlayer.stop()
                        val retryMediaItem = MediaItem.fromUri(source.streamUrl)
                        if (source.streamUrl.contains(".m3u8", ignoreCase = true)) {
                            val retryHlsSource = HlsMediaSource.Factory(dataSourceFactory).createMediaSource(retryMediaItem)
                            exoPlayer.setMediaSource(retryHlsSource)
                        } else {
                            exoPlayer.setMediaItem(retryMediaItem)
                        }
                        exoPlayer.prepare()
                        exoPlayer.playWhenReady = true
                    } else {
                        isFallbackToEmbed = true
                    }
                }
            })

            if (source.streamUrl.contains(".m3u8", ignoreCase = true)) {
                val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(mediaItem)
                exoPlayer.setMediaSource(hlsSource)
            } else {
                exoPlayer.setMediaItem(mediaItem)
            }
            exoPlayer.prepare()
            exoPlayer.playWhenReady = true
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            exoPlayer.release()
        }
    }

    val focusRequester = remember { FocusRequester() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        val currentSource = uiState.source
        val shouldUseEmbed = currentSource?.isEmbed == true || isFallbackToEmbed

        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    androidx.compose.material3.CircularProgressIndicator(color = colors.primary)
                    Spacer(Modifier.height(16.dp))
                    Text(text = "Loading stream...", style = StreamFlowTheme.typography.bodyLarge)
                }
            }
        } else if (uiState.error != null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(24.dp)
                ) {
                    Text(
                        text = "Unable to play stream",
                        style = StreamFlowTheme.typography.titleMedium,
                        color = Color.White
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = uiState.error ?: "Stream server is offline or unreachable.",
                        style = StreamFlowTheme.typography.bodyMedium,
                        color = Color.LightGray
                    )
                    Spacer(Modifier.height(24.dp))
                    Row {
                        androidx.tv.material3.Button(
                            onClick = { viewModel.retryStream() }
                        ) {
                            Text("Retry Stream")
                        }
                        Spacer(Modifier.width(16.dp))
                        androidx.tv.material3.Button(
                            onClick = { (context as? android.app.Activity)?.finish() }
                        ) {
                            Text("Go Back")
                        }
                    }
                }
            }
        } else if (shouldUseEmbed && currentSource != null) {
            // Android TV WebView Embed Player Component
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
                        settings.userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

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

                        // Allow WebView to capture TV remote D-Pad OK key
                        setOnKeyListener { v, keyCode, event ->
                            if (event.action == KeyEvent.ACTION_DOWN && (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER)) {
                                (v as? WebView)?.evaluateJavascript(
                                    """
                                    (function() {
                                        var v = document.querySelector('video');
                                        if (v) {
                                            if (v.paused) v.play(); else v.pause();
                                        }
                                    })();
                                    """.trimIndent(), null
                                )
                                true
                            } else {
                                false
                            }
                        }

                        loadUrl(currentSource.streamUrl)
                    }
                },
                modifier = Modifier
                    .fillMaxSize()
                    .focusRequester(focusRequester)
                    .focusable()
            )
        } else if (currentSource != null) {
            // ExoPlayer Native Player View
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = forwardingPlayer
                        useController = true
                        setShowNextButton(true)
                        setShowPreviousButton(true)
                        controllerShowTimeoutMs = 3500
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxSize()
                    .focusRequester(focusRequester)
                    .focusable()
            )

            LaunchedEffect(Unit) {
                focusRequester.requestFocus()
            }
        }
    }
}
