package com.kvnetflix.mobile

import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.UserProfile
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.components.BottomTabBar
import com.kvnetflix.mobile.ui.components.Navbar
import com.kvnetflix.mobile.ui.navigation.AppNavHost
import com.kvnetflix.mobile.ui.navigation.Routes
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.*
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private var isInPipMode = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val userRepo = UserDataRepository(applicationContext)

        setContent {
            KvTheme(darkTheme = true) {
                val navController = rememberNavController()
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentRoute = navBackStackEntry?.destination?.route ?: Routes.HOME

                val homeViewModel: HomeViewModel = viewModel()
                val detailViewModel: DetailViewModel = viewModel()
                val playerViewModel: PlayerViewModel = viewModel()
                val searchViewModel: SearchViewModel = viewModel()
                val myListViewModel: MyListViewModel = viewModel()
                val accountViewModel: AccountViewModel = viewModel()
                val pairingViewModel = remember { PairingViewModel(userRepo) }
                val updateViewModel: UpdateViewModel? = remember {
                    try { UpdateViewModel(applicationContext) } catch (_: Exception) { null }
                }

                var isAuthenticated by remember { mutableStateOf(false) }
                var isDarkTheme by remember { mutableStateOf(true) }
                var language by remember { mutableStateOf("vi") }
                var userProfile by remember { mutableStateOf<UserProfile?>(null) }

                LaunchedEffect(Unit) {
                    userRepo.authToken.collect { token ->
                        isAuthenticated = token != null
                        ApiClient.authToken = token
                        if (token != null) {
                            launch {
                                userRepo.syncWithRemote()
                                myListViewModel.loadExplore()
                            }
                        }
                    }
                }

                LaunchedEffect(Unit) {
                    userRepo.userProfile.collect { profile ->
                        userProfile = profile
                    }
                }

                LaunchedEffect(Unit) {
                    userRepo.serverUrl.collect { url ->
                        ApiClient.baseUrl = url
                    }
                }

                LaunchedEffect(Unit) {
                    userRepo.language.collect { lang -> language = lang }
                }

                val isFullScreen = currentRoute?.contains("watch/") == true

                LaunchedEffect(isFullScreen) {
                    val window = window
                    val controller = WindowCompat.getInsetsController(window, window.decorView)
                    if (isFullScreen) {
                        controller.hide(WindowInsetsCompat.Type.systemBars())
                        controller.systemBarsBehavior =
                            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    } else {
                        controller.show(WindowInsetsCompat.Type.systemBars())
                    }
                }

                val pipEnabled = currentRoute?.contains("watch/") == true &&
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.N &&
                    packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)

                val selectedTabIndex = when {
                    currentRoute == Routes.MY_LIST -> 3
                    currentRoute == Routes.HOME -> 0
                    currentRoute?.startsWith("home") == true -> {
                        val category = navBackStackEntry?.arguments?.getString("category")
                        when (category) {
                            "phim-le" -> 1
                            "phim-bo" -> 2
                            else -> 0
                        }
                    }
                    else -> 0
                }

                val onMovieClickNav: (String) -> Unit = { slug ->
                    navController.navigate(Routes.watchRoute(slug))
                }

                Scaffold(
                    modifier = Modifier.fillMaxSize(),
                    topBar = {
                        if (!isFullScreen) {
                            Navbar(
                                isAuthenticated = isAuthenticated,
                                isDarkTheme = isDarkTheme,
                                language = language,
                                onLanguageToggle = {
                                    val newLang = if (language == "vi") "en" else "vi"
                                    language = newLang
                                },
                                searchViewModel = searchViewModel,
                                onMovieClick = onMovieClickNav,
                                onAuthClick = {
                                    if (isAuthenticated) navController.navigate(Routes.MY_LIST)
                                    else navController.navigate(Routes.LOGIN)
                                },
                                onCategoryClick = { category ->
                                    navController.navigate(Routes.homeRoute(category))
                                },
                                onHomeClick = {
                                    navController.navigate(Routes.HOME) {
                                        popUpTo(Routes.HOME) { inclusive = true }
                                    }
                                }
                            )
                        }
                    },
                    bottomBar = {
                        if (!isFullScreen) {
                            BottomTabBar(
                                selectedTabIndex = selectedTabIndex,
                                onTabSelected = { tab ->
                                    when (tab) {
                                        "home" -> navController.navigate(Routes.HOME) {
                                            popUpTo(Routes.HOME) { inclusive = true }
                                        }
                                        "my-list" -> {
                                            myListViewModel.loadExplore()
                                            navController.navigate(Routes.MY_LIST)
                                        }
                                        else -> navController.navigate(Routes.homeRoute(tab))
                                    }
                                }
                            )
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        AppNavHost(
                            navController = navController,
                            userRepo = userRepo,
                            homeViewModel = homeViewModel,
                            detailViewModel = detailViewModel,
                            playerViewModel = playerViewModel,
                            myListViewModel = myListViewModel,
                            pairingViewModel = pairingViewModel,
                            accountViewModel = accountViewModel,
                            updateViewModel = updateViewModel,
                            language = language,
                            isAuthenticated = isAuthenticated,
                            userProfile = userProfile,
                            onEnterPip = {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isInPipMode) {
                                    val params = PictureInPictureParams.Builder()
                                        .setAspectRatio(Rational(16, 9))
                                        .build()
                                    enterPictureInPictureMode(params)
                                    isInPipMode = true
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        isInPipMode = isInPictureInPictureMode
        if (!isInPictureInPictureMode) {
            enableEdgeToEdge()
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !isInPipMode) {
            try {
                val params = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(16, 9))
                    .build()
                enterPictureInPictureMode(params)
                isInPipMode = true
            } catch (_: Exception) {}
        }
    }
}
