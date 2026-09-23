import SwiftUI
import Combine

public struct DevicePairingView: View {
    public let onDismiss: () -> Void
    public let onPairSuccess: () -> Void

    @State private var modeIndex: Int = 0 // 0: Authorize TV (Enter PIN), 1: Display PIN (Client login)
    @ObservedObject private var userStore = UserDataStore.shared

    // Authorizer Mode state
    @State private var pinDigits: [String] = Array(repeating: "", count: 6)
    @FocusState private var focusedIndex: Int?
    @State private var isSubmittingPair: Bool = false
    @State private var pairError: String? = nil
    @State private var pairSuccess: Bool = false

    // Client Mode state
    @State private var generatedCode: String? = nil
    @State private var remainingSeconds: Int = 300
    @State private var isPolling: Bool = false
    @State private var clientStatusError: String? = nil
    @State private var clientSuccess: Bool = false
    @State private var timerSubscription: AnyCancellable? = nil
    @State private var pollTask: Task<Void, Never>? = nil

    public init(onDismiss: @escaping () -> Void, onPairSuccess: @escaping () -> Void) {
        self.onDismiss = onDismiss
        self.onPairSuccess = onPairSuccess
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                KvColor.darkBg.ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(spacing: 24) {
                        // Segment Picker: Ghép đôi TV / Đăng nhập bằng mã
                        modePicker

                        if modeIndex == 0 {
                            authorizerModeView
                        } else {
                            clientModeView
                        }
                    }
                    .padding(20)
                }
            }
            .navigationTitle(userStore.language == "vi" ? "Ghép đôi thiết bị" : "Device Pairing")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: onDismiss) {
                        Image(systemName: "xmark")
                            .foregroundColor(.white)
                            .font(.system(size: 14, weight: .bold))
                            .padding(8)
                            .background(Color.white.opacity(0.12))
                            .clipShape(Circle())
                    }
                }
            }
        }
        .onDisappear {
            stopPolling()
        }
    }

    // MARK: - Mode Picker
    private var modePicker: some View {
        HStack(spacing: 0) {
            Button(action: {
                withAnimation {
                    modeIndex = 0
                    stopPolling()
                }
            }) {
                Text(userStore.language == "vi" ? "Ghép nối Android TV" : "Pair Android TV")
                    .font(.system(size: 13, weight: modeIndex == 0 ? .bold : .medium))
                    .foregroundColor(modeIndex == 0 ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(modeIndex == 0 ? KvColor.yellow : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }

            Button(action: {
                withAnimation {
                    modeIndex = 1
                    startClientMode()
                }
            }) {
                Text(userStore.language == "vi" ? "Mã đăng nhập thiết bị" : "Device Login Code")
                    .font(.system(size: 13, weight: modeIndex == 1 ? .bold : .medium))
                    .foregroundColor(modeIndex == 1 ? Color(red: 0.1, green: 0.1, blue: 0.14) : KvColor.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(modeIndex == 1 ? KvColor.yellow : Color.clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            }
        }
        .background(KvColor.darkSecondary)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    // MARK: - Mode 1: Authorizer Mode (User enters TV PIN)
    private var authorizerModeView: some View {
        VStack(spacing: 20) {
            Image(systemName: "tv")
                .font(.system(size: 48))
                .foregroundColor(KvColor.yellow)
                .padding(.top, 10)

            VStack(spacing: 6) {
                Text(userStore.language == "vi" ? "Nhập mã ghép nối" : "Enter Pairing Code")
                    .font(.kvTitle2)
                    .foregroundColor(.white)

                Text(
                    userStore.language == "vi"
                        ? "Nhập mã 6 chữ số đang hiển thị trên màn hình Android TV để liên kết tài khoản."
                        : "Enter the 6-digit code shown on your Android TV screen to link your account."
                )
                .font(.kvBody)
                .foregroundColor(KvColor.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
            }

            // 6 PIN Input Boxes
            HStack(spacing: 10) {
                ForEach(0..<6, id: \.self) { index in
                    ZStack {
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(KvColor.darkSecondary)
                            .frame(width: 46, height: 56)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(
                                        focusedIndex == index ? KvColor.yellow : Color.white.opacity(0.12),
                                        lineWidth: focusedIndex == index ? 2 : 1
                                    )
                            )

                        TextField("", text: Binding(
                            get: { pinDigits[index] },
                            set: { newValue in
                                handlePinInput(at: index, value: newValue)
                            }
                        ))
                        .focused($focusedIndex, equals: index)
                        .keyboardType(.numberPad)
                        .multilineTextAlignment(.center)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    }
                }
            }
            .padding(.vertical, 10)

            if let error = pairError {
                HStack(spacing: 6) {
                    Image(systemName: "exclamationmark.circle.fill")
                    Text(error)
                }
                .font(.kvSubheadline)
                .foregroundColor(Color.red)
            }

            if pairSuccess {
                HStack(spacing: 8) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(KvColor.greenMatch)
                    Text(userStore.language == "vi" ? "Ghép đôi thành công!" : "Paired Successfully!")
                        .foregroundColor(KvColor.greenMatch)
                        .font(.kvHeadline)
                }
                .padding(.vertical, 8)
            }

            // Submit Button
            Button(action: submitPairCode) {
                HStack(spacing: 8) {
                    if isSubmittingPair {
                        ProgressView().tint(Color(red: 0.1, green: 0.1, blue: 0.14))
                    }
                    Text(userStore.language == "vi" ? "Xác nhận liên kết" : "Confirm Pairing")
                        .font(.kvHeadline)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(isPinComplete ? KvColor.yellow : Color.gray.opacity(0.3))
                .foregroundColor(Color(red: 0.1, green: 0.1, blue: 0.14))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(!isPinComplete || isSubmittingPair)
            .padding(.top, 10)
        }
        .padding(20)
        .background(KvColor.darkElevated)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var isPinComplete: Bool {
        pinDigits.allSatisfy { !$0.isEmpty }
    }

    private func handlePinInput(at index: Int, value: String) {
        let clean = value.filter { $0.isNumber }
        if clean.isEmpty {
            pinDigits[index] = ""
            if index > 0 {
                focusedIndex = index - 1
            }
        } else {
            let lastChar = String(clean.suffix(1))
            pinDigits[index] = lastChar
            if index < 5 {
                focusedIndex = index + 1
            } else {
                focusedIndex = nil
                submitPairCode()
            }
        }
    }

    private func submitPairCode() {
        let code = pinDigits.joined()
        guard code.count == 6 else { return }

        isSubmittingPair = true
        pairError = nil

        Task {
            do {
                try await ApiClient.shared.pairDevice(code: code)
                self.isSubmittingPair = false
                self.pairSuccess = true

                // Auto-dismiss on success after delay
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                onPairSuccess()
                onDismiss()
            } catch {
                self.isSubmittingPair = false
                self.pairError = error.localizedDescription
            }
        }
    }

    // MARK: - Mode 2: Client Mode (Display 6-digit PIN & poll status)
    private var clientModeView: some View {
        VStack(spacing: 20) {
            Image(systemName: "iphone.and.arrow.forward")
                .font(.system(size: 46))
                .foregroundColor(KvColor.yellow)
                .padding(.top, 10)

            VStack(spacing: 6) {
                Text(userStore.language == "vi" ? "Đăng nhập nhanh" : "Fast Device Login")
                    .font(.kvTitle2)
                    .foregroundColor(.white)

                Text(
                    userStore.language == "vi"
                        ? "Mở KV-Netflix trên thiết bị đã đăng nhập, vào Cài đặt -> Ghép đôi thiết bị và nhập mã này:"
                        : "Open KV-Netflix on an authorized device, go to Settings -> Pair Device and enter this code:"
                )
                .font(.kvBody)
                .foregroundColor(KvColor.textMuted)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 16)
            }

            if let code = generatedCode {
                // Large 6-digit display
                HStack(spacing: 8) {
                    ForEach(Array(code), id: \.self) { char in
                        Text(String(char))
                            .font(.system(size: 34, weight: .black, design: .rounded))
                            .foregroundColor(KvColor.yellow)
                            .frame(width: 44, height: 60)
                            .background(KvColor.darkSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(KvColor.borderGold, lineWidth: 1)
                            )
                    }
                }
                .padding(.vertical, 8)

                // Countdown Timer & Polling Indicator
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                        .tint(KvColor.yellow)
                    Text(
                        userStore.language == "vi"
                            ? "Đang chờ xác nhận... Hết hạn trong \(formatTimer(remainingSeconds))"
                            : "Waiting for pair... Expires in \(formatTimer(remainingSeconds))"
                    )
                    .font(.kvCaption)
                    .foregroundColor(KvColor.textMuted)
                }

                if clientSuccess {
                    HStack(spacing: 8) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(KvColor.greenMatch)
                        Text(userStore.language == "vi" ? "Đăng nhập thành công!" : "Logged In!")
                            .foregroundColor(KvColor.greenMatch)
                            .font(.kvHeadline)
                    }
                }
            } else {
                ProgressView().tint(KvColor.yellow)
                    .padding(.vertical, 30)
            }

            // Refresh Code Button
            Button(action: startClientMode) {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.clockwise")
                    Text(userStore.language == "vi" ? "Tạo mã mới" : "Generate New Code")
                }
                .font(.kvSubheadline)
                .foregroundColor(KvColor.yellow)
            }
            .padding(.top, 6)
        }
        .padding(20)
        .background(KvColor.darkElevated)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func formatTimer(_ secs: Int) -> String {
        let m = secs / 60
        let s = secs % 60
        return String(format: "%02d:%02d", m, s)
    }

    private func startClientMode() {
        stopPolling()
        Task {
            do {
                let resp = try await ApiClient.shared.generateDeviceCode(deviceName: "iOS Companion")
                self.generatedCode = resp.code
                self.remainingSeconds = 300
                self.startCountdown()
                self.startPolling(code: resp.code)
            } catch {
                self.clientStatusError = error.localizedDescription
            }
        }
    }

    private func startCountdown() {
        timerSubscription = Timer.publish(every: 1.0, on: .main, in: .common)
            .autoconnect()
            .sink { _ in
                if remainingSeconds > 0 {
                    remainingSeconds -= 1
                } else {
                    stopPolling()
                }
            }
    }

    private func startPolling(code: String) {
        pollTask = Task {
            while !Task.isCancelled && remainingSeconds > 0 {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                guard !Task.isCancelled else { break }

                do {
                    let statusResp = try await ApiClient.shared.checkDeviceStatus(code: code)
                    if statusResp.status == "paired", let token = statusResp.token {
                        // User paired on authorizer!
                        let user = statusResp.user ?? UserProfile(id: 1, name: "KV User", email: "")
                        await MainActor.run {
                            userStore.saveAuth(token: token, user: user)
                            clientSuccess = true
                        }
                        try? await Task.sleep(nanoseconds: 1_200_000_000)
                        onPairSuccess()
                        onDismiss()
                        break
                    }
                } catch {
                    // Continue polling next cycle
                }
            }
        }
    }

    private func stopPolling() {
        timerSubscription?.cancel()
        timerSubscription = nil
        pollTask?.cancel()
        pollTask = nil
    }
}
