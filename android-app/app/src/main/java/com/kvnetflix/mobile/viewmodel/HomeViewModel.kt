package com.kvnetflix.mobile.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.Category
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.data.repository.MovieRepository
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

enum class SortOption(val labelEn: String, val labelVi: String) {
    LATEST("Latest", "Mới nhất"),
    MOST_VIEW("Most View", "Xem nhiều"),
    HOT("Hot of the Week", "Hot tuần")
}

data class HomeUiState(
    val heroMovies: List<Movie> = emptyList(),
    val watchedMovies: List<Movie> = emptyList(),
    val myListMovies: List<Movie> = emptyList(),
    val recommendedMovies: List<Movie> = emptyList(),
    val categoryMovies: Map<String, List<Movie>> = emptyMap(),
    val latestMovies: List<Movie> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
    val currentCategory: String? = null,
    val genres: List<Category> = emptyList(),
    val sortOption: SortOption = SortOption.LATEST,
    val allCategoryMovies: List<Movie> = emptyList(),
    val isLoadingAll: Boolean = false
)

class HomeViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    private var userRepo: UserDataRepository? = null

    private val mainCategories = listOf(
        "phim-le" to "Phim Lẻ",
        "phim-bo" to "Phim Bộ",
        "hoat-hinh" to "Hoạt Hình",
        "tv-shows" to "TV Shows"
    )

    private val genreCategories = listOf(
        "hanh-dong" to "Hành Động",
        "tinh-cam" to "Tình Cảm",
        "hai-huoc" to "Hài Hước",
        "vien-tuong" to "Viễn Tưởng",
        "kinh-di" to "Kinh Dị",
        "chinh-kich" to "Chính Kịch",
        "phieu-luu" to "Phiêu Lưu",
        "vo-thuat" to "Võ Thuật",
        "tam-ly" to "Tâm Lý",
        "hinh-su" to "Hình Sự",
        "co-trang" to "Cổ Trang",
        "the-thao" to "Thể Thao",
        "gia-dinh" to "Gia Đình",
        "hoc-duong" to "Học Đường",
        "bi-an" to "Bí Ẩn"
    )

    init {
        loadGenres()
    }

    private fun observeUserData(userRepo: UserDataRepository) {
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

    private fun sortMovies(movies: List<Movie>, option: SortOption): List<Movie> {
        return when (option) {
            SortOption.LATEST -> movies.sortedByDescending { it.year ?: 0 }
            SortOption.MOST_VIEW -> movies.shuffled()
            SortOption.HOT -> movies.shuffled()
        }
    }

    fun setSortOption(option: SortOption) {
        _uiState.value = _uiState.value.copy(
            sortOption = option,
            allCategoryMovies = sortMovies(_uiState.value.allCategoryMovies, option)
        )
    }

    private suspend fun loadAllPagesForCategory(categorySlug: String, maxPages: Int = 10): List<Movie> {
        val allMovies = mutableSetOf<Movie>()
        for (page in 1..maxPages) {
            try {
                val response = repository.getHomeVideos(categorySlug, page)
                if (response.items.isEmpty()) break
                allMovies.addAll(response.items)
            } catch (_: Exception) {
                break
            }
        }
        return allMovies.toList()
    }

    fun loadGenres() {
        viewModelScope.launch {
            try {
                val genres = repository.getGenres()
                _uiState.value = _uiState.value.copy(genres = genres)
            } catch (_: Exception) {}
        }
    }

    fun loadHome(
        category: String? = null,
        userRepo: UserDataRepository? = null
    ) {
        if (userRepo != null && this.userRepo == null) {
            this.userRepo = userRepo
            observeUserData(userRepo)
        }

        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                isLoading = true,
                error = null,
                currentCategory = category,
                isLoadingAll = false,
                allCategoryMovies = emptyList()
            )
            try {
                if (category != null) {
                    _uiState.value = _uiState.value.copy(isLoadingAll = true)
                    val allMovies = loadAllPagesForCategory(category)
                    val sorted = sortMovies(allMovies, _uiState.value.sortOption)
                    _uiState.value = _uiState.value.copy(
                        heroMovies = allMovies.take(5),
                        recommendedMovies = allMovies.shuffled().take(10),
                        latestMovies = allMovies,
                        allCategoryMovies = sorted,
                        isLoading = false,
                        isLoadingAll = false
                    )
                } else {
                    val categoryResults = mainCategories.map { (slug, name) ->
                        async {
                            try {
                                val response = repository.getHomeVideos(slug)
                                Log.d("HomeViewModel", "Loaded $slug: ${response.items.size} items")
                                name to response.items
                            } catch (e: Exception) {
                                Log.e("HomeViewModel", "Failed to load category $slug", e)
                                name to emptyList<Movie>()
                            }
                        }
                    }.awaitAll().toMap().toMutableMap()

                    val genreResults = genreCategories.map { (slug, name) ->
                        async {
                            try {
                                val response = repository.getHomeVideos(slug)
                                Log.d("HomeViewModel", "Loaded genre $slug: ${response.items.size} items")
                                name to response.items
                            } catch (e: Exception) {
                                Log.e("HomeViewModel", "Failed to load genre $slug", e)
                                name to emptyList<Movie>()
                            }
                        }
                    }.awaitAll().toMap()

                    genreResults.forEach { (name, movies) ->
                        if (movies.isNotEmpty()) {
                            categoryResults[name] = movies
                        }
                    }

                    val allFlattened = categoryResults.values.flatten()
                    val heroItemsRaw = mainCategories.firstOrNull()?.let { (slug, name) ->
                        categoryResults[name]?.take(5)
                    } ?: emptyList()
                    var latest = allFlattened.distinctBy { it.slug }

                    Log.d("HomeViewModel", "Total flattened: ${allFlattened.size}, Unique: ${latest.size}")

                    if (latest.isEmpty()) {
                        Log.d("HomeViewModel", "Categories empty, trying general load")
                        try {
                            val generalResponse = repository.getHomeVideos(null)
                            latest = generalResponse.items
                            Log.d("HomeViewModel", "General load: ${latest.size} items")
                        } catch (e: Exception) {
                            Log.e("HomeViewModel", "General load failed", e)
                        }
                    }

                    if (latest.isEmpty()) {
                        _uiState.value = _uiState.value.copy(
                            isLoading = false,
                            error = "No content found from server"
                        )
                    } else {
                        val heroItems = if (heroItemsRaw.isNotEmpty()) heroItemsRaw 
                                      else latest.take(5)

                        _uiState.value = _uiState.value.copy(
                            heroMovies = heroItems,
                            recommendedMovies = latest.shuffled().take(15),
                            latestMovies = latest.take(20),
                            categoryMovies = categoryResults.filter { it.value.isNotEmpty() },
                            isLoading = false
                        )
                    }
                }
            } catch (e: Exception) {
                Log.e("HomeViewModel", "Error loading home", e)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load content"
                )
            }
        }
    }
}
