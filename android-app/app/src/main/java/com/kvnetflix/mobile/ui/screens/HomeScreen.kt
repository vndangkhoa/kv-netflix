package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.model.Category
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.adaptive.LocalWindowState
import com.kvnetflix.mobile.ui.components.CenteredContent
import com.kvnetflix.mobile.ui.components.HeroCarousel
import com.kvnetflix.mobile.ui.components.MaxGridContentWidthDp
import com.kvnetflix.mobile.ui.components.MovieCard
import com.kvnetflix.mobile.ui.components.MovieRow
import com.kvnetflix.mobile.ui.components.gridHorizontalSpacing
import com.kvnetflix.mobile.ui.components.gridVerticalSpacing
import com.kvnetflix.mobile.ui.components.rememberPosterGridCells
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.util.Constants
import com.kvnetflix.mobile.viewmodel.HomeUiState
import com.kvnetflix.mobile.viewmodel.HomeViewModel
import com.kvnetflix.mobile.viewmodel.SortOption

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    userRepo: UserDataRepository?,
    category: String?,
    onMovieClick: (String) -> Unit,
    onCategoryClick: (String) -> Unit,
    language: String = "vi"
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = KvTheme.colors

    LaunchedEffect(category) {
        viewModel.loadHome(category = category, userRepo = userRepo)
    }

    if (uiState.isLoading) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                CircularProgressIndicator(color = colors.accent)
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Loading...",
                    color = colors.textMuted,
                    style = MaterialTheme.typography.bodyLarge
                )
            }
        }
    } else if (uiState.error != null) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(24.dp)
            ) {
                Text(
                    text = uiState.error ?: "Error",
                    color = Color.Red,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.loadHome(category = category, userRepo = userRepo) },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.accent)
                ) {
                    Text("Retry", color = colors.onAccent, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    } else if (category != null) {
        CategoryPage(
            uiState = uiState,
            viewModel = viewModel,
            onMovieClick = onMovieClick,
            category = category,
            language = language
        )
    } else {
        HomePage(
            uiState = uiState,
            onMovieClick = onMovieClick,
            onCategoryClick = onCategoryClick,
            language = language
        )
    }
}

@Composable
private fun HomePage(
    uiState: HomeUiState,
    onMovieClick: (String) -> Unit,
    onCategoryClick: (String) -> Unit,
    language: String
) {
    val windowState = LocalWindowState.current
    val horizontalPad = if (windowState.isWide) 20.dp else 16.dp

    CenteredContent(maxWidth = MaxGridContentWidthDp.dp) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            item {
                HeroCarousel(
                    movies = uiState.heroMovies,
                    onPlay = { movie -> onMovieClick(movie.slug) },
                    onMyList = { }
                )
            }

            item {
                Spacer(modifier = Modifier.height(12.dp))
                GenreChips(
                    genres = uiState.genres,
                    onGenreClick = onCategoryClick,
                    language = language,
                    horizontalPad = horizontalPad
                )
            }

            if (uiState.watchedMovies.isNotEmpty()) {
                item { Spacer(modifier = Modifier.height(16.dp)) }
                item {
                    MovieRow(
                        title = "Continue Watching",
                        movies = uiState.watchedMovies,
                        onClick = { onMovieClick(it.slug) },
                        isHorizontal = true
                    )
                }
            }

            if (uiState.myListMovies.isNotEmpty()) {
                item { Spacer(modifier = Modifier.height(12.dp)) }
                item {
                    MovieRow(
                        title = "My List",
                        movies = uiState.myListMovies,
                        onClick = { onMovieClick(it.slug) },
                        isHorizontal = true
                    )
                }
            }

            uiState.categoryMovies.forEach { (title, movies) ->
                val isHorizontal = title.contains("Lồng Tiếng", ignoreCase = true) ||
                    title.contains("C-drama", ignoreCase = true) ||
                    title.contains("Top 10", ignoreCase = true)
                item { Spacer(modifier = Modifier.height(12.dp)) }
                item {
                    MovieRow(
                        title = title,
                        movies = movies,
                        onClick = { onMovieClick(it.slug) },
                        isHorizontal = isHorizontal
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryPage(
    uiState: HomeUiState,
    viewModel: HomeViewModel,
    onMovieClick: (String) -> Unit,
    category: String,
    language: String
) {
    val colors = KvTheme.colors
    val windowState = LocalWindowState.current
    val horizontalPad = if (windowState.isWide) 20.dp else 16.dp
    var showSortMenu by remember { mutableStateOf(false) }

    val categoryLabel = getCategoryLabel(category, language)
    val showRank = category == "phim-le" || category == "phim-bo"

    CenteredContent(maxWidth = MaxGridContentWidthDp.dp) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = horizontalPad, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    categoryLabel,
                    color = colors.textPrimary,
                    fontSize = if (windowState.isWide) 24.sp else 22.sp,
                    fontWeight = FontWeight.Bold
                )

                Box {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(colors.bgSecondary)
                            .clickable { showSortMenu = true }
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = uiState.sortOption.let {
                                if (language == "vi") it.labelVi else it.labelEn
                            },
                            color = colors.textPrimary,
                            fontSize = 13.sp
                        )
                        Icon(
                            Icons.Default.ArrowDropDown,
                            contentDescription = null,
                            tint = colors.textPrimary,
                            modifier = Modifier.size(18.dp)
                        )
                    }

                    DropdownMenu(
                        expanded = showSortMenu,
                        onDismissRequest = { showSortMenu = false }
                    ) {
                        SortOption.entries.forEach { option ->
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        if (language == "vi") option.labelVi else option.labelEn,
                                        fontWeight = if (option == uiState.sortOption) FontWeight.Bold else FontWeight.Normal
                                    )
                                },
                                onClick = {
                                    viewModel.setSortOption(option)
                                    showSortMenu = false
                                }
                            )
                        }
                    }
                }
            }

            if (uiState.isLoadingAll) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Loading all movies...",
                        color = colors.textMuted,
                        fontSize = 14.sp
                    )
                }
            } else {
                LazyVerticalGrid(
                    columns = rememberPosterGridCells(),
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(
                        start = horizontalPad,
                        top = 8.dp,
                        end = horizontalPad,
                        bottom = 24.dp
                    ),
                    horizontalArrangement = Arrangement.spacedBy(gridHorizontalSpacing()),
                    verticalArrangement = Arrangement.spacedBy(gridVerticalSpacing())
                ) {
                    itemsIndexed(
                        items = uiState.allCategoryMovies,
                        key = { _, movie -> movie.slug }
                    ) { index, movie ->
                        MovieCard(
                            movie = movie,
                            onClick = { onMovieClick(movie.slug) },
                            width = null,
                            rank = if (showRank) index + 1 else null
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GenreChips(
    genres: List<Category>,
    onGenreClick: (String) -> Unit,
    language: String,
    horizontalPad: androidx.compose.ui.unit.Dp
) {
    val colors = KvTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = horizontalPad),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        genres.forEach { genre ->
            val label = getGenreLabel(genre.Slug, language, genre.Name)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(20.dp))
                    .background(colors.bgTertiary)
                    .clickable { onGenreClick(genre.Slug) }
                    .padding(horizontal = 14.dp, vertical = 7.dp)
            ) {
                Text(
                    label,
                    color = colors.textSecondary,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }
    }
}

private fun getCategoryLabel(slug: String, lang: String): String {
    Constants.CATEGORIES.find { it.id == slug }?.let { cat ->
        return if (lang == "vi") {
            when (cat.nameKey) {
                "movies" -> "Phim lẻ"
                "series" -> "Phim bộ"
                "animation" -> "Hoạt hình"
                else -> cat.nameKey
            }
        } else {
            when (cat.nameKey) {
                "movies" -> "Movies"
                "series" -> "Series"
                "animation" -> "Animation"
                "tvShows" -> "TV Shows"
                else -> cat.nameKey
            }
        }
    }
    Constants.GENRES.find { it.id == slug }?.let { genre ->
        return if (lang == "vi") genre.vi else genre.en
    }
    return slug
}

private fun getGenreLabel(slug: String, lang: String, fallback: String): String {
    Constants.GENRES.find { it.id == slug }?.let { genre ->
        return if (lang == "vi") genre.vi else genre.en
    }
    return fallback
}
