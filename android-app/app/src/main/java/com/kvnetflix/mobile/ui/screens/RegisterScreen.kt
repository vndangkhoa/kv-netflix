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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.theme.KvTheme
import kotlinx.coroutines.launch
import retrofit2.HttpException

@Composable
fun RegisterScreen(
    userRepo: UserDataRepository?,
    onDismiss: () -> Unit,
    onLogin: () -> Unit,
    onRegisterSuccess: () -> Unit
) {
    val colors = KvTheme.colors
    val statusBarPadding = WindowInsets.statusBars.asPaddingValues()
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
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
                    "Sign Up",
                    color = colors.textPrimary,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Full Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(12.dp))
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
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                )

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
                                if (name.isBlank()) {
                                    error = "Name is required"
                                    isLoading = false
                                    return@launch
                                }
                                if (email.isBlank()) {
                                    error = "Email is required"
                                    isLoading = false
                                    return@launch
                                }
                                if (password.length < 6) {
                                    error = "Password must be at least 6 characters"
                                    isLoading = false
                                    return@launch
                                }
                                val response = ApiClient.api.register(
                                    mapOf("name" to name.trim(), "email" to email.trim().lowercase(), "password" to password)
                                )
                                ApiClient.authToken = response.token
                                userRepo?.saveAuthData(response.token, response.user)
                                userRepo?.syncWithRemote()
                                onRegisterSuccess()
                            } catch (e: Exception) {
                                error = when (e) {
                                    is retrofit2.HttpException -> {
                                        try {
                                            e.response()?.errorBody()?.string()
                                                ?: "Registration failed (${e.code()})"
                                        } catch (_: Exception) {
                                            "Registration failed (${e.code()})"
                                        }
                                    }
                                    is java.net.UnknownHostException -> "Cannot reach server"
                                    is java.net.SocketTimeoutException -> "Connection timed out"
                                    else -> e.message ?: "Registration failed"
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
                        if (isLoading) "Registering..." else "Sign Up",
                        color = Color.White,
                        fontSize = 16.sp
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    "Already have an account? Sign In",
                    color = colors.accent,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .clickable(onClick = onLogin)
                        .align(Alignment.CenterHorizontally)
                )
            }
        }
    }
}
