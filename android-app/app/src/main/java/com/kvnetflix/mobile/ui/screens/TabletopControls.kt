package com.kvnetflix.mobile.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Forward10
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Replay10
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.kvnetflix.mobile.ui.theme.KvTheme
import kotlinx.coroutines.delay

private val TabletopSpeedSteps = listOf(0.5f, 0.75f, 1f, 1.25f, 1.5f, 2f)

/**
 * Flex / Tabletop lower-half control sheet shown when a foldable is half-opened
 * horizontally, keeping the upper half unobstructed for movie/series playback.
 */
@Composable
fun KvTabletopVideoControls(
    player: ExoPlayer,
    title: String,
    subtitle: String,
    hasPrevEpisode: Boolean,
    hasNextEpisode: Boolean,
    playbackSpeed: Float,
    onPlaybackSpeedChange: (Float) -> Unit,
    onPreviousEpisode: () -> Unit,
    onNextEpisode: () -> Unit,
    onFullscreen: () -> Unit,
    onClose: () -> Unit,
    onUserPausedChanged: (Boolean) -> Unit = {},
    modifier: Modifier = Modifier
) {
    var isPlaying by remember(player) { mutableStateOf(player.isPlaying) }
    var isEnded by remember(player) { mutableStateOf(player.playbackState == Player.STATE_ENDED) }
    var currentPosition by remember(player) { mutableLongStateOf(player.currentPosition.coerceAtLeast(0L)) }
    var duration by remember(player) { mutableLongStateOf(player.duration.coerceAtLeast(1L)) }
    var isMuted by remember(player) { mutableStateOf(player.volume == 0f) }
    var isScrubbing by remember { mutableStateOf(false) }
    var scrubFraction by remember { mutableFloatStateOf(0f) }

    DisposableEffect(player) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(playing: Boolean) {
                isPlaying = playing
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                isEnded = playbackState == Player.STATE_ENDED
            }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener) }
    }

    LaunchedEffect(player, isPlaying) {
        currentPosition = player.currentPosition.coerceAtLeast(0L)
        duration = player.duration.coerceAtLeast(1L)
        while (isPlaying) {
            delay(250)
            if (!isScrubbing) {
                currentPosition = player.currentPosition.coerceAtLeast(0L)
                duration = player.duration.coerceAtLeast(1L)
            }
        }
    }

    val liveFraction = (currentPosition.toFloat() / duration.coerceAtLeast(1L).toFloat()).coerceIn(0f, 1f)
    val sliderFraction = if (isScrubbing) scrubFraction else liveFraction
    val displayPos = if (isScrubbing) (scrubFraction * duration).toLong() else currentPosition
    val canPrevious = hasPrevEpisode || currentPosition > 3_000L

    KvTabletopVideoControlsBody(
        title = title,
        subtitle = subtitle,
        isPlaying = isPlaying,
        isEnded = isEnded,
        isMuted = isMuted,
        hasPrevious = canPrevious,
        hasNext = hasNextEpisode,
        playbackSpeed = playbackSpeed,
        sliderFraction = sliderFraction,
        positionLabel = "${formatTabletopTime(displayPos)} / ${formatTabletopTime(duration)}",
        onCycleSpeed = {
            val currentIdx = TabletopSpeedSteps.indexOfFirst { it == playbackSpeed }
            val nextSpeed = TabletopSpeedSteps[(currentIdx + 1) % TabletopSpeedSteps.size]
            onPlaybackSpeedChange(nextSpeed)
        },
        onPrevious = {
            if (player.currentPosition > 3_000L) {
                player.seekTo(0L)
                currentPosition = 0L
            } else if (hasPrevEpisode) {
                onPreviousEpisode()
            }
        },
        onReplay10 = {
            val target = (player.currentPosition - 10_000L).coerceAtLeast(0L)
            player.seekTo(target)
            currentPosition = target
        },
        onPlayPause = {
            if (isEnded) {
                player.seekTo(0L)
                player.play()
                onUserPausedChanged(false)
                isEnded = false
            } else if (isPlaying) {
                player.pause()
                onUserPausedChanged(true)
            } else {
                player.play()
                onUserPausedChanged(false)
            }
        },
        onForward10 = {
            val maxDur = player.duration.coerceAtLeast(1L)
            val target = (player.currentPosition + 10_000L).coerceAtMost(maxDur)
            player.seekTo(target)
            currentPosition = target
        },
        onNext = onNextEpisode,
        onScrub = { fraction ->
            isScrubbing = true
            scrubFraction = fraction.coerceIn(0f, 1f)
        },
        onScrubFinished = {
            val target = (scrubFraction * duration).toLong().coerceIn(0L, duration)
            player.seekTo(target)
            currentPosition = target
            isScrubbing = false
        },
        onToggleMute = {
            isMuted = !isMuted
            player.volume = if (isMuted) 0f else 1f
        },
        onFullscreen = onFullscreen,
        onClose = onClose,
        modifier = modifier
    )
}

@Composable
private fun KvTabletopVideoControlsBody(
    title: String,
    subtitle: String,
    isPlaying: Boolean,
    isEnded: Boolean,
    isMuted: Boolean,
    hasPrevious: Boolean,
    hasNext: Boolean,
    playbackSpeed: Float,
    sliderFraction: Float,
    positionLabel: String,
    onCycleSpeed: () -> Unit,
    onPrevious: () -> Unit,
    onReplay10: () -> Unit,
    onPlayPause: () -> Unit,
    onForward10: () -> Unit,
    onNext: () -> Unit,
    onScrub: (Float) -> Unit,
    onScrubFinished: () -> Unit,
    onToggleMute: () -> Unit,
    onFullscreen: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
        color = colors.bgSecondary
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 10.dp),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(width = 36.dp, height = 4.dp)
                        .background(
                            colors.textMuted.copy(alpha = 0.4f),
                            RoundedCornerShape(2.dp)
                        )
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "Video controls",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textPrimary
                )
                IconButton(onClick = onClose, modifier = Modifier.size(36.dp)) {
                    Icon(
                        imageVector = Icons.Filled.Close,
                        contentDescription = "Hide video controls",
                        tint = colors.textPrimary
                    )
                }
            }

            HorizontalDivider(color = colors.borderPrimary)

            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                verticalArrangement = Arrangement.SpaceEvenly,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = title.ifBlank { "Now playing" },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary,
                        textAlign = TextAlign.Center,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (subtitle.isNotBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = subtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = colors.textMuted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(
                        onClick = onPrevious,
                        enabled = hasPrevious,
                        modifier = Modifier
                            .size(48.dp)
                            .alpha(if (hasPrevious) 1f else 0.35f)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.SkipPrevious,
                            contentDescription = "Previous episode",
                            tint = colors.textPrimary,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                    IconButton(onClick = onReplay10, modifier = Modifier.size(52.dp)) {
                        Icon(
                            imageVector = Icons.Filled.Replay10,
                            contentDescription = "Rewind 10 seconds",
                            tint = colors.textPrimary,
                            modifier = Modifier.size(34.dp)
                        )
                    }
                    Surface(
                        onClick = onPlayPause,
                        shape = CircleShape,
                        color = colors.bgTertiary,
                        border = BorderStroke(1.dp, colors.accent.copy(alpha = 0.4f)),
                        modifier = Modifier.size(72.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = when {
                                    isEnded -> Icons.Filled.Replay
                                    isPlaying -> Icons.Filled.Pause
                                    else -> Icons.Filled.PlayArrow
                                },
                                contentDescription = if (isPlaying) "Pause" else "Play",
                                tint = colors.textPrimary,
                                modifier = Modifier.size(44.dp)
                            )
                        }
                    }
                    IconButton(onClick = onForward10, modifier = Modifier.size(52.dp)) {
                        Icon(
                            imageVector = Icons.Filled.Forward10,
                            contentDescription = "Forward 10 seconds",
                            tint = colors.textPrimary,
                            modifier = Modifier.size(34.dp)
                        )
                    }
                    IconButton(
                        onClick = onNext,
                        enabled = hasNext,
                        modifier = Modifier
                            .size(48.dp)
                            .alpha(if (hasNext) 1f else 0.35f)
                    ) {
                        Icon(
                            imageVector = Icons.Filled.SkipNext,
                            contentDescription = "Next episode",
                            tint = colors.textPrimary,
                            modifier = Modifier.size(30.dp)
                        )
                    }
                }
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = positionLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.textMuted
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(colors.bgTertiary)
                                .border(1.dp, colors.borderPrimary, RoundedCornerShape(8.dp))
                                .clickable(onClick = onCycleSpeed)
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = formatSpeedChip(playbackSpeed),
                                color = if (playbackSpeed != 1f) colors.accent else colors.textPrimary,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        IconButton(onClick = onToggleMute, modifier = Modifier.size(34.dp)) {
                            Icon(
                                imageVector = if (isMuted) Icons.AutoMirrored.Filled.VolumeOff
                                else Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = if (isMuted) "Unmute" else "Mute",
                                tint = colors.textSecondary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        IconButton(onClick = onFullscreen, modifier = Modifier.size(34.dp)) {
                            Icon(
                                imageVector = Icons.Filled.Fullscreen,
                                contentDescription = "Fullscreen",
                                tint = colors.textSecondary,
                                modifier = Modifier.size(22.dp)
                            )
                        }
                    }
                }
                Slider(
                    value = sliderFraction.coerceIn(0f, 1f),
                    onValueChange = onScrub,
                    onValueChangeFinished = onScrubFinished,
                    modifier = Modifier.fillMaxWidth(),
                    colors = SliderDefaults.colors(
                        thumbColor = colors.accent,
                        activeTrackColor = colors.accent,
                        inactiveTrackColor = colors.textMuted.copy(alpha = 0.25f)
                    )
                )
            }
        }
    }
}

private fun formatSpeedChip(speed: Float): String {
    val str = if (speed % 1f == 0f) speed.toInt().toString() else speed.toString()
    return "${str}x"
}

private fun formatTabletopTime(ms: Long): String {
    val totalSeconds = (ms / 1000).coerceAtLeast(0L)
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    val hours = minutes / 60
    return if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes % 60, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }
}

@Preview(name = "Tabletop", widthDp = 883, heightDp = 360, showBackground = true)
@Composable
private fun KvTabletopVideoControlsPreview() {
    KvTheme(darkTheme = true) {
        KvTabletopVideoControlsBody(
            title = "Sample Movie Title That Wraps Cleanly Across Two Lines",
            subtitle = "Episode 3 • 2026",
            isPlaying = true,
            isEnded = false,
            isMuted = false,
            hasPrevious = true,
            hasNext = true,
            playbackSpeed = 1.25f,
            sliderFraction = 0.28f,
            positionLabel = "18:24 / 1:08:37",
            onCycleSpeed = {},
            onPrevious = {},
            onReplay10 = {},
            onPlayPause = {},
            onForward10 = {},
            onNext = {},
            onScrub = {},
            onScrubFinished = {},
            onToggleMute = {},
            onFullscreen = {},
            onClose = {}
        )
    }
}
