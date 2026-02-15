# ProGuard rules for StreamFlow TV

# Moshi
-keep class com.streamflow.tv.data.model.** { *; }
-keepclassmembers class com.streamflow.tv.data.model.** { *; }

# Retrofit
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepattributes Signature
-keepattributes Exceptions

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
