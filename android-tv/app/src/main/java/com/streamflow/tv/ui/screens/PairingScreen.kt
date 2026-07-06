package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.streamflow.tv.data.repository.UserDataRepository
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.PairingUiState
import com.streamflow.tv.viewmodel.PairingViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PairingScreen(
    onSuccess: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val userDataRepository = remember { UserDataRepository(context) }
    val viewModel = remember { PairingViewModel(userDataRepository) }
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors

    var code by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(uiState) {
        if (uiState is PairingUiState.Success) {
            onSuccess()
        }
    }

    // Auto-focus the input field on launch
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(700.dp)
        ) {
            Text(
                text = "Link Account",
                style = StreamFlowTheme.typography.displayMedium,
                modifier = Modifier.padding(bottom = 16.dp)
            )

            Text(
                text = "Enter the pairing code shown on your Web App or Mobile App.",
                style = StreamFlowTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.7f),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = 40.dp)
            )

            // 6-Digit Code Entry
            BasicTextField(
                value = code,
                onValueChange = {
                    if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                        code = it
                        if (it.length == 6) {
                            viewModel.loginWithCode(it)
                        } else if (uiState is PairingUiState.Error) {
                            viewModel.resetState()
                        }
                    }
                },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier
                    .focusRequester(focusRequester)
                    .width(450.dp),
                decorationBox = {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        repeat(6) { index ->
                            val char = code.getOrNull(index)
                            val isFocused = index == code.length
                            
                            Box(
                                modifier = Modifier
                                    .size(64.dp)
                                    .background(
                                        if (isFocused) Color.White.copy(alpha = 0.15f) 
                                        else Color.White.copy(alpha = 0.05f),
                                        RoundedCornerShape(12.dp)
                                    )
                                    .border(
                                        width = 2.dp,
                                        color = if (isFocused) colors.primary else Color.Transparent,
                                        shape = RoundedCornerShape(12.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = char?.toString() ?: "",
                                    style = StreamFlowTheme.typography.displayLarge.copy(
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.Black
                                    ),
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            )

            Spacer(Modifier.height(32.dp))

            when (val state = uiState) {
                is PairingUiState.Loading -> {
                    CircularProgressIndicator(color = colors.primary)
                }
                is PairingUiState.Error -> {
                    Text(
                        text = state.message,
                        color = Color.Red,
                        style = StreamFlowTheme.typography.bodyLarge,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                }
                is PairingUiState.Success -> {
                    Text(
                        text = "Success! Logged in.",
                        color = Color(0xFF22C55E),
                        style = StreamFlowTheme.typography.headlineMedium
                    )
                }
                else -> {
                    if (code.length == 6) {
                         // Fallback for edge cases where it stays in Idle but code is 6 digits
                    }
                }
            }

            Spacer(Modifier.height(48.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Surface(
                    onClick = onBack,
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = Color.White.copy(alpha = 0.1f),
                        focusedContainerColor = Color.White.copy(alpha = 0.2f)
                    )
                ) {
                    Text(
                        "Cancel",
                        style = StreamFlowTheme.typography.labelLarge,
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                    )
                }
                
                if (code.length == 6) {
                    Surface(
                        onClick = { viewModel.loginWithCode(code) },
                        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = colors.primary,
                            focusedContainerColor = colors.accent
                        )
                    ) {
                        Text(
                            "Link Now",
                            style = StreamFlowTheme.typography.labelLarge.copy(color = Color.White),
                            modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
                        )
                    }
                }
            }
        }
    }
}
