package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kvnetflix.mobile.ui.adaptive.LocalWidthClass
import com.kvnetflix.mobile.ui.adaptive.LocalWindowState
import com.kvnetflix.mobile.ui.adaptive.WidthClass
import com.kvnetflix.mobile.ui.adaptive.WindowState

/** Narrower cap for text-heavy screens (settings, account). */
const val MaxReadableWidthDp = 720

/** Navigation rail width shown next to the content on large landscape tablets. */
const val NavRailWidthDp = 88

/** Horizontal content padding + grid gutter used by dense wide grids. */
const val WideGridPaddingDp = 16
const val WideGridSpacingDp = 12

/** Grid content may grow wider than the default centred cap so cards fill their columns. */
const val MaxGridContentWidthDp = 2400

/** Width available to content (minus rail when shown) and horizontal padding. */
private fun availableGridWidthDp(windowWidthDp: Int, hasRail: Boolean): Int =
    (windowWidthDp - (if (hasRail) NavRailWidthDp else 0) - 2 * WideGridPaddingDp).coerceAtLeast(320)

/**
 * Column count for poster grids across form factors:
 * - Compact phone (< 600dp): 2 columns
 * - Medium (600-839dp, e.g. unfolded foldable portrait): 3-4 columns
 * - Expanded (>= 840dp): 4-6 columns
 */
fun posterGridColumnCount(windowState: WindowState): Int = when (windowState.widthClass) {
    WidthClass.Compact -> 2
    WidthClass.Medium -> {
        val avail = availableGridWidthDp(windowState.widthDp, hasRail = false)
        (avail / 175f).toInt().coerceIn(3, 4)
    }
    WidthClass.Expanded -> {
        val avail = availableGridWidthDp(windowState.widthDp, windowState.useNavigationRail)
        (avail / 170f).toInt().coerceIn(4, 6)
    }
}

/** [GridCells] for poster grids, tuned to the current window state. */
@Composable
fun rememberPosterGridCells(): GridCells {
    val windowState = LocalWindowState.current
    return remember(windowState.widthClass, windowState.widthDp, windowState.useNavigationRail) {
        GridCells.Fixed(posterGridColumnCount(windowState))
    }
}

/** Horizontal gap between grid cells. */
@Composable
fun gridHorizontalSpacing(compact: Dp = 12.dp): Dp =
    if (LocalWidthClass.current.isWide) WideGridSpacingDp.dp else compact

/** Vertical gap between grid rows. */
@Composable
fun gridVerticalSpacing(compact: Dp = 12.dp): Dp =
    if (LocalWidthClass.current.isWide) WideGridSpacingDp.dp else compact

/**
 * Fills the available space but caps the content at [maxWidth] and centres it
 * horizontally (TopCenter) so grids/lists don't stretch endlessly on huge windows.
 */
@Composable
fun CenteredContent(
    modifier: Modifier = Modifier,
    maxWidth: Dp = MaxGridContentWidthDp.dp,
    content: @Composable BoxScope.() -> Unit
) {
    Box(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.TopCenter
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = maxWidth)
                .fillMaxSize(),
            content = content
        )
    }
}
