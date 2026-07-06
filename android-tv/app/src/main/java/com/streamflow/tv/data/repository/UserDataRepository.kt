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
        private val AUTH_TOKEN_KEY = stringPreferencesKey("auth_token")
        private val USER_PROFILE_KEY = stringPreferencesKey("user_profile")

        private const val MAX_HISTORY = 50
    }

    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()
    private val movieListType = Types.newParameterizedType(List::class.java, Movie::class.java)
    private val movieListAdapter = moshi.adapter<List<Movie>>(movieListType)
    private val userProfileAdapter = moshi.adapter(com.streamflow.tv.data.model.UserProfile::class.java)

    // --- Auth ---

    val authToken: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[AUTH_TOKEN_KEY]
    }

    val userProfile: Flow<com.streamflow.tv.data.model.UserProfile?> = context.dataStore.data.map { prefs ->
        prefs[USER_PROFILE_KEY]?.let { userProfileAdapter.fromJson(it) }
    }

    suspend fun saveAuthData(token: String, profile: com.streamflow.tv.data.model.UserProfile) {
        context.dataStore.edit { prefs ->
            prefs[AUTH_TOKEN_KEY] = token
            prefs[USER_PROFILE_KEY] = userProfileAdapter.toJson(profile)
        }
    }

    suspend fun clearAuthData() {
        context.dataStore.edit { prefs ->
            prefs.remove(AUTH_TOKEN_KEY)
            prefs.remove(USER_PROFILE_KEY)
        }
    }

    // --- Remote Sync ---

    suspend fun syncWithRemote() {
        try {
            val token = com.streamflow.tv.data.api.ApiClient.authToken
            android.util.Log.d("Sync", "Starting remote sync. Token exists: ${token != null}")
            if (token == null) return

            // Pull Saved Movies
            val remoteSaved = com.streamflow.tv.data.api.ApiClient.api.getSavedMovies()
            android.util.Log.d("Sync", "Pulled ${remoteSaved.size} saved movies")
            val savedMovies = remoteSaved.map { it.toMovie() }
            context.dataStore.edit { prefs ->
                prefs[MY_LIST_KEY] = movieListAdapter.toJson(savedMovies)
            }

            // Pull Watch History
            val remoteHistory = com.streamflow.tv.data.api.ApiClient.api.getWatchHistory()
            android.util.Log.d("Sync", "Pulled ${remoteHistory.size} watch history items")
            val watchedMovies = remoteHistory.map { it.toMovie() }
            context.dataStore.edit { prefs ->
                prefs[WATCH_HISTORY_KEY] = movieListAdapter.toJson(watchedMovies)
            }
            android.util.Log.d("Sync", "Remote sync completed successfully")
        } catch (e: Exception) {
            android.util.Log.e("Sync", "Remote sync failed", e)
        }
    }

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
        // Remote push
        try {
            if (com.streamflow.tv.data.api.ApiClient.authToken != null) {
                com.streamflow.tv.data.api.ApiClient.api.addSavedMovie(mapOf(
                    "movie_id" to (if (movie.id.isEmpty()) movie.slug else movie.id),
                    "title" to movie.title,
                    "slug" to movie.slug,
                    "thumbnail" to movie.thumbnail,
                    "backdrop" to movie.backdrop,
                    "year" to movie.year,
                    "category" to movie.category,
                    "quality" to movie.quality
                ))
            }
        } catch (_: Exception) {}
    }

    suspend fun removeFromMyList(slug: String) {
        var movieId = ""
        context.dataStore.edit { prefs ->
            val current = movieListAdapter.fromJson(prefs[MY_LIST_KEY] ?: "[]") ?: emptyList()
            movieId = current.find { it.slug == slug }?.id ?: slug
            prefs[MY_LIST_KEY] = movieListAdapter.toJson(current.filter { it.slug != slug })
        }
        // Remote delete
        try {
            if (com.streamflow.tv.data.api.ApiClient.authToken != null) {
                com.streamflow.tv.data.api.ApiClient.api.removeSavedMovie(movieId)
            }
        } catch (_: Exception) {}
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
        // Remote push
        try {
            if (com.streamflow.tv.data.api.ApiClient.authToken != null) {
                com.streamflow.tv.data.api.ApiClient.api.updateWatchProgress(mapOf(
                    "movie_id" to (if (movie.id.isEmpty()) movie.slug else movie.id),
                    "title" to movie.title,
                    "slug" to movie.slug,
                    "thumbnail" to movie.thumbnail,
                    "backdrop" to movie.backdrop,
                    "year" to movie.year,
                    "category" to movie.category,
                    "quality" to movie.quality,
                    "current_episode" to 1, // Default if not provided
                    "watched_timestamp" to 0,
                    "duration" to 0,
                    "progress" to 0.0
                ))
            }
        } catch (_: Exception) {}
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
