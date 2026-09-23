import SwiftUI

// MARK: - Color Palette
public enum KvColor {
    // Brand Golden Yellow
    public static let yellow = Color(red: 1.0, green: 0.847, blue: 0.459)          // #FFD875
    public static let yellowHover = Color(red: 0.996, green: 0.812, blue: 0.349)     // #FECF59
    public static let yellowBg = Color(red: 1.0, green: 0.847, blue: 0.459, opacity: 0.15)
    public static let yellowGlow = Color(red: 1.0, green: 0.847, blue: 0.459, opacity: 0.35)

    // Netflix Signature Red
    public static let netflixRed = Color(red: 0.898, green: 0.035, blue: 0.078)     // #E50914
    public static let netflixRedBg = Color(red: 0.898, green: 0.035, blue: 0.078, opacity: 0.15)

    // Dark Backgrounds
    public static let darkBg = Color(red: 0.039, green: 0.039, blue: 0.039)         // #0A0A0A
    public static let darkSecondary = Color(red: 0.078, green: 0.078, blue: 0.078)  // #141414
    public static let darkTertiary = Color(red: 0.102, green: 0.102, blue: 0.102)   // #1A1A1A
    public static let darkElevated = Color(red: 0.133, green: 0.133, blue: 0.133)   // #222222
    public static let cardBg = Color(red: 0.09, green: 0.094, blue: 0.114)          // #17181D

    // Light Backgrounds (for light theme support if toggled)
    public static let lightBg = Color(red: 0.96, green: 0.96, blue: 0.96)
    public static let lightSecondary = Color.white
    public static let lightTertiary = Color(red: 0.94, green: 0.94, blue: 0.94)

    // Text Colors
    public static let textWhite = Color.white
    public static let textLightGray = Color(red: 0.82, green: 0.835, blue: 0.859)   // #D1D5DB
    public static let textGray = Color(red: 0.612, green: 0.639, blue: 0.686)       // #9CA3AF
    public static let textDimGray = Color(red: 0.42, green: 0.447, blue: 0.502)     // #6B7280
    public static let textDark = Color(red: 0.067, green: 0.067, blue: 0.067)

    // Accents & Badges
    public static let greenMatch = Color(red: 0.133, green: 0.773, blue: 0.369)     // #22C55E
    public static let cyan = Color(red: 0.024, green: 0.714, blue: 0.831)           // #06B6D4
    public static let blue = Color(red: 0.231, green: 0.51, blue: 0.965)            // #3B82F6

    // Borders
    public static let borderLight = Color.white.opacity(0.10)
    public static let borderSubtle = Color.white.opacity(0.05)
    public static let borderGold = Color(red: 1.0, green: 0.847, blue: 0.459, opacity: 0.3)
}

// MARK: - App Theme Configuration
public struct KvTheme {
    public static let bgPrimary = KvColor.darkBg
    public static let bgSecondary = KvColor.darkSecondary
    public static let bgTertiary = KvColor.darkTertiary
    public static let bgElevated = KvColor.darkElevated

    public static let textPrimary = KvColor.textWhite
    public static let textSecondary = KvColor.textLightGray
    public static let textMuted = KvColor.textGray
    public static let textDim = KvColor.textDimGray

    public static let accent = KvColor.yellow
    public static let accentHover = KvColor.yellowHover
    public static let accentBg = KvColor.yellowBg

    public static let cardBackground = KvColor.darkSecondary
    public static let border = KvColor.borderLight
}

// MARK: - Typography & Fonts
public extension Font {
    static let kvLargeTitle = Font.system(size: 32, weight: .black, design: .rounded)
    static let kvTitle1 = Font.system(size: 26, weight: .bold, design: .default)
    static let kvTitle2 = Font.system(size: 20, weight: .bold, design: .default)
    static let kvTitle3 = Font.system(size: 17, weight: .semibold, design: .default)
    static let kvHeadline = Font.system(size: 15, weight: .bold, design: .default)
    static let kvBody = Font.system(size: 14, weight: .regular, design: .default)
    static let kvSubheadline = Font.system(size: 13, weight: .medium, design: .default)
    static let kvCaption = Font.system(size: 11, weight: .medium, design: .default)
    static let kvBadge = Font.system(size: 10, weight: .bold, design: .rounded)
}

// MARK: - Button Styles
public struct KvPrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    public init(isEnabled: Bool = true) {
        self.isEnabled = isEnabled
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.kvHeadline)
            .foregroundColor(Color(red: 0.098, green: 0.106, blue: 0.141))
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(isEnabled ? (configuration.isPressed ? KvColor.yellowHover : KvColor.yellow) : Color.gray.opacity(0.3))
            )
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

public struct KvSecondaryButtonStyle: ButtonStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.kvHeadline)
            .foregroundColor(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Color.white.opacity(configuration.isPressed ? 0.25 : 0.15))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.15), value: configuration.isPressed)
    }
}

public struct KvCardModifier: ViewModifier {
    var cornerRadius: CGFloat = 12

    public func body(content: Content) -> some View {
        content
            .background(KvColor.darkSecondary)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(KvColor.borderLight, lineWidth: 1)
            )
    }
}

public extension View {
    func kvCardStyle(cornerRadius: CGFloat = 12) -> some View {
        modifier(KvCardModifier(cornerRadius: cornerRadius))
    }
}
