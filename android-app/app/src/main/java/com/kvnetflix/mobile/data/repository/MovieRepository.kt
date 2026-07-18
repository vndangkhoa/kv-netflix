package com.kvnetflix.mobile.data.repository

import com.kvnetflix.mobile.data.api.ApiClient
import com.kvnetflix.mobile.data.model.*

class MovieRepository {

    private val api get() = ApiClient.api

    suspend fun getHomeVideos(category: String? = null, page: Int = 1): HomeResponse {
        val list = api.getHomeVideos(category, page)
        return HomeResponse(items = list, totalPages = 10, currentPage = page)
    }

    suspend fun searchVideos(query: String, page: Int = 1): HomeResponse {
        val list = api.searchVideos(query, page)
        return HomeResponse(items = list, totalPages = 1, currentPage = page)
    }

    suspend fun getMovieDetail(slug: String): MovieDetail {
        val response = api.getMovieDetail(slug)
        return MovieDetail(
            id = response.id,
            title = response.title,
            originalTitle = response.originalTitle,
            slug = response.slug,
            thumbnail = response.thumbnail,
            backdrop = response.backdrop,
            quality = response.quality,
            year = response.year,
            category = response.category,
            description = response.description,
            rating = response.rating,
            duration = response.duration,
            genre = response.genre,
            director = response.director,
            country = response.country,
            cast = response.cast,
            episodes = response.episodes
        )
    }

    suspend fun extractVideo(url: String): VideoSource {
        return api.extractVideo(ExtractRequest(url))
    }

    suspend fun getGenres(): List<Category> {
        return api.getGenres()
    }

    suspend fun getCountries(): List<Category> {
        return api.getCountries()
    }

    suspend fun exploreMovies(): List<Movie> {
        return api.exploreMovies()
    }
}
