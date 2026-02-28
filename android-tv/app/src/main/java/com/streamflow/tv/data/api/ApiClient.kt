package com.streamflow.tv.data.api

import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    // Default base URL for testing
    // Change this to your production API when ready
    // var baseUrl: String = "https://nf.khoavo.myds.me"
    private var _baseUrl: String = "http://10.0.2.2:3478/"
    
    var baseUrl: String
        get() = _baseUrl
        set(value) {
            _baseUrl = if (value.endsWith("/")) value else "$value/"
            synchronized(this) {
                _api = null // Reset to rebuild
            }
        }

    private val moshi: Moshi = Moshi.Builder()
        .addLast(KotlinJsonAdapterFactory())
        .build()

    private val userAgentInterceptor = Interceptor { chain ->
        val request = chain.request().newBuilder()
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
        chain.proceed(request)
    }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .addInterceptor(userAgentInterceptor)
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.HEADERS
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
