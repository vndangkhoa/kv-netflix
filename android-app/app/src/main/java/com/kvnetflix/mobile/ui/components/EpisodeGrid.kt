package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
    servers: List<String> = emptyList(),
    selectedServer: String = "",
    onServerChange: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    var showAll by remember { mutableStateOf(false) }

    val filteredEpisodes = if (selectedServer.isNotEmpty()) {
        episodes.filter { it.serverName == selectedServer }
    } else {
        episodes
    }

    val displayEpisodes = if (showAll) filteredEpisodes else filteredEpisodes.take(20)

    Column(modifier = modifier.fillMaxWidth()) {
        if (servers.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                servers.forEach { server ->
                    val isActive = server == selectedServer
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .then(
                                if (isActive) {
                                    Modifier.background(colors.accent)
                                } else {
                                    Modifier
                                        .background(colors.bgTertiary)
                                        .border(1.dp, colors.borderPrimary, RoundedCornerShape(16.dp))
                                }
                            )
                            .clickable { onServerChange(server) }
                            .padding(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Text(
                            text = server,
                            color = if (isActive) Color.White else colors.textPrimary,
                            fontSize = 13.sp,
                            fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Medium
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
        }

        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 64.dp),
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.heightIn(max = 300.dp)
        ) {
            items(displayEpisodes, key = { "${it.number}-${it.title}" }) { episode ->
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
                        color = if (isActive) Color.White
                        else colors.textPrimary,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        if (filteredEpisodes.size > 20) {
            Text(
                text = if (showAll) "Show Less" else "Show All (${filteredEpisodes.size})",
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
