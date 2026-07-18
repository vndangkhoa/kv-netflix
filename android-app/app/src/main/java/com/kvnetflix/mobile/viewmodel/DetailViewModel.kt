package com.kvnetflix.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.MovieDetail
import com.kvnetflix.mobile.data.repository.MovieRepository
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class DetailUiState(
    val movie: MovieDetail? = null,
    val isLoading: Boolean = true,
    val error: String? = null,
    val isInMyList: Boolean = false
)

class DetailViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(DetailUiState())
    val uiState: StateFlow<DetailUiState> = _uiState

    private var userRepo: UserDataRepository? = null

    fun loadMovie(slug: String, userRepo: UserDataRepository? = null) {
        if (userRepo != null) this.userRepo = userRepo

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val movie = repository.getMovieDetail(slug)
                val isInMyList = this@DetailViewModel.userRepo?.isInMyList(slug) ?: false
                _uiState.value = _uiState.value.copy(
                    movie = movie,
                    isLoading = false,
                    isInMyList = isInMyList
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load movie details"
                )
            }
        }
    }

    fun toggleMyList() {
        val movie = _uiState.value.movie ?: return
        val currentStatus = _uiState.value.isInMyList

        viewModelScope.launch {
            if (currentStatus) {
                userRepo?.removeFromMyList(movie.slug)
            } else {
                userRepo?.addToMyList(movie.toMovie())
            }
            _uiState.value = _uiState.value.copy(isInMyList = !currentStatus)
        }
    }
}
