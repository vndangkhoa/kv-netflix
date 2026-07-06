package com.streamflow.tv.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.api.GitHubRelease
import com.streamflow.tv.data.api.UpdateManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

sealed class UpdateUiState {
    object Idle : UpdateUiState()
    object Checking : UpdateUiState()
    data class UpdateAvailable(val release: GitHubRelease) : UpdateUiState()
    object UpToDate : UpdateUiState()
    data class Downloading(val progress: Float) : UpdateUiState()
    data class Error(val message: String) : UpdateUiState()
}

class UpdateViewModel(context: Context) : ViewModel() {
    private val updateManager = UpdateManager(context)

    private val _uiState = MutableStateFlow<UpdateUiState>(UpdateUiState.Idle)
    val uiState: StateFlow<UpdateUiState> = _uiState

    fun checkUpdate() {
        viewModelScope.launch {
            _uiState.value = UpdateUiState.Checking
            val release = updateManager.checkForUpdate()
            if (release != null) {
                _uiState.value = UpdateUiState.UpdateAvailable(release)
            } else {
                _uiState.value = UpdateUiState.UpToDate
            }
        }
    }

    fun startDownload(release: GitHubRelease) {
        val apkAsset = release.assets.find { it.name.endsWith(".apk") }
        if (apkAsset == null) {
            _uiState.value = UpdateUiState.Error("No APK found in release assets")
            return
        }

        viewModelScope.launch {
            try {
                updateManager.downloadAndInstall(apkAsset) { progress ->
                    _uiState.value = UpdateUiState.Downloading(progress)
                }
            } catch (e: Exception) {
                _uiState.value = UpdateUiState.Error(e.message ?: "Download failed")
            }
        }
    }
}
