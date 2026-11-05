package com.streamflow.tv.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.*
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
        targetValue = if (isRailFocused) 230.dp else 68.dp,
        animationSpec = tween(durationMillis = 250),
        label = "navRailWidth"
    )

    Row(
        modifier = modifier
            .fillMaxHeight()
            .width(animatedWidth)
            .onFocusChanged { isRailFocused = it.hasFocus }
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .background(Color(0xF50D0E12))
                .padding(vertical = 24.dp, horizontal = 10.dp),
            verticalArrangement = Arrangement.SpaceBetween,
            horizontalAlignment = Alignment.Start
        ) {
            // Netflix Brand Logo Header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 6.dp, vertical = 6.dp)
            ) {
                // Signature Red 'N' Emblem
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(colors.top10Red),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "N",
                        style = StreamFlowTheme.typography.titleLarge.copy(
                            color = Color.White,
                            fontWeight = FontWeight.Black,
                            fontSize = 22.sp
                        )
                    )
                }

                AnimatedVisibility(
                    visible = isRailFocused,
                    enter = fadeIn(animationSpec = tween(150)),
                    exit = fadeOut(animationSpec = tween(100))
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Spacer(Modifier.width(12.dp))
                        Text(
                            text = "NETFLIX",
                            style = StreamFlowTheme.typography.titleMedium.copy(
                                color = colors.top10Red,
                                fontWeight = FontWeight.Black,
                                fontSize = 18.sp,
                                letterSpacing = 2.sp
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Clip
                        )
                    }
                }
            }

            Spacer(Modifier.height(28.dp))

            // Navigation Items List
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                horizontalAlignment = Alignment.Start
            ) {
                NAV_ITEMS.forEach { item ->
                    NavRailItem(
                        item = item,
                        isSelected = selectedId == item.id,
                        isExpanded = isRailFocused,
                        onClick = { onNavigate(item) },
                        accentColor = colors.top10Red
                    )
                }
            }
        }

        // Subtle Right Vertical Separation Border
        Box(
            modifier = Modifier
                .width(1.dp)
                .fillMaxHeight()
                .background(Color.White.copy(alpha = 0.08f))
        )
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
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) Color.White.copy(alpha = 0.10f) else Color.Transparent,
            focusedContainerColor = Color.White.copy(alpha = 0.22f)
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.04f)
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Iconic Red Vertical Pill Indicator for Active Route
            if (isSelected) {
                Box(
                    modifier = Modifier
                        .width(3.5.dp)
                        .height(22.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(accentColor)
                )
                Spacer(Modifier.width(8.dp))
            } else {
                Spacer(Modifier.width(3.5.dp + 8.dp))
            }

            // Menu Item Icon
            Icon(
                imageVector = item.icon,
                contentDescription = item.label,
                tint = if (isFocused || isSelected) Color.White else Color.White.copy(alpha = 0.65f),
                modifier = Modifier.size(22.dp)
            )

            // Animated Label on Rail Expansion
            if (isExpanded) {
                Spacer(Modifier.width(12.dp))
                Text(
                    text = item.label,
                    style = StreamFlowTheme.typography.bodyLarge.copy(
                        color = if (isFocused || isSelected) Color.White else Color.White.copy(alpha = 0.70f),
                        fontWeight = if (isSelected) FontWeight.ExtraBold else FontWeight.SemiBold,
                        fontSize = 14.sp
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
