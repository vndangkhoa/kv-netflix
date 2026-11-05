package com.streamflow.tv.ui.components

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.*
import com.streamflow.tv.data.model.Episode
import com.streamflow.tv.ui.theme.StreamFlowTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun EpisodeSelector(
    episodes: List<Episode>,
    currentEpisode: Int,
    onEpisodeSelect: (Episode) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors

    Column(modifier = modifier) {
        Text(
            text = "Danh Sách Tập (${episodes.size})",
            style = StreamFlowTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 16.sp
            ),
            modifier = Modifier.padding(bottom = 10.dp)
        )

        TvLazyVerticalGrid(
            columns = TvGridCells.Adaptive(minSize = 120.dp),
            contentPadding = PaddingValues(4.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(episodes) { episode ->
                val isActive = episode.number == currentEpisode
                var isFocused by remember { mutableStateOf(false) }

                Surface(
                    onClick = { onEpisodeSelect(episode) },
                    modifier = Modifier
                        .onFocusChanged { isFocused = it.isFocused }
                        .then(
                            if (isFocused) {
                                Modifier.shadow(
                                    elevation = 12.dp,
                                    shape = RoundedCornerShape(8.dp),
                                    ambientColor = colors.focusGlow
                                )
                            } else Modifier
                        ),
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = when {
                            isActive -> colors.top10Red.copy(alpha = 0.35f)
                            else -> Color.White.copy(alpha = 0.08f)
                        },
                        focusedContainerColor = when {
                            isActive -> colors.top10Red
                            else -> Color.White
                        }
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(
                                if (isFocused) Modifier.border(2.dp, Color.White, RoundedCornerShape(8.dp))
                                else if (isActive) Modifier.border(1.5.dp, colors.top10Red, RoundedCornerShape(8.dp))
                                else Modifier
                            )
                            .padding(vertical = 12.dp, horizontal = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        val epLabel = if (episode.title.isNotBlank()) episode.title else "Tập ${episode.number}"
                        Text(
                            text = epLabel,
                            style = StreamFlowTheme.typography.labelLarge.copy(
                                color = when {
                                    isFocused && !isActive -> Color(0xFF141414)
                                    isActive -> Color.White
                                    else -> Color.White.copy(alpha = 0.85f)
                                },
                                fontWeight = if (isActive || isFocused) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 13.sp
                            ),
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}
