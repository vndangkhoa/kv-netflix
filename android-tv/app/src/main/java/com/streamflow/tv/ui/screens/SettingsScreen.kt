package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.tv.material3.*
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.repository.UserDataRepository
import com.streamflow.tv.ui.navigation.LocalNavController
import com.streamflow.tv.ui.theme.StreamFlowTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SettingsScreen(
    currentTheme: String,
    onThemeChange: (String) -> Unit
) {
    val colors = StreamFlowTheme.colors
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userRepo = remember { UserDataRepository(context) }

    var serverUrl by remember { mutableStateOf(TextFieldValue(ApiClient.baseUrl.removeSuffix("/"))) }
    val userProfile by userRepo.userProfile.collectAsState(initial = null)
    val navController = LocalNavController.current
    val updateViewModel = remember { com.streamflow.tv.viewmodel.UpdateViewModel(context) }
    val updateState by updateViewModel.uiState.collectAsState()

    LaunchedEffect(Unit) {
        val savedUrl = userRepo.serverUrl.first()
        serverUrl = TextFieldValue(savedUrl)
    }

    val themes = listOf(
        Triple("default", "StreamFlow", Color(0xFF06B6D4)),
        Triple("netflix", "Netflix", Color(0xFFE50914)),
        Triple("apple", "Apple TV+", Color(0xFFFFFFFF))
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        Text(
            text = "Settings",
            style = StreamFlowTheme.typography.displayMedium,
            modifier = Modifier.padding(bottom = 32.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "ACCOUNT",
                    style = StreamFlowTheme.typography.labelSmall.copy(
                        color = Color.White.copy(alpha = 0.5f)
                    ),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                if (userProfile != null) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier
                            .background(Color.White.copy(alpha = 0.05f), RoundedCornerShape(16.dp))
                            .padding(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(colors.primary, RoundedCornerShape(24.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = userProfile?.name?.first()?.uppercase() ?: "U",
                                style = StreamFlowTheme.typography.headlineMedium
                            )
                        }
                        Column {
                            Text(text = userProfile?.name ?: "", style = StreamFlowTheme.typography.titleMedium)
                            Text(
                                text = userProfile?.email ?: "",
                                style = StreamFlowTheme.typography.bodyMedium,
                                color = Color.White.copy(alpha = 0.5f)
                            )
                        }
                        Spacer(Modifier.width(24.dp))
                        Surface(
                            onClick = {
                                scope.launch {
                                    userRepo.clearAuthData()
                                    ApiClient.authToken = null
                                }
                            },
                            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color.White.copy(alpha = 0.1f),
                                focusedContainerColor = Color.White.copy(alpha = 0.2f)
                            )
                        ) {
                            Text(
                                "Logout",
                                style = StreamFlowTheme.typography.labelLarge,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )
                        }
                    }
                } else {
                    Surface(
                        onClick = { navController.navigate("pairing") },
                        modifier = Modifier.width(300.dp),
                        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(16.dp)),
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = colors.primary,
                            focusedContainerColor = colors.accent
                        ),
                        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                "Pair Device / Login",
                                style = StreamFlowTheme.typography.labelLarge.copy(color = Color.White)
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(32.dp))

        Text(
            text = "CHOOSE THEME",
            style = StreamFlowTheme.typography.labelSmall.copy(
                color = Color.White.copy(alpha = 0.5f)
            ),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            themes.forEach { (id, name, color) ->
                val isSelected = currentTheme == id

                Surface(
                    onClick = { onThemeChange(id) },
                    modifier = Modifier.width(200.dp),
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(16.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = if (isSelected) Color.White.copy(alpha = 0.1f) else colors.surfaceVariant,
                        focusedContainerColor = Color.White.copy(alpha = 0.15f)
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .background(Color.Black, RoundedCornerShape(12.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = name.first().toString(),
                                style = StreamFlowTheme.typography.headlineLarge.copy(color = color)
                            )
                        }

                        Spacer(Modifier.height(12.dp))

                        Text(
                            text = name,
                            style = StreamFlowTheme.typography.titleMedium
                        )

                        if (isSelected) {
                            Text(
                                text = "✓ Active",
                                style = StreamFlowTheme.typography.labelSmall.copy(
                                    color = Color(0xFF22C55E)
                                ),
                                modifier = Modifier.padding(top = 4.dp)
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(40.dp))

        Text(
            text = "SERVER URL",
            style = StreamFlowTheme.typography.labelSmall.copy(
                color = Color.White.copy(alpha = 0.5f)
            ),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            BasicTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                textStyle = StreamFlowTheme.typography.titleMedium,
                cursorBrush = SolidColor(colors.primary),
                modifier = Modifier
                    .width(400.dp)
                    .background(colors.surfaceVariant, RoundedCornerShape(12.dp))
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            )

            Surface(
                onClick = {
                    val url = serverUrl.text.trim()
                    ApiClient.baseUrl = url
                    scope.launch { userRepo.setServerUrl(url) }
                },
                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = colors.primary,
                    focusedContainerColor = colors.accent
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
            ) {
                Text(
                    "Save",
                    style = StreamFlowTheme.typography.labelLarge.copy(color = Color.White),
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }

        Spacer(Modifier.height(16.dp))

        Text(
            text = "Enter the IP address and port of your StreamFlow backend server.",
            style = StreamFlowTheme.typography.bodyMedium,
            modifier = Modifier.widthIn(max = 500.dp)
        )

        Spacer(Modifier.height(40.dp))

        Text(
            text = "APP UPDATE",
            style = StreamFlowTheme.typography.labelSmall.copy(
                color = Color.White.copy(alpha = 0.5f)
            ),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            Text(
                text = "Version: v${packageInfo.versionName}",
                style = StreamFlowTheme.typography.bodyLarge
            )

            Surface(
                onClick = { updateViewModel.checkUpdate() },
                shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = Color.White.copy(alpha = 0.1f),
                    focusedContainerColor = Color.White.copy(alpha = 0.2f)
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
            ) {
                Text(
                    text = when (updateState) {
                        is com.streamflow.tv.viewmodel.UpdateUiState.Checking -> "Checking..."
                        is com.streamflow.tv.viewmodel.UpdateUiState.Downloading -> "Downloading..."
                        else -> "Check for Update"
                    },
                    style = StreamFlowTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp)
                )
            }
        }

        when (val state = updateState) {
            is com.streamflow.tv.viewmodel.UpdateUiState.UpdateAvailable -> {
                Spacer(Modifier.height(12.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .background(colors.primary.copy(alpha = 0.1f), RoundedCornerShape(12.dp))
                        .padding(16.dp)
                ) {
                    Text(
                        text = "New Version Available: ${state.release.tagName}",
                        style = StreamFlowTheme.typography.bodyLarge.copy(color = colors.primary)
                    )
                    Button(onClick = { updateViewModel.startDownload(state.release) }) {
                        Text("Download & Install")
                    }
                }
            }
            is com.streamflow.tv.viewmodel.UpdateUiState.UpToDate -> {
                Spacer(Modifier.height(8.dp))
                Text(
                    "App is up to date.",
                    style = StreamFlowTheme.typography.bodyMedium.copy(color = Color(0xFF22C55E))
                )
            }
            is com.streamflow.tv.viewmodel.UpdateUiState.Downloading -> {
                Spacer(Modifier.height(8.dp))
                LinearProgressIndicator(
                    progress = state.progress,
                    modifier = Modifier.width(300.dp),
                    color = colors.primary
                )
            }
            is com.streamflow.tv.viewmodel.UpdateUiState.Error -> {
                Spacer(Modifier.height(8.dp))
                Text(
                    state.message,
                    style = StreamFlowTheme.typography.bodyMedium.copy(color = Color.Red)
                )
            }
            else -> {}
        }
    }
}
