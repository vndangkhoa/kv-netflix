package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.components.HeroBanner
import com.streamflow.tv.ui.components.MovieRow
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.HomeViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    onMovieClick: (String) -> Unit,
    category: String? = null,
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    viewModel: HomeViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors

    LaunchedEffect(category) {
        viewModel.loadHome(category, userDataRepository)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Loading...",
                    style = StreamFlowTheme.typography.headlineMedium.copy(color = colors.primary)
                )
            }
        } else if (uiState.error != null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = uiState.error ?: "Unknown error",
                    style = StreamFlowTheme.typography.bodyLarge.copy(color = Color.Red)
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                // Hero Banner
                if (uiState.heroMovies.isNotEmpty()) {
                    item {
                        HeroBanner(
                            movies = uiState.heroMovies,
                            onPlayClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }

                // Continue Watching (Watch History)
                if (uiState.watchedMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Continue Watching",
                            movies = uiState.watchedMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }

                // My List (Liked)
                if (uiState.myListMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "My List",
                            movies = uiState.myListMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }

                // Recommended for You
                if (uiState.recommendedMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Recommended for You",
                            movies = uiState.recommendedMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }

                // Category rows
                uiState.categoryMovies.forEach { (title, movies) ->
                    if (movies.isNotEmpty()) {
                        item {
                            MovieRow(
                                title = title,
                                movies = movies,
                                onMovieClick = { movie -> onMovieClick(movie.slug) }
                            )
                        }
                    }
                }
            }
        }
    }
}
