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
                    text = "Loading catalog...",
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
                contentPadding = PaddingValues(bottom = 32.dp)
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

                // Top 10 Movies Today (Horizontal 16:9 Thumbnails)
                if (uiState.top10Movies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "🔥 TOP 10 MOVIES TODAY",
                            movies = uiState.top10Movies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) },
                            isHorizontal = true
                        )
                    }
                }

                // Continue Watching (Vertical 2:3 Thumbnails)
                if (uiState.watchedMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Continue Watching",
                            movies = uiState.watchedMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) },
                            isHorizontal = false
                        )
                    }
                }

                // My List (Horizontal 16:9 Thumbnails)
                if (uiState.myListMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "My List",
                            movies = uiState.myListMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) },
                            isHorizontal = true
                        )
                    }
                }

                // Recommended for You (Vertical 2:3 Thumbnails)
                if (uiState.recommendedMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Recommended for You",
                            movies = uiState.recommendedMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) },
                            isHorizontal = false
                        )
                    }
                }

                // Interleaved Category rows (alternating Horizontal and Vertical thumbnails)
                uiState.categoryMovies.entries.forEachIndexed { index, entry ->
                    val (title, movies) = entry
                    if (movies.isNotEmpty()) {
                        item {
                            MovieRow(
                                title = title,
                                movies = movies,
                                onMovieClick = { movie -> onMovieClick(movie.slug) },
                                isHorizontal = (index % 2 == 0) // Alternates: true, false, true, false
                            )
                        }
                    }
                }
            }
        }
    }
}
