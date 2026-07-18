package com.kvnetflix.mobile.data.api

import com.kvnetflix.mobile.data.model.*
import retrofit2.http.*

interface StreamFlowApi {

    // --- Public Content ---
    @GET("api/videos/home")
    suspend fun getHomeVideos(
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1
    ): List<Movie>

    @GET("api/videos/search")
    suspend fun searchVideos(
        @Query("q") query: String,
        @Query("page") page: Int = 1
    ): List<Movie>

    @GET("api/videos/{slug}")
    suspend fun getMovieDetail(@Path("slug") slug: String): MovieDetailResponse

    @POST("api/extract")
    suspend fun extractVideo(@Body request: ExtractRequest): VideoSource

    @GET("api/categories/genres")
    suspend fun getGenres(): List<Category>

    @GET("api/categories/countries")
    suspend fun getCountries(): List<Category>

    // --- Auth ---
    @POST("api/auth/register")
    suspend fun register(@Body body: Map<String, String>): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @GET("api/auth/me")
    suspend fun getMe(): UserProfile

    // Device pairing
    @POST("api/auth/device/code")
    suspend fun generateDeviceCode(@Body body: Map<String, String>): Map<String, Any>

    @GET("api/auth/device/status")
    suspend fun checkDeviceStatus(@Query("code") code: String): Map<String, Any>

    @POST("api/auth/device/pair")
    suspend fun pairDevice(@Body body: Map<String, String>)

    @POST("api/auth/device/link-login")
    suspend fun loginWithCode(@Body body: Map<String, String>): AuthResponse

    @POST("api/auth/device/link-code")
    suspend fun generateLinkCode(): Map<String, Any>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body body: Map<String, String>): Map<String, Any>

    // --- Account ---
    @GET("api/account/devices")
    suspend fun getDevices(): List<Device>

    @DELETE("api/account/devices")
    suspend fun removeDevice(@Body body: Map<String, Any>)

    @POST("api/account/change-password")
    suspend fun changePassword(@Body body: Map<String, String>): Map<String, Any>

    @POST("api/account/recovery-key")
    suspend fun generateRecoveryKey(): Map<String, Any>

    // --- Explore ---
    @GET("api/videos/explore")
    suspend fun exploreMovies(): List<Movie>

    // --- Sync ---
    @GET("api/sync/saved-movies")
    suspend fun getSavedMovies(): List<RemoteSavedMovie>

    @POST("api/sync/saved-movies")
    suspend fun addSavedMovie(@Body movie: Map<String, Any?>)

    @DELETE("api/sync/saved-movies")
    suspend fun removeSavedMovie(@Query("movie_id") movieId: String)

    @GET("api/sync/watch-history")
    suspend fun getWatchHistory(): List<RemoteWatchHistory>

    @POST("api/sync/watch-history")
    suspend fun updateWatchProgress(@Body movie: Map<String, Any?>)

    @POST("api/sync/bulk")
    suspend fun bulkSync(@Body data: Map<String, List<Movie>>): Map<String, List<Movie>>
}
