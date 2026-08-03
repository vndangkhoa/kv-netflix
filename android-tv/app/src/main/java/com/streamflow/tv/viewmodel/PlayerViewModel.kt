package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.MovieDetail
import com.streamflow.tv.data.model.VideoSource
import com.streamflow.tv.data.repository.MovieRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import java.net.URLEncoder

data class PlayerUiState(
    val movie: MovieDetail? = null,
    val source: VideoSource? = null,
    val currentEpisode: Int = 1,
    val selectedServer: String = "",
    val isLoading: Boolean = true,
    val error: String? = null,
    val retryCount: Int = 0
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

    private fun proxyUrl(url: String): String {
        val base = ApiClient.baseUrl.removeSuffix("/")
        val encoded = URLEncoder.encode(url, "UTF-8")
        return "$base/api/stream?url=$encoded"
    }

    private fun extractRealStreamUrl(rawUrl: String): String {
        try {
            if (rawUrl.contains("?url=") || rawUrl.contains("&url=")) {
                val uri = android.net.Uri.parse(rawUrl)
                val paramUrl = uri.getQueryParameter("url")
                if (!paramUrl.isNullOrBlank() && (paramUrl.startsWith("http://") || paramUrl.startsWith("https://"))) {
                    return paramUrl
                }
            }
        } catch (e: Exception) {
            android.util.Log.w("PlayerViewModel", "Error extracting query url parameter", e)
        }
        return rawUrl
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
                val realUrl = extractRealStreamUrl(ep.url)
                val isDirectHls = realUrl.contains(".m3u8", ignoreCase = true)

                if (isDirectHls) {
                    val proxiedUrl = proxyUrl(realUrl)
                    android.util.Log.d("PlayerViewModel", "Direct HLS URL (proxied): $proxiedUrl")
                    _uiState.value = _uiState.value.copy(
                        source = VideoSource(
                            streamUrl = proxiedUrl,
                            resolution = "HD",
                            formatId = "hls",
                            isEmbed = false
                        ),
                        isLoading = false,
                        retryCount = 0
                    )
                } else {
                    android.util.Log.d("PlayerViewModel", "Extracting or embedding from URL: ${ep.url}")
                    var extractedSource: VideoSource? = null
                    try {
                        extractedSource = repository.extractVideo(realUrl)
                    } catch (e: Exception) {
                        android.util.Log.w("PlayerViewModel", "Extraction error, using WebView embed: ${e.message}")
                    }

                    if (extractedSource != null && extractedSource.streamUrl.isNotBlank()) {
                        val streamUrl = extractRealStreamUrl(extractedSource.streamUrl)
                        val isHls = streamUrl.contains(".m3u8", ignoreCase = true)
                        val proxiedUrl = if (isHls || streamUrl.contains("phimmoichill") || streamUrl.contains("ophim") || streamUrl.contains("streamc.xyz")) {
                            proxyUrl(streamUrl)
                        } else {
                            streamUrl
                        }
                        android.util.Log.d("PlayerViewModel", "Extracted stream (proxied): $proxiedUrl")
                        _uiState.value = _uiState.value.copy(
                            source = VideoSource(
                                streamUrl = proxiedUrl,
                                resolution = extractedSource.resolution.ifEmpty { "HD" },
                                formatId = extractedSource.formatId,
                                isEmbed = false
                            ),
                            isLoading = false,
                            retryCount = 0
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
                            isLoading = false,
                            retryCount = 0
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

    fun retryStream() {
        val movie = _uiState.value.movie ?: return
        val episode = _uiState.value.currentEpisode
        val server = _uiState.value.selectedServer
        val retryCount = _uiState.value.retryCount
        _uiState.value = _uiState.value.copy(
            isLoading = true,
            source = null,
            error = null,
            retryCount = retryCount + 1
        )
        viewModelScope.launch {
            loadStream(movie, episode, server)
        }
    }
}
