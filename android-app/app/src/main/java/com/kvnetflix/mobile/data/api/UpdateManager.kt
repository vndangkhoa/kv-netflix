package com.kvnetflix.mobile.data.api

import android.content.Context
import android.content.Intent
import android.os.Environment
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

class UpdateManager(private val context: Context) {

    suspend fun checkForUpdate(): ReleaseInfo? {
        return withContext(Dispatchers.IO) {
            val currentVersion = context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "1.0.0"

            var candidateRelease: ReleaseInfo? = null

            // 1. Check GitHub API
            try {
                val githubRelease = ReleaseApiClient.gitHubService.getLatestRelease()
                if (isNewerVersion(githubRelease.tagName, currentVersion)) {
                    candidateRelease = githubRelease
                }
            } catch (e: Exception) {
                android.util.Log.w("UpdateManager", "GitHub release check failed: ${e.message}")
            }

            // 2. Check Forgejo API
            try {
                val forgejoReleases = ReleaseApiClient.forgejoService.getReleases()
                val forgejoRelease = forgejoReleases.firstOrNull()
                if (forgejoRelease != null && isNewerVersion(forgejoRelease.tagName, currentVersion)) {
                    if (candidateRelease == null || isNewerVersion(forgejoRelease.tagName, candidateRelease.tagName)) {
                        candidateRelease = forgejoRelease
                    }
                }
            } catch (e: Exception) {
                android.util.Log.w("UpdateManager", "Forgejo release check failed: ${e.message}")
            }

            candidateRelease
        }
    }

    suspend fun downloadAndInstall(release: ReleaseInfo, onProgress: (Float) -> Unit) {
        withContext(Dispatchers.IO) {
            // Find mobile apk asset first, fallback to any apk asset
            val apkAsset = release.assets.find { it.name.contains("mobile", ignoreCase = true) && it.name.endsWith(".apk", ignoreCase = true) }
                ?: release.assets.find { !it.name.contains("tv", ignoreCase = true) && it.name.endsWith(".apk", ignoreCase = true) }
                ?: release.assets.find { it.name.endsWith(".apk", ignoreCase = true) }
            val downloadUrl = apkAsset?.downloadUrl ?: throw Exception("No APK asset found in release")

            val destination = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "kv-netflix-mobile-update.apk")
            if (destination.exists()) destination.delete()

            val client = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .build()

            val request = Request.Builder()
                .url(downloadUrl)
                .header("User-Agent", "kv-netflix-mobile/1.0")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) throw Exception("Download failed with code ${response.code}: ${response.message}")

            val body = response.body ?: throw Exception("Empty response body from server")
            val totalBytes = if (apkAsset.size > 0) apkAsset.size else body.contentLength()
            var downloadedBytes = 0L
            var lastReportedProgress = -1f

            body.byteStream().use { input ->
                FileOutputStream(destination).use { output ->
                    val buffer = ByteArray(65536)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead
                        // Throttle UI updates: only report when progress moves
                        // by >=1% to avoid thousands of recompositions.
                        if (totalBytes > 0) {
                            val progress = (downloadedBytes.toFloat() / totalBytes.toFloat()).coerceIn(0f, 1f)
                            if (progress - lastReportedProgress >= 0.01f || progress >= 1f) {
                                lastReportedProgress = progress
                                onProgress(progress)
                            }
                        } else {
                            onProgress(0.5f)
                        }
                    }
                }
            }

            onProgress(1.0f)
            installApk(destination)
        }
    }

    private fun installApk(file: File) {
        val intent = Intent(Intent.ACTION_VIEW).apply {
            val uri = FileProvider.getUriForFile(context, "${context.packageName}.provider", file)
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }
        context.startActivity(intent)
    }

    companion object {
        fun isNewerVersion(remoteTag: String, currentVersion: String): Boolean {
            val remoteClean = remoteTag.trimStart('v', 'V').trim()
            val currentClean = currentVersion.trimStart('v', 'V').trim()

            val remoteParts = remoteClean.split(".").mapNotNull { it.toIntOrNull() }
            val currentParts = currentClean.split(".").mapNotNull { it.toIntOrNull() }

            val maxLength = maxOf(remoteParts.size, currentParts.size)
            for (i in 0 until maxLength) {
                val r = remoteParts.getOrElse(i) { 0 }
                val c = currentParts.getOrElse(i) { 0 }
                if (r > c) return true
                if (r < c) return false
            }
            return false
        }
    }
}
