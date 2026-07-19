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
    val selectedServer: String = "",
    val servers: List<String> = emptyList(),
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

                val servers = movie.episodes?.map { it.serverName }?.distinct() ?: emptyList()
                val selectedServer = servers.firstOrNull() ?: ""

                _uiState.value = _uiState.value.copy(
                    movie = movie, 
                    isSaved = isSaved,
                    servers = servers,
                    selectedServer = selectedServer,
                    recommendations = recommendations,
                    genres = genres
                )
                loadStream(movie, episode, selectedServer)
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
        val server = _uiState.value.selectedServer
        _uiState.value = _uiState.value.copy(
            currentEpisode = episode,
            isLoading = true,
            source = null,
            error = null
        )
        viewModelScope.launch {
            loadStream(movie, episode, server)
        }
    }

    fun changeServer(server: String) {
        val movie = _uiState.value.movie ?: return
        val episode = _uiState.value.currentEpisode
        _uiState.value = _uiState.value.copy(
            selectedServer = server,
            isLoading = true,
            source = null,
            error = null
        )
        viewModelScope.launch {
            loadStream(movie, episode, server)
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

    private suspend fun loadStream(movie: MovieDetail, episode: Int, serverName: String = "") {
        try {
            val ep = movie.episodes?.find { it.number == episode && (serverName.isEmpty() || it.serverName == serverName) }

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
