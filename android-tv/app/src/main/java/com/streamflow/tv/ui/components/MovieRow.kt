package com.streamflow.tv.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.ui.theme.StreamFlowTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MovieRow(
    title: String,
    movies: List<Movie>,
    onMovieClick: (Movie) -> Unit,
    isHorizontal: Boolean = false,
    modifier: Modifier = Modifier
) {
    if (movies.isEmpty()) return
    val uniqueMovies = remember(movies) { movies.distinctBy { it.slug } }
    val colors = StreamFlowTheme.colors

    val isTop10Row = remember(title) {
        title.contains("TOP 10", ignoreCase = true)
    }
    val isContinueWatching = remember(title) {
        title.contains("Continue", ignoreCase = true) || title.contains("Đang xem", ignoreCase = true)
    }

    Column(modifier = modifier.padding(vertical = 14.dp)) {
        // Netflix Section Title Header
        Row(
            modifier = Modifier.padding(start = 48.dp, bottom = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (isTop10Row) {
                Box(
                    modifier = Modifier
                        .size(6.dp, 18.dp)
                        .padding(end = 2.dp)
                )
            }
            Text(
                text = title,
                style = StreamFlowTheme.typography.titleLarge.copy(
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp,
                    color = Color.White,
                    letterSpacing = (-0.2).sp
                )
            )
        }

        // TV Lazy Row with smooth D-pad scrolling
        TvLazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            itemsIndexed(
                uniqueMovies,
                key = { index, movie -> "${title}_${movie.slug}_$index" }
            ) { index, movie ->
                if (isTop10Row) {
                    Top10MovieCard(
                        rank = index + 1,
                        movie = movie,
                        onClick = { onMovieClick(movie) }
                    )
                } else if (isHorizontal) {
                    HorizontalMovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie) },
                        progress = if (isContinueWatching) 0.45f else null
                    )
                } else {
                    MovieCard(
                        movie = movie,
                        onClick = { onMovieClick(movie) },
                        progress = if (isContinueWatching) 0.45f else null
                    )
                }
            }
        }
    }
}
