package com.streamflow.tv.data.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import com.streamflow.tv.data.model.Movie
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_data")

class UserDataRepository(private val context: Context) {

    companion object {
        private val MY_LIST_KEY = stringPreferencesKey("my_list")
        private val WATCH_HISTORY_KEY = stringPreferencesKey("watch_history")
        private val THEME_KEY = stringPreferencesKey("theme")
        private val SERVER_URL_KEY = stringPreferencesKey("server_url")

        private const val MAX_HISTORY = 50
    }

    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val movieListType = Types.newParameterizedType(List::class.java, Movie::class.java)
    private val movieListAdapter = moshi.adapter<List<Movie>>(movieListType)

    // --- My List ---

    val myList: Flow<List<Movie>> = context.dataStore.data.map { prefs ->
        val json = prefs[MY_LIST_KEY] ?: "[]"
        movieListAdapter.fromJson(json) ?: emptyList()
    }

    suspend fun addToMyList(movie: Movie) {
        context.dataStore.edit { prefs ->
            val current = movieListAdapter.fromJson(prefs[MY_LIST_KEY] ?: "[]") ?: emptyList()
            if (current.none { it.slug == movie.slug }) {
                prefs[MY_LIST_KEY] = movieListAdapter.toJson(current + movie)
            }
        }
    }

    suspend fun removeFromMyList(slug: String) {
        context.dataStore.edit { prefs ->
            val current = movieListAdapter.fromJson(prefs[MY_LIST_KEY] ?: "[]") ?: emptyList()
            prefs[MY_LIST_KEY] = movieListAdapter.toJson(current.filter { it.slug != slug })
        }
    }

    suspend fun isInMyList(slug: String): Boolean {
        var found = false
        context.dataStore.edit { prefs ->
            val current = movieListAdapter.fromJson(prefs[MY_LIST_KEY] ?: "[]") ?: emptyList()
            found = current.any { it.slug == slug }
        }
        return found
    }

    // --- Watch History ---

    val watchHistory: Flow<List<Movie>> = context.dataStore.data.map { prefs ->
        val json = prefs[WATCH_HISTORY_KEY] ?: "[]"
        movieListAdapter.fromJson(json) ?: emptyList()
    }

    suspend fun addToHistory(movie: Movie) {
        context.dataStore.edit { prefs ->
            val current = movieListAdapter.fromJson(prefs[WATCH_HISTORY_KEY] ?: "[]")?.toMutableList() ?: mutableListOf()
            current.removeAll { it.slug == movie.slug }
            current.add(0, movie) // Most recent first
            val trimmed = current.take(MAX_HISTORY)
            prefs[WATCH_HISTORY_KEY] = movieListAdapter.toJson(trimmed)
        }
    }

    // --- Theme ---

    val theme: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[THEME_KEY] ?: "default"
    }

    suspend fun setTheme(theme: String) {
        context.dataStore.edit { prefs ->
            prefs[THEME_KEY] = theme
        }
    }

    // --- Server URL ---

    val serverUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[SERVER_URL_KEY] ?: "https://nf.khoavo.myds.me"
    }

    suspend fun setServerUrl(url: String) {
        context.dataStore.edit { prefs ->
            prefs[SERVER_URL_KEY] = url
        }
    }
}
