package com.streamflow.tv.data.api

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream

class UpdateManager(private val context: Context) {

    private val gitHubApi = GitHubApi.create()

    suspend fun checkForUpdate(): GitHubRelease? {
        return try {
            val latest = gitHubApi.getLatestRelease()
            val currentVersion = "v" + context.packageManager.getPackageInfo(context.packageName, 0).versionName
            if (latest.tagName != currentVersion) {
                latest
            } else {
                null
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    suspend fun downloadAndInstall(asset: GitHubAsset, onProgress: (Float) -> Unit) {
        withContext(Dispatchers.IO) {
            val destination = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk")
            if (destination.exists()) destination.delete()

            val client = OkHttpClient()
            val request = Request.Builder().url(asset.downloadUrl).build()
            val response = client.newCall(request).execute()

            if (!response.isSuccessful) throw Exception("Download failed: ${response.message}")

            val body = response.body ?: throw Exception("Empty response body")
            val totalBytes = asset.size
            var downloadedBytes = 0L

            body.byteStream().use { input ->
                FileOutputStream(destination).use { output ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloadedBytes += bytesRead
                        onProgress(downloadedBytes.toFloat() / totalBytes.toFloat())
                    }
                }
            }

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
}
