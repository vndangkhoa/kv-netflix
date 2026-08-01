package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kvnetflix.mobile.viewmodel.UpdateUiState
import com.kvnetflix.mobile.viewmodel.UpdateViewModel

@Composable
fun UpdateDialog(
    updateViewModel: UpdateViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by updateViewModel.uiState.collectAsState()

    when (val state = uiState) {
        is UpdateUiState.UpdateAvailable -> {
            val release = state.release

            Dialog(onDismissRequest = { updateViewModel.dismissUpdate() }) {
                Box(
                    modifier = modifier
                        .fillMaxWidth(0.9f)
                        .background(Color(0xFF1F1F1F), RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFFE50914), RoundedCornerShape(16.dp))
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.Start) {
                        Text(
                            text = "🎉 Update Available (${release.tagName})",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color.White
                            )
                        )

                        Spacer(Modifier.height(12.dp))

                        Text(
                            text = if (release.body.isNotBlank()) release.body else "A new version of kv-netflix Mobile is ready to install.",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = Color.White.copy(alpha = 0.8f),
                                fontSize = 13.sp
                            ),
                            modifier = Modifier
                                .heightIn(max = 140.dp)
                                .verticalScroll(rememberScrollState())
                        )

                        Spacer(Modifier.height(20.dp))

                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Button(
                                onClick = { updateViewModel.startDownload(release) },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE50914)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Update Now", color = Color.White)
                            }

                            OutlinedButton(
                                onClick = { updateViewModel.dismissUpdate() },
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Later", color = Color.White)
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
                        .fillMaxWidth(0.85f)
                        .background(Color(0xFF1F1F1F), RoundedCornerShape(16.dp))
                        .border(1.dp, Color(0xFFE50914), RoundedCornerShape(16.dp))
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Downloading Update...",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        )

                        Spacer(Modifier.height(16.dp))

                        LinearProgressIndicator(
                            progress = { state.progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp),
                            color = Color(0xFFE50914),
                            trackColor = Color.White.copy(alpha = 0.2f)
                        )

                        Spacer(Modifier.height(10.dp))

                        Text(
                            text = "${(state.progress * 100).toInt()}%",
                            style = MaterialTheme.typography.labelLarge.copy(
                                color = Color(0xFFE50914),
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
