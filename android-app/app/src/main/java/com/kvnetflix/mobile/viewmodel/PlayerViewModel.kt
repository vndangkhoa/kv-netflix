package com.kvnetflix.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.MovieDetail
import com.kvnetflix.mobile.data.model.VideoSource
import com.kvnetflix.mobile.data.repository.MovieRepository
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class PlayerUiState(
    val movie: MovieDetail? = null,
    val source: VideoSource? = null,
    val currentEpisode: Int = 1,
    val isLoading: Boolean = true,
    val isSaved: Boolean = false,
    val error: String? = null,
    val savedPosition: Long = 0L,
    val recommendations: List<com.kvnetflix.mobile.data.model.Movie> = emptyList(),
    val genres: List<com.kvnetflix.mobile.data.model.Category> = emptyList()
)

class PlayerViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState

    fun loadPlayer(slug: String, episode: Int = 1, userRepo: UserDataRepository? = null) {
        viewModelScope.launch {
            _uiState.value = PlayerUiState(isLoading = true, currentEpisode = episode)
            try {
                val movie = repository.getMovieDetail(slug)
                val isSaved = userRepo?.isInMyList(slug) ?: false
                
                // Load recommendations and genres in parallel
                var recommendations = try { repository.exploreMovies() } catch (e: Exception) { emptyList() }
                if (recommendations.isEmpty()) {
                    recommendations = try { repository.getHomeVideos().items.take(10) } catch (e: Exception) { emptyList() }
                }
                val genres = try { repository.getGenres() } catch (e: Exception) { emptyList() }

                _uiState.value = _uiState.value.copy(
                    movie = movie, 
                    isSaved = isSaved,
                    recommendations = recommendations,
                    genres = genres
                )
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
        _uiState.value = _uiState.value.copy(
            currentEpisode = episode,
            isLoading = true,
            source = null,
            error = null
        )
        viewModelScope.launch {
            loadStream(movie, episode)
        }
    }

    fun toggleMyList(userDataRepository: UserDataRepository) {
        val movie = _uiState.value.movie ?: return
        viewModelScope.launch {
            if (_uiState.value.isSaved) {
                userDataRepository.removeFromMyList(movie.slug)
                _uiState.value = _uiState.value.copy(isSaved = false)
            } else {
                userDataRepository.addToMyList(movie.toMovie())
                _uiState.value = _uiState.value.copy(isSaved = true)
            }
        }
    }

    fun saveToHistory(userDataRepository: UserDataRepository) {
        val movie = _uiState.value.movie ?: return
        viewModelScope.launch {
            userDataRepository.addToHistory(movie.toMovie())
        }
    }

    private suspend fun loadStream(movie: MovieDetail, episode: Int) {
        try {
            val ep = movie.episodes?.find { it.number == episode }

            if (ep != null && (ep.url.contains(".m3u8") || ep.url.contains("index.m3u8"))) {
                _uiState.value = _uiState.value.copy(
                    source = VideoSource(
                        streamUrl = ep.url,
                        resolution = "HD",
                        formatId = "hls"
                    ),
                    isLoading = false
                )
            } else if (ep != null && ep.url.isNotEmpty()) {
                val source = repository.extractVideo(ep.url)
                _uiState.value = _uiState.value.copy(
                    source = source,
                    isLoading = false
                )
            } else {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = "No stream available for episode $episode"
                )
            }
        } catch (e: Exception) {
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                error = e.message ?: "Failed to extract stream"
            )
        }
    }
}
