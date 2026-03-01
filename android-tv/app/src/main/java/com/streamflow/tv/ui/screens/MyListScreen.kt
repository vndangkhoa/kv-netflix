package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.ui.components.MovieCard
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        Text(
            text = "My List",
            style = StreamFlowTheme.typography.displayMedium,
            modifier = Modifier.padding(bottom = 24.dp)
        )

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
            // Continue Watching
            if (uiState.watchHistory.isNotEmpty()) {
                Text(
                    text = "Continue Watching",
                    style = StreamFlowTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                TvLazyVerticalGrid(
                    columns = TvGridCells.Adaptive(180.dp),
                    contentPadding = PaddingValues(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.heightIn(max = 320.dp)
                ) {
                    items(uiState.watchHistory, key = { "h_${it.slug}" }) { movie ->
                        MovieCard(movie = movie, onClick = { onMovieClick(movie.slug) })
                    }
                }

                Spacer(Modifier.height(24.dp))
            }

            // Saved
            if (uiState.savedMovies.isNotEmpty()) {
                Text(
                    text = "Saved Movies",
                    style = StreamFlowTheme.typography.headlineMedium,
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                TvLazyVerticalGrid(
                    columns = TvGridCells.Adaptive(180.dp),
                    contentPadding = PaddingValues(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(uiState.savedMovies, key = { "s_${it.slug}" }) { movie ->
                        MovieCard(movie = movie, onClick = { onMovieClick(movie.slug) })
                    }
                }
            }
        }
    }
}
