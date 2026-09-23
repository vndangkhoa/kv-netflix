import Foundation
import Combine

@MainActor
public final class AuthViewModel: ObservableObject {
    @Published public private(set) var isAuthenticated: Bool = false
    @Published public private(set) var currentUser: UserProfile?
    @Published public private(set) var isLoading: Bool = false
    @Published public var errorMessage: String?

    private let api = ApiClient.shared
    private let userRepo = UserDataRepository.shared
    private var cancellables = Set<AnyCancellable>()

    public init() {
        setupObservers()
    }

    private func setupObservers() {
        userRepo.$authToken
            .receive(on: DispatchQueue.main)
            .sink { [weak self] token in
                self?.isAuthenticated = token != nil && !(token?.isEmpty ?? true)
            }
            .store(in: &cancellables)

        userRepo.$userProfile
            .receive(on: DispatchQueue.main)
            .sink { [weak self] profile in
                self?.currentUser = profile
            }
            .store(in: &cancellables)
    }

    public func login(email: String, password: String) async -> Bool {
        let cleanEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !cleanEmail.isEmpty else {
            errorMessage = "Email is required"
            return false
        }
        guard !password.isEmpty else {
            errorMessage = "Password is required"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            let res = try await api.login(email: cleanEmail, password: password)
            userRepo.saveAuthData(token: res.token, profile: res.user)
            await userRepo.syncWithRemote()
            isLoading = false
            return true
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func loginWithCode(_ code: String) async -> Bool {
        let cleanCode = code.trimmingCharacters(in: .whitespacesAndNewlines)
        guard cleanCode.count >= 6 else {
            errorMessage = "Please enter a 6-digit code"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            let res = try await api.loginWithCode(code: cleanCode)
            userRepo.saveAuthData(token: res.token, profile: res.user)
            await userRepo.syncWithRemote()
            isLoading = false
            return true
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func register(name: String, email: String, password: String) async -> Bool {
        let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let cleanEmail = email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        guard !cleanName.isEmpty else {
            errorMessage = "Name is required"
            return false
        }
        guard !cleanEmail.isEmpty else {
            errorMessage = "Email is required"
            return false
        }
        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            let res = try await api.register(name: cleanName, email: cleanEmail, password: password)
            userRepo.saveAuthData(token: res.token, profile: res.user)
            await userRepo.syncWithRemote()
            isLoading = false
            return true
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func resetPassword(key: String, newPassword: String) async -> Bool {
        let cleanKey = key.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanKey.isEmpty else {
            errorMessage = "Recovery key is required"
            return false
        }
        guard newPassword.count >= 6 else {
            errorMessage = "New password must be at least 6 characters"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            try await api.resetPassword(key: cleanKey, newPassword: newPassword)
            isLoading = false
            return true
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
            return false
        }
    }

    public func logout() {
        userRepo.clearAuthData()
        errorMessage = nil
    }

    public func clearError() {
        errorMessage = nil
    }
}
