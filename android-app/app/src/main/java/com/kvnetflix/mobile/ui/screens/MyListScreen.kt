package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.data.model.UserProfile
import com.kvnetflix.mobile.ui.components.MovieCard
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.AccountViewModel
import com.kvnetflix.mobile.viewmodel.MyListViewModel
import kotlinx.coroutines.delay

@Composable
fun MyListScreen(
    viewModel: MyListViewModel,
    onMovieClick: (String) -> Unit,
    onLoginClick: () -> Unit,
    isAuthenticated: Boolean = false,
    userProfile: UserProfile? = null,
    onLogout: () -> Unit = {},
    accountViewModel: AccountViewModel
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = KvTheme.colors
    var selectedTab by remember { mutableIntStateOf(0) }

    val tabs = listOf(
        "Explore", "History", "Saved", "Account"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
    ) {
        Text(
            "My List",
            color = colors.textPrimary,
            fontSize = 28.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(16.dp)
        )

        // Tab bar
        ScrollableTabRow(
            selectedTabIndex = selectedTab,
            containerColor = Color.Transparent,
            contentColor = colors.accent,
            edgePadding = 16.dp,
            divider = {}
        ) {
            tabs.forEachIndexed { index, label ->
                Tab(
                    selected = index == selectedTab,
                    onClick = { selectedTab = index },
                    text = {
                        Text(
                            text = label,
                            fontSize = 15.sp,
                            fontWeight = if (index == selectedTab) FontWeight.Bold
                            else FontWeight.Normal
                        )
                    },
                    selectedContentColor = colors.accent,
                    unselectedContentColor = colors.textMuted
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        when (selectedTab) {
            0 -> ExploreTab(uiState.exploreMovies, colors, onMovieClick, uiState.isLoadingExplore)
            1 -> HistoryTab(uiState.watchHistory, colors, onMovieClick)
            2 -> SavedTab(uiState.savedMovies, colors, onMovieClick)
            3 -> AccountTab(
                colors = colors,
                onLoginClick = onLoginClick,
                isAuthenticated = isAuthenticated,
                userProfile = userProfile,
                onLogout = onLogout,
                accountViewModel = accountViewModel
            )
        }
    }
}

@Composable
private fun ExploreTab(
    movies: List<Movie>,
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onMovieClick: (String) -> Unit,
    isLoading: Boolean
) {
    if (isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = colors.accent)
        }
    } else if (movies.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    Icons.Default.Explore,
                    contentDescription = null,
                    tint = colors.textMuted,
                    modifier = Modifier.size(64.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    "Nothing to explore yet",
                    color = colors.textMuted,
                    fontSize = 16.sp
                )
            }
        }
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val cardWidth = if (maxWidth > 720.dp) 180 else 140
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = cardWidth.dp),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(movies, key = { it.slug }) { movie ->
                    MovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie.slug) },
                        width = cardWidth
                    )
                }
            }
        }
    }
}

@Composable
private fun MovieGridSection(
    movies: List<Movie>,
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onMovieClick: (String) -> Unit,
    emptyIcon: @Composable () -> Unit,
    emptyText: String,
    showProgress: Boolean = false
) {
    if (movies.isEmpty()) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                emptyIcon()
                Spacer(modifier = Modifier.height(16.dp))
                Text(emptyText, color = colors.textMuted, fontSize = 16.sp)
            }
        }
    } else {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val cardWidth = if (maxWidth > 720.dp) 180 else 140
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = cardWidth.dp),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(movies, key = { it.slug }) { movie ->
                    MovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie.slug) },
                        width = cardWidth,
                        progress = if (showProgress) movie.progress else null
                    )
                }
            }
        }
    }
}

@Composable
private fun HistoryTab(
    history: List<Movie>,
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onMovieClick: (String) -> Unit
) {
    MovieGridSection(
        movies = history,
        colors = colors,
        onMovieClick = onMovieClick,
        emptyIcon = {
            Icon(
                Icons.Default.History,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier.size(64.dp)
            )
        },
        emptyText = "No watch history yet",
        showProgress = true
    )
}

@Composable
private fun SavedTab(
    saved: List<Movie>,
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onMovieClick: (String) -> Unit
) {
    MovieGridSection(
        movies = saved,
        colors = colors,
        onMovieClick = onMovieClick,
        emptyIcon = {
            Icon(
                Icons.Default.BookmarkBorder,
                contentDescription = null,
                tint = colors.textMuted,
                modifier = Modifier.size(64.dp)
            )
        },
        emptyText = "No saved movies yet"
    )
}

@Composable
private fun SectionTitle(text: String, colors: com.kvnetflix.mobile.ui.theme.AppColors) {
    Text(
        text = text,
        color = colors.textSecondary,
        fontSize = 13.sp,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)
    )
}

@Composable
private fun AccountRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = colors.textSecondary,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = label,
            color = colors.textPrimary,
            fontSize = 15.sp,
            modifier = Modifier.weight(1f)
        )
        Icon(
                            Icons.Filled.ArrowForward,
            contentDescription = null,
            tint = colors.textMuted,
            modifier = Modifier.size(18.dp)
        )
    }
}

@Composable
private fun AccountTab(
    colors: com.kvnetflix.mobile.ui.theme.AppColors,
    onLoginClick: () -> Unit,
    isAuthenticated: Boolean,
    userProfile: UserProfile?,
    onLogout: () -> Unit,
    accountViewModel: AccountViewModel
) {
    val acc by accountViewModel.uiState.collectAsState()
    var showPw by remember { mutableStateOf(false) }
    var showRecovery by remember { mutableStateOf(false) }
    var showPairing by remember { mutableStateOf(false) }
    var pwCur by remember { mutableStateOf("") }
    var pwNew by remember { mutableStateOf("") }
    var pwCurVis by remember { mutableStateOf(false) }
    var pwNewVis by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        accountViewModel.loadDevices()
    }
    LaunchedEffect(acc.message) {
        if (acc.message != null) {
            delay(2500)
            accountViewModel.clearMessage()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 24.dp)
    ) {
        if (isAuthenticated && userProfile != null) {
            // Profile header
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(RoundedCornerShape(40.dp))
                        .background(
                            Brush.linearGradient(
                                colors = listOf(colors.accent, Color(0xFF991B1B))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
                Text(userProfile.name, color = colors.textPrimary, fontSize = 22.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(userProfile.email, color = colors.textMuted, fontSize = 14.sp)
            }

            // Feedback message
            acc.message?.let { msg ->
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.bgTertiary)
                        .padding(12.dp)
                ) {
                    Text(msg, color = colors.textSecondary, fontSize = 13.sp)
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            SectionTitle("Account", colors)
            AccountRow(Icons.Default.Lock, "Change Password", colors) { showPw = true }
            AccountRow(Icons.Default.Security, "Account Recovery", colors) {
                accountViewModel.generateRecoveryKey()
                showRecovery = true
            }
            AccountRow(Icons.Default.Devices, "Device Pairing", colors) {
                accountViewModel.generateLinkCode()
                showPairing = true
            }
            AccountRow(Icons.Default.Logout, "Sign Out", colors) { onLogout() }

            // Connected devices
            SectionTitle("Connected Devices", colors)
            if (acc.isLoadingDevices == true) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(28.dp))
                }
            } else if (acc.devices.isNullOrEmpty()) {
                Text(
                    "No connected devices",
                    color = colors.textMuted,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            } else {
                acc.devices?.forEach { device ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Smartphone,
                            contentDescription = null,
                            tint = colors.textSecondary,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(device.name.ifBlank { "Device #${device.id}" }, color = colors.textPrimary, fontSize = 15.sp)
                            if (device.createdAt.isNotBlank()) {
                                Text(
                                    "Added ${device.createdAt.take(10)}",
                                    color = colors.textMuted,
                                    fontSize = 12.sp
                                )
                            }
                        }
                        IconButton(onClick = { accountViewModel.removeDevice(device.id) }) {
                            Icon(
                                Icons.Default.Delete,
                                contentDescription = "Remove device",
                                tint = colors.textMuted,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }
            }
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(RoundedCornerShape(40.dp))
                            .background(colors.bgTertiary),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            tint = colors.textMuted,
                            modifier = Modifier.size(40.dp)
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = onLoginClick,
                        colors = ButtonDefaults.buttonColors(containerColor = colors.accent),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Sign In", color = Color.White, fontSize = 16.sp)
                    }
                }
            }
        }
    }

    // ── Change Password Dialog ──
    if (showPw) {
        AlertDialog(
            onDismissRequest = { showPw = false },
            title = { Text("Change Password", color = colors.textPrimary) },
            text = {
                Column {
                    OutlinedTextField(
                        value = pwCur,
                        onValueChange = { pwCur = it },
                        label = { Text("Current Password") },
                        singleLine = true,
                        visualTransformation = if (pwCurVis) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { pwCurVis = !pwCurVis }) {
                                Icon(
                                    if (pwCurVis) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = colors.textMuted
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = pwNew,
                        onValueChange = { pwNew = it },
                        label = { Text("New Password") },
                        singleLine = true,
                        visualTransformation = if (pwNewVis) VisualTransformation.None else PasswordVisualTransformation(),
                        trailingIcon = {
                            IconButton(onClick = { pwNewVis = !pwNewVis }) {
                                Icon(
                                    if (pwNewVis) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = colors.textMuted
                                )
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        accountViewModel.changePassword(pwCur, pwNew)
                        showPw = false
                        pwCur = ""
                        pwNew = ""
                    },
                    enabled = !acc.isBusy
                ) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showPw = false }) { Text("Cancel") }
            }
        )
    }

    // ── Account Recovery Dialog ──
    if (showRecovery) {
        val key = acc.recoveryKey
        AlertDialog(
            onDismissRequest = {
                showRecovery = false
                accountViewModel.clearRecoveryKey()
            },
            title = { Text("Account Recovery", color = colors.textPrimary) },
            text = {
                Column {
                    Text(
                        "Save this recovery key somewhere safe. You can use it to reset your password if you get locked out.",
                        color = colors.textSecondary,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    if (key != null) {
                        val clipboard = LocalClipboardManager.current
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.bgTertiary)
                                .clickable { clipboard.setText(AnnotatedString(key)) }
                                .padding(14.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                key,
                                color = colors.accent,
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 2.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Tap to copy", color = colors.textMuted, fontSize = 12.sp)
                    } else {
                        CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(24.dp))
                    }
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showRecovery = false
                        accountViewModel.clearRecoveryKey()
                    }
                ) { Text("Done") }
            }
        )
    }

    // ── Device Pairing Dialog ──
    if (showPairing) {
        val code = acc.linkCode
        AlertDialog(
            onDismissRequest = {
                showPairing = false
                accountViewModel.clearLinkCode()
            },
            title = { Text("Device Pairing", color = colors.textPrimary) },
            text = {
                Column {
                    Text(
                        "Enter this code on another device to pair it with your account. The code expires in 5 minutes.",
                        color = colors.textSecondary,
                        fontSize = 13.sp
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    if (code != null) {
                        val clipboard = LocalClipboardManager.current
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.bgTertiary)
                                .clickable { clipboard.setText(AnnotatedString(code)) }
                                .padding(14.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                code,
                                color = colors.accent,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 3.sp
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Tap to copy", color = colors.textMuted, fontSize = 12.sp)
                    } else {
                        CircularProgressIndicator(color = colors.accent, modifier = Modifier.size(24.dp))
                    }
                }
            },
            confirmButton = {
                Button(onClick = { accountViewModel.generateLinkCode() }) {
                    Text(if (code != null) "Refresh" else "Generate")
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        showPairing = false
                        accountViewModel.clearLinkCode()
                    }
                ) { Text("Close") }
            }
        )
    }
}
