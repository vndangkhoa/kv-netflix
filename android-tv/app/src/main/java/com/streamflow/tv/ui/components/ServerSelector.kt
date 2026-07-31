package com.streamflow.tv.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.items
import androidx.tv.material3.*
import com.streamflow.tv.ui.theme.StreamFlowTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ServerSelector(
    servers: List<String>,
    selectedServer: String,
    onServerSelect: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors

    if (servers.isEmpty()) return

    Column(modifier = modifier) {
        Text(
            text = "Streaming Server",
            style = StreamFlowTheme.typography.titleMedium,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        TvLazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(2.dp)
        ) {
            items(servers) { server ->
                val isSelected = server.equals(selectedServer, ignoreCase = true)

                Surface(
                    onClick = { onServerSelect(server) },
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = if (isSelected) colors.primary else colors.surfaceVariant,
                        focusedContainerColor = colors.accent
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                ) {
                    Box(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = server.ifBlank { "Default Server" },
                            style = StreamFlowTheme.typography.labelMedium.copy(
                                color = Color.White
                            )
                        )
                    }
                }
            }
        }
    }
}
