package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.components.MovieRow
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.MyListViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MyListScreen(
    onMovieClick: (String) -> Unit,
    viewModel: MyListViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
    ) {
        if (uiState.watchHistory.isEmpty() && uiState.savedMovies.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("❤️", style = StreamFlowTheme.typography.displayLarge)
                    Text(
                        "Your list is empty.",
                        style = StreamFlowTheme.typography.headlineMedium,
                        modifier = Modifier.padding(top = 12.dp)
                    )
                    Text(
                        "Start watching or add movies to your list.",
                        style = StreamFlowTheme.typography.bodyLarge,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(top = 32.dp, bottom = 48.dp)
            ) {
                item {
                    Text(
                        text = "My List",
                        style = StreamFlowTheme.typography.displayMedium,
                        modifier = Modifier.padding(start = 48.dp, bottom = 24.dp)
                    )
                }

                // Continue Watching
                if (uiState.watchHistory.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Continue Watching",
                            movies = uiState.watchHistory,
                            onMovieClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }

                // Saved Movies
                if (uiState.savedMovies.isNotEmpty()) {
                    item {
                        MovieRow(
                            title = "Saved Movies",
                            movies = uiState.savedMovies,
                            onMovieClick = { movie -> onMovieClick(movie.slug) }
                        )
                    }
                }
            }
        }
    }
}
