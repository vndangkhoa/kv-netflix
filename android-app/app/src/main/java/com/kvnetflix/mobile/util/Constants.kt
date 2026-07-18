package com.kvnetflix.mobile.util

object Constants {
    val CATEGORIES = listOf(
        CategoryItem("phim-le", "movies"),
        CategoryItem("phim-bo", "series"),
        CategoryItem("hoat-hinh", "animation"),
        CategoryItem("tv-shows", "tvShows")
    )

    val GENRES = listOf(
        GenreItem("hanh-dong", "Hành Động", "Action"),
        GenreItem("tinh-cam", "Tình Cảm", "Romance"),
        GenreItem("hai-huoc", "Hài Hước", "Comedy"),
        GenreItem("co-trang", "Cổ Trang", "Historical"),
        GenreItem("tam-ly", "Tâm Lý", "Psychological"),
        GenreItem("hinh-su", "Hình Sự", "Crime"),
        GenreItem("chien-tranh", "Chiến Tranh", "War"),
        GenreItem("the-thao", "Thể Thao", "Sports"),
        GenreItem("vo-thuat", "Võ Thuật", "Martial Arts"),
        GenreItem("vien-tuong", "Viễn Tưởng", "Sci-Fi"),
        GenreItem("phieu-luu", "Phiêu Lưu", "Adventure"),
        GenreItem("khoa-hoc", "Khoa Học", "Science"),
        GenreItem("kinh-di", "Kinh Dị", "Horror"),
        GenreItem("am-nhac", "Âm Nhạc", "Music"),
        GenreItem("than-thoai", "Thần Thoại", "Mythology"),
        GenreItem("tai-lieu", "Tài Liệu", "Documentary"),
        GenreItem("gia-dinh", "Gia Đình", "Family"),
        GenreItem("chinh-kich", "Chính Kịch", "Drama"),
        GenreItem("bi-an", "Bí Ẩn", "Mystery"),
        GenreItem("hoc-duong", "Học Đường", "School"),
        GenreItem("kinh-dien", "Kinh Điển", "Classic"),
        GenreItem("phim-18", "Phim 18+", "Adult")
    )
}

data class CategoryItem(
    val id: String,
    val nameKey: String
)

data class GenreItem(
    val id: String,
    val vi: String,
    val en: String
)

fun String.stripHtml(): String {
    return this
        .replace(Regex("<br\\s*/?>"), "\n")
        .replace(Regex("<p[^>]*>"), "\n")
        .replace(Regex("</p>"), "")
        .replace(Regex("<[^>]+>"), "")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&nbsp;", " ")
        .replace(Regex("\n{3,}"), "\n\n")
        .trim()
}
