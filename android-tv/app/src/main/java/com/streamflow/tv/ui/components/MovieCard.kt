package com.streamflow.tv.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.ui.theme.StreamFlowTheme

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun MovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isTop10: Boolean = false,
    progress: Float? = null
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val rawUrl = movie.thumbnail
    val primaryUrl = remember(movie.slug) { ApiClient.imageProxyUrl(rawUrl, 320) }
    var imageUrl by remember(movie.slug) { mutableStateOf(primaryUrl) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .width(135.dp)
            .height(200.dp)
            .onFocusChanged { isFocused = it.isFocused }
            .then(
                if (isFocused) {
                    Modifier.shadow(
                        elevation = 16.dp,
                        shape = RoundedCornerShape(8.dp),
                        ambientColor = colors.focusGlow,
                        spotColor = Color.Black
                    )
                } else Modifier
            ),
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = colors.surfaceVariant,
            focusedContainerColor = colors.surfaceVariant
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.12f)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (isFocused) Modifier.border(2.5.dp, Color.White, RoundedCornerShape(8.dp))
                    else Modifier
                )
        ) {
            // Poster Artwork
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(imageUrl)
                    .crossfade(true)
                    .listener(onError = { _, _ ->
                        if (imageUrl == primaryUrl && rawUrl.isNotBlank()) {
                            imageUrl = rawUrl
                        }
                    })
                    .build(),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(8.dp))
            )

            // Netflix "N" Brand Mark (Top Left)
            Box(
                modifier = Modifier
                    .padding(6.dp)
                    .align(Alignment.TopStart)
                    .size(16.dp)
                    .background(colors.top10Red, RoundedCornerShape(2.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "N",
                    style = StreamFlowTheme.typography.labelSmall.copy(
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black
                    )
                )
            }

            // Top Badge: TOP 10 or Quality Pill (Top Right)
            if (isTop10) {
                Box(
                    modifier = Modifier
                        .padding(6.dp)
                        .align(Alignment.TopEnd)
                        .background(colors.top10Red, RoundedCornerShape(3.dp))
                        .padding(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "TOP 10",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    )
                }
            } else {
                movie.quality?.let { rawQuality ->
                    val q = rawQuality.uppercase()
                    val displayQuality = if (q.contains("4K") || q.contains("UHD")) "4K" else "HD"
                    Box(
                        modifier = Modifier
                            .padding(6.dp)
                            .align(Alignment.TopEnd)
                            .background(Color.Black.copy(alpha = 0.70f), RoundedCornerShape(3.dp))
                            .border(0.75.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = displayQuality,
                            style = StreamFlowTheme.typography.labelSmall.copy(
                                color = Color.White,
                                fontSize = 8.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                    }
                }
            }

            // Bottom Gradient Scrim & Movie Title Metadata
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.70f),
                                Color.Black.copy(alpha = 0.96f)
                            )
                        )
                    )
                    .padding(horizontal = 8.dp, vertical = 6.dp)
            ) {
                Text(
                    text = movie.title,
                    style = StreamFlowTheme.typography.labelMedium.copy(
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = (-0.2).sp
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                movie.year?.let { year ->
                    Text(
                        text = year.toString(),
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
            }

            // Continue Watching Progress Bar
            if (progress != null && progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.5.dp)
                        .align(Alignment.BottomCenter)
                        .background(Color.White.copy(alpha = 0.3f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction = progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(colors.progressBar)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HorizontalMovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    progress: Float? = null
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val rawUrl = if (!movie.backdrop.isNullOrBlank()) movie.backdrop else movie.thumbnail
    val primaryUrl = remember(movie.slug) { ApiClient.imageProxyUrl(rawUrl, 640) }
    var imageUrl by remember(movie.slug) { mutableStateOf(primaryUrl) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .width(230.dp)
            .height(130.dp)
            .onFocusChanged { isFocused = it.isFocused }
            .then(
                if (isFocused) {
                    Modifier.shadow(
                        elevation = 16.dp,
                        shape = RoundedCornerShape(8.dp),
                        ambientColor = colors.focusGlow,
                        spotColor = Color.Black
                    )
                } else Modifier
            ),
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = colors.surfaceVariant,
            focusedContainerColor = colors.surfaceVariant
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.10f)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .then(
                    if (isFocused) Modifier.border(2.5.dp, Color.White, RoundedCornerShape(8.dp))
                    else Modifier
                )
        ) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(imageUrl)
                    .crossfade(true)
                    .listener(onError = { _, _ ->
                        if (imageUrl == primaryUrl && rawUrl.isNotBlank()) {
                            imageUrl = rawUrl
                        } else if (imageUrl == rawUrl && movie.thumbnail.isNotBlank()) {
                            imageUrl = movie.thumbnail
                        }
                    })
                    .build(),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(8.dp))
            )

            // Netflix "N" Brand Mark
            Box(
                modifier = Modifier
                    .padding(6.dp)
                    .align(Alignment.TopStart)
                    .size(16.dp)
                    .background(colors.top10Red, RoundedCornerShape(2.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "N",
                    style = StreamFlowTheme.typography.labelSmall.copy(
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black
                    )
                )
            }

            // Quality Badge Pill
            movie.quality?.let { quality ->
                Box(
                    modifier = Modifier
                        .padding(6.dp)
                        .align(Alignment.TopEnd)
                        .background(Color.Black.copy(alpha = 0.70f), RoundedCornerShape(3.dp))
                        .border(0.75.dp, Color.White.copy(alpha = 0.45f), RoundedCornerShape(3.dp))
                        .padding(horizontal = 4.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = if (quality.contains("4k", ignoreCase = true)) "4K" else "HD",
                        style = StreamFlowTheme.typography.labelSmall.copy(
                            color = Color.White,
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold
                        )
                    )
                }
            }

            // Bottom Title Scrim
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.65f),
                                Color.Black.copy(alpha = 0.95f)
                            )
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
                            color = Color.White.copy(alpha = 0.7f),
                            fontSize = 10.sp
                        )
                    )
                }
            }

            // Continue Watching Progress Bar
            if (progress != null && progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.5.dp)
                        .align(Alignment.BottomCenter)
                        .background(Color.White.copy(alpha = 0.3f))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction = progress.coerceIn(0f, 1f))
                            .fillMaxHeight()
                            .background(colors.progressBar)
                    )
                }
            }
        }
    }
}

/**
 * Iconic Netflix Top 10 Card:
 * Displays a massive stylized 3D rank numeral (1-10) sitting beside/behind the poster card.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun Top10MovieCard(
    rank: Int,
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .height(200.dp)
            .padding(end = 8.dp),
        verticalAlignment = Alignment.Bottom
    ) {
        // Giant Stylized Rank Number (Official Netflix 10-Foot Signature)
        Box(
            modifier = Modifier
                .width(55.dp)
                .fillMaxHeight(),
            contentAlignment = Alignment.BottomEnd
        ) {
            Text(
                text = "$rank",
                style = StreamFlowTheme.typography.displayLarge.copy(
                    fontSize = 100.sp,
                    fontWeight = FontWeight.Black,
                    color = if (isFocused) Color.White else Color(0xFF2C2D35),
                    letterSpacing = (-4).sp
                ),
                maxLines = 1
            )
        }

        Spacer(Modifier.width(4.dp))

        // Attached Movie Poster Card
        MovieCard(
            movie = movie,
            onClick = onClick,
            isTop10 = true,
            modifier = Modifier.onFocusChanged { isFocused = it.isFocused }
        )
    }
}
