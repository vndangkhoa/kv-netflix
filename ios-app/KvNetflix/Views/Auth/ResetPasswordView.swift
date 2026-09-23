import SwiftUI

public struct ResetPasswordView: View {
    public let onDismiss: () -> Void
    public let onBackToLogin: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared

    @State private var recoveryKey: String = ""
    @State private var newPassword: String = ""
    @State private var confirmPassword: String = ""
    @State private var isLoading: Bool = false
    @State private var isSuccess: Bool = false
    @State private var errorMessage: String? = nil

    public init(onDismiss: @escaping () -> Void, onBackToLogin: @escaping () -> Void) {
        self.onDismiss = onDismiss
        self.onBackToLogin = onBackToLogin
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                KvColor.darkBg.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Icon
                        Image(systemName: "key.fill")
                            .font(.system(size: 44))
                            .foregroundColor(KvColor.yellow)
                            .padding(.top, 20)

                        VStack(spacing: 20) {
                            Text(userStore.language == "vi" ? "Khôi phục mật khẩu" : "Reset Password")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)

                            Text(
                                userStore.language == "vi"
                                    ? "Nhập mã khôi phục (Recovery Key) đã được tạo trong tài khoản của bạn để thiết lập mật khẩu mới."
                                    : "Enter your 32-character account Recovery Key to configure a new password."
                            )
                            .font(.kvBody)
                            .foregroundColor(KvColor.textMuted)
                            .frame(maxWidth: .infinity, alignment: .leading)

                            if isSuccess {
                                successStateView
                            } else {
                                formFieldsView
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

    // MARK: - Form Fields
    private var formFieldsView: some View {
        VStack(spacing: 16) {
            // Recovery Key
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(userStore.language == "vi" ? "Mã khôi phục (Recovery Key)" : "Recovery Key")
                        .font(.kvCaption)
                        .foregroundColor(KvColor.textMuted)
                    Spacer()
                    Button(action: pasteKeyFromClipboard) {
                        Text(userStore.language == "vi" ? "Dán mã" : "Paste")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(KvColor.yellow)
                    }
                }

                TextField("rec_xxxxxxxx...", text: $recoveryKey)
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

            // New Password
            VStack(alignment: .leading, spacing: 6) {
                Text(userStore.language == "vi" ? "Mật khẩu mới" : "New Password")
                    .font(.kvCaption)
                    .foregroundColor(KvColor.textMuted)

                SecureField("••••••••", text: $newPassword)
                    .foregroundColor(.white)
                    .padding(12)
                    .background(KvColor.darkTertiary)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            }

            // Confirm New Password
            VStack(alignment: .leading, spacing: 6) {
                Text(userStore.language == "vi" ? "Xác nhận mật khẩu mới" : "Confirm New Password")
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

            if let error = errorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle.fill")
                    Text(error)
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(Color.red)
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(action: handleReset) {
                HStack(spacing: 8) {
                    if isLoading {
                        ProgressView().tint(Color(red: 0.1, green: 0.1, blue: 0.14))
                    }
                    Text(isLoading ? (userStore.language == "vi" ? "Đang đặt lại..." : "Updating...") : (userStore.language == "vi" ? "Đặt lại mật khẩu" : "Reset Password"))
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(KvColor.yellow)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(isLoading)

            Button(action: onBackToLogin) {
                Text(userStore.language == "vi" ? "Quay lại đăng nhập" : "Back to Sign In")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(KvColor.textSecondary)
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Success State
    private var successStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 52))
                .foregroundColor(KvColor.greenMatch)

            Text(userStore.language == "vi" ? "Mật khẩu đã được thay đổi!" : "Password Reset Successfully!")
                .font(.kvTitle3)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)

            Text(
                userStore.language == "vi"
                    ? "Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ."
                    : "You can now use your new password to sign in."
            )
            .font(.kvBody)
            .foregroundColor(KvColor.textMuted)
            .multilineTextAlignment(.center)

            Button(action: onBackToLogin) {
                Text(userStore.language == "vi" ? "Đăng nhập ngay" : "Sign In Now")
                    .font(.kvHeadline)
                    .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(KvColor.yellow)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .padding(.top, 10)
        }
        .padding(.vertical, 10)
    }

    private func pasteKeyFromClipboard() {
        if let clip = UIPasteboard.general.string {
            recoveryKey = clip.trimmingCharacters(in: .whitespacesAndNewlines)
        }
    }

    private func handleReset() {
        errorMessage = nil
        let cleanKey = recoveryKey.trimmingCharacters(in: .whitespaces)

        guard !cleanKey.isEmpty else {
            errorMessage = userStore.language == "vi" ? "Vui lòng nhập mã khôi phục" : "Recovery key required"
            return
        }
        guard newPassword.count >= 6 else {
            errorMessage = userStore.language == "vi" ? "Mật khẩu mới tối thiểu 6 ký tự" : "Password must be at least 6 characters"
            return
        }
        guard newPassword == confirmPassword else {
            errorMessage = userStore.language == "vi" ? "Mật khẩu không khớp" : "Passwords do not match"
            return
        }

        isLoading = true
        Task {
            do {
                try await ApiClient.shared.resetPassword(key: cleanKey, newPassword: newPassword)
                isLoading = false
                isSuccess = true
            } catch {
                isLoading = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
