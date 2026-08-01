package com.streamflow.tv.ui.screens

import android.view.KeyEvent
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebSettings
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
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.PlayerViewModel

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

    // ExoPlayer setup
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            playWhenReady = true
        }
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

    // Configure ExoPlayer media source with custom browser HTTP headers
    LaunchedEffect(uiState.source, isFallbackToEmbed) {
        val source = uiState.source
        if (source != null && !source.isEmbed && !isFallbackToEmbed) {
            val httpDataSourceFactory = DefaultHttpDataSource.Factory()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .setDefaultRequestProperties(
                    mapOf(
                        "Referer" to "https://ophim17.cc/",
                        "Origin" to "https://ophim17.cc"
                    )
                )
                .setAllowCrossProtocolRedirects(true)

            val dataSourceFactory = DefaultDataSource.Factory(context, httpDataSourceFactory)
            val mediaItem = MediaItem.fromUri(source.streamUrl)

            android.util.Log.d("PlayerScreen", "Loading ExoPlayer stream: ${source.streamUrl}")

            exoPlayer.addListener(object : androidx.media3.common.Player.Listener {
                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    android.util.Log.e("PlayerScreen", "ExoPlayer error: ${error.message}. Triggering WebView embed fallback.", error)
                    isFallbackToEmbed = true
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
                Text(
                    text = uiState.error ?: "Failed to play video",
                    style = StreamFlowTheme.typography.bodyLarge,
                    color = Color.Red
                )
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
                            override fun onPageFinished(view: WebView?, url: String?) {
                                super.onPageFinished(view, url)
                                // Auto play video inside iframe if present
                                view?.evaluateJavascript(
                                    """
                                    (function() {
                                        var v = document.querySelector('video');
                                        if (v) { v.play(); }
                                    })();
                                    """.trimIndent(), null
                                )
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
