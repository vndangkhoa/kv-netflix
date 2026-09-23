import SwiftUI

@main
public struct KvNetflixApp: App {
    @StateObject private var appState = AppState.shared
    @StateObject private var userStore = UserDataStore.shared

    public init() {
        // Configure dark translucent appearance for system bars
        let appearance = UINavigationBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundColor = UIColor.clear
        appearance.titleTextAttributes = [.foregroundColor: UIColor.white]
        appearance.largeTitleTextAttributes = [.foregroundColor: UIColor.white]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().compactAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        UINavigationBar.appearance().tintColor = UIColor(red: 1.0, green: 0.847, blue: 0.459, alpha: 1.0)
    }

    public var body: some Scene {
        WindowGroup {
            MainContentView()
                .environmentObject(appState)
                .environmentObject(userStore)
                .preferredColorScheme(.dark)
                .onOpenURL { url in
                    appState.handleDeepLink(url: url)
                }
        }
    }
}

// MARK: - Main Content View with TabBar & NavigationStack
public struct MainContentView: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var userStore: UserDataStore

    public var body: some View {
        NavigationStack(path: $appState.navigationPath) {
            ZStack(alignment: .bottom) {
                KvColor.darkBg.ignoresSafeArea()

                // Active Tab Content
                VStack(spacing: 0) {
                    // Top Navbar on Home Tab
                    if appState.selectedTab == .home {
                        NavbarView(
                            onLogoClick: {
                                appState.navigateToHome()
                            },
                            onSearchClick: {
                                appState.navigateToSearch()
                            },
                            onProfileClick: {
                                if userStore.isAuthenticated {
                                    appState.navigateToSettings()
                                } else {
                                    appState.presentLogin()
                                }
                            }
                        )
                    }

                    // Tab View content switcher
                    ZStack {
                        switch appState.selectedTab {
                        case .home:
                            HomeScreen(
                                onMovieClick: { movie in
                                    appState.navigateToDetail(slug: movie.slug)
                                },
                                onWatchClick: { slug, ep in
                                    appState.navigateToWatch(slug: slug, episode: ep)
                                },
                                onCategoryClick: { cat in
                                    appState.navigateToHome(category: cat)
                                }
                            )
                        case .search:
                            SearchScreen(
                                onMovieClick: { movie in
                                    appState.navigateToDetail(slug: movie.slug)
                                }
                            )
                        case .myList:
                            MyListView(
                                onMovieClick: { movie in
                                    appState.navigateToDetail(slug: movie.slug)
                                },
                                onWatchClick: { slug, ep in
                                    appState.navigateToWatch(slug: slug, episode: ep)
                                },
                                onSignInClick: {
                                    appState.presentLogin()
                                }
                            )
                        case .settings:
                            SettingsView(
                                onLoginClick: {
                                    appState.presentLogin()
                                },
                                onPairClick: {
                                    appState.presentDevicePair()
                                }
                            )
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }

                // Custom Netflix Mobile Bottom TabBar
                bottomTabBar
            }
            .navigationDestination(for: AppRoute.self) { route in
                destinationView(for: route)
            }
            .sheet(item: $appState.presentedSheet) { sheet in
                sheetView(for: sheet)
            }
        }
    }

    // MARK: - Custom Bottom TabBar
    private var bottomTabBar: some View {
        HStack(spacing: 0) {
            ForEach(TabItem.allCases) { tab in
                let isSelected = (appState.selectedTab == tab)
                Button(action: {
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.75)) {
                        appState.selectedTab = tab
                    }
                }) {
                    VStack(spacing: 4) {
                        Image(systemName: tab.iconName)
                            .font(.system(size: 20, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? KvColor.yellow : KvColor.textMuted)

                        Text(userStore.language == "vi" ? tab.titleVi : tab.titleEn)
                            .font(.system(size: 10, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? KvColor.yellow : KvColor.textMuted)

                        // Subtle active pill bar
                        Capsule()
                            .fill(isSelected ? KvColor.yellow : Color.clear)
                            .frame(width: isSelected ? 16 : 0, height: 2)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 8)
                    .padding(.bottom, 6)
                }
                .buttonStyle(ScaleButtonStyle())
            }
        }
        .padding(.horizontal, 8)
        .background(
            Rectangle()
                .fill(KvColor.darkSecondary.opacity(0.95))
                .background(.ultraThinMaterial)
                .ignoresSafeArea(edges: .bottom)
                .overlay(
                    Rectangle()
                        .fill(KvColor.borderLight)
                        .frame(height: 1),
                    alignment: .top
                )
        )
    }

    // MARK: - Navigation Destinations
    @ViewBuilder
    private func destinationView(for route: AppRoute) -> some View {
        switch route {
        case .home(let cat):
            HomeScreen(
                onMovieClick: { movie in
                    appState.navigateToDetail(slug: movie.slug)
                },
                onWatchClick: { slug, ep in
                    appState.navigateToWatch(slug: slug, episode: ep)
                },
                onCategoryClick: { category in
                    appState.navigateToHome(category: category)
                }
            )
            .navigationBarBackButtonHidden(false)

        case .detail(let slug):
            MovieDetailView(
                slug: slug,
                onWatchClick: { s, ep in
                    appState.navigateToWatch(slug: s, episode: ep)
                },
                onMovieClick: { movie in
                    appState.navigateToDetail(slug: movie.slug)
                },
                onBackClick: {
                    appState.navigationPath.removeLast()
                }
            )
            .navigationBarBackButtonHidden(true)

        case .watch(let slug, let ep):
            WatchView(
                slug: slug,
                initialEpisode: ep,
                onBack: {
                    appState.navigationPath.removeLast()
                }
            )
            .navigationBarBackButtonHidden(true)

        case .search:
            SearchScreen(
                onMovieClick: { movie in
                    appState.navigateToDetail(slug: movie.slug)
                }
            )

        case .myList:
            MyListView(
                onMovieClick: { movie in
                    appState.navigateToDetail(slug: movie.slug)
                },
                onWatchClick: { slug, ep in
                    appState.navigateToWatch(slug: slug, episode: ep)
                },
                onSignInClick: {
                    appState.presentLogin()
                }
            )

        case .login:
            LoginView(
                onDismiss: { appState.dismissSheet() },
                onRegisterClick: { appState.presentRegister() },
                onForgotPasswordClick: { appState.presentResetPassword() },
                onDevicePairClick: { appState.presentDevicePair() },
                onLoginSuccess: { appState.dismissSheet() }
            )

        case .register:
            RegisterView(
                onDismiss: { appState.dismissSheet() },
                onLoginClick: { appState.presentLogin() },
                onRegisterSuccess: { appState.dismissSheet() }
            )

        case .devicePair, .deviceLogin:
            DevicePairingView(
                onDismiss: { appState.dismissSheet() },
                onPairSuccess: { appState.dismissSheet() }
            )

        case .resetPassword:
            ResetPasswordView(
                onDismiss: { appState.dismissSheet() },
                onBackToLogin: { appState.presentLogin() }
            )

        case .settings:
            SettingsView(
                onLoginClick: { appState.presentLogin() },
                onPairClick: { appState.presentDevicePair() }
            )
        }
    }

    // MARK: - Sheets
    @ViewBuilder
    private func sheetView(for destination: SheetDestination) -> some View {
        switch destination {
        case .login:
            LoginView(
                onDismiss: { appState.dismissSheet() },
                onRegisterClick: { appState.presentRegister() },
                onForgotPasswordClick: { appState.presentResetPassword() },
                onDevicePairClick: { appState.presentDevicePair() },
                onLoginSuccess: { appState.dismissSheet() }
            )
        case .register:
            RegisterView(
                onDismiss: { appState.dismissSheet() },
                onLoginClick: { appState.presentLogin() },
                onRegisterSuccess: { appState.dismissSheet() }
            )
        case .devicePair:
            DevicePairingView(
                onDismiss: { appState.dismissSheet() },
                onPairSuccess: { appState.dismissSheet() }
            )
        case .resetPassword:
            ResetPasswordView(
                onDismiss: { appState.dismissSheet() },
                onBackToLogin: { appState.presentLogin() }
            )
        }
    }
}
