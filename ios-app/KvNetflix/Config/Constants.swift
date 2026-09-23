import Foundation
#if canImport(SwiftUI)
import SwiftUI
#endif
#if canImport(UIKit)
import UIKit
#endif

// MARK: - App Configuration & Server URLs

public enum AppConfig {
    /// Default production backend URL
    public static let defaultServerUrl = "https://nf.khoavo.myds.me/"
    
    /// Fallback local development backend URL
    public static let fallbackServerUrl = "http://localhost:8088/"
    
    /// App display name
    public static let appName = "KV-Netflix"
    
    /// App version string
    public static let appVersion = "1.0.0"
    
    /// Standard mobile User-Agent for streaming requests and API calls
    public static let userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 KV-Netflix/1.0"
}

// MARK: - API Routes

public enum ApiRoutes {
    // MARK: Public Content
    public static let homeVideos = "api/videos/home"
    public static let searchVideos = "api/videos/search"
    public static func movieDetail(slug: String) -> String { "api/videos/\(slug)" }
    public static let extract = "api/extract"
    public static let imageProxy = "api/images/proxy"
    public static let genres = "api/categories/genres"
    public static let countries = "api/categories/countries"
    public static let stream = "api/stream"
    public static let streamSubtitles = "api/stream/subtitles"
    public static let actors = "api/actors"
    public static func actorDetail(slug: String) -> String { "api/actors/\(slug)" }

    // MARK: Auth Routes (Public)
    public static let register = "api/auth/register"
    public static let login = "api/auth/login"
    public static let deviceCode = "api/auth/device/code"
    public static let deviceStatus = "api/auth/device/status"
    public static let deviceLinkLogin = "api/auth/device/link-login"
    public static let resetPassword = "api/auth/reset-password"

    // MARK: Auth & Device Routes (Protected)
    public static let me = "api/auth/me"
    public static let devicePair = "api/auth/device/pair"
    public static let deviceLinkCode = "api/auth/device/link-code"

    // MARK: Account Management
    public static let devices = "api/account/devices"
    public static let changePassword = "api/account/change-password"
    public static let recoveryKey = "api/account/recovery-key"

    // MARK: Explore
    public static let exploreMovies = "api/videos/explore"
    public static let exploreCategory = "api/videos/explore/category"

    // MARK: State Synchronization
    public static let savedMovies = "api/sync/saved-movies"
    public static let watchHistory = "api/sync/watch-history"
    public static let bulkSync = "api/sync/bulk"
}

// MARK: - Storage Keys

public enum StorageKeys {
    public static let authToken = "kv_netflix_auth_token"
    public static let userProfile = "kv_netflix_user_profile"
    public static let serverUrl = "kv_netflix_server_url"
    public static let myList = "kv_netflix_my_list"
    public static let watchHistory = "kv_netflix_watch_history"
    public static let watchProgress = "kv_netflix_watch_progress"
    public static let theme = "kv_netflix_theme"
    public static let language = "kv_netflix_language"
    public static let keychainService = "com.kvnetflix.mobile.keychain"
}

// MARK: - Theme Colors

public enum AppThemeColors {
    // Hex Color Definitions
    public static let netflixRedHex = "#E50914"
    public static let darkBackgroundHex = "#141414"
    public static let cardBackgroundHex = "#222222"
    public static let elevatedBackgroundHex = "#17181D"
    public static let brandYellowHex = "#FFD875"
    public static let greenMatchHex = "#22C55E"
    public static let textPrimaryHex = "#FFFFFF"
    public static let textSecondaryHex = "#D1D5DB"
    public static let textMutedHex = "#9CA3AF"
    public static let textDimHex = "#6B7280"

    #if canImport(SwiftUI)
    /// Netflix Signature Red (#E50914)
    public static let netflixRed = Color(red: 229/255.0, green: 9/255.0, blue: 20/255.0)
    
    /// Dark App Background (#141414)
    public static let darkBackground = Color(red: 20/255.0, green: 20/255.0, blue: 20/255.0)
    
    /// Card & Surface Background (#222222)
    public static let cardBackground = Color(red: 34/255.0, green: 34/255.0, blue: 34/255.0)
    
    /// Elevated Surface (#17181D)
    public static let elevatedBackground = Color(red: 23/255.0, green: 24/255.0, blue: 29/255.0)
    
    /// Brand Gold / Yellow Accent (#FFD875)
    public static let brandYellow = Color(red: 1.0, green: 216/255.0, blue: 117/255.0)
    
    /// Match percentage indicator (#22C55E)
    public static let greenMatch = Color(red: 34/255.0, green: 197/255.0, blue: 94/255.0)
    
    /// Pure White primary text (#FFFFFF)
    public static let textPrimary = Color.white
    
    /// Light gray secondary text (#D1D5DB)
    public static let textSecondary = Color(red: 209/255.0, green: 213/255.0, blue: 219/255.0)
    
    /// Muted gray text (#9CA3AF)
    public static let textMuted = Color(red: 156/255.0, green: 163/255.0, blue: 175/255.0)
    
    /// Dim gray text (#6B7280)
    public static let textDim = Color(red: 107/255.0, green: 114/255.0, blue: 128/255.0)
    #endif

    #if canImport(UIKit)
    public static let uiNetflixRed = UIColor(red: 229/255.0, green: 9/255.0, blue: 20/255.0, alpha: 1.0)
    public static let uiDarkBackground = UIColor(red: 20/255.0, green: 20/255.0, blue: 20/255.0, alpha: 1.0)
    public static let uiCardBackground = UIColor(red: 34/255.0, green: 34/255.0, blue: 34/255.0, alpha: 1.0)
    #endif
}

// MARK: - Ad-Blocking & Protection

public enum AdBlockConstants {
    /// Domain blocklist identical to Android implementation
    public static let domains: [String] = [
        "googleads.g.doubleclick.net",
        "pagead2.googlesyndication.com",
        "adservice.google.com",
        "googleadservices.com",
        "ad.doubleclick.net",
        "ad.turn.com",
        "adroll.com",
        "amazon-adsystem.com",
        "pubmatic.com",
        "adnxs.com",
        "adskeeper.com",
        "propellerads.com",
        "exoclick.com",
        "voom.mgid.com",
        "cdn.popinads.com",
        "ads.twitter.com",
        "analytics.twitter.com",
        "static.ads-twitter.com",
        "syndication.twitter.com",
        "ads.facebook.com",
        "analytics.facebook.com",
        "connect.facebook.net",
        "vsbet", "1xbet", "fun88", "w88", "m88", "fb88", "bk8", "dafabet",
        "histats.com", "onclickads.net", "popads.net", "popcash.net", "adsterra.com",
        "mc.yandex.ru", "creative", "banner", "popup", "adserver", "syndication", "opstream10"
    ]

    /// JavaScript to hide ad containers, remove popups, and elevate video elements
    public static let adBlockJS: String = """
    (function() {
        try {
            if (!document.getElementById('streamflow-adblock-style')) {
                var style = document.createElement('style');
                style.id = 'streamflow-adblock-style';
                style.type = 'text/css';
                style.innerHTML = `
                    [class*="ad-"], [class*="ads-"], [class*="advert"], 
                    [id*="ad-"], [id*="ads-"], [id*="advert"],
                    .ad, .ads, .advert, .advertisement,
                    [class*="popup"], [id*="popup"],
                    [class*="overlay"], [id*="overlay"],
                    [class*="banner"], [id*="banner"],
                    [class*="vsbet"], [id*="vsbet"],
                    .vsbet, .banner, .popup, .overlay,
                    iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
                    iframe[src*="facebook"], iframe[src*="adskeeper"],
                    iframe[src*="propeller"], iframe[src*="exoclick"],
                    iframe[src*="mgid"], iframe[src*="popin"],
                    div[style*="z-index: 9999"], div[style*="z-index:9999"],
                    div[style*="z-index: 2147483647"],
                    [class*="interstitial"], [class*="preroll"],
                    [class*="midroll"], [class*="postroll"] {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        pointer-events: none !important;
                        width: 0px !important;
                        height: 0px !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            var cleanAndElevateVideo = function() {
                var selectors = [
                    '[class*="ad-"]', '[class*="ads-"]', '[class*="advert"]',
                    '[id*="ad-"]', '[id*="ads-"]', '[id*="advert"]',
                    '.ad', '.ads', '.advert', '.advertisement',
                    '[class*="popup"]', '[class*="overlay"]',
                    '[class*="banner"]', '[id*="banner"]',
                    '[class*="vsbet"]', '.vsbet', '[id*="vsbet"]',
                    'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
                    'iframe[src*="facebook"]', 'iframe[src*="adskeeper"]',
                    'iframe[src*="propeller"]', 'iframe[src*="exoclick"]',
                    'iframe[src*="mgid"]', 'iframe[src*="popin"]',
                    '[class*="skip"]', '[id*="skip"]', '.skip-ad', '.skip-btn'
                ];
                selectors.forEach(function(sel) {
                    try {
                        document.querySelectorAll(sel).forEach(function(el) {
                            if (el.tagName !== 'VIDEO' && el.tagName !== 'SOURCE') {
                                el.remove();
                            }
                        });
                    } catch(e) {}
                });
                document.querySelectorAll('div[style]').forEach(function(el) {
                    var z = parseInt(el.style.zIndex) || 0;
                    if (z > 100 && el.querySelector('video') === null) {
                        el.remove();
                    }
                });

                var v = document.querySelector('video');
                if (v) {
                    v.style.position = 'fixed';
                    v.style.top = '0px';
                    v.style.left = '0px';
                    v.style.width = '100vw';
                    v.style.height = '100vh';
                    v.style.zIndex = '2147483647';
                    v.style.objectFit = 'contain';
                    v.style.backgroundColor = '#000';
                    if (v.paused) {
                        v.play().catch(function(){});
                    }
                }
            };

            cleanAndElevateVideo();
            if (!window.__adBlockInterval) {
                window.__adBlockInterval = setInterval(cleanAndElevateVideo, 250);
            }
        } catch(e) {}
    })();
    """

    /// JavaScript to block aggressive window popups
    public static let popupBlockerJS: String = """
    (function() {
        try {
            window.open = function() { return null; };
            window.alert = function() { return true; };
            window.confirm = function() { return true; };
            window.prompt = function() { return null; };
            window.onbeforeunload = null;
        } catch(e) {}
    })();
    """

    /// JavaScript to attempt auto-play on video elements
    public static let autoPlayJS: String = """
    (function() {
        try {
            var v = document.querySelector('video');
            if (v && v.paused) { v.play().catch(function(){}); }
        } catch(e) {}
    })();
    """
}

// MARK: - App Constants (Catalog and Discovery)

public struct AppConstants {
    public static let defaultServerUrl = AppConfig.defaultServerUrl
    public static let fallbackServerUrl = AppConfig.fallbackServerUrl

    public static let categories: [(id: String, vi: String, en: String)] = [
        ("phim-le", "Phim Lẻ", "Movies"),
        ("phim-bo", "Phim Bộ", "TV Series"),
        ("hoat-hinh", "Hoạt Hình", "Animation"),
        ("tv-shows", "TV Shows", "TV Shows"),
        ("k-drama", "K-Drama", "K-Drama"),
        ("c-drama", "C-Drama", "C-Drama")
    ]

    public static let genres: [(id: String, vi: String, en: String)] = [
        ("hanh-dong", "Hành Động", "Action"),
        ("tinh-cam", "Tình Cảm", "Romance"),
        ("hai-huoc", "Hài Hước", "Comedy"),
        ("co-trang", "Cổ Trang", "Historical"),
        ("tam-ly", "Tâm Lý", "Psychological"),
        ("hinh-su", "Hình Sự", "Crime"),
        ("chien-tranh", "Chiến Tranh", "War"),
        ("the-thao", "Thể Thao", "Sports"),
        ("vo-thuat", "Võ Thuật", "Martial Arts"),
        ("vien-tuong", "Viễn Tưởng", "Sci-Fi"),
        ("phieu-luu", "Phiêu Lưu", "Adventure"),
        ("khoa-hoc", "Khoa Học", "Science"),
        ("kinh-di", "Kinh Dị", "Horror"),
        ("am-nhac", "Âm Nhạc", "Music"),
        ("than-thoai", "Thần Thoại", "Mythology"),
        ("tai-lieu", "Tài Liệu", "Documentary"),
        ("gia-dinh", "Gia Đình", "Family"),
        ("chinh-kich", "Chính Kịch", "Drama"),
        ("bi-an", "Bí Ẩn", "Mystery"),
        ("hoc-duong", "Học Đường", "School"),
        ("kinh-dien", "Kinh Điển", "Classic")
    ]

    public static let countries: [(id: String, vi: String, en: String)] = [
        ("viet-nam", "Việt Nam", "Vietnam"),
        ("han-quoc", "Hàn Quốc", "Korea"),
        ("trung-quoc", "Trung Quốc", "China"),
        ("au-my", "Âu Mỹ", "US/UK"),
        ("nhat-ban", "Nhật Bản", "Japan"),
        ("thai-lan", "Thái Lan", "Thailand"),
        ("an-do", "Ấn Độ", "India"),
        ("hong-kong", "Hồng Kông", "Hong Kong"),
        ("dai-loan", "Đài Loan", "Taiwan")
    ]
}
