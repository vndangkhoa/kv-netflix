package com.kvnetflix.mobile.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.Device
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class AccountUiState(
    val devices: List<Device> = emptyList(),
    val isLoadingDevices: Boolean = false,
    val recoveryKey: String? = null,
    val linkCode: String? = null,
    val message: String? = null,
    val isBusy: Boolean = false
)

class AccountViewModel(application: Application) : AndroidViewModel(application) {

    private val userRepo = UserDataRepository(application)
    private val _uiState = MutableStateFlow(AccountUiState())
    val uiState: StateFlow<AccountUiState> = _uiState

    fun loadDevices() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingDevices = true)
            try {
                val devices = userRepo.getDevices()
                _uiState.value = _uiState.value.copy(
                    devices = devices,
                    isLoadingDevices = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoadingDevices = false)
            }
        }
    }

    fun removeDevice(deviceId: Int) {
        viewModelScope.launch {
            try {
                userRepo.removeDevice(deviceId)
                _uiState.value = _uiState.value.copy(
                    devices = _uiState.value.devices.filter { it.id != deviceId },
                    message = "Device removed"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(message = "Failed to remove device")
            }
        }
    }

    fun changePassword(currentPassword: String, newPassword: String) {
        if (currentPassword.isBlank() || newPassword.isBlank()) {
            _uiState.value = _uiState.value.copy(message = "Both fields are required")
            return
        }
        if (newPassword.length < 6) {
            _uiState.value = _uiState.value.copy(message = "New password must be at least 6 characters")
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBusy = true)
            try {
                userRepo.changePassword(currentPassword, newPassword)
                _uiState.value = _uiState.value.copy(
                    isBusy = false,
                    message = "Password changed"
                )
            } catch (e: Exception) {
                val msg = if (e is retrofit2.HttpException) {
                    e.response()?.errorBody()?.string() ?: e.message()
                } else e.message ?: "Failed to change password"
                _uiState.value = _uiState.value.copy(isBusy = false, message = msg)
            }
        }
    }

    fun generateRecoveryKey() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBusy = true)
            try {
                val result = userRepo.generateRecoveryKey()
                val key = result["key"] as? String
                _uiState.value = _uiState.value.copy(
                    isBusy = false,
                    recoveryKey = key,
                    message = if (key != null) "Recovery key generated" else "Failed to generate key"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isBusy = false,
                    message = e.message ?: "Failed to generate key"
                )
            }
        }
    }

    fun clearRecoveryKey() {
        _uiState.value = _uiState.value.copy(recoveryKey = null)
    }

    fun generateLinkCode() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isBusy = true)
            try {
                val result = userRepo.generateLinkCode()
                val code = result["code"] as? String
                _uiState.value = _uiState.value.copy(
                    isBusy = false,
                    linkCode = code,
                    message = if (code != null) "Pairing code generated" else "Failed to generate code"
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isBusy = false,
                    message = e.message ?: "Failed to generate code"
                )
            }
        }
    }

    fun clearLinkCode() {
        _uiState.value = _uiState.value.copy(linkCode = null)
    }

    fun clearMessage() {
        _uiState.value = _uiState.value.copy(message = null)
    }
}
