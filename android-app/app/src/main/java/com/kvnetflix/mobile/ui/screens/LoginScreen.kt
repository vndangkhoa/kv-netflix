package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.theme.KvTheme
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun LoginScreen(
    userRepo: UserDataRepository?,
    onDismiss: () -> Unit,
    onRegister: () -> Unit,
    onForgotPassword: () -> Unit,
    onDeviceLogin: () -> Unit,
    onLoginSuccess: () -> Unit
) {
    val colors = KvTheme.colors
    val statusBarPadding = WindowInsets.statusBars.asPaddingValues()
    var useCode by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
    ) {
        IconButton(
            onClick = onDismiss,
            modifier = Modifier.padding(
                top = statusBarPadding.calculateTopPadding() + 8.dp,
                start = 8.dp
            )
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = colors.textPrimary)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.Center)
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 400.dp)
                    .background(colors.bgSecondary, RoundedCornerShape(24.dp))
                    .padding(32.dp)
            ) {
                Text(
                    "Sign In",
                    color = colors.textPrimary,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    TabButton("Email", !useCode, colors.accent) { useCode = false }
                    TabButton("Enter Code", useCode, colors.accent) { useCode = true }
                }

                Spacer(modifier = Modifier.height(20.dp))

                if (useCode) {
                    OutlinedTextField(
                        value = code,
                        onValueChange = { if (it.length <= 6) code = it },
                        label = { Text("Enter 6-digit code") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        textStyle = MaterialTheme.typography.headlineMedium.copy(
                            textAlign = TextAlign.Center,
                            letterSpacing = 8.sp
                        )
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        "Or pair a device",
                        color = colors.accent,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable(onClick = onDeviceLogin)
                    )
                } else {
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation()
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Forgot password?",
                        color = colors.accent,
                        fontSize = 14.sp,
                        modifier = Modifier.clickable(onClick = onForgotPassword)
                    )
                }

                error?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(it, color = Color.Red, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        scope.launch {
                            isLoading = true
                            error = null
                            try {
                                val response = if (useCode) {
                                    if (code.length < 6) {
                                        error = "Please enter the 6-digit code"
                                        isLoading = false
                                        return@launch
                                    }
                                    ApiClient.api.loginWithCode(mapOf("code" to code))
                                } else {
                                    if (email.isBlank()) {
                                        error = "Email is required"
                                        isLoading = false
                                        return@launch
                                    }
                                    if (password.isBlank()) {
                                        error = "Password is required"
                                        isLoading = false
                                        return@launch
                                    }
                                    ApiClient.api.login(mapOf("email" to email.trim().lowercase(), "password" to password))
                                }
                                ApiClient.authToken = response.token
                                userRepo?.saveAuthData(response.token, response.user)
                                onLoginSuccess()
                                scope.launch {
                                    userRepo?.syncWithRemote()
                                }
                            } catch (e: Exception) {
                                error = when (e) {
                                    is retrofit2.HttpException -> {
                                        try {
                                            e.response()?.errorBody()?.string()
                                                ?: "Login failed (${e.code()})"
                                        } catch (_: Exception) {
                                            "Login failed (${e.code()})"
                                        }
                                    }
                                    is java.net.UnknownHostException -> "Cannot reach server"
                                    is java.net.SocketTimeoutException -> "Connection timed out"
                                    else -> e.message ?: "Login failed"
                                }
                            } finally {
                                isLoading = false
                            }
                        }
                    },
                    enabled = !isLoading,
                    colors = ButtonDefaults.buttonColors(containerColor = colors.accent),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text(
                        if (isLoading) "Signing in..." else "Sign In",
                        color = Color.White,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    "Don't have an account? Sign Up",
                    color = colors.accent,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .clickable(onClick = onRegister)
                        .align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}

@Composable
private fun TabButton(
    label: String,
    active: Boolean,
    activeColor: Color,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (active) activeColor.copy(alpha = 0.2f)
                else Color.Transparent
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        Text(
            label,
            color = if (active) activeColor else Color.Gray,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
            fontSize = 14.sp
        )
    }
}
