package com.streamflow.tv.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.data.repository.MovieRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.launch

data class HomeUiState(
    val heroMovies: List<Movie> = emptyList(),
    val top10Movies: List<Movie> = emptyList(),
    val watchedMovies: List<Movie> = emptyList(),
    val myListMovies: List<Movie> = emptyList(),
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
        "phim-le" to "Phim Lẻ Mới Nhất",
        "phim-bo" to "Phim Bộ Nổi Bật",
        "hoat-hinh" to "Hoạt Hình Anime",
        "tv-shows" to "TV Shows Hot",
        "phim-chieu-rap" to "Phim Chiếu Rạp",
        "phim-vietsub" to "Phim Thuyết Minh"
    )

    init {
        loadHome()
    }

    private fun observeUserData(userRepo: com.streamflow.tv.data.repository.UserDataRepository) {
        viewModelScope.launch {
            userRepo.watchHistory.collect { history ->
                _uiState.value = _uiState.value.copy(watchedMovies = history)
            }
        }
        viewModelScope.launch {
            userRepo.myList.collect { list ->
                _uiState.value = _uiState.value.copy(myListMovies = list)
            }
        }
    }

    fun loadHome(
        category: String? = null,
        userRepo: com.streamflow.tv.data.repository.UserDataRepository? = null
    ) {
        if (userRepo != null && this.userDataRepository == null) {
            this.userDataRepository = userRepo
            observeUserData(userRepo)
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null, currentCategory = category)
            try {
                if (category != null) {
                    // Load single category
                    val response = repository.getHomeVideos(category)
                    val items = response.items
                    _uiState.value = _uiState.value.copy(
                        heroMovies = items.take(5),
                        top10Movies = items.take(10),
                        recommendedMovies = items.take(15).shuffled(),
                        categoryMovies = mapOf(
                            categories.find { it.first == category }?.second.orEmpty().ifBlank { category } to items
                        ),
                        isLoading = false
                    )
                } else {
                    // Load all categories for home
                    val allMovies = java.util.Collections.synchronizedMap(LinkedHashMap<String, List<Movie>>())
                    val allFlattened = java.util.Collections.synchronizedList(mutableListOf<Movie>())

                    kotlinx.coroutines.coroutineScope {
                        val categoryTasks = categories.map { (slug, name) ->
                            async {
                                try {
                                    val response = repository.getHomeVideos(slug)
                                    if (response.items.isNotEmpty()) {
                                        allMovies[name] = response.items.take(15)
                                        allFlattened.addAll(response.items.take(15))
                                    }
                                    response.items
                                } catch (_: Exception) { emptyList<Movie>() }
                            }
                        }

                        categoryTasks.awaitAll()
                    }

                    val distinctAll = allFlattened.distinctBy { it.slug }
                    val heroItems = distinctAll.take(5)
                    val top10Items = distinctAll.take(10)

                    _uiState.value = _uiState.value.copy(
                        heroMovies = heroItems,
                        top10Movies = top10Items,
                        recommendedMovies = distinctAll.shuffled().take(15),
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
