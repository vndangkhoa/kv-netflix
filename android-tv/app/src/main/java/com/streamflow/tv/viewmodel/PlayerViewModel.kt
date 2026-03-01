package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.MovieDetail
import com.streamflow.tv.data.model.VideoSource
import com.streamflow.tv.data.repository.MovieRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class PlayerUiState(
    val movie: MovieDetail? = null,
    val source: VideoSource? = null,
    val currentEpisode: Int = 1,
    val isLoading: Boolean = true,
    val error: String? = null
)

class PlayerViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState

    fun loadPlayer(slug: String, episode: Int = 1) {
        viewModelScope.launch {
            _uiState.value = PlayerUiState(isLoading = true, currentEpisode = episode)
            try {
                val movie = repository.getMovieDetail(slug)
                _uiState.value = _uiState.value.copy(movie = movie)
                loadStream(movie, episode)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load"
                )
            }
        }
    }

    fun changeEpisode(episode: Int) {
        val movie = _uiState.value.movie ?: return
        _uiState.value = _uiState.value.copy(currentEpisode = episode, isLoading = true, source = null)
        viewModelScope.launch {
            loadStream(movie, episode)
        }
    }

    fun saveToHistory(userDataRepository: com.streamflow.tv.data.repository.UserDataRepository) {
        val movie = _uiState.value.movie ?: return
        viewModelScope.launch {
            userDataRepository.addToHistory(movie.toMovie())
            android.util.Log.e("PlayerViewModel", "Movie saved to history: ${movie.title}")
        }
    }

    private suspend fun loadStream(movie: MovieDetail, episode: Int) {
        try {
            val ep = movie.episodes?.find { it.number == episode }
            android.util.Log.e("PlayerViewModel", "Loading stream for slug=${movie.slug} episode=$episode. Episode data: $ep")

            if (ep != null && (ep.url.contains(".m3u8") || ep.url.contains("index.m3u8"))) {
                // Direct HLS URL
                android.util.Log.e("PlayerViewModel", "Direct HLS URL found: ${ep.url}")
                _uiState.value = _uiState.value.copy(
                    source = VideoSource(
                        streamUrl = ep.url,
                        resolution = "HD",
                        formatId = "hls"
                    ),
                    isLoading = false
                )
            } else if (ep != null && ep.url.isNotEmpty()) {
                // Non-HLS URL — try to extract via backend
                android.util.Log.e("PlayerViewModel", "Extracting from URL: ${ep.url}")
                val source = repository.extractVideo(ep.url)
                android.util.Log.e("PlayerViewModel", "Extraction successful: $source")
                
                _uiState.value = _uiState.value.copy(
                    source = source,
                    isLoading = false
                )
            } else {
                // No valid episode URL found
                android.util.Log.e("PlayerViewModel", "No stream URL found for episode $episode")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "No stream available for episode $episode"
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("PlayerViewModel", "Error loading stream", e)
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = e.message ?: "Failed to extract stream"
            )
        }
    }
}
