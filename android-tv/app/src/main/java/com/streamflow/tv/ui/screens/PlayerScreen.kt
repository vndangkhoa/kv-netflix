package com.streamflow.tv.ui.screens

import android.view.KeyEvent
import android.view.ViewGroup
import androidx.activity.compose.BackHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.focusable
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.key.*
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import androidx.tv.material3.Border
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.navigation.LocalNavController
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.PlayerViewModel
import java.io.ByteArrayInputStream
import kotlinx.coroutines.delay

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

            // Auto-click resume modal if present in embed iframe
            try {
                var resumeBtn = Array.from(document.querySelectorAll('button, a, div, span')).find(function(el) {
                    return el.textContent && (el.textContent.includes('Tiếp tục') || el.textContent.includes('Xem từ đầu'));
                });
                if (resumeBtn) { resumeBtn.click(); }
            } catch(e) {}

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
        var resumeBtn = Array.from(document.querySelectorAll('button, a, div, span')).find(function(el) {
            return el.textContent && (el.textContent.includes('Tiếp tục') || el.textContent.includes('Xem từ đầu'));
        });
        if (resumeBtn) { resumeBtn.click(); }
        var v = document.querySelector('video');
        if (v) { v.play().catch(function(){}); }
    } catch(e) {}
})();
"""

private fun formatTimeMs(millis: Long): String {
    if (millis <= 0) return "00:00"
    val totalSeconds = millis / 1000
    val seconds = totalSeconds % 60
    val minutes = (totalSeconds / 60) % 60
    val hours = totalSeconds / 3600
    return if (hours > 0) {
        String.format("%02d:%02d:%02d", hours, minutes, seconds)
    } else {
        String.format("%02d:%02d", minutes, seconds)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvPlayerControlButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    text: String? = null,
    isPrimary: Boolean = false,
    focusRequester: FocusRequester? = null
) {
    var isFocused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(targetValue = if (isFocused) 1.22f else 1.0f, label = "button_scale")

    val bgBrush = if (isFocused) {
        Brush.radialGradient(
            colors = listOf(Color(0xFFE50914), Color(0xFFB20710))
        )
    } else if (isPrimary) {
        Brush.horizontalGradient(
            colors = listOf(Color(0xDD333333), Color(0xDD222222))
        )
    } else {
        Brush.horizontalGradient(
            colors = listOf(Color(0xAA111111), Color(0xAA111111))
        )
    }

    val borderStroke = if (isFocused) {
        BorderStroke(3.dp, Color.White)
    } else {
        BorderStroke(1.dp, Color(0x44FFFFFF))
    }

    androidx.tv.material3.Surface(
        onClick = onClick,
        modifier = (if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .then(modifier)
            .scale(scale)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(32.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.Transparent
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(border = borderStroke),
            focusedBorder = Border(border = BorderStroke(3.dp, Color.White))
        )
    ) {
        Box(
            modifier = Modifier
                .background(bgBrush)
                .padding(
                    horizontal = if (text != null && icon != null) 16.dp else if (isPrimary) 20.dp else 14.dp,
                    vertical = if (isPrimary) 16.dp else 12.dp
                ),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (icon != null) {
                    Icon(
                        imageVector = icon,
                        contentDescription = text ?: "Control",
                        tint = if (isFocused) Color.White else Color(0xDDFFFFFF),
                        modifier = Modifier.size(if (isPrimary) 36.dp else 26.dp)
                    )
                }
                if (icon != null && text != null) {
                    Spacer(Modifier.width(8.dp))
                }
                if (text != null) {
                    Text(
                        text = text,
                        style = StreamFlowTheme.typography.labelMedium.copy(
                            color = if (isFocused) Color.White else Color(0xDDFFFFFF),
                            fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Medium
                        )
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TvSeekBar(
    currentPosition: Long,
    duration: Long,
    onSeek: (Long) -> Unit,
    modifier: Modifier = Modifier,
    focusRequester: FocusRequester? = null
) {
    var isFocused by remember { mutableStateOf(false) }
    val progressFloat = if (duration > 0) (currentPosition.toFloat() / duration.toFloat()).coerceIn(0f, 1f) else 0f
    val scale by animateFloatAsState(targetValue = if (isFocused) 1.02f else 1.0f, label = "seek_scale")

    androidx.tv.material3.Surface(
        onClick = { },
        modifier = modifier
            .fillMaxWidth()
            .scale(scale)
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { isFocused = it.isFocused }
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown && isFocused) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        KeyEvent.KEYCODE_DPAD_LEFT -> {
                            val newPos = (currentPosition - 10_000L).coerceAtLeast(0L)
                            onSeek(newPos)
                            true
                        }
                        KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            val targetDuration = if (duration > 0) duration else currentPosition + 60_000L
                            val newPos = (currentPosition + 10_000L).coerceAtMost(targetDuration)
                            onSeek(newPos)
                            true
                        }
                        else -> false
                    }
                } else {
                    false
                }
            },
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(12.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.Transparent
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border.None,
            focusedBorder = Border(border = BorderStroke(2.dp, Color.White))
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 6.dp, horizontal = 12.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatTimeMs(currentPosition),
                    style = StreamFlowTheme.typography.bodyMedium.copy(
                        fontWeight = if (isFocused) FontWeight.Bold else FontWeight.Normal
                    ),
                    color = if (isFocused) Color.White else Color(0xDDFFFFFF)
                )
                if (isFocused) {
                    Text(
                        text = "◄ D-Pad Left/Right to Seek ►",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color(0xFFE50914),
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
                Text(
                    text = formatTimeMs(duration),
                    style = StreamFlowTheme.typography.bodyMedium,
                    color = Color(0xAAFFFFFF)
                )
            }

            Spacer(Modifier.height(6.dp))

            LinearProgressIndicator(
                progress = { progressFloat },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(if (isFocused) 10.dp else 6.dp),
                color = if (isFocused) Color(0xFFE50914) else Color(0xCC06B6D4),
                trackColor = Color(0x44FFFFFF)
            )
        }
    }
}

@OptIn(UnstableApi::class)
@kotlin.OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerScreen(
    slug: String,
    episode: Int = 1,
    server: String? = null,
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    mainActivity: com.streamflow.tv.MainActivity? = null,
    viewModel: PlayerViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val colors = StreamFlowTheme.colors
    var isFallbackToEmbed by remember { mutableStateOf(false) }

    // Keep screen awake while in PlayerScreen
    DisposableEffect(Unit) {
        val activity = context as? android.app.Activity
        activity?.window?.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose { }
    }

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

    // Player position & play state tracking for overlay
    var currentPosition by remember { mutableLongStateOf(0L) }
    var duration by remember { mutableLongStateOf(0L) }
    var isPlaying by remember { mutableStateOf(false) }

    LaunchedEffect(exoPlayer) {
        while (true) {
            currentPosition = exoPlayer.currentPosition.coerceAtLeast(0L)
            duration = exoPlayer.duration.coerceAtLeast(0L)
            isPlaying = exoPlayer.isPlaying
            delay(500)
        }
    }

    // Configure ExoPlayer media source with retry
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

    var webViewRef by remember { mutableStateOf<WebView?>(null) }
    var showControls by remember { mutableStateOf(true) }
    var lastInteraction by remember { mutableLongStateOf(System.currentTimeMillis()) }
    val rootFocusRequester = remember { FocusRequester() }
    val playButtonFocusRequester = remember { FocusRequester() }
    val backButtonFocusRequester = remember { FocusRequester() }
    val exitButtonFocusRequester = remember { FocusRequester() }
    val prevEpFocusRequester = remember { FocusRequester() }
    val rewindFocusRequester = remember { FocusRequester() }
    val fastForwardFocusRequester = remember { FocusRequester() }
    val nextEpFocusRequester = remember { FocusRequester() }
    val speedFocusRequester = remember { FocusRequester() }
    val seekBarFocusRequester = remember { FocusRequester() }

    val speedSteps = listOf(1f, 1.25f, 1.5f, 0.75f, 0.5f)
    var playbackSpeed by remember { mutableFloatStateOf(1f) }

    val navController = LocalNavController.current
    val onGoBack = {
        val popped = navController?.popBackStack() ?: false
        if (!popped) {
            (context as? android.app.Activity)?.finish()
        }
    }

    DisposableEffect(mainActivity, showControls) {
        mainActivity?.onPlayerKeyAction = { keyEvent ->
            val keyCode = keyEvent.keyCode
            val isActionDown = keyEvent.action == android.view.KeyEvent.ACTION_DOWN

            if (!showControls) {
                val isWakeKey = keyCode == android.view.KeyEvent.KEYCODE_DPAD_CENTER ||
                                keyCode == android.view.KeyEvent.KEYCODE_ENTER ||
                                keyCode == android.view.KeyEvent.KEYCODE_NUMPAD_ENTER ||
                                keyCode == android.view.KeyEvent.KEYCODE_SPACE ||
                                keyCode == android.view.KeyEvent.KEYCODE_DPAD_UP ||
                                keyCode == android.view.KeyEvent.KEYCODE_DPAD_DOWN ||
                                keyCode == android.view.KeyEvent.KEYCODE_DPAD_LEFT ||
                                keyCode == android.view.KeyEvent.KEYCODE_DPAD_RIGHT

                if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
                    if (isActionDown) {
                        onGoBack()
                    }
                    true
                } else if (isWakeKey) {
                    if (isActionDown) {
                        showControls = true
                        try { playButtonFocusRequester.requestFocus() } catch (e: Exception) { }
                    }
                    true
                } else {
                    false
                }
            } else {
                if (keyCode == android.view.KeyEvent.KEYCODE_BACK) {
                    if (isActionDown) {
                        onGoBack()
                    }
                    true
                } else {
                    false
                }
            }
        }
        onDispose {
            mainActivity?.onPlayerKeyAction = null
        }
    }

    fun togglePlayPause() {
        val currentSource = uiState.source
        val shouldUseEmbed = currentSource?.isEmbed == true || isFallbackToEmbed
        if (!shouldUseEmbed) {
            if (exoPlayer.isPlaying) exoPlayer.pause() else exoPlayer.play()
            isPlaying = exoPlayer.isPlaying
        } else {
            isPlaying = !isPlaying
            webViewRef?.evaluateJavascript(
                "(function(){ var v=document.querySelector('video'); if(v){ if(v.paused) v.play(); else v.pause(); } })();", null
            )
        }
    }

    fun seekToPosition(newPos: Long) {
        val currentSource = uiState.source
        val shouldUseEmbed = currentSource?.isEmbed == true || isFallbackToEmbed
        if (!shouldUseEmbed) {
            exoPlayer.seekTo(newPos)
            currentPosition = newPos
        } else {
            val seconds = newPos / 1000
            webViewRef?.evaluateJavascript(
                "(function(){ var v=document.querySelector('video'); if(v) v.currentTime = $seconds; })();", null
            )
            currentPosition = newPos
        }
    }

    // Auto-hide controls overlay after inactivity
    LaunchedEffect(showControls, lastInteraction) {
        if (showControls) {
            delay(5000)
            showControls = false
        }
    }

    LaunchedEffect(showControls) {
        if (showControls) {
            delay(100)
            try {
                playButtonFocusRequester.requestFocus()
            } catch (e: Exception) { }
        } else {
            try {
                rootFocusRequester.requestFocus()
            } catch (e: Exception) { }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .focusRequester(rootFocusRequester)
            .focusable(enabled = !showControls)
            .onKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown) {
                    lastInteraction = System.currentTimeMillis()
                    val keyCode = keyEvent.nativeKeyEvent.keyCode

                    if (!showControls) {
                        showControls = true
                        try { playButtonFocusRequester.requestFocus() } catch (e: Exception) { }
                        true
                    } else {
                        when (keyCode) {
                            KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                                togglePlayPause()
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_PLAY -> {
                                if (!exoPlayer.isPlaying) togglePlayPause()
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                                if (exoPlayer.isPlaying) togglePlayPause()
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_FAST_FORWARD -> {
                                seekToPosition(currentPosition + 10_000L)
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_REWIND -> {
                                seekToPosition((currentPosition - 10_000L).coerceAtLeast(0L))
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_NEXT -> {
                                val eps = uiState.movie?.episodes ?: emptyList()
                                val maxEp = if (eps.isNotEmpty()) eps.maxOf { it.number } else uiState.currentEpisode + 1
                                if (uiState.currentEpisode < maxEp) {
                                    viewModel.changeEpisode(uiState.currentEpisode + 1)
                                }
                                true
                            }
                            KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                                if (uiState.currentEpisode > 1) {
                                    viewModel.changeEpisode(uiState.currentEpisode - 1)
                                }
                                true
                            }
                            KeyEvent.KEYCODE_BACK -> {
                                showControls = false
                                true
                            }
                            else -> {
                                false
                            }
                        }
                    }
                } else {
                    false
                }
            }
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
            // Android TV WebView Embed Player Component (Focusable = false so Compose receives all D-Pad input)
            AndroidView(
                factory = { ctx ->
                    WebView(ctx).apply {
                        isFocusable = false
                        isFocusableInTouchMode = false
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

                        webViewRef = this
                        loadUrl(currentSource.streamUrl)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else if (currentSource != null) {
            // ExoPlayer Native Player View (Focusable = false so Compose receives all D-Pad input)
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        player = forwardingPlayer
                        useController = false
                        isFocusable = false
                        isFocusableInTouchMode = false
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // TV Overlay Controls with D-Pad focus feedback & navigation
        AnimatedVisibility(
            visible = showControls && !uiState.isLoading && uiState.error == null,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color(0xCC000000),
                                Color(0x44000000),
                                Color(0xEE000000)
                            )
                        )
                    )
                    .padding(32.dp)
            ) {
                // Top Bar: Back button (exits player back to movie selection page) & Title info
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopStart),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TvPlayerControlButton(
                        onClick = { onGoBack() },
                        icon = Icons.AutoMirrored.Filled.ArrowBack,
                        text = "Back",
                        focusRequester = backButtonFocusRequester,
                        modifier = Modifier.focusProperties {
                            down = playButtonFocusRequester
                            right = playButtonFocusRequester
                        }
                    )

                    Spacer(Modifier.width(20.dp))

                    Column {
                        Text(
                            text = uiState.movie?.title ?: "StreamFlow Player",
                            style = StreamFlowTheme.typography.titleMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        val epInfo = "Episode ${uiState.currentEpisode}" +
                                if (uiState.selectedServer.isNotBlank()) " • ${uiState.selectedServer}" else ""
                        Text(
                            text = epInfo,
                            style = StreamFlowTheme.typography.bodyMedium,
                            color = Color(0xCCFFFFFF)
                        )
                    }
                }

                // Center Bar: Playback Controls (Prev, Rewind, Play/Pause, FastForward, Next)
                Row(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(bottom = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(20.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Previous Episode Button
                    TvPlayerControlButton(
                        onClick = {
                            if (uiState.currentEpisode > 1) {
                                viewModel.changeEpisode(uiState.currentEpisode - 1)
                            }
                        },
                        icon = Icons.Default.SkipPrevious,
                        focusRequester = prevEpFocusRequester,
                        modifier = Modifier.focusProperties {
                            right = rewindFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )

                    // Rewind 10s Button
                    TvPlayerControlButton(
                        onClick = {
                            seekToPosition((currentPosition - 10_000L).coerceAtLeast(0L))
                        },
                        icon = Icons.Default.FastRewind,
                        focusRequester = rewindFocusRequester,
                        modifier = Modifier.focusProperties {
                            left = prevEpFocusRequester
                            right = playButtonFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )

                    // Play / Pause Button (Primary Focus Target on OK / Wake)
                    TvPlayerControlButton(
                        onClick = {
                            togglePlayPause()
                        },
                        icon = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                        isPrimary = true,
                        focusRequester = playButtonFocusRequester,
                        modifier = Modifier.focusProperties {
                            left = rewindFocusRequester
                            right = fastForwardFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )

                    // Fast Forward 10s Button
                    TvPlayerControlButton(
                        onClick = {
                            val targetDur = if (duration > 0) duration else currentPosition + 60_000L
                            seekToPosition((currentPosition + 10_000L).coerceAtMost(targetDur))
                        },
                        icon = Icons.Default.FastForward,
                        focusRequester = fastForwardFocusRequester,
                        modifier = Modifier.focusProperties {
                            left = playButtonFocusRequester
                            right = speedFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )

                    // Playback Speed Cycle Button (1x → 1.25x → 1.5x → 0.75x → 0.5x)
                    TvPlayerControlButton(
                        onClick = {
                            val currentIndex = speedSteps.indexOf(playbackSpeed).takeIf { it >= 0 } ?: 0
                            val next = speedSteps[(currentIndex + 1) % speedSteps.size]
                            playbackSpeed = next
                            exoPlayer.setPlaybackSpeed(next)
                        },
                        text = if (playbackSpeed == 1f) "1x" else "${playbackSpeed}x",
                        focusRequester = speedFocusRequester,
                        modifier = Modifier.focusProperties {
                            left = fastForwardFocusRequester
                            right = nextEpFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )

                    // Next Episode Button
                    TvPlayerControlButton(
                        onClick = {
                            val eps = uiState.movie?.episodes ?: emptyList()
                            val maxEp = if (eps.isNotEmpty()) eps.maxOf { it.number } else uiState.currentEpisode + 1
                            if (uiState.currentEpisode < maxEp) {
                                viewModel.changeEpisode(uiState.currentEpisode + 1)
                            }
                        },
                        icon = Icons.Default.SkipNext,
                        focusRequester = nextEpFocusRequester,
                        modifier = Modifier.focusProperties {
                            left = speedFocusRequester
                            up = backButtonFocusRequester
                            down = seekBarFocusRequester
                        }
                    )
                }

                // Bottom Bar: D-Pad Focusable Seek / Progress Bar
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 8.dp)
                ) {
                    TvSeekBar(
                        currentPosition = currentPosition,
                        duration = duration,
                        onSeek = { newPos -> seekToPosition(newPos) },
                        focusRequester = seekBarFocusRequester,
                        modifier = Modifier.focusProperties {
                            up = playButtonFocusRequester
                        }
                    )
                }
            }
        }
    }
}
