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
}
