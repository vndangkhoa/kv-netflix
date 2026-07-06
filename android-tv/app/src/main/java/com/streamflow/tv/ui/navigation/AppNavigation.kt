package com.streamflow.tv.ui.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.streamflow.tv.ui.screens.*

@Composable
fun AppNavigation(
    currentTheme: String,
    onThemeChange: (String) -> Unit
) {
    val navController = rememberNavController()

    // Provide nav controller via local
    CompositionLocalProvider(LocalNavController provides navController) {
        NavHost(navController = navController, startDestination = "home") {
            // Home (all categories)
            composable("home") {
                HomeScreen(
                    onMovieClick = { slug -> navController.navigate("detail/$slug") }
                )
            }

            // Home filtered by category
            composable(
                "home/{category}",
                arguments = listOf(navArgument("category") { type = NavType.StringType })
            ) { backStackEntry ->
                val category = backStackEntry.arguments?.getString("category")
                HomeScreen(
                    onMovieClick = { slug -> navController.navigate("detail/$slug") },
                    category = category
                )
            }

            // Movie Detail
            composable(
                "detail/{slug}",
                arguments = listOf(navArgument("slug") { type = NavType.StringType })
            ) { backStackEntry ->
                val slug = backStackEntry.arguments?.getString("slug") ?: return@composable
                DetailScreen(
                    slug = slug,
                    onPlayClick = { s, ep -> navController.navigate("player/$s/$ep") },
                    onBack = { navController.popBackStack() }
                )
            }

            // Video Player
            composable(
                "player/{slug}/{episode}",
                arguments = listOf(
                    navArgument("slug") { type = NavType.StringType },
                    navArgument("episode") { type = NavType.IntType; defaultValue = 1 }
                )
            ) { backStackEntry ->
                val slug = backStackEntry.arguments?.getString("slug") ?: return@composable
                val episode = backStackEntry.arguments?.getInt("episode") ?: 1
                PlayerScreen(slug = slug, episode = episode)
            }

            // Search
            composable("search") {
                SearchScreen(
                    onMovieClick = { slug -> navController.navigate("detail/$slug") }
                )
            }

            // My List
            composable("mylist") {
                MyListScreen(
                    onMovieClick = { slug -> navController.navigate("detail/$slug") }
                )
            }

            // Settings
            composable("settings") {
                SettingsScreen(
                    currentTheme = currentTheme,
                    onThemeChange = onThemeChange
                )
            }

            // Pairing
            composable("pairing") {
                PairingScreen(
                    onSuccess = { navController.popBackStack() },
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}

val LocalNavController = staticCompositionLocalOf<androidx.navigation.NavHostController> {
    error("NavController not provided")
}
