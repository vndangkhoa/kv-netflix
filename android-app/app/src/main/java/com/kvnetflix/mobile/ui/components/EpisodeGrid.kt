package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
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
    horizontalPadding: Dp = 16.dp,
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
                    .padding(horizontal = horizontalPadding, vertical = 4.dp),
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
                            color = if (isActive) colors.onAccent else colors.textPrimary,
                            fontSize = 13.sp,
                            fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Medium
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(4.dp))
        }

        // Non-lazy chunked rows so EpisodeGrid embeds safely inside LazyColumn / LazyVerticalGrid.
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = horizontalPadding)
        ) {
            val cols = ((maxWidth.value + 6f) / 62f).toInt().coerceIn(4, 12)
            val rows = displayEpisodes.chunked(cols)

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                rows.forEach { rowEpisodes ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        rowEpisodes.forEach { episode ->
                            val isActive = episode.number == currentEpisode
                            val label = if (
                                episode.title.isNotBlank() &&
                                episode.title != "0" &&
                                !episode.title.startsWith("0") &&
                                !episode.title.startsWith("Tập 0")
                            ) {
                                episode.title
                            } else if (episode.number <= 0) {
                                "Full"
                            } else {
                                "${episode.number}"
                            }

                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(44.dp)
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
                                    text = label,
                                    color = if (isActive) colors.onAccent else colors.textPrimary,
                                    fontSize = 14.sp,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.padding(horizontal = 4.dp)
                                )
                            }
                        }

                        val missing = cols - rowEpisodes.size
                        repeat(missing) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
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
                    .padding(horizontal = horizontalPadding, vertical = 10.dp)
            )
        }
    }
}
