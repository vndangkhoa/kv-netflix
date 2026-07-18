package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun MovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Int = 190,
    rank: Int? = null,
    progress: Float? = null
) {
    val colors = KvTheme.colors

    Box(
        modifier = modifier
            .width(width.dp)
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .background(colors.bgTertiary)
    ) {
        AsyncImage(
            model = ApiClient.imageProxyUrl(movie.thumbnail, 300),
            contentDescription = movie.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Bottom gradient for title readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(80.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.85f)
                        )
                    )
                )
        )

        // Quality badge
        if (!movie.quality.isNullOrBlank()) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(6.dp)
                    .background(
                        colors.accent,
                        RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 5.dp, vertical = 2.dp)
            ) {
                Text(
                    text = movie.quality,
                    color = Color.White,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }
        }

        // Ranking banner
        if (rank != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(bottom = 30.dp)
                    .size(44.dp)
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                colors.accent,
                                colors.accent.copy(alpha = 0.7f)
                            )
                        ),
                        shape = RoundedCornerShape(topEnd = 10.dp, bottomEnd = 10.dp, topStart = 0.dp, bottomStart = 0.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "$rank",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.ExtraBold,
                    lineHeight = 20.sp
                )
            }
        }

        // Title
        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(8.dp)
        ) {
            Text(
                text = movie.title,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 16.sp
            )
        }

        // Resume progress bar
        if (progress != null && progress > 0f) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .align(Alignment.BottomCenter),
                color = colors.accent,
                trackColor = Color.White.copy(alpha = 0.25f)
            )
        }
    }
}
