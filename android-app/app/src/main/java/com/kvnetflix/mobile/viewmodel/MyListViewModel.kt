package com.kvnetflix.mobile.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.data.repository.MovieRepository
import com.kvnetflix.mobile.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class MyListUiState(
    val savedMovies: List<Movie> = emptyList(),
    val watchHistory: List<Movie> = emptyList(),
    val exploreMovies: List<Movie> = emptyList(),
    val isLoadingExplore: Boolean = false
)

class MyListViewModel(application: Application) : AndroidViewModel(application) {

    private val userRepo = UserDataRepository(application)
    private val movieRepo = MovieRepository()
    private val _uiState = MutableStateFlow(MyListUiState())
    val uiState: StateFlow<MyListUiState> = _uiState

    init {
        viewModelScope.launch {
            userRepo.myList.collectLatest { list ->
                _uiState.value = _uiState.value.copy(savedMovies = list)
            }
        }
        viewModelScope.launch {
            userRepo.watchHistory.collectLatest { history ->
                _uiState.value = _uiState.value.copy(watchHistory = history)
            }
        }
        loadExplore()
    }

    fun loadExplore() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoadingExplore = true)
            try {
                val movies = movieRepo.exploreMovies()
                _uiState.value = _uiState.value.copy(
                    exploreMovies = movies,
                    isLoadingExplore = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoadingExplore = false)
            }
        }
    }

    fun removeFromMyList(slug: String) {
        viewModelScope.launch { userRepo.removeFromMyList(slug) }
    }

    fun removeFromHistory(slug: String) {
        viewModelScope.launch {
            userRepo.addToHistory(Movie(slug = slug, title = "", thumbnail = "", category = ""))
        }
    }
}
