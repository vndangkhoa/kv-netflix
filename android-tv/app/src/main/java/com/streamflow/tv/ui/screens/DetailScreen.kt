package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import android.util.Log
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.ui.components.EpisodeSelector
import com.streamflow.tv.ui.components.ServerSelector
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.DetailViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailScreen(
    slug: String,
    onPlayClick: (String, Int, String) -> Unit,
    onBack: () -> Unit,
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    viewModel: DetailViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors
    
    LaunchedEffect(slug) {
        viewModel.loadMovie(slug, userDataRepository)
    }

    Log.d("DetailScreen", "Composing DetailScreen(slug=$slug, isLoading=${uiState.isLoading})")
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
        contentAlignment = Alignment.Center
    ) {
        if (uiState.isLoading) {
            CircularLoadingIndicator()
        } else if (uiState.error != null) {
            ErrorState(message = uiState.error ?: "Unknown error", onRetry = { viewModel.loadMovie(slug) })
        } else {
            val movie = uiState.movie ?: return@Box
            Log.d("DetailScreen", "Rendering movie details: ${movie.title}")

            val servers = remember(movie.episodes) {
                movie.episodes?.mapNotNull { it.serverName.ifBlank { null } }?.distinct() ?: emptyList()
            }

            val filteredEpisodes = remember(movie.episodes, uiState.selectedServer) {
                if (uiState.selectedServer.isNotBlank()) {
                    val matching = movie.episodes?.filter { it.serverName.equals(uiState.selectedServer, ignoreCase = true) }
                    if (!matching.isNullOrEmpty()) matching else movie.episodes ?: emptyList()
                } else {
                    movie.episodes ?: emptyList()
                }
            }

            // Background Image
            AsyncImage(
                model = ApiClient.imageProxyUrl(movie.backdrop ?: movie.thumbnail, 1280),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Gradient Overlays
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(
                                colors.background.copy(alpha = 0.95f),
                                colors.background.copy(alpha = 0.75f),
                                Color.Transparent
                            )
                        )
                    )
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.35f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, colors.background)
                        )
                    )
            )

            // Content
            val focusRequester = remember { FocusRequester() }

            LaunchedEffect(uiState.movie) {
                if (uiState.movie != null) {
                    focusRequester.requestFocus()
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 48.dp, vertical = 28.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = movie.title,
                    style = StreamFlowTheme.typography.displayMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                Spacer(Modifier.height(12.dp))

                Text(
                    text = movie.description,
                    style = StreamFlowTheme.typography.bodyMedium,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.widthIn(max = 650.dp)
                )
                
                Spacer(Modifier.height(24.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                    Surface(
                        onClick = {
                            val firstEp = filteredEpisodes.firstOrNull()?.number ?: 1
                            onPlayClick(movie.slug, firstEp, uiState.selectedServer)
                        },
                        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = colors.primary,
                            focusedContainerColor = colors.accent
                        ),
                        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
                        modifier = Modifier.focusRequester(focusRequester)
                    ) {
                        Text(
                            "▶  Play Movie",
                            style = StreamFlowTheme.typography.titleMedium.copy(color = Color.White),
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                        )
                    }

                    Surface(
                        onClick = { viewModel.toggleMyList() },
                        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = if (uiState.isInMyList) colors.accent.copy(alpha = 0.3f) else colors.surfaceVariant,
                            focusedContainerColor = colors.accent
                        ),
                        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                    ) {
                        Text(
                            if (uiState.isInMyList) "✓ In My List" else "+ My List",
                            style = StreamFlowTheme.typography.titleMedium.copy(color = Color.White),
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                        )
                    }
                }

                // Server Selector Row
                if (servers.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    ServerSelector(
                        servers = servers,
                        selectedServer = uiState.selectedServer,
                        onServerSelect = { server -> viewModel.selectServer(server) }
                    )
                }

                // Episode Selector
                if (filteredEpisodes.isNotEmpty()) {
                    Spacer(Modifier.height(20.dp))
                    
                    EpisodeSelector(
                        episodes = filteredEpisodes,
                        currentEpisode = 1,
                        onEpisodeSelect = { episode -> onPlayClick(movie.slug, episode.number, uiState.selectedServer) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(180.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun CircularLoadingIndicator() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = "Loading movie details...",
            style = StreamFlowTheme.typography.headlineMedium.copy(color = StreamFlowTheme.colors.primary)
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        val colors = StreamFlowTheme.colors
        Text(
            text = message,
            style = StreamFlowTheme.typography.bodyLarge.copy(color = Color.Red),
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Surface(
            onClick = onRetry,
            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = colors.surfaceVariant
            )
        ) {
            Text(
                "Retry",
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
            )
        }
    }
}
