package com.streamflow.tv

import android.os.Bundle
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
import coil.Coil
import coil.ImageLoader
import coil.disk.DiskCache
import coil.memory.MemoryCache

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup Coil with caching
        val imageLoader = ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(this.cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.02)
                    .build()
            }
            .build()
        Coil.setImageLoader(imageLoader)

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
        currentTheme = userRepo.theme.first()
        val serverUrl = userRepo.serverUrl.first()
        if (serverUrl.isNotBlank()) {
            ApiClient.baseUrl = serverUrl
        }
    }

    StreamFlowTvTheme(themeName = currentTheme) {
        val colors = StreamFlowTheme.colors

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
                            onBack = { navController.popBackStack() }
                        )
                    }

                    composable(
                        "player/{slug}/{episode}",
                        arguments = listOf(
                            navArgument("slug") { type = NavType.StringType },
                            navArgument("episode") { type = NavType.IntType; defaultValue = 1 }
                        )
                    ) { entry ->
                        val slug = entry.arguments?.getString("slug")
                        val episode = entry.arguments?.getInt("episode") ?: 1
                        android.util.Log.e("StreamFlowNav", "Navigating to player: slug=$slug, episode=$episode")
                        if (slug == null) {
                            android.util.Log.e("StreamFlowNav", "Slug is null - not rendering PlayerScreen")
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
                }
            }
        }
    }
}
