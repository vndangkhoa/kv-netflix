package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.UpdateViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userRepo: UserDataRepository?,
    updateViewModel: UpdateViewModel?,
    onBack: () -> Unit,
    onLogin: () -> Unit,
    onLogout: () -> Unit,
    onDevicePair: () -> Unit
) {
    val colors = KvTheme.colors
    val scope = rememberCoroutineScope()
    var serverUrl by remember { mutableStateOf("https://nf.khoavo.myds.me") }

    LaunchedEffect(Unit) {
        userRepo?.serverUrl?.collect { serverUrl = it }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
    ) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, "Back", tint = colors.textPrimary)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Settings",
                color = colors.textPrimary,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp)
        ) {
            // Account section
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.bgSecondary)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Account",
                        color = colors.textPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = onLogin,
                        colors = ButtonDefaults.buttonColors(containerColor = colors.accent),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Sign In", color = Color.White)
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = onDevicePair,
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(colors.accent.copy(alpha = 0.1f))
                    ) {
                        Text("Pair Device", color = colors.accent)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Server section
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.bgSecondary)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Server",
                        color = colors.textPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = serverUrl,
                        onValueChange = { serverUrl = it },
                        label = { Text("Server URL") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            scope.launch {
                                userRepo?.setServerUrl(serverUrl)
                                ApiClient.baseUrl = serverUrl
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.accent),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Save", color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Update section
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = colors.bgSecondary)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "App Update",
                        color = colors.textPrimary,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Version 1.0",
                        color = colors.textMuted,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = { updateViewModel?.checkUpdate() },
                        colors = ButtonDefaults.buttonColors(containerColor = colors.accent),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Check for Update", color = Color.White)
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
