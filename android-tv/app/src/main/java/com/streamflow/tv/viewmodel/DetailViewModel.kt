package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.MovieDetail
import com.streamflow.tv.data.repository.MovieRepository
import com.streamflow.tv.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class DetailUiState(
    val movie: MovieDetail? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val isInMyList: Boolean = false,
    val selectedServer: String = ""
)

class DetailViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(DetailUiState())
    val uiState: StateFlow<DetailUiState> = _uiState
    
    private var userDataRepository: UserDataRepository? = null

    fun loadMovie(slug: String, userRepo: UserDataRepository? = null) {
        if (userRepo != null) {
            this.userDataRepository = userRepo
        }
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val movie = repository.getMovieDetail(slug)
                val isInMyList = userDataRepository?.isInMyList(slug) ?: false
                val firstServer = movie.episodes?.mapNotNull { it.serverName.ifBlank { null } }?.firstOrNull() ?: ""
                _uiState.value = _uiState.value.copy(
                    movie = movie, 
                    isLoading = false,
                    isInMyList = isInMyList,
                    selectedServer = firstServer
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load movie details"
                )
            }
        }
    }

    fun selectServer(server: String) {
        _uiState.value = _uiState.value.copy(selectedServer = server)
    }

    fun toggleMyList() {
        val movie = _uiState.value.movie ?: return
        val currentStatus = _uiState.value.isInMyList
        
        viewModelScope.launch {
            if (currentStatus) {
                userDataRepository?.removeFromMyList(movie.slug)
            } else {
                userDataRepository?.addToMyList(movie.toMovie())
            }
            _uiState.value = _uiState.value.copy(isInMyList = !currentStatus)
        }
    }
}
