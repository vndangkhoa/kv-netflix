package com.streamflow.tv.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = false)
data class Movie(
    val id: String = "",
    val title: String = "",
    @Json(name = "original_title") val originalTitle: String? = null,
    val slug: String = "",
    val thumbnail: String = "",
    val backdrop: String? = null,
    val quality: String? = null,
    val year: Int? = null,
    val category: String = "",
    val time: String? = null,
    val lang: String? = null,
    val director: String? = null,
    val cast: List<String>? = null
)

@JsonClass(generateAdapter = false)
data class MovieDetail(
    val id: String = "",
    val title: String = "",
    @Json(name = "original_title") val originalTitle: String? = null,
    val slug: String = "",
    val thumbnail: String = "",
    val backdrop: String? = null,
    val quality: String? = null,
    val year: Int? = null,
    val category: String = "",
    val description: String = "",
    val rating: String? = null,
    val duration: Int? = null,
    val genre: String? = null,
    val director: String? = null,
    val country: String? = null,
    val cast: List<String>? = null,
    val episodes: List<Episode>? = null
) {
    fun toMovie(): Movie = Movie(
        id = id,
        title = title,
        originalTitle = originalTitle,
        slug = slug,
        thumbnail = thumbnail,
        backdrop = backdrop,
        quality = quality,
        year = year,
        category = category,
        director = director,
        cast = cast
    )
}

@JsonClass(generateAdapter = false)
data class Episode(
    val number: Int = 0,
    val title: String = "",
    val url: String = ""
)

@JsonClass(generateAdapter = false)
data class VideoSource(
    @Json(name = "stream_url") val streamUrl: String = "",
    val resolution: String = "",
    @Json(name = "format_id") val formatId: String = ""
)

@JsonClass(generateAdapter = false)
data class Category(
    val name: String = "",
    val slug: String = ""
)

@JsonClass(generateAdapter = false)
data class HomeResponse(
    val items: List<Movie> = emptyList(),
    val totalPages: Int = 1,
    val currentPage: Int = 1
)

@JsonClass(generateAdapter = false)
data class ExtractRequest(
    val url: String
)

@JsonClass(generateAdapter = false)
data class MovieDetailResponse(
    val id: String = "",
    val title: String = "",
    @Json(name = "original_title") val originalTitle: String? = null,
    val slug: String = "",
    val thumbnail: String = "",
    val backdrop: String? = null,
    val quality: String? = null,
    val year: Int? = null,
    val category: String = "",
    val description: String = "",
    val rating: String? = null,
    val duration: Int? = null,
    val genre: String? = null,
    val director: String? = null,
    val country: String? = null,
    val cast: List<String>? = null,
    val episodes: List<Episode>? = null
)

