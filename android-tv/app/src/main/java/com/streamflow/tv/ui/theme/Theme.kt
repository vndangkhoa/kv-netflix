package com.streamflow.tv.ui.theme

import androidx.compose.runtime.*
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.*

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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun StreamFlowTvTheme(
    themeName: String = "default",
    content: @Composable () -> Unit
) {
    val colors = streamFlowColors(themeName)
    
    val colorScheme = ColorScheme(
        primary = colors.primary,
        onPrimary = Color.White,
        primaryContainer = colors.primary.copy(alpha = 0.3f),
        onPrimaryContainer = Color.White,
        secondary = colors.secondary,
        onSecondary = Color.White,
        secondaryContainer = colors.secondary.copy(alpha = 0.3f),
        onSecondaryContainer = Color.White,
        tertiary = colors.accent,
        onTertiary = Color.Black,
        tertiaryContainer = colors.accent.copy(alpha = 0.3f),
        onTertiaryContainer = Color.White,
        background = colors.background,
        onBackground = Color.White,
        surface = colors.surface,
        onSurface = Color.White,
        surfaceVariant = colors.surfaceVariant,
        onSurfaceVariant = Color.White,
        error = Color.Red,
        onError = Color.White,
        errorContainer = Color.Red.copy(alpha = 0.1f),
        onErrorContainer = Color.Red,
        border = colors.divider,
        borderVariant = colors.divider,
        scrim = Color.Black,
        inverseSurface = Color.White,
        inverseOnSurface = Color.Black,
        inversePrimary = colors.primary,
        surfaceTint = colors.primary
    )

    val tvTypography = Typography(
        displayLarge = AppTypography.displayLarge,
        displayMedium = AppTypography.displayMedium,
        displaySmall = AppTypography.displayMedium,
        headlineLarge = AppTypography.headlineLarge,
        headlineMedium = AppTypography.headlineMedium,
        headlineSmall = AppTypography.headlineMedium,
        titleLarge = AppTypography.titleLarge,
        titleMedium = AppTypography.titleMedium,
        titleSmall = AppTypography.titleMedium,
        bodyLarge = AppTypography.bodyLarge,
        bodyMedium = AppTypography.bodyMedium,
        bodySmall = AppTypography.bodyMedium,
        labelLarge = AppTypography.labelLarge,
        labelMedium = AppTypography.labelLarge,
        labelSmall = AppTypography.labelSmall
    )

    CompositionLocalProvider(LocalStreamFlowColors provides colors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = tvTypography,
            content = content
        )
    }
}
