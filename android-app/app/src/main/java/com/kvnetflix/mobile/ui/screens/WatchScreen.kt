package com.kvnetflix.mobile.ui.screens

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.OrientationEventListener
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
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.ui.PlayerView
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.components.EpisodeGrid
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.PlayerViewModel

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
    val activity = LocalContext.current as? Activity
    val context = LocalContext.current

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
                                        override fun onPageFinished(view: WebView?, url: String?) {
                                            super.onPageFinished(view, url)
                                            view?.evaluateJavascript(
                                                """(function() { var v = document.querySelector('video'); if (v) v.play(); })();""", null
                                            )
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
                        // ExoPlayer with custom HTTP headers
                        val player = remember {
                            ExoPlayer.Builder(context).build()
                        }

                        LaunchedEffect(uiState.source, uiState.currentEpisode) {
                            try {
                                val source = uiState.source ?: return@LaunchedEffect
                                if (source.streamUrl.isNotEmpty()) {
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

                                    player.addListener(object : androidx.media3.common.Player.Listener {
                                        override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                                            android.util.Log.e("WatchScreen", "ExoPlayer error, switching to WebView embed: ${error.message}", error)
                                            isFallbackToEmbed = true
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

                        Box(modifier = Modifier.fillMaxSize()) {
                            AndroidView(
                                factory = { ctx ->
                                    PlayerView(ctx).apply {
                                        this.player = player
                                        useController = true
                                        keepScreenOn = true
                                    }
                                },
                                modifier = Modifier.fillMaxSize()
                            )

                            // Overlay buttons
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(8.dp)
                                    .fillMaxWidth()
                            ) {
                                // Back button (left)
                                if (!isFullscreen) {
                                    IconButton(
                                        onClick = onBack,
                                        modifier = Modifier
                                            .align(Alignment.TopStart)
                                            .size(40.dp)
                                            .background(
                                                Color.Black.copy(alpha = 0.6f),
                                                RoundedCornerShape(20.dp)
                                            )
                                    ) {
                                        Icon(
                                            Icons.AutoMirrored.Filled.ArrowBack,
                                            "Back",
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp)
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
                                        modifier = Modifier
                                            .size(40.dp)
                                            .background(
                                                Color.Black.copy(alpha = 0.6f),
                                                RoundedCornerShape(20.dp)
                                            )
                                    ) {
                                        Icon(
                                            Icons.Default.PictureInPicture,
                                            "PiP",
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp)
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
                                        modifier = Modifier
                                            .size(40.dp)
                                            .background(
                                                Color.Black.copy(alpha = 0.6f),
                                                RoundedCornerShape(20.dp)
                                            )
                                    ) {
                                        Icon(
                                            if (isFullscreen) Icons.Default.FullscreenExit
                                            else Icons.Default.Fullscreen,
                                            "Fullscreen",
                                            tint = Color.White,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else if (uiState.error != null) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(uiState.error ?: "Error", color = Color.Red, fontSize = 14.sp)
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
