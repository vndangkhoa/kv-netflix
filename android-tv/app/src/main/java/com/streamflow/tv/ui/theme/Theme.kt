package com.streamflow.tv.ui.theme

import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color

data class StreamFlowColors(
    val primary: Color,
    val secondary: Color,
    val accent: Color,
    val background: Color = DarkBackground,
    val surface: Color = DarkSurface,
    val surfaceVariant: Color = DarkSurfaceVariant,
    val textPrimary: Color = TextPrimary,
    val textSecondary: Color = TextSecondary,
    val card: Color = CardBackground,
    val divider: Color = DividerColor
)

val LocalStreamFlowColors = staticCompositionLocalOf {
    StreamFlowColors(
        primary = StreamFlowPrimary,
        secondary = StreamFlowSecondary,
        accent = StreamFlowAccent
    )
}

object StreamFlowTheme {
    val colors: StreamFlowColors
        @Composable
        @ReadOnlyComposable
        get() = LocalStreamFlowColors.current

    val typography = AppTypography
}

fun streamFlowColors(themeName: String): StreamFlowColors {
    return when (themeName) {
        "netflix" -> StreamFlowColors(
            primary = NetflixPrimary,
            secondary = NetflixSecondary,
            accent = NetflixAccent
        )
        "apple" -> StreamFlowColors(
            primary = ApplePrimary,
            secondary = AppleSecondary,
            accent = AppleAccent
        )
        else -> StreamFlowColors(
            primary = StreamFlowPrimary,
            secondary = StreamFlowSecondary,
            accent = StreamFlowAccent
        )
    }
}

@Composable
fun StreamFlowTvTheme(
    themeName: String = "default",
    content: @Composable () -> Unit
) {
    val colors = streamFlowColors(themeName)
    CompositionLocalProvider(LocalStreamFlowColors provides colors) {
        content()
    }
}
