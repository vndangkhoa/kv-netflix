package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.viewmodel.SearchViewModel

@Composable
fun Navbar(
    isAuthenticated: Boolean,
    isDarkTheme: Boolean,
    language: String,
    searchViewModel: SearchViewModel,
    onMovieClick: (String) -> Unit,
    onLanguageToggle: () -> Unit,
    onAuthClick: () -> Unit,
    onCategoryClick: (String) -> Unit,
    onHomeClick: () -> Unit,
    scrollState: androidx.compose.foundation.ScrollState? = null
) {
    val colors = KvTheme.colors
    val statusBarPadding = WindowInsets.statusBars.asPaddingValues()
    val uiState by searchViewModel.uiState.collectAsState()
    var menuOpen by remember { mutableStateOf(false) }
    val isTyping = uiState.query.isNotEmpty()

    LaunchedEffect(uiState.showSuggestions, uiState.suggestions.size, uiState.hasSearched, uiState.results.size) {
        menuOpen = (uiState.showSuggestions && uiState.suggestions.isNotEmpty()) ||
            (uiState.hasSearched && uiState.results.isNotEmpty())
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = colors.bgSecondary.copy(alpha = 0.95f),
        tonalElevation = 0.dp
    ) {
        Column {
            Spacer(modifier = Modifier.height(statusBarPadding.calculateTopPadding()))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Search bar + dropdown
                Box(
                    modifier = Modifier.weight(1f)
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(44.dp)
                                .clip(RoundedCornerShape(22.dp))
                                .background(colors.bgTertiary)
                                .padding(horizontal = 16.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Icon(
                                    Icons.Default.Search,
                                    contentDescription = "Search",
                                    tint = colors.textMuted,
                                    modifier = Modifier.size(20.dp)
                                )
                                BasicTextField(
                                    value = uiState.query,
                                    onValueChange = { searchViewModel.onQueryChanged(it) },
                                    modifier = Modifier.weight(1f),
                                    textStyle = TextStyle(
                                        color = colors.textPrimary,
                                        fontSize = 15.sp
                                    ),
                                    cursorBrush = SolidColor(colors.accent),
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                    keyboardActions = KeyboardActions(
                                        onSearch = {
                                            searchViewModel.search()
                                        }
                                    ),
                                    decorationBox = { innerTextField ->
                                        if (uiState.query.isEmpty()) {
                                            Text(
                                                "Search movies...",
                                                color = colors.textMuted,
                                                fontSize = 15.sp
                                            )
                                        }
                                        innerTextField()
                                    }
                                )
                                if (uiState.query.isNotEmpty()) {
                                    IconButton(
                                        onClick = {
                                            searchViewModel.clearSearch()
                                            menuOpen = false
                                        },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(
                                            Icons.Default.Close,
                                            contentDescription = "Clear",
                                            tint = colors.textMuted,
                                            modifier = Modifier.size(18.dp)
                                        )
                                    }
                                }
                            }
                        }

                        // Suggestions / results dropdown
                        if (menuOpen) {
                            val items = if (uiState.hasSearched) uiState.results else uiState.suggestions
                            if (items.isNotEmpty()) {
                                Surface(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 4.dp),
                                    color = colors.bgElevated,
                                    tonalElevation = 0.dp,
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .heightIn(max = 360.dp)
                                            .verticalScroll(rememberScrollState())
                                            .padding(vertical = 6.dp)
                                    ) {
                                        items.forEach { movie ->
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable {
                                                        menuOpen = false
                                                        searchViewModel.dismissSuggestions()
                                                        onMovieClick(movie.slug)
                                                    }
                                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Icon(
                                                    Icons.Default.Search,
                                                    contentDescription = null,
                                                    tint = colors.textMuted,
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(12.dp))
                                                Column {
                                                    Text(
                                                        movie.title,
                                                        color = colors.textPrimary,
                                                        fontSize = 14.sp,
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                    movie.year?.let {
                                                        Text(
                                                            "$it",
                                                            color = colors.textDim,
                                                            fontSize = 12.sp
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (!isTyping) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(colors.bgTertiary)
                        .clickable(onClick = onLanguageToggle),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (language == "vi") "VI" else "EN",
                        color = colors.textSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                if (isAuthenticated) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(colors.bgTertiary)
                            .clickable(onClick = onAuthClick),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = "Account",
                            tint = colors.textSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .height(40.dp)
                            .clip(RoundedCornerShape(20.dp))
                            .background(colors.accent)
                            .clickable(onClick = onAuthClick)
                            .padding(horizontal = 14.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Sign In",
                            color = Color.White,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                }
            }
        }
    }
}
