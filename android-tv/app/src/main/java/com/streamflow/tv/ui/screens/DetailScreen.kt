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
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.Episode
import com.streamflow.tv.ui.components.EpisodeSelector
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.DetailViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailScreen(
    slug: String,
    onPlayClick: (String, Int) -> Unit,
    onBack: () -> Unit,
    viewModel: DetailViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    
    LaunchedEffect(slug) {
        viewModel.loadMovie(slug)
    }

    Log.e("DetailScreen", "Composing DetailScreen(slug=$slug, isLoading=${uiState.isLoading})")
    
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        val movie = uiState.movie ?: return@Box
        Log.e("DetailScreen", "Rendering movie details: ${movie.title}")

        val colors = StreamFlowTheme.colors

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
                            colors.background.copy(alpha = 0.7f),
                            Color.Transparent
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.3f)
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
                android.util.Log.e("DetailScreen", "Focus requested on Play button")
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 48.dp, vertical = 32.dp),
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = movie.title,
                style = StreamFlowTheme.typography.displayLarge,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            
            Spacer(Modifier.height(16.dp))

            Text(
                text = movie.description,
                style = StreamFlowTheme.typography.bodyMedium,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.widthIn(max = 600.dp)
            )
            
            Spacer(Modifier.height(32.dp))

            Surface(
                onClick = { onPlayClick(movie.slug, 1) },
                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = colors.primary,
                    focusedContainerColor = colors.accent
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
                modifier = Modifier.focusRequester(focusRequester)
            ) {
                Text(
                    "▶  Play",
                    style = StreamFlowTheme.typography.titleMedium.copy(color = Color.White),
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                )
            }

            if (!movie.episodes.isNullOrEmpty()) {
                Spacer(Modifier.height(32.dp))
                
                EpisodeSelector(
                    episodes = movie.episodes,
                    currentEpisode = 1, // Default to 1 for initial detail load
                    onEpisodeSelect = { episode -> onPlayClick(movie.slug, episode.number) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )
            }
        }
    }
}
