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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
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
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val rawUrl = movie.thumbnail
    val primaryUrl = remember(movie.slug) { ApiClient.imageProxyUrl(rawUrl, 300) }
    var imageUrl by remember(movie.slug) { mutableStateOf(primaryUrl) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .width(135.dp)
            .height(195.dp)
            .onFocusChanged { isFocused = it.isFocused },
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
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.92f))
                        )
                    )
                    .padding(horizontal = 8.dp, vertical = 8.dp)
            ) {
                Text(
                    text = movie.title,
                    style = StreamFlowTheme.typography.labelMedium.copy(
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                movie.year?.let { year ->
                    Text(
                        text = year.toString(),
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HorizontalMovieCard(
    movie: Movie,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors
    var isFocused by remember { mutableStateOf(false) }
    val context = LocalContext.current

    val rawUrl = if (!movie.backdrop.isNullOrBlank()) movie.backdrop else movie.thumbnail
    val primaryUrl = remember(movie.slug) { ApiClient.imageProxyUrl(rawUrl, 600) }
    var imageUrl by remember(movie.slug) { mutableStateOf(primaryUrl) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .width(220.dp)
            .height(124.dp)
            .onFocusChanged { isFocused = it.isFocused },
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
                            colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.92f))
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
