package com.streamflow.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.foundation.lazy.list.TvLazyRow
import androidx.tv.foundation.lazy.list.itemsIndexed
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.ui.theme.StreamFlowTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun Top10Row(
    title: String = "🔥 TOP 10 MOVIES TODAY",
    movies: List<Movie>,
    onMovieClick: (Movie) -> Unit,
    modifier: Modifier = Modifier
) {
    if (movies.isEmpty()) return
    val top10List = movies.take(10)

    Column(modifier = modifier.padding(vertical = 14.dp)) {
        Text(
            text = title,
            style = StreamFlowTheme.typography.titleLarge.copy(
                fontWeight = FontWeight.Black,
                fontSize = 20.sp,
                letterSpacing = 0.5.sp
            ),
            modifier = Modifier.padding(start = 36.dp, bottom = 12.dp)
        )

        TvLazyRow(
            contentPadding = PaddingValues(horizontal = 36.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            itemsIndexed(top10List, key = { _, movie -> movie.slug }) { index, movie ->
                Top10Card(
                    rank = index + 1,
                    movie = movie,
                    onClick = { onMovieClick(movie) }
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun Top10Card(
    rank: Int,
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }

    Row(
        verticalAlignment = Alignment.Bottom,
        modifier = modifier
            .onFocusChanged { isFocused = it.isFocused }
    ) {
        // Giant Rank Number (YouTube TV / Netflix Style)
        Text(
            text = "$rank",
            style = StreamFlowTheme.typography.displayLarge.copy(
                fontSize = 80.sp,
                fontWeight = FontWeight.Black,
                color = if (isFocused) colors.primary else Color.White.copy(alpha = 0.85f)
            ),
            modifier = Modifier.offset(x = (14).dp)
        )

        // 16:9 Landscape Card
        Surface(
            onClick = onClick,
            modifier = Modifier
                .width(220.dp)
                .height(124.dp),
            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(10.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = colors.surfaceVariant,
                focusedContainerColor = colors.surfaceVariant
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .then(
                        if (isFocused) Modifier.border(2.dp, colors.primary, RoundedCornerShape(10.dp))
                        else Modifier
                    )
            ) {
                AsyncImage(
                    model = ApiClient.imageProxyUrl(movie.backdrop ?: movie.thumbnail, 600),
                    contentDescription = movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(10.dp))
                )

                movie.quality?.let { quality ->
                    Box(
                        modifier = Modifier
                            .padding(6.dp)
                            .align(Alignment.TopEnd)
                            .background(colors.primary, RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = quality.uppercase(),
                            style = StreamFlowTheme.typography.labelSmall.copy(
                                color = Color.White,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.9f))
                            )
                        )
                        .padding(horizontal = 8.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = movie.title,
                        style = StreamFlowTheme.typography.labelMedium.copy(
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    movie.year?.let { year ->
                        Text(
                            text = "$year",
                            style = StreamFlowTheme.typography.labelSmall.copy(
                                color = Color.White.copy(alpha = 0.65f),
                                fontSize = 10.sp
                            )
                        )
                    }
                }
            }
        }
    }
}
