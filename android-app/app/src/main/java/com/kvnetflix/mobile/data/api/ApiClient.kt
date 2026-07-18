package com.kvnetflix.mobile.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private var _baseUrl: String = "https://nf.khoavo.myds.me/"

    var baseUrl: String
        get() = _baseUrl
        set(value) {
            _baseUrl = if (value.endsWith("/")) value else "$value/"
            synchronized(this) {
                _api = null
            }
        }

    private var _authToken: String? = null
    var authToken: String?
        get() = _authToken
        set(value) {
            _authToken = value
            synchronized(this) {
                _api = null
            }
        }

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val authInterceptor = Interceptor { chain ->
        val original = chain.request()
        val requestBuilder = original.newBuilder()
            .header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )

        _authToken?.let {
            requestBuilder.header("Authorization", "Bearer $it")
        }

        chain.proceed(requestBuilder.build())
    }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(authInterceptor)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
        )
        .build()

    private var _api: StreamFlowApi? = null

    val api: StreamFlowApi
        get() {
            return synchronized(this) {
                if (_api == null) {
                    _api = Retrofit.Builder()
                        .baseUrl(_baseUrl)
                        .client(okHttpClient)
                        .addConverterFactory(MoshiConverterFactory.create(moshi))
                        .build()
                        .create(StreamFlowApi::class.java)
                }
                _api!!
            }
        }

    fun imageProxyUrl(url: String, width: Int = 400): String {
        val base = _baseUrl.removeSuffix("/")
        return "$base/api/images/proxy?url=${java.net.URLEncoder.encode(url, "UTF-8")}&width=$width"
    }
}
