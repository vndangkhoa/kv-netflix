import SwiftUI
import WebKit

public struct AdBlockWebView: UIViewRepresentable {
    public let urlString: String
    public var onBack: (() -> Void)?

    public init(urlString: String, onBack: (() -> Void)? = nil) {
        self.urlString = urlString
        self.onBack = onBack
    }

    public static let adBlockDomains: [String] = AdBlockConstants.domains
    private static let popupBlockerJS: String = AdBlockConstants.popupBlockerJS
    private static let adBlockAndElevateJS: String = AdBlockConstants.adBlockJS
    private static let autoPlayJS: String = AdBlockConstants.autoPlayJS

    public func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    public func makeUIView(context: Context) -> WKWebView {
        let userContentController = WKUserContentController()

        // 1. Popup blocker injected at documentStart
        let popupScript = WKUserScript(
            source: Self.popupBlockerJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(popupScript)

        // 2. CSS + Adblock remover injected at documentStart
        let adBlockScript = WKUserScript(
            source: Self.adBlockAndElevateJS,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        userContentController.addUserScript(adBlockScript)

        // Webview preferences
        let configuration = WKWebViewConfiguration()
        configuration.userContentController = userContentController
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.customUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

        if let url = URL(string: urlString) {
            var req = URLRequest(url: url)
            req.timeoutInterval = 30
            webView.load(req)
        }

        return webView
    }

    public func updateUIView(_ uiView: WKWebView, context: Context) {
        if uiView.url?.absoluteString != urlString, let url = URL(string: urlString) {
            uiView.load(URLRequest(url: url))
        }
    }

    public final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var parent: AdBlockWebView

        init(_ parent: AdBlockWebView) {
            self.parent = parent
        }

        // Intercept navigation requests to block ad domains
        public func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.allow)
                return
            }

            let urlString = url.absoluteString.lowercased()

            // Check if domain is blocked
            let isBlocked = AdBlockWebView.adBlockDomains.contains { domain in
                urlString.contains(domain.lowercased())
            }

            if isBlocked {
                decisionHandler(.cancel)
                return
            }

            // Block clicks that attempt to open outside popups/windows
            if navigationAction.targetFrame == nil {
                // If it's a user clicked link that targets a new window, don't open new window;
                // instead block it or load within current frame only if it's the main video site
                decisionHandler(.cancel)
                return
            }

            decisionHandler(.allow)
        }

        public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Re-apply scripts on finish
            webView.evaluateJavaScript(AdBlockWebView.adBlockAndElevateJS, completionHandler: nil)
            webView.evaluateJavaScript(AdBlockWebView.autoPlayJS, completionHandler: nil)
        }

        // Block window.open popup requests by returning nil
        public func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            // Returning nil blocks popup windows completely
            return nil
        }

        public func webView(
            _ webView: WKWebView,
            didReceive challenge: URLAuthenticationChallenge,
            completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
        ) {
            // Handle SSL errors / self-signed certificates gracefully
            if challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
               let serverTrust = challenge.protectionSpace.serverTrust {
                completionHandler(.useCredential, URLCredential(trust: serverTrust))
            } else {
                completionHandler(.performDefaultHandling, nil)
            }
        }
    }
}
