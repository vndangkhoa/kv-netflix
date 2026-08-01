package com.streamflow.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.tv.material3.*
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.UpdateUiState
import com.streamflow.tv.viewmodel.UpdateViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun UpdateDialog(
    updateViewModel: UpdateViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by updateViewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors

    when (val state = uiState) {
        is UpdateUiState.UpdateAvailable -> {
            val release = state.release
            val focusRequester = remember { FocusRequester() }

            LaunchedEffect(Unit) {
                focusRequester.requestFocus()
            }

            Dialog(onDismissRequest = { updateViewModel.dismissUpdate() }) {
                Box(
                    modifier = modifier
                        .width(520.dp)
                        .background(colors.surface.copy(alpha = 0.95f), RoundedCornerShape(16.dp))
                        .border(2.dp, colors.primary, RoundedCornerShape(16.dp))
                        .padding(28.dp)
                ) {
                    Column(horizontalAlignment = Alignment.Start) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "🎉 Update Available (${release.tagName})",
                                style = StreamFlowTheme.typography.titleLarge.copy(
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 20.sp,
                                    color = Color.White
                                )
                            )
                        }

                        Spacer(Modifier.height(14.dp))

                        Text(
                            text = if (release.body.isNotBlank()) release.body else "A new version of kv-netflix TV is ready to install.",
                            style = StreamFlowTheme.typography.bodyMedium.copy(
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 13.sp
                            ),
                            modifier = Modifier
                                .heightIn(max = 160.dp)
                                .verticalScroll(rememberScrollState())
                        )

                        Spacer(Modifier.height(24.dp))

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Surface(
                                onClick = { updateViewModel.startDownload(release) },
                                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = colors.primary,
                                    focusedContainerColor = colors.accent
                                ),
                                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
                                modifier = Modifier.focusRequester(focusRequester)
                            ) {
                                Text(
                                    text = "🚀 Update Now",
                                    style = StreamFlowTheme.typography.labelLarge.copy(color = Color.White),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                )
                            }

                            Surface(
                                onClick = { updateViewModel.dismissUpdate() },
                                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                                colors = ClickableSurfaceDefaults.colors(
                                    containerColor = colors.surfaceVariant,
                                    focusedContainerColor = Color.White.copy(alpha = 0.2f)
                                ),
                                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                            ) {
                                Text(
                                    text = "Later",
                                    style = StreamFlowTheme.typography.labelLarge.copy(color = Color.White),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
        is UpdateUiState.Downloading -> {
            Dialog(onDismissRequest = {}) {
                Box(
                    modifier = modifier
                        .width(440.dp)
                        .background(colors.surface.copy(alpha = 0.95f), RoundedCornerShape(16.dp))
                        .border(2.dp, colors.primary, RoundedCornerShape(16.dp))
                        .padding(28.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Downloading Update...",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )

                        Spacer(Modifier.height(16.dp))

                        LinearProgressIndicator(
                            progress = state.progress,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp),
                            color = colors.primary,
                            trackColor = Color.White.copy(alpha = 0.2f)
                        )

                        Spacer(Modifier.height(10.dp))

                        Text(
                            text = "${(state.progress * 100).toInt()}%",
                            style = StreamFlowTheme.typography.labelLarge.copy(
                                color = colors.primary,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }
        }
        else -> {}
    }
}
