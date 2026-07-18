package com.kvnetflix.mobile.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.screens.*
import com.kvnetflix.mobile.viewmodel.*

object Routes {
    const val HOME = "home"
    const val MY_LIST = "my-list"
    const val WATCH = "watch/{slug}/{episode}"
    const val LOGIN = "login"
    const val REGISTER = "register"
    const val SETTINGS = "settings"
    const val DEVICE_PAIR = "device-pair"
    const val DEVICE_LOGIN = "device-login"
    const val RESET_PASSWORD = "reset-password"

    fun watchRoute(slug: String, episode: Int = 1): String =
        "watch/$slug/$episode"

    fun homeRoute(category: String? = null): String =
        if (category != null) "home?category=$category" else "home"
}

@Composable
fun AppNavHost(
    navController: NavHostController,
    userRepo: UserDataRepository?,
    homeViewModel: HomeViewModel,
    detailViewModel: DetailViewModel,
    playerViewModel: PlayerViewModel,
    myListViewModel: MyListViewModel,
    pairingViewModel: PairingViewModel,
    accountViewModel: AccountViewModel,
    updateViewModel: UpdateViewModel?,
    language: String = "vi",
    isAuthenticated: Boolean = false,
    userProfile: com.kvnetflix.mobile.data.model.UserProfile? = null,
    onEnterPip: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    NavHost(
        navController = navController,
        startDestination = Routes.HOME,
        modifier = modifier
    ) {
        composable(Routes.HOME) {
            HomeScreen(
                viewModel = homeViewModel,
                userRepo = userRepo,
                category = null,
                onMovieClick = { slug ->
                    navController.navigate(Routes.watchRoute(slug))
                },
                onCategoryClick = { category ->
                    navController.navigate(Routes.homeRoute(category))
                },
                language = language
            )
        }

        composable(
            route = "home?category={category}",
            arguments = listOf(navArgument("category") {
                type = NavType.StringType
                defaultValue = null
                nullable = true
            })
        ) { backStackEntry ->
            val category = backStackEntry.arguments?.getString("category")
            HomeScreen(
                viewModel = homeViewModel,
                userRepo = userRepo,
                category = category,
                onMovieClick = { slug ->
                    navController.navigate(Routes.watchRoute(slug))
                },
                onCategoryClick = { cat ->
                    navController.navigate(Routes.homeRoute(cat))
                },
                language = language
            )
        }

        composable(
            route = Routes.WATCH,
            arguments = listOf(
                navArgument("slug") { type = NavType.StringType },
                navArgument("episode") {
                    type = NavType.IntType
                    defaultValue = 1
                }
            )
        ) { backStackEntry ->
            val slug = backStackEntry.arguments?.getString("slug") ?: ""
            val episode = backStackEntry.arguments?.getInt("episode") ?: 1
            WatchScreen(
                viewModel = playerViewModel,
                slug = slug,
                episode = episode,
                userRepo = userRepo,
                language = language,
                onBack = { navController.popBackStack() },
                onMovieClick = { newSlug ->
                    navController.navigate(Routes.watchRoute(newSlug))
                },
                onCategoryClick = { cat ->
                    navController.navigate(Routes.homeRoute(cat))
                },
                onEnterPip = onEnterPip
            )
        }

        composable(Routes.MY_LIST) {
            MyListScreen(
                viewModel = myListViewModel,
                onMovieClick = { slug ->
                    navController.navigate(Routes.watchRoute(slug))
                },
                onLoginClick = { navController.navigate(Routes.LOGIN) },
                isAuthenticated = isAuthenticated,
                userProfile = userProfile,
                accountViewModel = accountViewModel,
                onLogout = {
                    kotlinx.coroutines.runBlocking {
                        userRepo?.clearAuthData()
                    }
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.HOME) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.LOGIN) {
            LoginScreen(
                userRepo = userRepo,
                onDismiss = { navController.popBackStack() },
                onRegister = {
                    navController.navigate(Routes.REGISTER) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onForgotPassword = { navController.navigate(Routes.RESET_PASSWORD) },
                onDeviceLogin = { navController.navigate(Routes.DEVICE_LOGIN) },
                onLoginSuccess = { navController.popBackStack(Routes.HOME, false); navController.navigate(Routes.MY_LIST) }
            )
        }

        composable(Routes.REGISTER) {
            RegisterScreen(
                userRepo = userRepo,
                onDismiss = { navController.popBackStack() },
                onLogin = { navController.popBackStack() },
                onRegisterSuccess = { navController.popBackStack(Routes.HOME, false) }
            )
        }

        composable(Routes.DEVICE_PAIR) { /* TODO */ }
        composable(Routes.DEVICE_LOGIN) { /* TODO */ }
        composable(Routes.RESET_PASSWORD) { /* TODO */ }

        composable(Routes.SETTINGS) {
            SettingsScreen(
                userRepo = userRepo,
                updateViewModel = updateViewModel,
                onBack = { navController.popBackStack() },
                onLogin = { navController.navigate(Routes.LOGIN) },
                onLogout = { },
                onDevicePair = { navController.navigate(Routes.DEVICE_PAIR) }
            )
        }
    }
}
