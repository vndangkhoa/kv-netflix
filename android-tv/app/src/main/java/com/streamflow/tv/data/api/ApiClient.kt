package com.streamflow.tv.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    // Production server on Synology NAS
    var baseUrl: String = "https://nf.khoavo.myds.me/"
        set(value) {
            field = if (value.endsWith("/")) value else "$value/"
            _api = null // Reset to rebuild
        }

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }
        )
        .build()

    private var _api: StreamFlowApi? = null

    val api: StreamFlowApi
        get() {
            if (_api == null) {
                _api = Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .client(okHttpClient)
                    .addConverterFactory(MoshiConverterFactory.create(moshi))
                    .build()
                    .create(StreamFlowApi::class.java)
            }
            return _api!!
        }

    fun imageProxyUrl(url: String, width: Int = 400): String {
        return "${baseUrl}api/images/proxy?url=${java.net.URLEncoder.encode(url, "UTF-8")}&width=$width"
    }
}
