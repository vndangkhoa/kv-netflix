package com.streamflow.tv.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
import com.streamflow.tv.R
import com.streamflow.tv.ui.theme.StreamFlowTheme

data class NavItem(
    val id: String,
    val route: String,
    val label: String,
    val icon: ImageVector
)

val NAV_ITEMS = listOf(
    NavItem("home", "home", "Home", Icons.Default.Home),
    NavItem("movies", "home/phim-le", "Movies", Icons.Default.Movie),
    NavItem("series", "home/phim-bo", "TV Series", Icons.Default.Tv),
    NavItem("search", "search", "Search", Icons.Default.Search),
    NavItem("mylist", "mylist", "My List", Icons.Default.Favorite),
    NavItem("settings", "settings", "Settings", Icons.Default.Settings)
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SideNavRail(
    selectedId: String,
    onNavigate: (NavItem) -> Unit,
    modifier: Modifier = Modifier
) {
    val colors = StreamFlowTheme.colors
    var isRailFocused by remember { mutableStateOf(false) }
    val animatedWidth by animateDpAsState(
        targetValue = if (isRailFocused) 220.dp else 68.dp,
        animationSpec = tween(durationMillis = 250),
        label = "navRailWidth"
    )

    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(animatedWidth)
            .background(colors.surface.copy(alpha = 0.95f))
            .onFocusChanged { isRailFocused = it.hasFocus }
            .padding(vertical = 20.dp, horizontal = 10.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.Start
    ) {
        // App Logo Header (YouTube TV Style)
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 6.dp, vertical = 8.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(colors.primary),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "KV",
                    style = StreamFlowTheme.typography.titleMedium.copy(
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp
                    )
                )
            }
            if (isRailFocused) {
                Spacer(Modifier.width(12.dp))
                Text(
                    text = "NETFLIX",
                    style = StreamFlowTheme.typography.titleMedium.copy(
                        color = colors.primary,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        letterSpacing = 1.sp
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Clip
                )
            }
        }

        Spacer(Modifier.height(24.dp))

        // Navigation Items List
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.Start
        ) {
            NAV_ITEMS.forEach { item ->
                NavRailItem(
                    item = item,
                    isSelected = selectedId == item.id,
                    isExpanded = isRailFocused,
                    onClick = { onNavigate(item) },
                    accentColor = colors.primary
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun NavRailItem(
    item: NavItem,
    isSelected: Boolean,
    isExpanded: Boolean,
    onClick: () -> Unit,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(48.dp)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(12.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) accentColor.copy(alpha = 0.2f) else Color.Transparent,
            focusedContainerColor = accentColor.copy(alpha = 0.35f)
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = item.label,
                tint = if (isFocused || isSelected) accentColor else Color.White.copy(alpha = 0.7f),
                modifier = Modifier.size(24.dp)
            )

            if (isExpanded) {
                Spacer(Modifier.width(14.dp))
                Text(
                    text = item.label,
                    style = StreamFlowTheme.typography.bodyLarge.copy(
                        color = if (isFocused || isSelected) Color.White else Color.White.copy(alpha = 0.7f),
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
