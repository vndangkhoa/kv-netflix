package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.kvnetflix.mobile.ui.theme.KvTheme

@Composable
fun BottomTabBar(
    selectedTabIndex: Int,
    onTabSelected: (String) -> Unit
) {
    val colors = KvTheme.colors

    fun isSelected(index: Int): Boolean = selectedTabIndex == index

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.bgSecondary.copy(alpha = 0.95f))
            .windowInsetsPadding(WindowInsets.navigationBars)
            .height(48.dp)
            .padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically
    ) {
        TabIcon(
            selected = isSelected(0),
            icon = { Icon(Icons.Default.Home, "Home", modifier = Modifier.size(22.dp)) },
            onClick = { onTabSelected("home") },
            accentColor = colors.accent
        )
        TabIcon(
            selected = isSelected(1),
            icon = { Icon(Icons.Default.Movie, "Movies", modifier = Modifier.size(22.dp)) },
            onClick = { onTabSelected("phim-le") },
            accentColor = colors.accent
        )
        TabIcon(
            selected = isSelected(2),
            icon = { Icon(Icons.Default.Tv, "Series", modifier = Modifier.size(22.dp)) },
            onClick = { onTabSelected("phim-bo") },
            accentColor = colors.accent
        )
        TabIcon(
            selected = isSelected(3),
            icon = { Icon(Icons.Default.FavoriteBorder, "My List", modifier = Modifier.size(22.dp)) },
            onClick = { onTabSelected("my-list") },
            accentColor = colors.accent
        )
    }
}

@Composable
private fun TabIcon(
    selected: Boolean,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    accentColor: Color
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .clickable(onClick = onClick)
    ) {
        icon()
        Spacer(modifier = Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .width(if (selected) 16.dp else 0.dp)
                .height(2.dp)
                .clip(CircleShape)
                .background(if (selected) accentColor else Color.Transparent)
        )
    }
}
