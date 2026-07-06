package com.streamflow.tv.data.api

import com.streamflow.tv.data.model.*
import retrofit2.http.*

interface StreamFlowApi {

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
    suspend fun getMovieDetail(
        @Path("slug") slug: String
    ): MovieDetailResponse

    @POST("api/extract")
    suspend fun extractVideo(
        @Body request: ExtractRequest
    ): VideoSource

    @GET("api/categories/genres")
    suspend fun getGenres(): List<Category>

    @GET("api/categories/countries")
    suspend fun getCountries(): List<Category>

    @POST("api/auth/device/link-login")
    suspend fun loginWithCode(@Body body: Map<String, String>): AuthResponse

    @GET("api/auth/me")
    suspend fun getMe(): UserProfile

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
