package com.kvnetflix.mobile.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationRail
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.kvnetflix.mobile.ui.theme.KvTheme

data class KvNavItem(
    val index: Int,
    val tabKey: String,
    val labelEn: String,
    val labelVi: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    fun label(language: String): String = if (language == "vi") labelVi else labelEn
}

val kvNavItems = listOf(
    KvNavItem(
        index = 0,
        tabKey = "home",
        labelEn = "Home",
        labelVi = "Trang chủ",
        selectedIcon = Icons.Filled.Home,
        unselectedIcon = Icons.Outlined.Home
    ),
    KvNavItem(
        index = 1,
        tabKey = "phim-le",
        labelEn = "Movies",
        labelVi = "Phim lẻ",
        selectedIcon = Icons.Filled.Movie,
        unselectedIcon = Icons.Outlined.Movie
    ),
    KvNavItem(
        index = 2,
        tabKey = "phim-bo",
        labelEn = "Series",
        labelVi = "Phim bộ",
        selectedIcon = Icons.Filled.Tv,
        unselectedIcon = Icons.Outlined.Tv
    ),
    KvNavItem(
        index = 3,
        tabKey = "my-list",
        labelEn = "My List",
        labelVi = "Của tôi",
        selectedIcon = Icons.Filled.Favorite,
        unselectedIcon = Icons.Filled.FavoriteBorder
    ),
    KvNavItem(
        index = 4,
        tabKey = "settings",
        labelEn = "Settings",
        labelVi = "Cài đặt",
        selectedIcon = Icons.Filled.Settings,
        unselectedIcon = Icons.Outlined.Settings
    )
)

@Composable
private fun NavItemVisual(
    item: KvNavItem,
    selected: Boolean,
    language: String,
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors
    val itemColor = if (selected) colors.accent else colors.textMuted
    val iconVector = if (selected) item.selectedIcon else item.unselectedIcon
    val label = item.label(language)

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
        modifier = modifier
    ) {
        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(12.dp))
                .background(if (selected) colors.accentBg else Color.Transparent)
                .padding(horizontal = 14.dp, vertical = 3.dp),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = iconVector,
                contentDescription = label,
                tint = itemColor,
                modifier = Modifier.size(22.dp)
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Text(
            text = label,
            color = itemColor,
            fontSize = 11.sp,
            lineHeight = 14.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            maxLines = 1,
            softWrap = false,
            overflow = TextOverflow.Ellipsis
        )
    }
}

@Composable
fun BottomTabBar(
    selectedTabIndex: Int,
    onTabSelected: (String) -> Unit,
    language: String = "vi",
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(colors.bgSecondary.copy(alpha = 0.96f))
            .navigationBarsPadding()
    ) {
        HorizontalDivider(
            thickness = 1.dp,
            color = colors.borderPrimary
        )

        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            Row(
                modifier = Modifier
                    .widthIn(max = 560.dp)
                    .fillMaxWidth()
                    .heightIn(min = 60.dp),
                horizontalArrangement = Arrangement.SpaceAround,
                verticalAlignment = Alignment.CenterVertically
            ) {
                kvNavItems.forEach { item ->
                    val selected = selectedTabIndex == item.index
                    NavItemVisual(
                        item = item,
                        selected = selected,
                        language = language,
                        modifier = Modifier
                            .weight(1f)
                            .clickable(
                                interactionSource = remember { MutableInteractionSource() },
                                indication = null
                            ) {
                                onTabSelected(item.tabKey)
                            }
                            .padding(vertical = 6.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun KvNavigationRail(
    selectedTabIndex: Int,
    onTabSelected: (String) -> Unit,
    language: String = "vi",
    modifier: Modifier = Modifier
) {
    val colors = KvTheme.colors

    Row(modifier = modifier.fillMaxHeight()) {
        NavigationRail(
            // Explicit width prevents fillMaxWidth() items from expanding the rail across the screen.
            modifier = Modifier.width(NavRailWidthDp.dp),
            containerColor = colors.bgSecondary,
            contentColor = colors.textPrimary,
            windowInsets = WindowInsets.systemBars.only(
                WindowInsetsSides.Start + WindowInsetsSides.Top + WindowInsetsSides.Bottom
            )
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            kvNavItems.forEach { item ->
                val selected = selectedTabIndex == item.index
                NavItemVisual(
                    item = item,
                    selected = selected,
                    language = language,
                    modifier = Modifier
                        .fillMaxWidth()
                        .heightIn(min = 64.dp)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            onTabSelected(item.tabKey)
                        }
                        .padding(vertical = 8.dp)
                )
            }
        }
        VerticalDivider(color = colors.borderPrimary)
    }
}
