package com.kvnetflix.mobile.data.api

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = false)
data class ReleaseAsset(
    val name: String = "",
    @Json(name = "browser_download_url") val downloadUrl: String = "",
    val size: Long = 0L
)

@JsonClass(generateAdapter = false)
data class ReleaseInfo(
    @Json(name = "tag_name") val tagName: String = "",
    val name: String = "",
    val body: String = "",
    val assets: List<ReleaseAsset> = emptyList()
)

interface GitHubService {
    @GET("repos/vndangkhoa/kv-netflix/releases/latest")
    suspend fun getLatestRelease(): ReleaseInfo
}

interface ForgejoService {
    @GET("api/v1/repos/vndangkhoa/kv-netflix/releases?limit=1")
    suspend fun getReleases(): List<ReleaseInfo>
}

object ReleaseApiClient {
    private val moshi = Moshi.Builder().addLast(KotlinJsonAdapterFactory()).build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    val gitHubService: GitHubService by lazy {
        Retrofit.Builder()
            .baseUrl("https://api.github.com/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(GitHubService::class.java)
    }

    val forgejoService: ForgejoService by lazy {
        Retrofit.Builder()
            .baseUrl("https://git.khoavo.myds.me/")
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(ForgejoService::class.java)
    }
}
