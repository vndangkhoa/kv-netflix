package com.kvnetflix.mobile.ui.screens

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
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
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
                    val player = remember {
                        ExoPlayer.Builder(context).build()
                    }

                    LaunchedEffect(uiState.source, uiState.currentEpisode) {
                        val source = uiState.source ?: return@LaunchedEffect
                        val mediaItem = MediaItem.fromUri(source.streamUrl)
                        player.setMediaItem(mediaItem)
                        player.prepare()
                        player.playWhenReady = true

                        if (userRepo != null) {
                            viewModel.saveToHistory(userRepo)
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
                                    onClick = { isFullscreen = !isFullscreen },
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
                                    "${movie.episodes.size} total",
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
