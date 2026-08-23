package com.kvnetflix.mobile

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.kvnetflix.mobile.data.api.ApiClient

class KvNetflixApp : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        ApiClient.init(this)
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(this.cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.02)
                    .build()
            }
            .respectCacheHeaders(false)
            .build()
    }
}
