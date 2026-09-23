import Foundation
import Security

/// Thread-safe Keychain manager for secure credentials and sensitive session storage.
/// Built directly on top of Apple's Security framework APIs (SecItemAdd, SecItemUpdate, SecItemCopyMatching, SecItemDelete).
public final class KeychainManager: @unchecked Sendable {
    public static let shared = KeychainManager()

    private let service: String
    private let accessGroup: String?
    private let lock = NSLock()

    public init(
        service: String = StorageKeys.keychainService,
        accessGroup: String? = nil
    ) {
        self.service = service
        self.accessGroup = accessGroup
    }

    // MARK: - Core Keychain Operations

    /// Saves raw binary Data to the Keychain. If the item already exists, it updates it.
    @discardableResult
    public func save(data: Data, forKey key: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }

        var query = baseQuery(forKey: key)
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

        let status = SecItemAdd(query as CFDictionary, nil)

        if status == errSecSuccess {
            return true
        } else if status == errSecDuplicateItem {
            // Item already exists, perform update
            let updateQuery = baseQuery(forKey: key)
            let attributesToUpdate: [String: Any] = [
                kSecValueData as String: data,
                kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
            ]
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributesToUpdate as CFDictionary)
            return updateStatus == errSecSuccess
        }

        return false
    }

    /// Retrieves raw binary Data from the Keychain.
    public func getData(forKey key: String) -> Data? {
        lock.lock()
        defer { lock.unlock() }

        var query = baseQuery(forKey: key)
        query[kSecReturnData as String] = kCFBooleanTrue
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        guard status == errSecSuccess, let data = item as? Data else {
            return nil
        }
        return data
    }

    /// Saves a String into the Keychain (UTF-8 encoded).
    @discardableResult
    public func save(string: String, forKey key: String) -> Bool {
        guard let data = string.data(using: .utf8) else { return false }
        return save(data: data, forKey: key)
    }

    /// Retrieves a UTF-8 String from the Keychain.
    public func getString(forKey key: String) -> String? {
        guard let data = getData(forKey: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Saves any Encodable object as JSON Data into the Keychain.
    @discardableResult
    public func save<T: Encodable>(_ item: T, forKey key: String) -> Bool {
        do {
            let data = try JSONEncoder().encode(item)
            return save(data: data, forKey: key)
        } catch {
            return false
        }
    }

    /// Retrieves and decodes any Decodable object from the Keychain.
    public func get<T: Decodable>(forKey key: String, as type: T.Type) -> T? {
        guard let data = getData(forKey: key) else { return nil }
        do {
            return try JSONDecoder().decode(type, from: data)
        } catch {
            return nil
        }
    }

    /// Deletes a specific key from the Keychain.
    @discardableResult
    public func delete(forKey key: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }

        let query = baseQuery(forKey: key)
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    /// Clears all keys stored under this service identifier.
    @discardableResult
    public func clearAll() -> Bool {
        lock.lock()
        defer { lock.unlock() }

        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }

    // MARK: - Query Builder

    private func baseQuery(forKey key: String) -> [String: Any] {
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        if let accessGroup = accessGroup {
            query[kSecAttrAccessGroup as String] = accessGroup
        }
        return query
    }

    // MARK: - Strongly-Typed Convenience Properties

    /// Active JWT authentication token.
    public var authToken: String? {
        get { getString(forKey: StorageKeys.authToken) }
        set {
            if let newValue = newValue, !newValue.isEmpty {
                save(string: newValue, forKey: StorageKeys.authToken)
            } else {
                delete(forKey: StorageKeys.authToken)
            }
        }
    }

    /// Cached backend server URL.
    public var serverUrl: String? {
        get { getString(forKey: StorageKeys.serverUrl) }
        set {
            if let newValue = newValue, !newValue.isEmpty {
                save(string: newValue, forKey: StorageKeys.serverUrl)
            } else {
                delete(forKey: StorageKeys.serverUrl)
            }
        }
    }

    /// Cached user profile object.
    public var userProfile: UserProfile? {
        get { get(forKey: StorageKeys.userProfile, as: UserProfile.self) }
        set {
            if let newValue = newValue {
                save(newValue, forKey: StorageKeys.userProfile)
            } else {
                delete(forKey: StorageKeys.userProfile)
            }
        }
    }
}
