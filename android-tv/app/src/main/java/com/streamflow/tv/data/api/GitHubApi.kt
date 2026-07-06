package com.streamflow.tv.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET

@JsonClass(generateAdapter = false)
data class GitHubRelease(
    @Json(name = "tag_name") val tagName: String,
    val assets: List<GitHubAsset>
)

@JsonClass(generateAdapter = false)
data class GitHubAsset(
    val name: String,
    @Json(name = "browser_download_url") val downloadUrl: String,
    val size: Long
)

interface GitHubApi {
    @GET("repos/vndangkhoa/kv-netflix/releases/latest")
    suspend fun getLatestRelease(): GitHubRelease

    companion object {
        private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()

        fun create(): GitHubApi {
            return Retrofit.Builder()
                .baseUrl("https://api.github.com/")
                .addConverterFactory(MoshiConverterFactory.create(moshi))
                .client(OkHttpClient.Builder().build())
                .build()
                .create(GitHubApi::class.java)
        }
    }
}
