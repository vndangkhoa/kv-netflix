package com.streamflow.tv.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.items
import androidx.tv.material3.*
import com.streamflow.tv.ui.components.MovieCard
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.SearchViewModel

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchScreen(
    onMovieClick: (String) -> Unit,
    viewModel: SearchViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors
    var textValue by remember { mutableStateOf(TextFieldValue("")) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 48.dp, vertical = 32.dp)
    ) {
        // Search bar
        Text(
            text = "Search",
            style = StreamFlowTheme.typography.displayMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.surfaceVariant, RoundedCornerShape(12.dp))
                .padding(horizontal = 16.dp, vertical = 12.dp)
        ) {
            Text("🔍 ", style = StreamFlowTheme.typography.titleMedium)
            BasicTextField(
                value = textValue,
                onValueChange = {
                    textValue = it
                    if (it.text.length >= 2) {
                        viewModel.search(it.text)
                    }
                },
                textStyle = StreamFlowTheme.typography.titleMedium,
                cursorBrush = SolidColor(colors.primary),
                modifier = Modifier.fillMaxWidth(),
                decorationBox = { innerTextField ->
                    Box {
                        if (textValue.text.isEmpty()) {
                            Text(
                                "Type to search...",
                                style = StreamFlowTheme.typography.titleMedium.copy(
                                    color = Color.White.copy(alpha = 0.3f)
                                )
                            )
                        }
                        innerTextField()
                    }
                }
            )
        }

        Spacer(Modifier.height(24.dp))

        // Results
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Searching...", style = StreamFlowTheme.typography.bodyLarge.copy(color = colors.primary))
                }
            }
            uiState.results.isNotEmpty() -> {
                TvLazyVerticalGrid(
                    columns = TvGridCells.Adaptive(180.dp),
                    contentPadding = PaddingValues(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(uiState.results, key = { it.slug }) { movie ->
                        MovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.slug) }
                        )
                    }
                }
            }
            uiState.hasSearched -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No results found", style = StreamFlowTheme.typography.bodyLarge)
                }
            }
            else -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🎬", style = StreamFlowTheme.typography.displayLarge)
                        Text(
                            "Search for movies and shows",
                            style = StreamFlowTheme.typography.bodyLarge,
                            modifier = Modifier.padding(top = 12.dp)
                        )
                    }
                }
            }
        }
    }
}
