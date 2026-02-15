package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.MovieDetail
import com.streamflow.tv.data.repository.MovieRepository
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

    fun loadMovie(slug: String) {
        android.util.Log.e("DetailVM", "loadMovie($slug) called")
        viewModelScope.launch {
            _uiState.value = DetailUiState(isLoading = true)
            try {
                val movie = repository.getMovieDetail(slug)
                android.util.Log.e("DetailVM", "loadMovie success: ${movie.title}, episodes: ${movie.episodes?.size}")
                _uiState.value = DetailUiState(movie = movie, isLoading = false)
            } catch (e: Exception) {
                android.util.Log.e("DetailVM", "loadMovie failed", e)
                _uiState.value = DetailUiState(
                    isLoading = false,
                    error = e.message ?: "Failed to load movie details"
                )
            }
        }
    }

    fun toggleMyList(isInList: Boolean) {
        _uiState.value = _uiState.value.copy(isInMyList = !isInList)
    }
}
