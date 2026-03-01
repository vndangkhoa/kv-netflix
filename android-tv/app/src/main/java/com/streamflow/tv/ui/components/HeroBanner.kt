package com.streamflow.tv.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.ui.theme.StreamFlowTheme
import kotlinx.coroutines.delay

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HeroBanner(
    movies: List<Movie>,
    onPlayClick: (Movie) -> Unit,
    modifier: Modifier = Modifier
) {
    if (movies.isEmpty()) return
    val colors = StreamFlowTheme.colors

    var currentIndex by remember { mutableIntStateOf(0) }
    val currentMovie = movies[currentIndex]

    LaunchedEffect(currentIndex) {
        delay(6000)
        currentIndex = (currentIndex + 1) % movies.size
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(480.dp)
    ) {
        AnimatedContent(
            targetState = currentMovie,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "hero-crossfade"
        ) { movie ->
            AsyncImage(
                model = ApiClient.imageProxyUrl(movie.backdrop ?: movie.thumbnail, 1280),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            colors.background.copy(alpha = 0.9f),
                            colors.background.copy(alpha = 0.5f),
                            Color.Transparent
                        )
                    )
                )
        )
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.4f)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, colors.background)
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 48.dp, end = 200.dp)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.Center
        ) {
            currentMovie.quality?.let { quality ->
                Box(
                    modifier = Modifier
                        .background(colors.primary, RoundedCornerShape(4.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = quality,
                        style = StreamFlowTheme.typography.labelSmall.copy(color = Color.White)
                    )
                }
                Spacer(Modifier.height(12.dp))
            }

            Text(
                text = currentMovie.title,
                style = StreamFlowTheme.typography.displayLarge,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(Modifier.height(12.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                currentMovie.year?.let {
                    Text("$it", style = StreamFlowTheme.typography.bodyLarge)
                }
            }

            Spacer(Modifier.height(16.dp))

            Surface(
                onClick = { onPlayClick(currentMovie) },
                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = colors.primary,
                    focusedContainerColor = colors.accent
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
            ) {
                Text(
                    text = "▶  Play Now",
                    style = StreamFlowTheme.typography.titleMedium.copy(color = Color.White),
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                )
            }
        }

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            movies.forEachIndexed { index, _ ->
                Box(
                    modifier = Modifier
                        .size(if (index == currentIndex) 24.dp else 8.dp, 8.dp)
                        .clip(CircleShape)
                        .background(
                            if (index == currentIndex) colors.primary
                            else Color.White.copy(alpha = 0.3f)
                        )
                )
            }
        }
    }
}
