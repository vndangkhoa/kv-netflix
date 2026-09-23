import SwiftUI

public struct LoginView: View {
    public let onDismiss: () -> Void
    public let onRegisterClick: () -> Void
    public let onForgotPasswordClick: () -> Void
    public let onDevicePairClick: () -> Void
    public let onLoginSuccess: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared

    @State private var useCodeTab: Bool = false
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var code: String = ""
    @State private var showPassword: Bool = false
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil

    public init(
        onDismiss: @escaping () -> Void,
        onRegisterClick: @escaping () -> Void,
        onForgotPasswordClick: @escaping () -> Void,
        onDevicePairClick: @escaping () -> Void,
        onLoginSuccess: @escaping () -> Void
    ) {
        self.onDismiss = onDismiss
        self.onRegisterClick = onRegisterClick
        self.onForgotPasswordClick = onForgotPasswordClick
        self.onDevicePairClick = onDevicePairClick
        self.onLoginSuccess = onLoginSuccess
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                KvColor.darkBg.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        // KV Brand Banner
                        headerBrand

                        // Card Form
                        VStack(spacing: 20) {
                            Text(userStore.language == "vi" ? "Đăng nhập" : "Sign In")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            // Tabs: Email vs Code
                            tabSelector

                            if useCodeTab {
                                codeLoginFields
                            } else {
                                emailLoginFields
                            }

                            // Error message
                            if let error = errorMessage {
                                HStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text(error)
                                }
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(Color.red)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }

                            // Submit Button
                            Button(action: handleLogin) {
                                HStack(spacing: 8) {
                                    if isLoading {
                                        ProgressView().tint(Color(red: 0.1, green: 0.1, blue: 0.14))
                                    }
                                    Text(isLoading ? (userStore.language == "vi" ? "Đang xử lý..." : "Signing in...") : (userStore.language == "vi" ? "Đăng nhập" : "Sign In"))
                                        .font(.system(size: 16, weight: .bold))
                                }
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(KvColor.yellow)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .disabled(isLoading)

                            // Fast device pairing link
                            Button(action: onDevicePairClick) {
                                HStack(spacing: 6) {
                                    Image(systemName: "tv.fill")
                                    Text(userStore.language == "vi" ? "Đăng nhập bằng mã thiết bị hoặc TV" : "Login with Device or TV Code")
                                }
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(KvColor.yellow)
                            }
                            .padding(.top, 4)

                            // Divider
                            Divider()
                                .background(Color.white.opacity(0.1))
                                .padding(.vertical, 4)

                            // Register Call-To-Action
                            HStack(spacing: 4) {
                                Text(userStore.language == "vi" ? "Chưa có tài khoản?" : "New to KV-Netflix?")
                                    .font(.system(size: 14))
                                    .foregroundColor(KvColor.textMuted)

                                Button(action: onRegisterClick) {
                                    Text(userStore.language == "vi" ? "Đăng ký ngay" : "Sign up now")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(.white)
                                }
                            }
                        }
                        .padding(24)
                        .background(KvColor.darkSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(Color.white.opacity(0.08), lineWidth: 1)
                        )
                    }
                    .padding(20)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .foregroundColor(.white)
                            .padding(8)
                            .background(Color.white.opacity(0.12))
                            .clipShape(Circle())
                    }
                }
            }
        }
    }

    // MARK: - Brand Header
    private var headerBrand: some View {
        HStack(spacing: 10) {
            Text("KV")
                .font(.system(size: 20, weight: .black, design: .rounded))
                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                .frame(width: 44, height: 44)
                .background(KvColor.yellow)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .shadow(color: KvColor.yellow.opacity(0.35), radius: 8, x: 0, y: 3)

            Text("KV-NETFLIX")
                .font(.system(size: 22, weight: .black, design: .rounded))
                .tracking(2)
                .foregroundColor(KvColor.yellow)
        }
        .padding(.top, 10)
    }

    // MARK: - Tab Selector
    private var tabSelector: some View {
        HStack(spacing: 8) {
            Button(action: {
                withAnimation { useCodeTab = false; errorMessage = nil }
            }) {
                Text(userStore.language == "vi" ? "Email & Mật khẩu" : "Email & Password")
                    .font(.system(size: 13, weight: !useCodeTab ? .bold : .medium))
                    .foregroundColor(!useCodeTab ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(!useCodeTab ? KvColor.yellow : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            Button(action: {
                withAnimation { useCodeTab = true; errorMessage = nil }
            }) {
                Text(userStore.language == "vi" ? "Nhập mã 6 số" : "6-Digit Code")
                    .font(.system(size: 13, weight: useCodeTab ? .bold : .medium))
                    .foregroundColor(useCodeTab ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(useCodeTab ? KvColor.yellow : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
        }
        .padding(4)
        .background(KvColor.darkTertiary)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    // MARK: - Email Fields
    private var emailLoginFields: some View {
        VStack(spacing: 14) {
            // Email Input
            VStack(alignment: .leading, spacing: 6) {
                Text("Email")
                    .font(.kvCaption)
                    .foregroundColor(KvColor.textMuted)

                TextField("email@example.com", text: $email)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .foregroundColor(.white)
                    .padding(12)
                    .background(KvColor.darkTertiary)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            }

            // Password Input
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(userStore.language == "vi" ? "Mật khẩu" : "Password")
                        .font(.kvCaption)
                        .foregroundColor(KvColor.textMuted)
                    Spacer()
                    Button(action: onForgotPasswordClick) {
                        Text(userStore.language == "vi" ? "Quên mật khẩu?" : "Forgot password?")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(KvColor.yellow)
                    }
                }

                HStack {
                    if showPassword {
                        TextField("••••••••", text: $password)
                    } else {
                        SecureField("••••••••", text: $password)
                    }

                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .foregroundColor(KvColor.textMuted)
                    }
                }
                .foregroundColor(.white)
                .padding(12)
                .background(KvColor.darkTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
            }
        }
    }

    // MARK: - 6-Digit Code Fields
    private var codeLoginFields: some View {
        VStack(spacing: 14) {
            Text(userStore.language == "vi" ? "Nhập mã ghép nối 6 chữ số từ thiết bị liên kết:" : "Enter 6-digit link code from your paired device:")
                .font(.kvSubheadline)
                .foregroundColor(KvColor.textMuted)
                .multilineTextAlignment(.center)

            TextField("123456", text: $code)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.center)
                .font(.system(size: 28, weight: .black, design: .rounded))
                .tracking(10)
                .foregroundColor(KvColor.yellow)
                .padding(14)
                .background(KvColor.darkTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .stroke(KvColor.borderGold, lineWidth: 1.5)
                )
                .onChange(of: code) { newValue in
                    if newValue.count > 6 {
                        code = String(newValue.prefix(6))
                    }
                }
        }
    }

    // MARK: - Login Handler
    private func handleLogin() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                let response: AuthResponse
                if useCodeTab {
                    let clean = code.trimmingCharacters(in: .whitespaces)
                    guard clean.count == 6 else {
                        errorMessage = userStore.language == "vi" ? "Vui lòng nhập đủ 6 chữ số" : "Please enter 6 digits"
                        isLoading = false
                        return
                    }
                    response = try await ApiClient.shared.loginWithCode(code: clean)
                } else {
                    let cleanEmail = email.trimmingCharacters(in: .whitespaces)
                    guard !cleanEmail.isEmpty else {
                        errorMessage = userStore.language == "vi" ? "Vui lòng nhập email" : "Email required"
                        isLoading = false
                        return
                    }
                    guard !password.isEmpty else {
                        errorMessage = userStore.language == "vi" ? "Vui lòng nhập mật khẩu" : "Password required"
                        isLoading = false
                        return
                    }
                    response = try await ApiClient.shared.login(email: cleanEmail, password: password)
                }

                userStore.saveAuth(token: response.token, user: response.user)
                isLoading = false
                onLoginSuccess()
                onDismiss()
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
