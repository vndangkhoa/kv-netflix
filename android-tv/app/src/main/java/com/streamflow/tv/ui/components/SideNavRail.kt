package com.streamflow.tv.ui.components

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
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
    NavItem("categories", "home/phim-le", "Categories", Icons.Default.Category),
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

    Column(
        modifier = modifier
            .fillMaxHeight()
            .width(56.dp)
            .background(colors.background.copy(alpha = 0.95f))
            .padding(vertical = 16.dp),
        verticalArrangement = Arrangement.SpaceBetween,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(colors.primary),
            contentAlignment = Alignment.Center
        ) {
            Text("S", style = StreamFlowTheme.typography.titleMedium.copy(color = Color.White))
        }

        Spacer(Modifier.height(24.dp))

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            NAV_ITEMS.forEach { item ->
                NavRailItem(
                    item = item,
                    isSelected = selectedId == item.id,
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
    onClick: () -> Unit,
    accentColor: Color
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .size(48.dp),
        shape = ClickableSurfaceDefaults.shape(shape = RoundedCornerShape(12.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) accentColor.copy(alpha = 0.15f) else Color.Transparent,
            focusedContainerColor = accentColor.copy(alpha = 0.2f)
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f)
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = item.icon,
                contentDescription = item.label,
                tint = if (isSelected) accentColor else Color.White.copy(alpha = 0.6f),
                modifier = Modifier.size(22.dp)
            )
        }
    }
}
