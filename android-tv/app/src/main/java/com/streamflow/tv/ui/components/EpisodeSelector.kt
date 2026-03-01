package com.streamflow.tv.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
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
            text = "Episodes",
            style = StreamFlowTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 12.dp)
        )

        android.util.Log.e("EpisodeSelector", "Rendering grid with ${episodes.size} episodes")
        TvLazyVerticalGrid(
            columns = TvGridCells.Adaptive(minSize = 120.dp),
            contentPadding = PaddingValues(4.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(episodes) { episode ->
                val isActive = episode.number == currentEpisode
                var isFocused by remember { mutableStateOf(false) }

                Surface(
                    onClick = { onEpisodeSelect(episode) },
                    modifier = Modifier
                        .onFocusChanged { isFocused = it.isFocused },
                    shape = ClickableSurfaceDefaults.shape(
                        shape = RoundedCornerShape(8.dp)
                    ),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = if (isActive) colors.primary.copy(alpha = 0.2f) else colors.surfaceVariant,
                        focusedContainerColor = colors.primary.copy(alpha = 0.3f)
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 12.dp, horizontal = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = if (episode.title.isNotBlank()) episode.title else "Ep ${episode.number}",
                            style = StreamFlowTheme.typography.labelLarge.copy(
                                color = if (isActive) colors.primary else Color.White
                            )
                        )
                    }
                }
            }
        }
    }
}
