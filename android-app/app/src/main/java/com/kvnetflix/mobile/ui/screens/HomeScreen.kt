package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.Category
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.data.repository.UserDataRepository
import com.kvnetflix.mobile.ui.components.HeroCarousel
import com.kvnetflix.mobile.ui.components.MovieCard
import com.kvnetflix.mobile.ui.components.MovieRow
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
            Text(
                "Loading...",
                color = colors.textMuted,
                style = MaterialTheme.typography.bodyLarge
            )
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
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = { viewModel.loadHome(category = category, userRepo = userRepo) },
                    colors = ButtonDefaults.buttonColors(containerColor = colors.accent)
                ) {
                    Text("Retry", color = Color.White)
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
            viewModel = viewModel,
            onMovieClick = onMovieClick,
            onCategoryClick = onCategoryClick,
            language = language
        )
    }
}

@Composable
private fun HomePage(
    uiState: HomeUiState,
    viewModel: HomeViewModel,
    onMovieClick: (String) -> Unit,
    onCategoryClick: (String) -> Unit,
    language: String
) {
    val colors = KvTheme.colors

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 60.dp)
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
                language = language
            )
        }

        if (uiState.watchedMovies.isNotEmpty()) {
            item { Spacer(modifier = Modifier.height(16.dp)) }
            item {
                MovieRow(
                    title = "Continue Watching",
                    movies = uiState.watchedMovies,
                    onClick = { onMovieClick(it.slug) }
                )
            }
        }

        if (uiState.myListMovies.isNotEmpty()) {
            item { Spacer(modifier = Modifier.height(12.dp)) }
            item {
                MovieRow(
                    title = "My List",
                    movies = uiState.myListMovies,
                    onClick = { onMovieClick(it.slug) }
                )
            }
        }

        uiState.categoryMovies.forEach { (title, movies) ->
            item { Spacer(modifier = Modifier.height(12.dp)) }
            item {
                MovieRow(
                    title = title,
                    movies = movies,
                    onClick = { onMovieClick(it.slug) }
                )
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
    var showSortMenu by remember { mutableStateOf(false) }

    val categoryLabel = getCategoryLabel(category, language)

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                categoryLabel,
                color = colors.textPrimary,
                fontSize = 22.sp,
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
                columns = GridCells.Adaptive(minSize = 160.dp),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp, 8.dp, 16.dp, 60.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(uiState.allCategoryMovies, key = { it.slug }) { movie ->
                    val index = uiState.allCategoryMovies.indexOf(movie)
                    val showRank = category == "phim-le" || category == "phim-bo"
                    MovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie.slug) },
                        width = 140,
                        rank = if (showRank) index + 1 else null
                    )
                }
            }
        }
    }
}

@Composable
private fun GenreChips(
    genres: List<Category>,
    onGenreClick: (String) -> Unit,
    language: String
) {
    val colors = KvTheme.colors

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
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
