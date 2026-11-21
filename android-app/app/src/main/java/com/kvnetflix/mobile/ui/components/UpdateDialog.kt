package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.UpdateUiState
import com.kvnetflix.mobile.viewmodel.UpdateViewModel

@Composable
fun UpdateDialog(
    updateViewModel: UpdateViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by updateViewModel.uiState.collectAsState()
    val colors = KvTheme.colors

    when (val state = uiState) {
        is UpdateUiState.UpdateAvailable -> {
            val release = state.release

            Dialog(onDismissRequest = { updateViewModel.dismissUpdate() }) {
                Box(
                    modifier = modifier
                        .widthIn(max = 440.dp)
                        .fillMaxWidth(0.92f)
                        .background(colors.bgSecondary, RoundedCornerShape(16.dp))
                        .border(1.dp, colors.accent, RoundedCornerShape(16.dp))
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.Start) {
                        Text(
                            text = "Update Available (${release.tagName})",
                            style = MaterialTheme.typography.titleLarge.copy(
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = colors.textPrimary
                            )
                        )

                        Spacer(Modifier.height(12.dp))

                        Text(
                            text = if (release.body.isNotBlank()) release.body
                            else "A new version of KV-Netflix Mobile is ready to install.",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = colors.textSecondary,
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
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = colors.accent,
                                    contentColor = colors.onAccent
                                ),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text(
                                    "Update Now",
                                    color = colors.onAccent,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            OutlinedButton(
                                onClick = { updateViewModel.dismissUpdate() },
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Later", color = colors.textPrimary)
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
                        .widthIn(max = 440.dp)
                        .fillMaxWidth(0.88f)
                        .background(colors.bgSecondary, RoundedCornerShape(16.dp))
                        .border(1.dp, colors.accent, RoundedCornerShape(16.dp))
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Downloading Update...",
                            style = MaterialTheme.typography.titleMedium.copy(
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                        )

                        Spacer(Modifier.height(16.dp))

                        LinearProgressIndicator(
                            progress = { state.progress },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(6.dp),
                            color = colors.accent,
                            trackColor = colors.textMuted.copy(alpha = 0.25f)
                        )

                        Spacer(Modifier.height(10.dp))

                        Text(
                            text = "${(state.progress * 100).toInt()}%",
                            style = MaterialTheme.typography.labelLarge.copy(
                                color = colors.accent,
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
