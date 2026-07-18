package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.model.Episode
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun EpisodeGrid(
    episodes: List<Episode>,
    currentEpisode: Int,
    onEpisodeClick: (Episode) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    var showAll by remember { mutableStateOf(false) }

    val displayEpisodes = if (showAll) episodes else episodes.take(20)

    Column(modifier = modifier.fillMaxWidth()) {
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 64.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.heightIn(max = 300.dp)
        ) {
            items(displayEpisodes, key = { it.number }) { episode ->
                val isActive = episode.number == currentEpisode

                Box(
                    modifier = Modifier
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .then(
                            if (isActive) {
                                Modifier.background(colors.accent)
                            } else {
                                Modifier
                                    .background(colors.bgTertiary)
                                    .border(
                                        1.dp,
                                        colors.borderPrimary,
                                        RoundedCornerShape(8.dp)
                                    )
                            }
                        )
                        .clickable { onEpisodeClick(episode) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${episode.number}",
                        color = if (isActive) androidx.compose.ui.graphics.Color.White
                        else colors.textPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        if (episodes.size > 20) {
            Text(
                text = if (showAll) "Show Less" else "Show All (${episodes.size})",
                color = colors.accent,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier
                    .clickable { showAll = !showAll }
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
    }
}
