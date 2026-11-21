package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.ui.theme.GreenMatch
import com.kvnetflix.mobile.ui.theme.KvTheme

private fun isUsableCompactImageUrl(url: String?): Boolean {
    if (url.isNullOrBlank()) return false
    val lower = url.lowercase()
    return !lower.contains("danviet.vn") && !lower.contains("i.ex-cdn.com")
}

@Composable
fun CompactMovieRow(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    thumbnailWidth: Dp? = null
) {
    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val thumbWidth = thumbnailWidth ?: (maxWidth * 0.42f).coerceIn(112.dp, 136.dp)
        CompactMovieRowContent(
            movie = movie,
            onClick = onClick,
            thumbnailWidth = thumbWidth
        )
    }
}

@Composable
private fun CompactMovieRowContent(
    movie: Movie,
    onClick: () -> Unit,
    thumbnailWidth: Dp
) {
    val colors = KvTheme.colors
    val context = LocalContext.current

    val rawBackdrop = movie.backdrop.orEmpty().trim()
    val rawThumb = movie.thumbnail.trim()
    val initialRawUrl = if (isUsableCompactImageUrl(rawBackdrop)) rawBackdrop
    else if (isUsableCompactImageUrl(rawThumb)) rawThumb
    else ""
    val primaryProxyUrl = remember(movie.slug, initialRawUrl) {
        if (initialRawUrl.isNotBlank()) ApiClient.imageProxyUrl(initialRawUrl, 400) else ""
    }

    var currentUrl by remember(movie.slug, primaryProxyUrl) { mutableStateOf(primaryProxyUrl) }
    var fallbackStage by remember(movie.slug, primaryProxyUrl) { mutableIntStateOf(0) }
    var isFailed by remember(movie.slug, primaryProxyUrl) { mutableStateOf(initialRawUrl.isBlank()) }

    val shape = RoundedCornerShape(8.dp)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .width(thumbnailWidth)
                .aspectRatio(16f / 9f)
                .clip(shape)
                .background(colors.bgTertiary)
                .border(1.dp, colors.borderSubtle, shape)
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
                                        if (isUsableCompactImageUrl(rawBackdrop) && currentUrl != rawBackdrop) {
                                            currentUrl = rawBackdrop
                                        } else if (isUsableCompactImageUrl(rawThumb)) {
                                            fallbackStage = 2
                                            currentUrl = ApiClient.imageProxyUrl(rawThumb, 300)
                                        } else {
                                            isFailed = true
                                        }
                                    }
                                    1 -> {
                                        fallbackStage = 2
                                        if (isUsableCompactImageUrl(rawThumb)) {
                                            currentUrl = ApiClient.imageProxyUrl(rawThumb, 300)
                                        } else {
                                            isFailed = true
                                        }
                                    }
                                    2 -> {
                                        fallbackStage = 3
                                        if (isUsableCompactImageUrl(rawThumb) && currentUrl != rawThumb) {
                                            currentUrl = rawThumb
                                        } else {
                                            isFailed = true
                                        }
                                    }
                                    else -> isFailed = true
                                }
                            }
                        )
                        .build(),
                    contentDescription = movie.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF262833), Color(0xFF16181F))
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Movie,
                        contentDescription = null,
                        tint = colors.accent.copy(alpha = 0.8f),
                        modifier = Modifier.size(24.dp)
                    )
                }
            }

            if (!movie.quality.isNullOrBlank()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .background(colors.accent, RoundedCornerShape(4.dp))
                        .padding(horizontal = 4.dp, vertical = 1.dp)
                ) {
                    Text(
                        text = movie.quality,
                        color = colors.onAccent,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1
                    )
                }
            }
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = movie.title,
                color = colors.textPrimary,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                lineHeight = 17.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )

            val subMeta = buildString {
                val orig = movie.originalTitle?.takeIf { it.isNotBlank() && it != movie.title }
                if (orig != null) {
                    append(orig)
                } else {
                    movie.year?.takeIf { it > 0 }?.let { append(it) }
                    if (movie.category.isNotBlank()) {
                        if (isNotEmpty()) append(" • ")
                        append(movie.category)
                    }
                }
            }
            if (subMeta.isNotBlank()) {
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = subMeta,
                    color = colors.textMuted,
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(modifier = Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(
                    text = "98% Match",
                    color = GreenMatch,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
                movie.year?.takeIf { it > 0 }?.let { year ->
                    Box(
                        modifier = Modifier
                            .background(colors.bgTertiary, RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = "$year",
                            color = colors.textSecondary,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
