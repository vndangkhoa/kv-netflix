package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.ui.theme.KvTheme

private fun isUsableImageUrl(url: String?): Boolean {
    if (url.isNullOrBlank()) return false
    val lower = url.lowercase()
    if (lower.contains("danviet.vn") || lower.contains("i.ex-cdn.com")) return false
    return true
}

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
    val context = LocalContext.current

    val rawThumb = movie.thumbnail.trim()
    val rawBackdrop = movie.backdrop.orEmpty().trim()

    val initialRawUrl = if (isUsableImageUrl(rawThumb)) rawThumb else if (isUsableImageUrl(rawBackdrop)) rawBackdrop else ""
    val primaryProxyUrl = remember(movie.slug, initialRawUrl) {
        if (initialRawUrl.isNotBlank()) ApiClient.imageProxyUrl(initialRawUrl, 300) else ""
    }

    var currentUrl by remember(movie.slug, primaryProxyUrl) { mutableStateOf(primaryProxyUrl) }
    var fallbackStage by remember(movie.slug, primaryProxyUrl) { mutableIntStateOf(0) }
    var isFailed by remember(movie.slug, primaryProxyUrl) { mutableStateOf(initialRawUrl.isBlank()) }

    Box(
        modifier = modifier
            .width(width.dp)
            .aspectRatio(2f / 3f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .background(colors.bgTertiary)
    ) {
        if (!isFailed && currentUrl.isNotBlank()) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(currentUrl)
                    .crossfade(true)
                    .listener(
                        onError = { _, _ ->
                            when (fallbackStage) {
                                0 -> {
                                    fallbackStage = 1
                                    if (isUsableImageUrl(rawThumb) && currentUrl != rawThumb) {
                                        currentUrl = rawThumb
                                    } else if (isUsableImageUrl(rawBackdrop)) {
                                        fallbackStage = 2
                                        currentUrl = ApiClient.imageProxyUrl(rawBackdrop, 300)
                                    } else {
                                        isFailed = true
                                    }
                                }
                                1 -> {
                                    fallbackStage = 2
                                    if (isUsableImageUrl(rawBackdrop)) {
                                        currentUrl = ApiClient.imageProxyUrl(rawBackdrop, 300)
                                    } else {
                                        isFailed = true
                                    }
                                }
                                2 -> {
                                    fallbackStage = 3
                                    if (isUsableImageUrl(rawBackdrop) && currentUrl != rawBackdrop) {
                                        currentUrl = rawBackdrop
                                    } else {
                                        isFailed = true
                                    }
                                }
                                else -> {
                                    isFailed = true
                                }
                            }
                        }
                    )
                    .build(),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Elegant Fallback Placeholder
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF262833), Color(0xFF16181F))
                        )
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Movie,
                        contentDescription = null,
                        tint = colors.accent.copy(alpha = 0.8f),
                        modifier = Modifier.size(36.dp)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = movie.title,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }

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
                    color = Color(0xFF191B24),
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
                    color = Color(0xFF191B24),
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

@Composable
fun HorizontalMovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Int = 220,
    progress: Float? = null
) {
    val colors = KvTheme.colors
    val context = LocalContext.current

    val rawBackdrop = movie.backdrop.orEmpty().trim()
    val rawThumb = movie.thumbnail.trim()

    // Prefer backdrop for 16:9 widescreen, fallback to thumbnail
    val initialRawUrl = if (isUsableImageUrl(rawBackdrop)) rawBackdrop else if (isUsableImageUrl(rawThumb)) rawThumb else ""
    val primaryProxyUrl = remember(movie.slug, initialRawUrl) {
        if (initialRawUrl.isNotBlank()) ApiClient.imageProxyUrl(initialRawUrl, 500) else ""
    }

    var currentUrl by remember(movie.slug, primaryProxyUrl) { mutableStateOf(primaryProxyUrl) }
    var fallbackStage by remember(movie.slug, primaryProxyUrl) { mutableIntStateOf(0) }
    var isFailed by remember(movie.slug, primaryProxyUrl) { mutableStateOf(initialRawUrl.isBlank()) }

    Box(
        modifier = modifier
            .width(width.dp)
            .aspectRatio(16f / 9f)
            .clip(RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .background(colors.bgTertiary)
    ) {
        if (!isFailed && currentUrl.isNotBlank()) {
            AsyncImage(
                model = ImageRequest.Builder(context)
                    .data(currentUrl)
                    .crossfade(true)
                    .listener(
                        onError = { _, _ ->
                            when (fallbackStage) {
                                0 -> {
                                    fallbackStage = 1
                                    if (isUsableImageUrl(rawBackdrop) && currentUrl != rawBackdrop) {
                                        currentUrl = rawBackdrop
                                    } else if (isUsableImageUrl(rawThumb)) {
                                        fallbackStage = 2
                                        currentUrl = ApiClient.imageProxyUrl(rawThumb, 400)
                                    } else {
                                        isFailed = true
                                    }
                                }
                                1 -> {
                                    fallbackStage = 2
                                    if (isUsableImageUrl(rawThumb)) {
                                        currentUrl = ApiClient.imageProxyUrl(rawThumb, 400)
                                    } else {
                                        isFailed = true
                                    }
                                }
                                2 -> {
                                    fallbackStage = 3
                                    if (isUsableImageUrl(rawThumb) && currentUrl != rawThumb) {
                                        currentUrl = rawThumb
                                    } else {
                                        isFailed = true
                                    }
                                }
                                else -> {
                                    isFailed = true
                                }
                            }
                        }
                    )
                    .build(),
                contentDescription = movie.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Elegant Placeholder
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.linearGradient(
                            listOf(Color(0xFF262833), Color(0xFF16181F))
                        )
                    )
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier.padding(12.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Movie,
                        contentDescription = null,
                        tint = colors.accent.copy(alpha = 0.8f),
                        modifier = Modifier.size(28.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = movie.title,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }

        // Bottom gradient
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.88f)
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
                    color = Color(0xFF191B24),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }
        }

        // Title and Year
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(8.dp)
        ) {
            Text(
                text = movie.title,
                color = Color.White,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            if (movie.year != null && movie.year > 0) {
                Text(
                    text = movie.year.toString(),
                    color = Color.White.copy(alpha = 0.65f),
                    fontSize = 10.sp
                )
            }
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
