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
    val selectedServer: String = "",
    val isLoading: Boolean = true,
    val error: String? = null
)

class PlayerViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState

    fun loadPlayer(slug: String, episode: Int = 1, server: String? = null) {
        viewModelScope.launch {
            _uiState.value = PlayerUiState(isLoading = true, currentEpisode = episode, selectedServer = server ?: "")
            try {
                val movie = repository.getMovieDetail(slug)
                val activeServer = server ?: movie.episodes?.map { it.displayServerName }?.firstOrNull() ?: ""
                _uiState.value = _uiState.value.copy(movie = movie, selectedServer = activeServer)
                loadStream(movie, episode, activeServer)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load movie details"
                )
            }
        }
    }

    fun changeEpisode(episode: Int, server: String? = null) {
        val movie = _uiState.value.movie ?: return
        val targetServer = server ?: _uiState.value.selectedServer
        _uiState.value = _uiState.value.copy(currentEpisode = episode, selectedServer = targetServer, isLoading = true, source = null)
        viewModelScope.launch {
            loadStream(movie, episode, targetServer)
        }
    }

    fun changeServer(server: String) {
        val movie = _uiState.value.movie ?: return
        val currentEp = _uiState.value.currentEpisode
        _uiState.value = _uiState.value.copy(selectedServer = server, isLoading = true, source = null)
        viewModelScope.launch {
            loadStream(movie, currentEp, server)
        }
    }

    fun saveToHistory(userDataRepository: com.streamflow.tv.data.repository.UserDataRepository) {
        val movie = _uiState.value.movie ?: return
        viewModelScope.launch {
            userDataRepository.addToHistory(movie.toMovie())
            android.util.Log.d("PlayerViewModel", "Movie saved to history: ${movie.title}")
        }
    }

    private suspend fun loadStream(movie: MovieDetail, episode: Int, server: String = "") {
        try {
            val episodes = movie.episodes ?: emptyList()
            val filteredEpisodes = if (server.isNotBlank()) {
                episodes.filter { it.displayServerName.equals(server, ignoreCase = true) }
            } else episodes

            val ep = filteredEpisodes.find { it.number == episode }
                ?: episodes.find { it.number == episode }
                ?: episodes.firstOrNull()

            android.util.Log.d("PlayerViewModel", "Loading stream for slug=${movie.slug} episode=$episode server=$server. Episode: $ep")

            if (ep != null && ep.url.isNotBlank()) {
                val isDirectHls = ep.url.contains(".m3u8", ignoreCase = true) || ep.url.contains("index.m3u8", ignoreCase = true)
                if (isDirectHls) {
                    android.util.Log.d("PlayerViewModel", "Direct HLS URL found: ${ep.url}")
                    _uiState.value = _uiState.value.copy(
                        source = VideoSource(
                            streamUrl = ep.url,
                            resolution = "HD",
                            formatId = "hls",
                            isEmbed = false
                        ),
                        isLoading = false
                    )
                } else {
                    android.util.Log.d("PlayerViewModel", "Extracting or embedding from URL: ${ep.url}")
                    var extractedSource: VideoSource? = null
                    try {
                        extractedSource = repository.extractVideo(ep.url)
                    } catch (e: Exception) {
                        android.util.Log.w("PlayerViewModel", "Extraction error, using WebView embed: ${e.message}")
                    }

                    if (extractedSource != null && extractedSource.streamUrl.contains(".m3u8", ignoreCase = true)) {
                        _uiState.value = _uiState.value.copy(
                            source = extractedSource.copy(isEmbed = false),
                            isLoading = false
                        )
                    } else {
                        // Web Embed Player Fallback
                        _uiState.value = _uiState.value.copy(
                            source = VideoSource(
                                streamUrl = ep.url,
                                resolution = "Embed",
                                formatId = "embed",
                                isEmbed = true
                            ),
                            isLoading = false
                        )
                    }
                }
            } else {
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
