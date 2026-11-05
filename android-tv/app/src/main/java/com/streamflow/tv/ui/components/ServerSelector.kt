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
            text = "Máy Chủ Phát",
            style = StreamFlowTheme.typography.titleMedium.copy(
                fontWeight = FontWeight.Bold,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 15.sp
            ),
            modifier = Modifier.padding(bottom = 8.dp)
        )

        TvLazyRow(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            contentPadding = PaddingValues(2.dp)
        ) {
            items(servers) { server ->
                val isSelected = server.equals(selectedServer, ignoreCase = true)
                var isFocused by remember { mutableStateOf(false) }

                Surface(
                    onClick = { onServerSelect(server) },
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
                        containerColor = if (isSelected) colors.top10Red else Color.White.copy(alpha = 0.10f),
                        focusedContainerColor = Color.White
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                ) {
                    Box(
                        modifier = Modifier
                            .then(
                                if (isFocused) Modifier.border(2.dp, Color.White, RoundedCornerShape(8.dp))
                                else Modifier
                            )
                            .padding(horizontal = 18.dp, vertical = 9.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = server.ifBlank { "Máy Chủ Mặc Định" },
                            style = StreamFlowTheme.typography.labelMedium.copy(
                                color = if (isFocused) Color(0xFF141414) else Color.White,
                                fontWeight = if (isSelected || isFocused) FontWeight.Bold else FontWeight.Medium,
                                fontSize = 13.sp
                            )
                        )
                    }
                }
            }
        }
    }
}
