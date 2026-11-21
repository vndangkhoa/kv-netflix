package com.kvnetflix.mobile.ui.theme

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

data class AppColors(
    val bgPrimary: Color,
    val bgSecondary: Color,
    val bgTertiary: Color,
    val bgElevated: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val textDim: Color,
    val accent: Color,
    val onAccent: Color,
    val accentHover: Color,
    val accentBg: Color,
    val accentBgHover: Color,
    val borderPrimary: Color,
    val borderSubtle: Color,
    val cardBackground: Color,
    val isDark: Boolean
)

val LocalAppColors = staticCompositionLocalOf {
    AppColors(
        bgPrimary = DarkBg,
        bgSecondary = DarkSecondary,
        bgTertiary = DarkTertiary,
        bgElevated = DarkElevated,
        textPrimary = TextWhite,
        textSecondary = TextLightGray,
        textMuted = TextGray,
        textDim = TextDimGray,
        accent = KvYellow,
        onAccent = KvOnAccent,
        accentHover = KvYellowHover,
        accentBg = KvYellowBg,
        accentBgHover = KvYellowBg,
        borderPrimary = BorderLight,
        borderSubtle = BorderSubtle,
        cardBackground = DarkSecondary,
        isDark = true
    )
}

object KvTheme {
    val colors: AppColors
        @Composable
        @ReadOnlyComposable
        get() = LocalAppColors.current
}

fun appColors(isDark: Boolean): AppColors {
    return if (isDark) {
        AppColors(
            bgPrimary = DarkBg,
            bgSecondary = DarkSecondary,
            bgTertiary = DarkTertiary,
            bgElevated = DarkElevated,
            textPrimary = TextWhite,
            textSecondary = TextLightGray,
            textMuted = TextGray,
            textDim = TextDimGray,
            accent = KvYellow,
            onAccent = KvOnAccent,
            accentHover = KvYellowHover,
            accentBg = KvYellowBg,
            accentBgHover = KvYellowBg,
            borderPrimary = BorderLight,
            borderSubtle = BorderSubtle,
            cardBackground = DarkSecondary,
            isDark = true
        )
    } else {
        AppColors(
            bgPrimary = LightBg,
            bgSecondary = LightSecondary,
            bgTertiary = LightTertiary,
            bgElevated = LightElevated,
            textPrimary = TextDark,
            textSecondary = TextDarkSecondary,
            textMuted = TextGray,
            textDim = TextDimGray,
            accent = KvYellow,
            onAccent = KvOnAccent,
            accentHover = KvYellowHover,
            accentBg = KvYellowBg,
            accentBgHover = KvYellowBg,
            borderPrimary = BorderDark,
            borderSubtle = BorderDark,
            cardBackground = LightSecondary,
            isDark = false
        )
    }
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.findActivity()
    else -> null
}

@Composable
fun KvTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = appColors(darkTheme)
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = colors.accent,
            onPrimary = colors.onAccent,
            primaryContainer = colors.accentBg,
            onPrimaryContainer = colors.accent,
            secondary = colors.accent,
            onSecondary = colors.onAccent,
            background = colors.bgPrimary,
            onBackground = colors.textPrimary,
            surface = colors.bgSecondary,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.bgTertiary,
            onSurfaceVariant = colors.textSecondary,
            error = Color(0xFFCF6679),
            onError = Color.Black,
            outline = colors.borderPrimary
        )
    } else {
        lightColorScheme(
            primary = colors.accent,
            onPrimary = colors.onAccent,
            primaryContainer = colors.accentBg,
            onPrimaryContainer = colors.accent,
            secondary = colors.accent,
            onSecondary = colors.onAccent,
            background = colors.bgPrimary,
            onBackground = colors.textPrimary,
            surface = colors.bgSecondary,
            onSurface = colors.textPrimary,
            surfaceVariant = colors.bgTertiary,
            onSurfaceVariant = colors.textSecondary,
            error = Color(0xFFB3261E),
            onError = Color.White,
            outline = colors.borderPrimary
        )
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        DisposableEffect(view, darkTheme) {
            val window = view.context.findActivity()?.window
            if (window != null) {
                @Suppress("DEPRECATION")
                window.statusBarColor = colors.bgPrimary.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
            }
            onDispose {}
        }
    }

    CompositionLocalProvider(LocalAppColors provides colors) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = AppTypography,
            content = content
        )
    }
}
