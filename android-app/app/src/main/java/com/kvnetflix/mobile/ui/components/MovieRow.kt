package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun MovieRow(
    title: String,
    movies: List<Movie>,
    onClick: (Movie) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors

    if (movies.isEmpty()) return

    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 8.dp),
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
                fontSize = 17.sp,
                fontWeight = FontWeight.Bold
            )
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(movies, key = { it.slug }) { movie ->
                MovieCard(
                    movie = movie,
                    onClick = { onClick(movie) },
                    width = 155
                )
            }
        }
    }
}
