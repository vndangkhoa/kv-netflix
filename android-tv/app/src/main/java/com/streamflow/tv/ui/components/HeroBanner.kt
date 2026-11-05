package com.streamflow.tv.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.ui.theme.StreamFlowTheme
import kotlinx.coroutines.delay

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HeroBanner(
    movies: List<Movie>,
    onPlayClick: (Movie) -> Unit,
    onInfoClick: ((Movie) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    if (movies.isEmpty()) return
    val colors = StreamFlowTheme.colors

    var currentIndex by remember { mutableIntStateOf(0) }
    val currentMovie = movies.getOrNull(currentIndex) ?: movies.firstOrNull() ?: return

    LaunchedEffect(currentIndex, movies.size) {
        delay(8000)
        currentIndex = (currentIndex + 1) % movies.size
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(460.dp)
    ) {
        // Dynamic Backdrop Crossfade
        AnimatedContent(
            targetState = currentMovie,
            transitionSpec = {
                fadeIn(animationSpec = tween(600)) togetherWith fadeOut(animationSpec = tween(600))
            },
            label = "hero-crossfade"
        ) { movie ->
            val backdropUrl = movie.backdrop?.ifBlank { movie.thumbnail } ?: movie.thumbnail
            AsyncImage(
                model = ApiClient.imageProxyUrl(backdropUrl, 1920),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }

        // Layer 1: Left Horizontal Deep Vignette (Text protection & cinematic contrast)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colorStops = arrayOf(
                            0.0f to colors.background,
                            0.30f to colors.background.copy(alpha = 0.98f),
                            0.50f to colors.background.copy(alpha = 0.80f),
                            0.70f to colors.background.copy(alpha = 0.35f),
                            1.0f to Color.Transparent
                        )
                    )
                )
        )

        // Layer 2: Bottom Vertical Scrim (Seamless transition into content rows)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.65f)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Transparent,
                            0.35f to colors.background.copy(alpha = 0.45f),
                            0.75f to colors.background.copy(alpha = 0.90f),
                            1.0f to colors.background
                        )
                    )
                )
        )

        // Layer 3: Top Ambient Vignette (Top navigation contrast)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            colors.background.copy(alpha = 0.5f),
                            Color.Transparent
                        )
                    )
                )
        )

        // Content Column
        Column(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 48.dp, end = 260.dp)
                .fillMaxHeight(),
            verticalArrangement = Arrangement.Center
        ) {
            // Netflix Original / Category Brand Ribbon
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Netflix 'N' Logo Mark
                Box(
                    modifier = Modifier
                        .size(22.dp)
                        .background(colors.top10Red, RoundedCornerShape(4.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "N",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 13.sp
                        )
                    )
                }

                Text(
                    text = "SERIES",
                    style = StreamFlowTheme.typography.labelSmall.copy(
                        color = Color.White.copy(alpha = 0.9f),
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 2.sp,
                        fontSize = 11.sp
                    )
                )

                // Top 10 Badge Indicator
                Box(
                    modifier = Modifier
                        .background(colors.top10Red, RoundedCornerShape(3.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "TOP 10",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 10.sp,
                            letterSpacing = 0.5.sp
                        )
                    )
                }

                Text(
                    text = "#1 in TV Shows Today",
                    style = StreamFlowTheme.typography.labelSmall.copy(
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                )
            }

            Spacer(Modifier.height(10.dp))

            // Main Cinematic Title
            Text(
                text = currentMovie.title,
                style = StreamFlowTheme.typography.displayLarge.copy(
                    fontWeight = FontWeight.Black,
                    fontSize = 38.sp,
                    letterSpacing = (-0.5).sp,
                    color = Color.White
                ),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            // Original Title Subtitle
            currentMovie.originalTitle?.let { orig ->
                if (orig.isNotBlank() && !orig.equals(currentMovie.title, ignoreCase = true)) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = orig,
                        style = StreamFlowTheme.typography.titleMedium.copy(
                            color = Color.White.copy(alpha = 0.65f),
                            fontWeight = FontWeight.Medium
                        ),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // Netflix Metadata Pills Row (Match, Year, Maturity Rating, Quality, Audio)
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // High Match %
                Text(
                    text = "98% Match",
                    style = StreamFlowTheme.typography.labelMedium.copy(
                        color = Color(0xFF46D369),
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                )

                // Release Year
                currentMovie.year?.let { year ->
                    Text(
                        text = "$year",
                        style = StreamFlowTheme.typography.bodyMedium.copy(
                            color = Color.White.copy(alpha = 0.85f),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp
                        )
                    )
                }

                // Age Rating Badge Pill
                Box(
                    modifier = Modifier
                        .border(1.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = "18+",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    )
                }

                // Video Quality Pill
                val quality = currentMovie.quality?.uppercase() ?: "4K ULTRA HD"
                Box(
                    modifier = Modifier
                        .border(1.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = if (quality.contains("4K") || quality.contains("UHD")) "4K UHD" else quality,
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    )
                }

                // HDR Pill
                Box(
                    modifier = Modifier
                        .border(1.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = "HDR",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    )
                }

                // 5.1 Spatial Audio Pill
                Box(
                    modifier = Modifier
                        .border(1.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 5.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = "5.1",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp
                        )
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // Official Netflix TV Dual Action Buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Primary Action Button (White Play Button)
                Surface(
                    onClick = { onPlayClick(currentMovie) },
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(6.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = Color.White,
                        focusedContainerColor = Color.White
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 24.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "▶",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = Color(0xFF141414),
                                fontWeight = FontWeight.Black
                            )
                        )
                        Text(
                            text = "Play",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = Color(0xFF141414),
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }

                // Secondary Action Button (Frosted More Info / My List)
                Surface(
                    onClick = {
                        if (onInfoClick != null) onInfoClick(currentMovie)
                        else onPlayClick(currentMovie)
                    },
                    shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(6.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = Color.White.copy(alpha = 0.22f),
                        focusedContainerColor = Color.White.copy(alpha = 0.38f)
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = "ℹ",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = Color.White,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Text(
                            text = "More Info",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }
                }
            }
        }

        // Indicator Bars (Netflix elongated capsule indicators)
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 48.dp, bottom = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            movies.forEachIndexed { index, _ ->
                val isSelected = index == currentIndex
                Box(
                    modifier = Modifier
                        .size(if (isSelected) 22.dp else 6.dp, 4.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            if (isSelected) colors.top10Red
                            else Color.White.copy(alpha = 0.25f)
                        )
                )
            }
        }
    }
}
