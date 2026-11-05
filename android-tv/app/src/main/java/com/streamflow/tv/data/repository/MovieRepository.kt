package com.streamflow.tv.data.repository

import com.streamflow.tv.data.api.ApiClient
import com.streamflow.tv.data.model.*
import java.util.concurrent.ConcurrentHashMap

class MovieRepository {

    private val api get() = ApiClient.api

    companion object {
        // High-speed In-Memory Cache for Instant (0ms) Episode & Detail Switching
        private val detailCache = ConcurrentHashMap<String, MovieDetail>()
        private val streamCache = ConcurrentHashMap<String, VideoSource>()

        fun cacheMovieDetail(detail: MovieDetail) {
            detailCache[detail.slug] = detail
        }

        fun getCachedMovieDetail(slug: String): MovieDetail? = detailCache[slug]

        fun clearCache() {
            detailCache.clear()
            streamCache.clear()
        }
    }

    suspend fun getHomeVideos(category: String? = null, page: Int = 1): HomeResponse {
        val list = api.getHomeVideos(category, page)
        android.util.Log.d("MovieRepo", "getHomeVideos($category): Received ${list.size} items")
        return HomeResponse(items = list, totalPages = 10, currentPage = page)
    }

    suspend fun searchVideos(query: String, page: Int = 1): HomeResponse {
        val list = api.searchVideos(query, page)
        android.util.Log.d("MovieRepo", "searchVideos($query): Received ${list.size} items")
        return HomeResponse(items = list, totalPages = 1, currentPage = page)
    }

    suspend fun getMovieDetail(slug: String, forceRefresh: Boolean = false): MovieDetail {
        if (!forceRefresh) {
            detailCache[slug]?.let { cached ->
                android.util.Log.d("MovieRepo", "getMovieDetail($slug): Instant cache hit (0ms)")
                return cached
            }
        }

        val response = api.getMovieDetail(slug)
        val episodes = response.episodes ?: emptyList()

        val detail = MovieDetail(
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
            episodes = episodes
        )
        detailCache[slug] = detail
        return detail
    }

    suspend fun extractVideo(url: String): VideoSource {
        streamCache[url]?.let { cached ->
            android.util.Log.d("MovieRepo", "extractVideo($url): Instant cache hit (0ms)")
            return cached
        }

        val source = api.extractVideo(ExtractRequest(url))
        if (source.streamUrl.isNotBlank()) {
            streamCache[url] = source
        }
        return source
    }

    suspend fun getGenres(): List<Category> {
        return api.getGenres()
    }

    suspend fun getCountries(): List<Category> {
        return api.getCountries()
    }
}
