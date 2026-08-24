# Kotlin / Coroutines
-dontwarn kotlinx.coroutines.**
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# Moshi (reflection-based adapter via KotlinJsonAdapterFactory)
# Keep every @JsonClass model regardless of package - R8 renames fields otherwise
# and KotlinJsonAdapterFactory throws on parse (ReleaseInfo lives in data.api).
-keep @com.squareup.moshi.JsonClass class * { *; }
-keep class com.kvnetflix.mobile.data.model.** { *; }
-keep class kotlin.Metadata { *; }
-keep class com.squareup.moshi.** { *; }
-dontwarn com.squareup.moshi.**

# Coil
-dontwarn coil.**
