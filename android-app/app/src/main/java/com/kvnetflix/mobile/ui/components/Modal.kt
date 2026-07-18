package com.kvnetflix.mobile.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun Modal(
    visible: Boolean,
    onDismiss: () -> Unit,
    title: String? = null,
    content: @Composable () -> Unit
) {
    val colors = KvTheme.colors

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn(),
        exit = fadeOut()
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.6f))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = onDismiss
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 384.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(colors.bgSecondary)
                    .padding(24.dp)
                    .clickable(enabled = false) { }
            ) {
                if (title != null) {
                    Text(
                        text = title,
                        color = colors.textPrimary,
                        style = androidx.compose.material3.MaterialTheme.typography.headlineSmall
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                }

                content()
            }
        }
    }
}
