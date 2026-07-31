package com.streamflow.tv.ui.screens

import android.view.KeyEvent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.foundation.lazy.grid.TvGridCells
import androidx.tv.foundation.lazy.grid.TvLazyVerticalGrid
import androidx.tv.foundation.lazy.grid.itemsIndexed
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

    val searchFieldFocusRequester = remember { FocusRequester() }
    val firstResultFocusRequester = remember { FocusRequester() }
    var isSearchFocused by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        try {
            searchFieldFocusRequester.requestFocus()
        } catch (e: Exception) {
            // Ignore
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.background)
            .padding(horizontal = 36.dp, vertical = 28.dp)
    ) {
        // Search Header
        Text(
            text = "Search Movies & Shows",
            style = StreamFlowTheme.typography.headlineLarge.copy(
                fontWeight = FontWeight.Bold,
                fontSize = 28.sp
            ),
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Search Bar Container
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    if (isSearchFocused) colors.surfaceVariant.copy(alpha = 0.9f) else colors.surfaceVariant.copy(alpha = 0.5f),
                    RoundedCornerShape(12.dp)
                )
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .focusProperties {
                    down = firstResultFocusRequester
                }
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
                textStyle = StreamFlowTheme.typography.titleMedium.copy(color = Color.White),
                cursorBrush = SolidColor(colors.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(
                    onSearch = {
                        if (uiState.results.isNotEmpty()) {
                            firstResultFocusRequester.requestFocus()
                        }
                    }
                ),
                modifier = Modifier
                    .weight(1f)
                    .focusRequester(searchFieldFocusRequester)
                    .onFocusChanged { isSearchFocused = it.isFocused }
                    .onPreviewKeyEvent { keyEvent ->
                        if (keyEvent.type == KeyEventType.KeyDown) {
                            when (keyEvent.nativeKeyEvent.keyCode) {
                                KeyEvent.KEYCODE_DPAD_DOWN -> {
                                    if (uiState.results.isNotEmpty()) {
                                        firstResultFocusRequester.requestFocus()
                                        true
                                    } else false
                                }
                                KeyEvent.KEYCODE_ENTER, KeyEvent.KEYCODE_DPAD_CENTER -> {
                                    if (textValue.text.length >= 2) {
                                        viewModel.search(textValue.text)
                                    }
                                    if (uiState.results.isNotEmpty()) {
                                        firstResultFocusRequester.requestFocus()
                                        true
                                    } else false
                                }
                                else -> false
                            }
                        } else false
                    },
                decorationBox = { innerTextField ->
                    Box {
                        if (textValue.text.isEmpty()) {
                            Text(
                                "Type title or genre to search...",
                                style = StreamFlowTheme.typography.titleMedium.copy(
                                    color = Color.White.copy(alpha = 0.35f)
                                )
                            )
                        }
                        innerTextField()
                    }
                }
            )

            if (uiState.results.isNotEmpty()) {
                Surface(
                    onClick = { firstResultFocusRequester.requestFocus() },
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = colors.primary,
                        focusedContainerColor = colors.accent
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f)
                ) {
                    Text(
                        text = "Results (${uiState.results.size}) ↓",
                        style = StreamFlowTheme.typography.labelMedium.copy(color = Color.White),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                    )
                }
            }
        }

        Spacer(Modifier.height(20.dp))

        // Results Section
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(
                        "Searching catalog...",
                        style = StreamFlowTheme.typography.bodyLarge.copy(color = colors.primary)
                    )
                }
            }
            uiState.results.isNotEmpty() -> {
                TvLazyVerticalGrid(
                    columns = TvGridCells.Adaptive(180.dp),
                    contentPadding = PaddingValues(bottom = 32.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    itemsIndexed(uiState.results, key = { _, item -> item.slug }) { index, movie ->
                        MovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.slug) },
                            modifier = if (index == 0) Modifier.focusRequester(firstResultFocusRequester) else Modifier
                        )
                    }
                }
            }
            uiState.hasSearched -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No matching movies or series found", style = StreamFlowTheme.typography.bodyLarge)
                }
            }
            else -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🎬", style = StreamFlowTheme.typography.displayLarge)
                        Text(
                            "Search across all providers",
                            style = StreamFlowTheme.typography.bodyLarge,
                            modifier = Modifier.padding(top = 12.dp)
                        )
                    }
                }
            }
        }
    }
}
