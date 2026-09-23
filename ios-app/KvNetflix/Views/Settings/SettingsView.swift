import SwiftUI

public struct SettingsView: View {
    public let onLoginClick: () -> Void
    public let onPairClick: () -> Void

    @ObservedObject private var userStore = UserDataStore.shared

    @State private var serverUrlInput: String = ""
    @State private var isTestingServer: Bool = false
    @State private var serverTestResult: String? = nil
    @State private var isServerOnline: Bool? = nil

    @State private var devices: [Device] = []
    @State private var isLoadingDevices: Bool = false
    @State private var deviceToRevoke: Device? = nil

    @State private var generatedRecoveryKey: String? = nil
    @State private var isGeneratingKey: Bool = false
    @State private var copiedKeyToast: Bool = false

    @State private var showClearedToast: Bool = false

    public init(onLoginClick: @escaping () -> Void, onPairClick: @escaping () -> Void) {
        self.onLoginClick = onLoginClick
        self.onPairClick = onPairClick
    }

    public var body: some View {
        ZStack {
            KvColor.darkBg.ignoresSafeArea()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 20) {
                    // Title
                    Text(userStore.language == "vi" ? "Cài đặt & Tài khoản" : "Settings & Account")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 16)
                        .padding(.top, 10)

                    // 1. Account Section
                    accountCard

                    // 2. Linked Devices & Pairing Section
                    linkedDevicesCard

                    // 3. Server Configuration Section
                    serverConfigCard

                    // 4. Preferences Section (Language, Cache)
                    preferencesCard

                    // 5. About App
                    aboutAppCard
                }
                .padding(.bottom, 80)
            }
        }
        .onAppear {
            serverUrlInput = userStore.serverUrl
            if userStore.isAuthenticated {
                loadDevices()
            }
        }
        .alert(
            userStore.language == "vi" ? "Hủy liên kết thiết bị?" : "Unlink Device?",
            isPresented: Binding(
                get: { deviceToRevoke != nil },
                set: { if !$0 { deviceToRevoke = nil } }
            )
        ) {
            Button(userStore.language == "vi" ? "Hủy" : "Cancel", role: .cancel) {
                deviceToRevoke = nil
            }
            Button(userStore.language == "vi" ? "Xác nhận hủy" : "Revoke", role: .destructive) {
                if let dev = deviceToRevoke {
                    revokeDevice(dev)
                }
            }
        } message: {
            if let dev = deviceToRevoke {
                Text(
                    userStore.language == "vi"
                        ? "Bạn có chắc muốn đăng xuất thiết bị \"\(dev.name)\"?"
                        : "Are you sure you want to log out \"\(dev.name)\"?"
                )
            }
        }
    }

    // MARK: - 1. Account Section
    private var accountCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(userStore.language == "vi" ? "Tài khoản" : "Account")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(KvColor.yellow)

            if userStore.isAuthenticated, let profile = userStore.userProfile {
                HStack(spacing: 14) {
                    let initial = String(profile.name.prefix(1)).uppercased()
                    Text(initial)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                        .frame(width: 48, height: 48)
                        .background(KvColor.yellow)
                        .clipShape(Circle())

                    VStack(alignment: .leading, spacing: 3) {
                        Text(profile.name)
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        Text(profile.email)
                            .font(.system(size: 13))
                            .foregroundColor(KvColor.textMuted)
                    }

                    Spacer()
                }

                Divider().background(Color.white.opacity(0.08))

                // Recovery Key Generator
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Button(action: generateRecoveryKey) {
                            HStack(spacing: 6) {
                                if isGeneratingKey {
                                    ProgressView().tint(KvColor.yellow).scaleEffect(0.8)
                                } else {
                                    Image(systemName: "key.horizontal.fill")
                                }
                                Text(userStore.language == "vi" ? "Tạo mã khôi phục tài khoản" : "Generate Recovery Key")
                                    .font(.system(size: 13, weight: .semibold))
                            }
                            .foregroundColor(KvColor.yellow)
                        }
                        Spacer()
                    }

                    if let key = generatedRecoveryKey {
                        HStack {
                            Text(key)
                                .font(.system(size: 11, design: .monospaced))
                                .foregroundColor(.white)
                                .lineLimit(1)

                            Spacer()

                            Button(action: { copyKeyToClipboard(key) }) {
                                Image(systemName: copiedKeyToast ? "checkmark" : "doc.on.doc")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(copiedKeyToast ? KvColor.greenMatch : KvColor.yellow)
                            }
                        }
                        .padding(10)
                        .background(KvColor.darkTertiary)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                    }
                }

                // Logout Button
                Button(action: { userStore.logout() }) {
                    HStack {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                        Text(userStore.language == "vi" ? "Đăng xuất" : "Sign Out")
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Color.red.opacity(0.9))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.red.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    Text(
                        userStore.language == "vi"
                            ? "Đăng nhập tài khoản KV-Netflix để đồng bộ phim đã lưu, lịch sử xem và liên kết Android TV."
                            : "Sign in to KV-Netflix to sync your library, watch history, and connect Android TV."
                    )
                    .font(.kvBody)
                    .foregroundColor(KvColor.textMuted)

                    Button(action: onLoginClick) {
                        Text(userStore.language == "vi" ? "Đăng nhập hoặc Đăng ký" : "Sign In or Sign Up")
                            .font(.kvHeadline)
                            .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(KvColor.yellow)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
            }
        }
        .padding(16)
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.horizontal, 16)
    }

    // MARK: - 2. Linked Devices & TV Pairing Card
    private var linkedDevicesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text(userStore.language == "vi" ? "Thiết bị liên kết" : "Linked Devices")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(KvColor.yellow)

                Spacer()

                Button(action: onPairClick) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus.circle.fill")
                        Text(userStore.language == "vi" ? "Ghép đôi mới" : "Pair New")
                    }
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(KvColor.yellow)
                }
            }

            if userStore.isAuthenticated {
                if isLoadingDevices {
                    ProgressView().tint(KvColor.yellow)
                        .padding(.vertical, 10)
                } else if devices.isEmpty {
                    Text(userStore.language == "vi" ? "Chưa có thiết bị TV hoặc Companion nào được liên kết." : "No linked TV or companion devices.")
                        .font(.kvCaption)
                        .foregroundColor(KvColor.textMuted)
                } else {
                    VStack(spacing: 8) {
                        ForEach(devices) { dev in
                            HStack(spacing: 12) {
                                Image(systemName: dev.name.contains("TV") ? "tv" : "display")
                                    .foregroundColor(KvColor.yellow)
                                    .font(.system(size: 16))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(dev.name)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(.white)
                                    Text(dev.isPaired ? (userStore.language == "vi" ? "Đã ghép đôi" : "Paired") : (userStore.language == "vi" ? "Chờ xác nhận" : "Pending"))
                                        .font(.system(size: 11))
                                        .foregroundColor(dev.isPaired ? KvColor.greenMatch : KvColor.textMuted)
                                }

                                Spacer()

                                Button(action: { deviceToRevoke = dev }) {
                                    Image(systemName: "trash")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color.red.opacity(0.8))
                                        .padding(6)
                                }
                            }
                            .padding(10)
                            .background(KvColor.darkTertiary)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                }
            } else {
                Text(userStore.language == "vi" ? "Đăng nhập để xem và quản lý danh sách thiết bị liên kết." : "Sign in to manage your connected devices.")
                    .font(.kvCaption)
                    .foregroundColor(KvColor.textMuted)
            }
        }
        .padding(16)
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.horizontal, 16)
    }

    // MARK: - 3. Server Configuration Card
    private var serverConfigCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(userStore.language == "vi" ? "Cấu hình Máy chủ (Backend URL)" : "Server Configuration")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(KvColor.yellow)

            Text(userStore.language == "vi" ? "Địa chỉ URL API backend KV-Netflix / StreamFlow." : "Target backend URL endpoint.")
                .font(.kvCaption)
                .foregroundColor(KvColor.textMuted)

            TextField("https://...", text: $serverUrlInput)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .foregroundColor(.white)
                .padding(12)
                .background(KvColor.darkTertiary)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

            HStack(spacing: 10) {
                // Test Connection
                Button(action: testServerConnection) {
                    HStack(spacing: 6) {
                        if isTestingServer {
                            ProgressView().tint(KvColor.yellow).scaleEffect(0.7)
                        } else {
                            Image(systemName: "network")
                        }
                        Text(userStore.language == "vi" ? "Kiểm tra" : "Ping")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(KvColor.yellow)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.white.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }

                // Reset to Default
                Button(action: {
                    serverUrlInput = AppConstants.defaultServerUrl
                    saveServerUrl()
                }) {
                    Text(userStore.language == "vi" ? "Mặc định" : "Default")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(KvColor.textMuted)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                }

                Spacer()

                // Save button
                Button(action: saveServerUrl) {
                    Text(userStore.language == "vi" ? "Lưu URL" : "Save URL")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(KvColor.yellow)
                        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }

            if let result = serverTestResult {
                HStack(spacing: 6) {
                    Circle()
                        .fill((isServerOnline == true) ? KvColor.greenMatch : Color.red)
                        .frame(width: 8, height: 8)
                    Text(result)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor((isServerOnline == true) ? KvColor.greenMatch : Color.red)
                }
            }
        }
        .padding(16)
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.horizontal, 16)
    }

    // MARK: - 4. Preferences Card (Language & Cache)
    private var preferencesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(userStore.language == "vi" ? "Tùy chọn & Bộ nhớ" : "Preferences & Storage")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(KvColor.yellow)

            // Language Switcher
            HStack {
                Text(userStore.language == "vi" ? "Ngôn ngữ giao diện" : "App Language")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white)

                Spacer()

                Picker("Language", selection: $userStore.language) {
                    Text("Tiếng Việt").tag("vi")
                    Text("English").tag("en")
                }
                .pickerStyle(.segmented)
                .frame(width: 170)
            }

            Divider().background(Color.white.opacity(0.08))

            // Clear Cache
            Button(action: clearCache) {
                HStack {
                    Image(systemName: "trash.circle")
                    Text(userStore.language == "vi" ? "Xóa bộ nhớ đệm hình ảnh và lịch sử tìm kiếm" : "Clear Cache & Search History")
                }
                .font(.system(size: 13, weight: .medium))
                .foregroundColor(KvColor.textSecondary)
            }

            if showClearedToast {
                Text(userStore.language == "vi" ? "Đã dọn dẹp bộ nhớ đệm thành công!" : "Cache cleared successfully!")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(KvColor.greenMatch)
            }
        }
        .padding(16)
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .padding(.horizontal, 16)
    }

    // MARK: - 5. About App Card
    private var aboutAppCard: some View {
        VStack(alignment: .center, spacing: 6) {
            Text("KV-NETFLIX iOS")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(KvColor.yellow)

            Text("Phiên bản 1.0.0 (Build 1) • SwiftUI Native")
                .font(.system(size: 12))
                .foregroundColor(KvColor.textMuted)

            Text("© 2026 KV-Netflix. All rights reserved.")
                .font(.system(size: 11))
                .foregroundColor(KvColor.textMuted.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
    }

    // MARK: - Handlers
    private func saveServerUrl() {
        userStore.serverUrl = serverUrlInput
        serverTestResult = userStore.language == "vi" ? "Đã lưu địa chỉ máy chủ!" : "Server URL saved!"
        isServerOnline = true
    }

    private func testServerConnection() {
        isTestingServer = true
        serverTestResult = nil
        Task {
            do {
                _ = try await ApiClient.shared.getHomeVideos(category: nil, page: 1)
                isTestingServer = false
                isServerOnline = true
                serverTestResult = userStore.language == "vi" ? "Kết nối máy chủ thành công (200 OK)" : "Connected successfully (200 OK)"
            } catch {
                isTestingServer = false
                isServerOnline = false
                serverTestResult = error.localizedDescription
            }
        }
    }

    private func loadDevices() {
        isLoadingDevices = true
        Task {
            do {
                let list = try await ApiClient.shared.getDevices()
                self.devices = list
                self.isLoadingDevices = false
            } catch {
                self.isLoadingDevices = false
            }
        }
    }

    private func revokeDevice(_ device: Device) {
        Task {
            do {
                try await ApiClient.shared.removeDevice(id: device.id)
                self.devices.removeAll { $0.id == device.id }
            } catch {
                // handle error
            }
        }
    }

    private func generateRecoveryKey() {
        isGeneratingKey = true
        Task {
            do {
                let key = try await ApiClient.shared.generateRecoveryKey()
                self.generatedRecoveryKey = key
                self.isGeneratingKey = false
            } catch {
                self.isGeneratingKey = false
            }
        }
    }

    private func copyKeyToClipboard(_ key: String) {
        UIPasteboard.general.string = key
        copiedKeyToast = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copiedKeyToast = false
        }
    }

    private func clearCache() {
        URLCache.shared.removeAllCachedResponses()
        showClearedToast = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            showClearedToast = false
        }
    }
}
