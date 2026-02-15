package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.data.repository.MovieRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
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
                    val allMovies = java.util.Collections.synchronizedMap(mutableMapOf<String, List<Movie>>())
                    val allFlattened = java.util.Collections.synchronizedList(mutableListOf<Movie>())

                    kotlinx.coroutines.coroutineScope {
                        // 1. Initial categories
                        val categoryTasks = categories.map { (slug, name) ->
                            async {
                                try {
                                    val response = repository.getHomeVideos(slug)
                                    allMovies[name] = response.items
                                    allFlattened.addAll(response.items)
                                    response.items
                                } catch (_: Exception) { emptyList<Movie>() }
                            }
                        }

                        // 2. Fetch Genres & Countries metadata in parallel
                        val genresDeferred = async { try { repository.getGenres().take(8) } catch (_: Exception) { emptyList() } }
                        val countriesDeferred = async { try { repository.getCountries().take(5) } catch (_: Exception) { emptyList() } }

                        val genres = genresDeferred.await()
                        val countries = countriesDeferred.await()

                        // 3. Fetch Genre and Country content in parallel
                        val genreTasks = genres.map { genre ->
                            async {
                                try {
                                    val response = repository.getHomeVideos(genre.slug)
                                    if (response.items.isNotEmpty()) {
                                        allMovies["Genre: ${genre.name}"] = response.items
                                        allFlattened.addAll(response.items)
                                    }
                                } catch (_: Exception) { }
                            }
                        }

                        val countryTasks = countries.map { country ->
                            async {
                                try {
                                    val response = repository.getHomeVideos(country.slug)
                                    if (response.items.isNotEmpty()) {
                                        allMovies["Country: ${country.name}"] = response.items
                                        allFlattened.addAll(response.items)
                                    }
                                } catch (_: Exception) { }
                            }
                        }

                        // Wait for everything
                        categoryTasks.awaitAll()
                        genreTasks.awaitAll()
                        countryTasks.awaitAll()
                    }

                    val heroItems = allMovies[categories.first().second]?.take(5) ?: emptyList()

                    _uiState.value = _uiState.value.copy(
                        heroMovies = heroItems,
                        watchedMovies = history,
                        recommendedMovies = allFlattened.filter { m -> history.none { it.slug == m.slug } }
                            .distinctBy { it.slug }.shuffled().take(15),
                        categoryMovies = allMovies.toMap(),
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
