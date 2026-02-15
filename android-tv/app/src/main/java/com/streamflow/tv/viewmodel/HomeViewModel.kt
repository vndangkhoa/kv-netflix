package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.data.repository.MovieRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class HomeUiState(
    val heroMovies: List<Movie> = emptyList(),
    val watchedMovies: List<Movie> = emptyList(),
    val recommendedMovies: List<Movie> = emptyList(),
    val categoryMovies: Map<String, List<Movie>> = emptyMap(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val currentCategory: String? = null
)

class HomeViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    private var userDataRepository: com.streamflow.tv.data.repository.UserDataRepository? = null

    private val categories = listOf(
        "phim-le" to "Phim Lẻ",
        "phim-bo" to "Phim Bộ",
        "hoat-hinh" to "Hoạt Hình",
        "tv-shows" to "TV Shows"
    )

    init {
        loadHome()
    }

    fun loadHome(
        category: String? = null,
        userRepo: com.streamflow.tv.data.repository.UserDataRepository? = null
    ) {
        if (userRepo != null) {
            this.userDataRepository = userRepo
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, currentCategory = category)
            try {
                // Load history if repository is available
                val history = userRepo?.watchHistory?.first() ?: emptyList()

                if (category != null) {
                    // Load single category
                    val response = repository.getHomeVideos(category)
                    _uiState.value = _uiState.value.copy(
                        heroMovies = response.items.take(5),
                        watchedMovies = history,
                        recommendedMovies = response.items.filter { m -> history.none { it.slug == m.slug } }.shuffled().take(10),
                        categoryMovies = mapOf(
                            categories.find { it.first == category }?.second.orEmpty() to response.items
                        ),
                        isLoading = false
                    )
                } else {
                    // Load all categories for home
                    val allMovies = mutableMapOf<String, List<Movie>>()
                    var heroItems = listOf<Movie>()
                    val allFlattened = mutableListOf<Movie>()

                    // 1. Initial categories
                    categories.forEach { (slug, name) ->
                        try {
                            val response = repository.getHomeVideos(slug)
                            allMovies[name] = response.items
                            allFlattened.addAll(response.items)
                            if (heroItems.isEmpty()) {
                                heroItems = response.items.take(5)
                            }
                        } catch (_: Exception) { }
                    }

                    // 2. Fetch Genres
                    try {
                        val genres = repository.getGenres()
                        genres.take(8).forEach { genre ->
                            try {
                                val response = repository.getHomeVideos(genre.slug)
                                if (response.items.isNotEmpty()) {
                                    allMovies["Genre: ${genre.name}"] = response.items
                                    allFlattened.addAll(response.items)
                                }
                            } catch (_: Exception) { }
                        }
                    } catch (_: Exception) { }

                    // 3. Fetch Countries
                    try {
                        val countries = repository.getCountries()
                        countries.take(5).forEach { country ->
                            try {
                                val response = repository.getHomeVideos(country.slug)
                                if (response.items.isNotEmpty()) {
                                    allMovies["Country: ${country.name}"] = response.items
                                    allFlattened.addAll(response.items)
                                }
                            } catch (_: Exception) { }
                        }
                    } catch (_: Exception) { }

                    _uiState.value = _uiState.value.copy(
                        heroMovies = heroItems,
                        watchedMovies = history,
                        recommendedMovies = allFlattened.filter { m -> history.none { it.slug == m.slug } }.distinctBy { it.slug }.shuffled().take(15),
                        categoryMovies = allMovies,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load content"
                )
            }
        }
    }
}
