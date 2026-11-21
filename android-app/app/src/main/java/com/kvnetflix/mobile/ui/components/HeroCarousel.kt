package com.kvnetflix.mobile.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.kvnetflix.mobile.ui.adaptive.LocalWindowState
import com.kvnetflix.mobile.ui.adaptive.WidthClass
import com.kvnetflix.mobile.ui.theme.KvTheme
import com.kvnetflix.mobile.util.stripHtml
import kotlinx.coroutines.delay

@Composable
fun HeroCarousel(
    movies: List<Movie>,
    onPlay: (Movie) -> Unit,
    onMyList: (Movie) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    val windowState = LocalWindowState.current
    if (movies.isEmpty()) return

    var currentIndex by remember { mutableIntStateOf(0) }
    val safeIndex = currentIndex.coerceIn(0, movies.lastIndex)

    LaunchedEffect(safeIndex, movies.size) {
        if (movies.size > 1) {
            delay(8000)
            currentIndex = (safeIndex + 1) % movies.size
        }
    }

    val currentMovie = movies[safeIndex]
    val heroHeight = when {
        windowState.isWide && windowState.isLandscape ->
            (windowState.heightDp * 0.50f).dp.coerceIn(300.dp, 460.dp)
        windowState.widthClass == WidthClass.Medium -> 400.dp
        windowState.isWide -> 420.dp
        else -> 440.dp
    }
    val horizontalPad = if (windowState.isWide) 28.dp else 20.dp

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(heroHeight)
            .background(Color.Black)
    ) {
        AnimatedContent(
            targetState = currentMovie,
            transitionSpec = {
                fadeIn(animationSpec = tween(1000)) togetherWith
                    fadeOut(animationSpec = tween(1000))
            },
            label = "HeroContent",
            modifier = Modifier.fillMaxSize()
        ) { movie ->
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = ApiClient.imageProxyUrl(
                        movie.backdrop ?: movie.thumbnail, 1280
                    ),
                    contentDescription = movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )

                // Top vignette - darken top for navbar readability
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.78f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Left vignette - darken left side for text readability
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(if (windowState.isWide) 0.58f else 0.78f)
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.9f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Bottom gradient - smooth fade to background
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(210.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.45f),
                                    colors.bgPrimary
                                )
                            )
                        )
                )

                // Content
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = horizontalPad)
                        .padding(bottom = if (windowState.isWide) 40.dp else 52.dp),
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Text(
                        text = movie.title,
                        color = Color.White,
                        fontSize = if (windowState.isWide) 36.sp else 30.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.widthIn(max = if (windowState.isWide) 540.dp else 380.dp),
                        lineHeight = if (windowState.isWide) 42.sp else 36.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "98% Match",
                            color = Color(0xFF22C55E),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        if (movie.year != null) {
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "${movie.year}",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 14.sp
                            )
                        }
                        if (!movie.quality.isNullOrBlank()) {
                            Spacer(modifier = Modifier.width(12.dp))
                            Box(
                                modifier = Modifier
                                    .background(
                                        Color.White.copy(alpha = 0.2f),
                                        RoundedCornerShape(4.dp)
                                    )
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text(
                                    text = movie.quality,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }

                    if (!movie.originalTitle.isNullOrBlank() && movie.originalTitle != movie.title) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = movie.originalTitle,
                            color = Color.White.copy(alpha = 0.55f),
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.widthIn(max = if (windowState.isWide) 520.dp else 360.dp)
                        )
                    }

                    if (windowState.widthClass == WidthClass.Expanded) {
                        val desc = movie.description?.stripHtml().orEmpty()
                        if (desc.isNotBlank()) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = desc,
                                color = Color.White.copy(alpha = 0.78f),
                                fontSize = 14.sp,
                                lineHeight = 20.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.widthIn(max = 500.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { onPlay(movie) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black
                            ),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(44.dp)
                        ) {
                            Text(
                                text = "Watch Now",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp
                            )
                        }

                        Button(
                            onClick = { onMyList(movie) },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White.copy(alpha = 0.15f),
                                contentColor = Color.White
                            ),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.height(44.dp)
                        ) {
                            Text(
                                text = "My List",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }
        }

        // Dot indicators
        if (movies.size > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = horizontalPad, bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                movies.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .height(6.dp)
                            .width(if (index == safeIndex) 20.dp else 6.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == safeIndex) colors.accent
                                else Color.White.copy(alpha = 0.35f)
                            )
                            .clickable { currentIndex = index }
                    )
                }
            }
        }
    }
}
