package com.streamflow.tv.ui.screens

import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.foundation.focusable
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.datasource.DefaultDataSource
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
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    viewModel: PlayerViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val colors = StreamFlowTheme.colors
    var playerView by remember { mutableStateOf<PlayerView?>(null) }

    LaunchedEffect(slug, episode) {
        viewModel.loadPlayer(slug, episode)
    }

    LaunchedEffect(uiState.movie) {
        if (uiState.movie != null && userDataRepository != null) {
            viewModel.saveToHistory(userDataRepository)
        }
    }

    // ExoPlayer instance
    val exoPlayer = remember {
        ExoPlayer.Builder(context).build().apply {
            playWhenReady = true
        }
    }

    // Wrap ExoPlayer to intercept next/previous UI clicks
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
            override fun seekToNext() {
                seekToNextMediaItem()
            }
            override fun seekToPreviousMediaItem() {
                if (hasPreviousMediaItem()) {
                    viewModel.changeEpisode(uiState.currentEpisode - 1)
                }
            }
            override fun seekToPrevious() {
                seekToPreviousMediaItem()
            }
        }
    }

    // Update player when source changes
    LaunchedEffect(uiState.source) {
        uiState.source?.let { source ->
            val dataSourceFactory = DefaultDataSource.Factory(context)
            val mediaItem = MediaItem.fromUri(source.streamUrl)

            android.util.Log.e("StreamFlowPlayer", "Setting media source: ${source.streamUrl}")

            exoPlayer.addListener(object : androidx.media3.common.Player.Listener {
                override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                    android.util.Log.e("StreamFlowPlayer", "Player Error: ${error.message}", error)
                }
                override fun onPlaybackStateChanged(playbackState: Int) {
                    android.util.Log.e("StreamFlowPlayer", "Playback State: $playbackState")
                }
            })

            if (source.streamUrl.contains(".m3u8")) {
                val hlsSource = HlsMediaSource.Factory(dataSourceFactory)
                    .createMediaSource(mediaItem)
                exoPlayer.setMediaSource(hlsSource)
            } else {
                exoPlayer.setMediaItem(mediaItem)
            }
            exoPlayer.prepare()
        }
    }

    // Cleanup
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
            .focusRequester(focusRequester)
            .focusable()
            .onPreviewKeyEvent { keyEvent ->
                if (keyEvent.type == KeyEventType.KeyDown) {
                    when (keyEvent.nativeKeyEvent.keyCode) {
                        android.view.KeyEvent.KEYCODE_DPAD_CENTER,
                        android.view.KeyEvent.KEYCODE_ENTER -> {
                            // Toggle controls visibility
                            if (playerView?.isControllerFullyVisible == true) {
                                playerView?.hideController()
                            } else {
                                playerView?.showController()
                            }
                            true
                        }
                        android.view.KeyEvent.KEYCODE_DPAD_LEFT -> {
                            // Seek backward 10s
                            playerView?.showController()
                            exoPlayer.seekTo(maxOf(0, exoPlayer.currentPosition - 10000))
                            true
                        }
                        android.view.KeyEvent.KEYCODE_DPAD_RIGHT -> {
                            // Seek forward 10s
                            playerView?.showController()
                            exoPlayer.seekTo(minOf(exoPlayer.duration, exoPlayer.currentPosition + 10000))
                            true
                        }
                        android.view.KeyEvent.KEYCODE_DPAD_UP,
                        android.view.KeyEvent.KEYCODE_DPAD_DOWN -> {
                            playerView?.showController()
                            true
                        }
                        android.view.KeyEvent.KEYCODE_MEDIA_NEXT -> {
                            if (forwardingPlayer.hasNextMediaItem()) {
                                forwardingPlayer.seekToNextMediaItem()
                            }
                            true
                        }
                        android.view.KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                            if (forwardingPlayer.hasPreviousMediaItem()) {
                                forwardingPlayer.seekToPreviousMediaItem()
                            }
                            true
                        }
                        else -> false
                    }
                } else false
            }
    ) {
        LaunchedEffect(Unit) {
            focusRequester.requestFocus()
        }

        if (uiState.isLoading || uiState.source == null) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "Loading stream...",
                        style = StreamFlowTheme.typography.headlineMedium.copy(color = colors.primary)
                    )
                    uiState.movie?.let { movie ->
                        Text(
                            movie.title,
                            style = StreamFlowTheme.typography.bodyLarge,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }
                }
            }
        } else {
            // ExoPlayer View
            android.util.Log.e("StreamFlowPlayer", "Drawing AndroidView for Player")
            AndroidView(
                factory = { ctx ->
                    android.util.Log.e("StreamFlowPlayer", "Creating PlayerView factory")
                    PlayerView(ctx).apply {
                        player = forwardingPlayer
                        useController = true
                        setShowNextButton(true)
                        setShowPreviousButton(true)
                        controllerAutoShow = true
                        keepScreenOn = true // Prevent screen sleep during playback
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                        playerView = this
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        }

        // Error overlay
        uiState.error?.let { error ->
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    error,
                    style = StreamFlowTheme.typography.bodyLarge.copy(color = Color.Red)
                )
            }
        }
    }
}
