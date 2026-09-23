import Foundation
import Combine

public enum PairingState: Equatable {
    case idle
    case loading
    case success
    case error(String)
}

@MainActor
public final class PairingViewModel: ObservableObject {
    @Published public private(set) var state: PairingState = .idle
    @Published public var code: String = ""
    @Published public private(set) var generatedLinkCode: String?
    @Published public private(set) var isGeneratingCode: Bool = false

    private let api = ApiClient.shared
    private let userRepo = UserDataRepository.shared

    public init() {}

    public func loginWithCode(_ codeString: String? = nil) {
        let targetCode = (codeString ?? code).trimmingCharacters(in: .whitespacesAndNewlines)
        guard targetCode.count >= 6 else {
            state = .error("Please enter a valid 6-digit code")
            return
        }

        state = .loading

        Task {
            do {
                let response = try await api.loginWithCode(code: targetCode)
                userRepo.saveAuthData(token: response.token, profile: response.user)
                await userRepo.syncWithRemote()
                self.state = .success
            } catch let nsError as NSError {
                let msg: String
                switch nsError.code {
                case 400: msg = "Invalid or expired pairing code."
                case 404: msg = "Code not found."
                default: msg = nsError.localizedDescription
                }
                self.state = .error(msg)
            }
        }
    }

    public func generateLinkCode() {
        isGeneratingCode = true
        Task {
            do {
                let code = try await userRepo.generateLinkCode()
                self.generatedLinkCode = code
                self.isGeneratingCode = false
            } catch {
                self.isGeneratingCode = false
                self.state = .error("Failed to generate code: \(error.localizedDescription)")
            }
        }
    }

    public func resetState() {
        state = .idle
        code = ""
    }
}
