package com.streamflow.tv.ui.screens

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.tv.material3.ClickableSurfaceDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Surface
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.ui.components.EpisodeSelector
import com.streamflow.tv.ui.components.ServerSelector
import com.streamflow.tv.ui.theme.StreamFlowTheme
import com.streamflow.tv.viewmodel.DetailViewModel

private fun stripHtml(html: String): String {
    if (html.isBlank()) return ""
    return html.replace(Regex("<[^>]*>"), "")
        .replace("&nbsp;", " ")
        .replace("&quot;", "\"")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace(Regex("\\s+"), " ")
        .trim()
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailScreen(
    slug: String,
    onPlayClick: (String, Int, String) -> Unit,
    onBack: () -> Unit,
    userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null,
    viewModel: DetailViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val colors = StreamFlowTheme.colors
    
    LaunchedEffect(slug) {
        viewModel.loadMovie(slug, userDataRepository)
    }

    Log.d("DetailScreen", "Composing DetailScreen(slug=$slug, isLoading=${uiState.isLoading})")
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F0F14)),
        contentAlignment = Alignment.Center
    ) {
        if (uiState.isLoading) {
            CircularLoadingIndicator()
        } else if (uiState.error != null) {
            ErrorState(message = uiState.error ?: "Unknown error", onRetry = { viewModel.loadMovie(slug) })
        } else {
            val movie = uiState.movie ?: return@Box
            Log.d("DetailScreen", "Rendering movie details: ${movie.title}")

            val servers = remember(movie.episodes) {
                movie.episodes?.map { it.displayServerName }?.distinct() ?: emptyList()
            }

            val activeServer = if (uiState.selectedServer.isNotBlank() && servers.contains(uiState.selectedServer)) {
                uiState.selectedServer
            } else {
                servers.firstOrNull() ?: ""
            }

            val filteredEpisodes = remember(movie.episodes, activeServer) {
                if (activeServer.isNotBlank()) {
                    movie.episodes?.filter { it.displayServerName.equals(activeServer, ignoreCase = true) } ?: emptyList()
                } else {
                    movie.episodes ?: emptyList()
                }
            }

            val cleanDescription = remember(movie.description) {
                stripHtml(movie.description)
            }

            // Cinematic Hero Backdrop with Dynamic Multi-stage Vignette
            AsyncImage(
                model = ApiClient.imageProxyUrl(movie.backdrop ?: movie.thumbnail, 1920),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Left Horizontal Dark Vignette Gradient (Focus readability on text)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            colorStops = arrayOf(
                                0.0f to Color(0xFF0F0F14),
                                0.40f to Color(0xFA0F0F14),
                                0.65f to Color(0xB30F0F14),
                                0.85f to Color(0x400F0F14),
                                1.0f to Color.Transparent
                            )
                        )
                    )
            )

            // Bottom Vertical Dark Fade Gradient
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.65f)
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colorStops = arrayOf(
                                0.0f to Color.Transparent,
                                0.40f to Color(0x800F0F14),
                                0.80f to Color(0xF50F0F14),
                                1.0f to Color(0xFF0F0F14)
                            )
                        )
                    )
            )

            val focusRequester = remember { FocusRequester() }

            LaunchedEffect(uiState.movie) {
                if (uiState.movie != null) {
                    focusRequester.requestFocus()
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 48.dp, vertical = 28.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left Column: Poster Cover Art (Visual Highlight)
                if (!movie.thumbnail.isNullOrBlank()) {
                    Box(
                        modifier = Modifier
                            .width(175.dp)
                            .height(260.dp)
                            .shadow(24.dp, shape = RoundedCornerShape(12.dp), ambientColor = colors.focusGlow, spotColor = Color.Black)
                            .clip(RoundedCornerShape(12.dp))
                            .border(1.5.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(12.dp))
                    ) {
                        AsyncImage(
                            model = ApiClient.imageProxyUrl(movie.thumbnail, 400),
                            contentDescription = movie.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                    Spacer(Modifier.width(36.dp))
                }

                // Right Column: Title, Metadata Badges, Description, Buttons, Servers, Episodes
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.Center
                ) {
                    // Movie Title
                    Text(
                        text = movie.title,
                        style = StreamFlowTheme.typography.displayMedium.copy(
                            fontWeight = FontWeight.ExtraBold,
                            fontSize = 32.sp,
                            color = Color.White
                        ),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    // Original Title Subtitle
                    if (!movie.originalTitle.isNullOrBlank() && !movie.originalTitle.equals(movie.title, ignoreCase = true)) {
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = movie.originalTitle,
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = colors.primary,
                                fontWeight = FontWeight.SemiBold
                            )
                        )
                    }

                    Spacer(Modifier.height(12.dp))

                    // Metadata Pill Badges Row (Year, Quality, Category, Episode Count)
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val yearVal = movie.year ?: 0
                        if (yearVal > 0) {
                            BadgePill(text = "$yearVal")
                        }
                        if (!movie.quality.isNullOrBlank()) {
                            BadgePill(text = movie.quality, isHighlight = true)
                        }
                        if (filteredEpisodes.isNotEmpty()) {
                            BadgePill(text = "${filteredEpisodes.size} Tập")
                        }
                        if (!movie.category.isNullOrBlank()) {
                            BadgePill(text = movie.category)
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    // Cleaned Description Paragraph
                    if (cleanDescription.isNotBlank()) {
                        Text(
                            text = cleanDescription,
                            style = StreamFlowTheme.typography.bodyMedium.copy(
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 14.sp,
                                lineHeight = 20.sp
                            ),
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.fillMaxWidth(0.9f)
                        )
                        Spacer(Modifier.height(20.dp))
                    }

                    // Action Buttons (Play Movie, Add to My List)
                    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Surface(
                            onClick = {
                                val firstEp = filteredEpisodes.firstOrNull()?.number ?: 1
                                onPlayClick(movie.slug, firstEp, activeServer)
                            },
                            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = Color.White,
                                focusedContainerColor = Color.White
                            ),
                            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f),
                            modifier = Modifier.focusRequester(focusRequester)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "▶  Xem Phim",
                                    style = StreamFlowTheme.typography.titleMedium.copy(
                                        color = Color(0xFF141414),
                                        fontWeight = FontWeight.Black
                                    )
                                )
                            }
                        }

                        Surface(
                            onClick = { viewModel.toggleMyList() },
                            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = if (uiState.isInMyList) colors.top10Red.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.15f),
                                focusedContainerColor = Color.White.copy(alpha = 0.32f)
                            ),
                            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.08f)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    if (uiState.isInMyList) "✓ Trong Danh Sách" else "+ Danh Sách Của Tôi",
                                    style = StreamFlowTheme.typography.titleMedium.copy(
                                        color = Color.White,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                )
                            }
                        }
                    }

                    // Server Selector Row (if multiple servers exist)
                    if (servers.size > 1) {
                        Spacer(Modifier.height(18.dp))
                        ServerSelector(
                            servers = servers,
                            selectedServer = activeServer,
                            onServerSelect = { server -> viewModel.selectServer(server) }
                        )
                    }

                    // Episode Selector Grid
                    if (filteredEpisodes.isNotEmpty()) {
                        Spacer(Modifier.height(18.dp))
                        EpisodeSelector(
                            episodes = filteredEpisodes,
                            currentEpisode = 1,
                            onEpisodeSelect = { episode -> onPlayClick(movie.slug, episode.number, activeServer) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(130.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun BadgePill(text: String, isHighlight: Boolean = false) {
    val colors = StreamFlowTheme.colors
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(if (isHighlight) colors.top10Red.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.10f))
            .border(
                width = 1.dp,
                color = if (isHighlight) colors.top10Red.copy(alpha = 0.85f) else Color.White.copy(alpha = 0.35f),
                shape = RoundedCornerShape(4.dp)
            )
            .padding(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(
            text = text,
            style = StreamFlowTheme.typography.labelSmall.copy(
                color = if (isHighlight) Color.White else Color.White.copy(alpha = 0.90f),
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp
            )
        )
    }
}

@Composable
fun CircularLoadingIndicator() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(
            text = "Loading movie details...",
            style = StreamFlowTheme.typography.headlineMedium.copy(color = StreamFlowTheme.colors.primary)
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        val colors = StreamFlowTheme.colors
        Text(
            text = message,
            style = StreamFlowTheme.typography.bodyLarge.copy(color = Color.Red),
            modifier = Modifier.padding(bottom = 16.dp)
        )
        Surface(
            onClick = onRetry,
            shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = colors.surfaceVariant
            )
        ) {
            Text(
                "Retry",
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp)
            )
        }
    }
}
