package com.kvnetflix.mobile.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import kotlinx.coroutines.delay

@Composable
fun HeroCarousel(
    movies: List<Movie>,
    onPlay: (Movie) -> Unit,
    onMyList: (Movie) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    if (movies.isEmpty()) return

    var currentIndex by remember { mutableIntStateOf(0) }

    LaunchedEffect(currentIndex) {
        if (movies.size > 1) {
            delay(8000)
            currentIndex = (currentIndex + 1) % movies.size
        }
    }

    val currentMovie = movies[currentIndex]

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(460.dp)
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
                        .height(120.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.8f),
                                    Color.Transparent
                                )
                            )
                        )
                )

                // Left vignette - darken left side for text readability
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .width(280.dp)
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
                        .height(220.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.Black.copy(alpha = 0.4f),
                                    colors.bgPrimary
                                )
                            )
                        )
                )

                // Content
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 20.dp)
                        .padding(bottom = 52.dp),
                    verticalArrangement = Arrangement.Bottom
                ) {
                    Text(
                        text = movie.title,
                        color = Color.White,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.ExtraBold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.widthIn(max = 380.dp),
                        lineHeight = 36.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "98% Match",
                            color = Color(0xFF22C55E),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        if (movie.year != null) {
                            Text(
                                text = "${movie.year}",
                                color = Color.White.copy(alpha = 0.7f),
                                fontSize = 14.sp
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        if (!movie.quality.isNullOrBlank()) {
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

                    Spacer(modifier = Modifier.height(4.dp))

                    if (!movie.originalTitle.isNullOrBlank() && movie.originalTitle != movie.title) {
                        Text(
                            text = movie.originalTitle,
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
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
                    .padding(end = 20.dp, bottom = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                movies.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .height(6.dp)
                            .width(if (index == currentIndex) 20.dp else 6.dp)
                            .clip(CircleShape)
                            .background(
                                if (index == currentIndex) colors.accent
                                else Color.White.copy(alpha = 0.35f)
                            )
                    )
                }
            }
        }
    }
}
