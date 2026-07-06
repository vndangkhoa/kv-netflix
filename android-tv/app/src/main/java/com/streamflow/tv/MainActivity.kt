package com.streamflow.tv

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.repository.UserDataRepository
import com.streamflow.tv.ui.components.SideNavRail
import com.streamflow.tv.ui.screens.*
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.ui.theme.StreamFlowTvTheme
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.d("MainActivity", "onCreate started")
        setContent {
            StreamFlowTvApp()
        }
    }
}

@Composable
fun StreamFlowTvApp() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val userRepo = remember { UserDataRepository(context) }
    val navController = rememberNavController()

    var currentTheme by remember { mutableStateOf("default") }
    var selectedNavId by remember { mutableStateOf("home") }

    // Load persisted settings
    LaunchedEffect(Unit) {
        try {
            currentTheme = userRepo.theme.first()
            val serverUrl = userRepo.serverUrl.first()
            if (serverUrl.isNotBlank()) {
                ApiClient.baseUrl = serverUrl
            }
            val token = userRepo.authToken.first()
            if (!token.isNullOrBlank()) {
                ApiClient.authToken = token
                // Sync on app launch
                userRepo.syncWithRemote()
            }
            Log.d("StreamFlowTvApp", "Settings loaded: theme=$currentTheme, url=$serverUrl, hasToken=${!token.isNullOrBlank()}")
        } catch (e: Exception) {
            Log.e("StreamFlowTvApp", "Error loading settings", e)
        }
    }

    StreamFlowTvTheme(themeName = currentTheme) {
        val colors = StreamFlowTheme.colors

        CompositionLocalProvider(com.streamflow.tv.ui.navigation.LocalNavController provides navController) {
            val navBackStackEntry by navController.currentBackStackEntryAsState()
            val currentRoute = navBackStackEntry?.destination?.route
            val showSideNav = currentRoute != null && !currentRoute.startsWith("player")

            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .background(colors.background)
            ) {
                // Side Navigation
                if (showSideNav) {
                    SideNavRail(
                        selectedId = selectedNavId,
                        onNavigate = { item ->
                            selectedNavId = item.id
                            navController.navigate(item.route) {
                                popUpTo("home") { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        }
                    )
                }

                // Main content
                Box(modifier = Modifier.weight(1f)) {
                    NavHost(
                        navController = navController,
                        startDestination = "home"
                    ) {
                        composable("home") {
                            HomeScreen(
                                onMovieClick = { slug ->
                                    navController.navigate("detail/$slug")
                                },
                                userDataRepository = userRepo
                            )
                        }

                        composable(
                            "home/{category}",
                            arguments = listOf(navArgument("category") { type = NavType.StringType })
                        ) { entry ->
                            HomeScreen(
                                onMovieClick = { slug -> navController.navigate("detail/$slug") },
                                category = entry.arguments?.getString("category"),
                                userDataRepository = userRepo
                            )
                        }

                        composable(
                        "detail/{slug}",
                        arguments = listOf(navArgument("slug") { type = NavType.StringType })
                    ) { entry ->
                        val slug = entry.arguments?.getString("slug") ?: return@composable
                        DetailScreen(
                            slug = slug,
                            onPlayClick = { s, ep -> navController.navigate("player/$s/$ep") },
                            onBack = { navController.popBackStack() },
                            userDataRepository = userRepo
                        )
                    }

                        composable(
                            "player/{slug}/{episode}",
                            arguments = listOf(
                                navArgument("slug") { type = NavType.StringType },
                                navArgument("episode") { type = NavType.IntType; defaultValue = 1 }
                            ),
                            deepLinks = listOf(androidx.navigation.navDeepLink { uriPattern = "streamflow://player/{slug}/{episode}" })
                        ) { entry ->
                            val slug = entry.arguments?.getString("slug")
                            val episode = entry.arguments?.getInt("episode") ?: 1
                            Log.d("StreamFlowNav", "Navigating to player: slug=$slug, episode=$episode")
                            if (slug == null) {
                                return@composable
                            }
                            PlayerScreen(
                                slug = slug,
                                episode = episode,
                                userDataRepository = userRepo
                            )
                        }

                        composable("search") {
                            SearchScreen(
                                onMovieClick = { slug -> navController.navigate("detail/$slug") }
                            )
                        }

                        composable("mylist") {
                            MyListScreen(
                                onMovieClick = { slug -> navController.navigate("detail/$slug") }
                            )
                        }

                        composable("settings") {
                            SettingsScreen(
                                currentTheme = currentTheme,
                                onThemeChange = { theme ->
                                    currentTheme = theme
                                    scope.launch { userRepo.setTheme(theme) }
                                }
                            )
                        }

                        composable("pairing") {
                            PairingScreen(
                                onSuccess = { navController.popBackStack() },
                                onBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }
}
