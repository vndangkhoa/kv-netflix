package com.streamflow.tv.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.streamflow.tv.data.model.Movie
import com.streamflow.tv.data.repository.UserDataRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

data class MyListUiState(
    val savedMovies: List<Movie> = emptyList(),
    val watchHistory: List<Movie> = emptyList()
)

class MyListViewModel(application: Application) : AndroidViewModel(application) {

    private val userRepo = UserDataRepository(application)
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
    }

    fun addToMyList(movie: Movie) {
        viewModelScope.launch { userRepo.addToMyList(movie) }
    }

    fun removeFromMyList(slug: String) {
        viewModelScope.launch { userRepo.removeFromMyList(slug) }
    }

    fun addToHistory(movie: Movie) {
        viewModelScope.launch { userRepo.addToHistory(movie) }
    }
}
