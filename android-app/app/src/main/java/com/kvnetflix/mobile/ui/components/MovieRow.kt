package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.ui.adaptive.LocalWindowState
import com.kvnetflix.mobile.ui.adaptive.WidthClass
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun MovieRow(
    title: String,
    movies: List<Movie>,
    onClick: (Movie) -> Unit,
    modifier: Modifier = Modifier,
    isHorizontal: Boolean = false
) {
    val colors = KvTheme.colors
    val windowState = LocalWindowState.current

    if (movies.isEmpty()) return

    val horizontalPad = if (windowState.isWide) 20.dp else 16.dp
    val itemSpacing = if (windowState.isWide) 12.dp else 10.dp
    val horizontalCardWidth = when (windowState.widthClass) {
        WidthClass.Compact -> 210
        WidthClass.Medium -> 245
        WidthClass.Expanded -> 280
    }
    val posterCardWidth = when (windowState.widthClass) {
        WidthClass.Compact -> 145
        WidthClass.Medium -> 160
        WidthClass.Expanded -> 176
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(
                start = horizontalPad,
                end = horizontalPad,
                top = 4.dp,
                bottom = 8.dp
            ),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(18.dp)
                    .background(colors.accent, RoundedCornerShape(2.dp))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = title,
                color = colors.textPrimary,
                fontSize = if (windowState.isWide) 19.sp else 17.sp,
                fontWeight = FontWeight.Bold
            )
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = horizontalPad),
            horizontalArrangement = Arrangement.spacedBy(itemSpacing)
        ) {
            items(movies, key = { it.slug }) { movie ->
                if (isHorizontal) {
                    HorizontalMovieCard(
                        movie = movie,
                        onClick = { onClick(movie) },
                        width = horizontalCardWidth
                    )
                } else {
                    MovieCard(
                        movie = movie,
                        onClick = { onClick(movie) },
                        width = posterCardWidth
                    )
                }
            }
        }
    }
}
