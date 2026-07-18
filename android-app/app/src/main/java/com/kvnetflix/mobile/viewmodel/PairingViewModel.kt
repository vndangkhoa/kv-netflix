package com.kvnetflix.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class PairingUiState {
    object Idle : PairingUiState()
    object Loading : PairingUiState()
    object Success : PairingUiState()
    data class Error(val message: String) : PairingUiState()
}

class PairingViewModel(private val userDataRepository: UserDataRepository) : ViewModel() {

    private val _uiState = MutableStateFlow<PairingUiState>(PairingUiState.Idle)
    val uiState: StateFlow<PairingUiState> = _uiState.asStateFlow()

    fun loginWithCode(code: String) {
        if (code.length < 6) return

        viewModelScope.launch {
            _uiState.value = PairingUiState.Loading
            try {
                val response = ApiClient.api.loginWithCode(mapOf("code" to code))
                ApiClient.authToken = response.token
                userDataRepository.saveAuthData(response.token, response.user)
                userDataRepository.syncWithRemote()
                _uiState.value = PairingUiState.Success
            } catch (e: retrofit2.HttpException) {
                val errorMsg = when (e.code()) {
                    400 -> "Invalid or expired code."
                    404 -> "Code not found."
                    else -> "Connection error (${e.code()})"
                }
                _uiState.value = PairingUiState.Error(errorMsg)
            } catch (e: Exception) {
                _uiState.value = PairingUiState.Error(e.message ?: "Failed to login")
            }
        }
    }

    fun resetState() {
        _uiState.value = PairingUiState.Idle
    }
}
