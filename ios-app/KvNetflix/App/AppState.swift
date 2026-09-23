import SwiftUI
import Combine

public enum TabItem: String, CaseIterable, Identifiable {
    case home
    case search
    case myList
    case settings

    public var id: String { rawValue }

    public var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .search: return "magnifyingglass"
        case .myList: return "square.stack.fill"
        case .settings: return "gearshape.fill"
        }
    }

    public var titleVi: String {
        switch self {
        case .home: return "Trang chủ"
        case .search: return "Tìm kiếm"
        case .myList: return "Danh sách"
        case .settings: return "Cài đặt"
        }
    }

    public var titleEn: String {
        switch self {
        case .home: return "Home"
        case .search: return "Search"
        case .myList: return "My List"
        case .settings: return "Settings"
        }
    }
}

public enum AppRoute: Hashable {
    case home(category: String?)
    case detail(slug: String)
    case watch(slug: String, episode: Int)
}

public enum SheetDestination: Identifiable {
    case login
    case register
    case devicePair
    case resetPassword

    public var id: String {
        switch self {
        case .login: return "login"
        case .register: return "register"
        case .devicePair: return "devicePair"
        case .resetPassword: return "resetPassword"
        }
    }
}

@MainActor
public final class AppState: ObservableObject {
    public static let shared = AppState()

    // MARK: - Navigation State
    @Published public var selectedTab: TabItem = .home
    @Published public var navigationPath = NavigationPath()
    @Published public var presentedSheet: SheetDestination? = nil

    // MARK: - Init
    public init() {}

    // MARK: - Route Navigation Helpers
    public func navigateToHome(category: String? = nil) {
        selectedTab = .home
        navigationPath.removeLast(navigationPath.count)
        if let cat = category {
            navigationPath.append(AppRoute.home(category: cat))
        }
    }

    public func navigateToDetail(slug: String) {
        navigationPath.append(AppRoute.detail(slug: slug))
    }

    public func navigateToWatch(slug: String, episode: Int = 1) {
        navigationPath.append(AppRoute.watch(slug: slug, episode: episode))
    }

    public func navigateToSettings() {
        selectedTab = .settings
    }

    public func navigateToSearch() {
        selectedTab = .search
    }

    public func navigateToMyList() {
        selectedTab = .myList
    }

    public func presentLogin() {
        presentedSheet = .login
    }

    public func presentRegister() {
        presentedSheet = .register
    }

    public func presentDevicePair() {
        presentedSheet = .devicePair
    }

    public func presentResetPassword() {
        presentedSheet = .resetPassword
    }

    public func dismissSheet() {
        presentedSheet = nil
    }

    // MARK: - Deep Link Handler
    /// Handles schemes:
    /// kvnetflix://watch/{slug}/{episode}
    /// streamflow://watch/{slug}/{episode}
    public func handleDeepLink(url: URL) {
        guard let scheme = url.scheme?.lowercased(),
              scheme == "kvnetflix" || scheme == "streamflow" else {
            return
        }

        let host = url.host?.lowercased() ?? ""
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // Route: watch/{slug}/{episode}
        if host == "watch" || pathComponents.first == "watch" {
            let components = host == "watch" ? pathComponents : Array(pathComponents.dropFirst())

            if let slug = components.first, !slug.isEmpty {
                let epNumber: Int
                if components.count > 1, let parsedEp = Int(components[1]) {
                    epNumber = parsedEp
                } else {
                    epNumber = 1
                }

                // Navigate directly to Watch screen
                navigateToWatch(slug: slug, episode: epNumber)
            }
        } else if host == "pair" || host == "device-pair" {
            presentDevicePair()
        } else if host == "login" {
            presentLogin()
        } else if host == "settings" {
            selectedTab = .settings
        }
    }
}
