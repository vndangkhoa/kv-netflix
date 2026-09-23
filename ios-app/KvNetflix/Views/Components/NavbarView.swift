import SwiftUI

public struct NavbarView: View {
    public let onLogoClick: () -> Void
    public let onSearchClick: () -> Void
    public let onProfileClick: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared

    public init(
        onLogoClick: @escaping () -> Void,
        onSearchClick: @escaping () -> Void,
        onProfileClick: @escaping () -> Void
    ) {
        self.onLogoClick = onLogoClick
        self.onSearchClick = onSearchClick
        self.onProfileClick = onProfileClick
    }

    public var body: some View {
        HStack(spacing: 12) {
            // KV Brand Logo
            Button(action: onLogoClick) {
                HStack(spacing: 8) {
                    // Golden Yellow KV Badge
                    Text("KV")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                        .frame(width: 34, height: 34)
                        .background(KvColor.yellow)
                        .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
                        .shadow(color: KvColor.yellow.opacity(0.3), radius: 6, x: 0, y: 2)

                    Text("NETFLIX")
                        .font(.system(size: 17, weight: .black, design: .rounded))
                        .tracking(1.5)
                        .foregroundColor(.white)
                }
            }
            .buttonStyle(ScaleButtonStyle())

            Spacer()

            // Quick Language Switcher Pill
            Button(action: toggleLanguage) {
                Text(userStore.language.uppercased())
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(KvColor.yellow)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.white.opacity(0.12))
                    .clipShape(Capsule())
            }

            // Search Icon Button
            Button(action: onSearchClick) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.white.opacity(0.12))
                    .clipShape(Circle())
            }
            .buttonStyle(ScaleButtonStyle())

            // Profile / Account Avatar
            Button(action: onProfileClick) {
                if let profile = userStore.userProfile {
                    // User initial avatar
                    let initial = String(profile.name.prefix(1)).uppercased()
                    Text(initial)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                        .frame(width: 34, height: 34)
                        .background(KvColor.yellow)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 1.5))
                } else {
                    // Guest avatar
                    Image(systemName: "person.fill")
                        .font(.system(size: 16))
                        .foregroundColor(.white.opacity(0.85))
                        .frame(width: 34, height: 34)
                        .background(Color.white.opacity(0.15))
                        .clipShape(Circle())
                }
            }
            .buttonStyle(ScaleButtonStyle())
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            // Translucent Netflix blur
            Rectangle()
                .fill(KvColor.darkBg.opacity(0.85))
                .background(.ultraThinMaterial.opacity(0.5))
                .ignoresSafeArea(edges: .top)
        )
    }

    private func toggleLanguage() {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
            userStore.language = (userStore.language == "vi") ? "en" : "vi"
        }
    }
}
