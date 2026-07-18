package com.kvnetflix.mobile.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.kvnetflix.mobile.data.model.Movie
import com.kvnetflix.mobile.data.repository.MovieRepository
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class SearchUiState(
    val query: String = "",
    val suggestions: List<Movie> = emptyList(),
    val results: List<Movie> = emptyList(),
    val isLoading: Boolean = false,
    val hasSearched: Boolean = false,
    val showSuggestions: Boolean = false
)

class SearchViewModel : ViewModel() {

    private val repository = MovieRepository()
    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState

    private var searchJob: Job? = null

    fun onQueryChanged(query: String) {
        _uiState.value = _uiState.value.copy(
            query = query,
            hasSearched = false
        )
        searchJob?.cancel()

        if (query.length >= 2) {
            searchJob = viewModelScope.launch {
                delay(300)
                try {
                    val response = repository.searchVideos(query)
                    _uiState.value = _uiState.value.copy(
                        suggestions = response.items.take(8),
                        showSuggestions = true
                    )
                } catch (_: Exception) {}
            }
        } else {
            _uiState.value = _uiState.value.copy(
                suggestions = emptyList(),
                showSuggestions = false
            )
        }
    }

    fun search() {
        val query = _uiState.value.query
        if (query.isBlank()) return
        _uiState.value = _uiState.value.copy(
            isLoading = true,
            hasSearched = true,
            showSuggestions = false,
            results = emptyList()
        )
        viewModelScope.launch {
            try {
                val response = repository.searchVideos(query)
                _uiState.value = _uiState.value.copy(
                    results = response.items,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false)
            }
        }
    }

    fun dismissSuggestions() {
        _uiState.value = _uiState.value.copy(showSuggestions = false)
    }

    fun clearSearch() {
        _uiState.value = SearchUiState()
    }
}
