import SwiftUI

public struct RegisterView: View {
    public let onDismiss: () -> Void
    public let onLoginClick: () -> Void
    public let onRegisterSuccess: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared

    @State private var name: String = ""
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var showPassword: Bool = false
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil

    public init(
        onDismiss: @escaping () -> Void,
        onLoginClick: @escaping () -> Void,
        onRegisterSuccess: @escaping () -> Void
    ) {
        self.onDismiss = onDismiss
        self.onLoginClick = onLoginClick
        self.onRegisterSuccess = onRegisterSuccess
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
                        VStack(spacing: 18) {
                            Text(userStore.language == "vi" ? "Tạo tài khoản" : "Create Account")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            // Name field
                            VStack(alignment: .leading, spacing: 6) {
                                Text(userStore.language == "vi" ? "Họ và tên" : "Full Name")
                                    .font(.kvCaption)
                                    .foregroundColor(KvColor.textMuted)

                                TextField(userStore.language == "vi" ? "Nguyễn Văn A" : "John Doe", text: $name)
                                    .foregroundColor(.white)
                                    .padding(12)
                                    .background(KvColor.darkTertiary)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
                            }

                            // Email field
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

                            // Password field
                            VStack(alignment: .leading, spacing: 6) {
                                Text(userStore.language == "vi" ? "Mật khẩu" : "Password")
                                    .font(.kvCaption)
                                    .foregroundColor(KvColor.textMuted)

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

                            // Confirm Password field
                            VStack(alignment: .leading, spacing: 6) {
                                Text(userStore.language == "vi" ? "Xác nhận mật khẩu" : "Confirm Password")
                                    .font(.kvCaption)
                                    .foregroundColor(KvColor.textMuted)

                                SecureField("••••••••", text: $confirmPassword)
                                    .foregroundColor(.white)
                                    .padding(12)
                                    .background(KvColor.darkTertiary)
                                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                                    )
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
                            Button(action: handleRegister) {
                                HStack(spacing: 8) {
                                    if isLoading {
                                        ProgressView().tint(Color(red: 0.1, green: 0.1, blue: 0.14))
                                    }
                                    Text(isLoading ? (userStore.language == "vi" ? "Đang tạo tài khoản..." : "Creating Account...") : (userStore.language == "vi" ? "Đăng ký" : "Sign Up"))
                                        .font(.system(size: 16, weight: .bold))
                                }
                                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(KvColor.yellow)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                            .disabled(isLoading)

                            Divider()
                                .background(Color.white.opacity(0.1))
                                .padding(.vertical, 4)

                            // Already have account
                            HStack(spacing: 4) {
                                Text(userStore.language == "vi" ? "Đã có tài khoản?" : "Already have an account?")
                                    .font(.system(size: 14))
                                    .foregroundColor(KvColor.textMuted)

                                Button(action: onLoginClick) {
                                    Text(userStore.language == "vi" ? "Đăng nhập" : "Sign In")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(KvColor.yellow)
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

    private func handleRegister() {
        errorMessage = nil

        let cleanName = name.trimmingCharacters(in: .whitespaces)
        let cleanEmail = email.trimmingCharacters(in: .whitespaces)

        guard !cleanName.isEmpty else {
            errorMessage = userStore.language == "vi" ? "Vui lòng nhập họ và tên" : "Name required"
            return
        }
        guard !cleanEmail.isEmpty else {
            errorMessage = userStore.language == "vi" ? "Vui lòng nhập email" : "Email required"
            return
        }
        guard password.count >= 6 else {
            errorMessage = userStore.language == "vi" ? "Mật khẩu tối thiểu 6 ký tự" : "Password must be at least 6 characters"
            return
        }
        guard password == confirmPassword else {
            errorMessage = userStore.language == "vi" ? "Mật khẩu xác nhận không khớp" : "Passwords do not match"
            return
        }

        isLoading = true
        Task {
            do {
                let response = try await ApiClient.shared.register(
                    name: cleanName,
                    email: cleanEmail,
                    password: password
                )
                userStore.saveAuth(token: response.token, user: response.user)
                isLoading = false
                onRegisterSuccess()
                onDismiss()
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
