export type Lang = 'vi' | 'en';

export interface Translations {
    // Navbar
    searchPlaceholder: string;
    login: string;
    register: string;
    myAccount: string;
    logout: string;
    pairDevice: string;

    // Home
    home: string;
    movies: string;
    series: string;
    animation: string;
    tvShows: string;
    koreanDrama: string;
    chineseDrama: string;
    upcoming: string;
    nowShowing: string;
    continueWatching: string;
    viewAll: string;
    myList: string;
    director: string;
    castMember: string;
    latestUpdates: string;
    noResults: string;
    quality: string;
    inList: string;

    // Login promo banner
    loginPromoTitle: string;
    loginPromoDesc: string;
    featWatchProgress: string;
    featFavorite: string;
    featSync: string;
    featList: string;

    // Community charts
    chartTrending: string;
    chartFavorite: string;
    chartHotGenre: string;
    viewMore: string;

    // FAQ
    faqTitle: string;
    faqSubtitle: string;
    faqFreeQ: string;
    faqFreeA: string;
    faqUpdateQ: string;
    faqUpdateA: string;
    faqQualityQ: string;
    faqQualityA: string;
    faqDeviceQ: string;
    faqDeviceA: string;
    faqServerQ: string;
    faqServerA: string;
    faqSeekQ: string;
    faqSeekA: string;
    faqTheaterQ: string;
    faqTheaterA: string;
    faqDubQ: string;
    faqDubA: string;
    faqAnimeQ: string;
    faqAnimeA: string;
    faqSpeedQ: string;
    faqSpeedA: string;

    // My List / Account
    explore: string;
    history: string;
    savedMovies: string;
    account: string;
    noSavedMovies: string;
    noWatchHistory: string;
    savedMoviesHint: string;
    watchHistoryHint: string;
    signInToSync: string;
    signInToExplore: string;
    noWatchHistoryYet: string;
    startWatchingHint: string;

    // Account Settings
    connectedDevices: string;
    noDevices: string;
    loading: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    passwordMinHint: string;
    changePasswordBtn: string;
    changing: string;
    passwordChanged: string;
    passwordMismatch: string;
    fillAllFields: string;
    passwordMinLength: string;
    passwordChangeFailed: string;
    recoverAccount: string;
    recoverDescription: string;
    saveKeySafely: string;
    generateKey: string;
    generating: string;
    generateNewKey: string;
    createRecoveryKey: string;
    keyGeneratedError: string;

    // Auth modals
    email: string;
    password: string;
    name: string;
    noAccount: string;
    hasAccount: string;
    registerBtn: string;
    loginBtn: string;
    registering: string;
    loggingIn: string;
    enterPairCode: string;
    pairCodePlaceholder: string;
    pairBtn: string;
    pairing: string;
    forgotPassword: string;
    loginWithCode: string;

    // Device Login
    scanQR: string;
    enterCodeOnPC: string;
    waitingForPair: string;
    devicePaired: string;
    enterCodeFromDevice: string;
    invalidOrExpiredCode: string;
    loginToPair: string;
    enterCodeOnOtherDevice: string;
    expiresSoon: string;
    expiresIn: string;
    generateNewCode: string;
    waitingForDevice: string;
    deviceConnected: string;
    deviceConnectedDesc: string;
    failedToGenerateCode: string;

    // Reset Password
    resetPassword: string;
    resetPasswordDesc: string;
    recoveryKey: string;
    recoveryKeyPlaceholder: string;
    newPasswordPlaceholder: string;
    confirmNewPassword: string;
    resetBtn: string;
    resetting: string;
    resetSuccess: string;
    resetSuccessDesc: string;
    backToHome: string;
    invalidKey: string;

    // Watch Page
    loadingStream: string;
    comingSoon: string;
    notAvailableYet: string;
    checkBackLater: string;
    saveForLater: string;
    episode: string;
    server: string;
    nextEpisode: string;
    prevEpisode: string;
    autoPlayNext: string;
    playNextIn: string;
    saveMovie: string;
    savedMovie: string;
    savedToMyList: string;
    saveToSync: string;

    // Explore
    exploreTitle: string;
    exploreEmpty: string;
    exploreEmptyHint: string;
    retry: string;
    loadingError: string;

    // General
    close: string;
    cancel: string;
    save: string;
    delete: string;
    confirm: string;
    back: string;

    // Mobile bottom nav
    mobileSchedule: string;
    mobileAccount: string;
}

const vi: Translations = {
    searchPlaceholder: 'Tìm kiếm phim...',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    myAccount: 'Của tôi',
    logout: 'Đăng xuất',
    pairDevice: 'Ghép nối',

    home: 'Trang chủ',
    movies: 'Phim lẻ',
    series: 'Phim bộ',
    animation: 'Hoạt hình',
    tvShows: 'TV Shows',
    koreanDrama: 'Hàn Quốc',
    chineseDrama: 'Trung Quốc',
    upcoming: 'Sắp chiếu',
    nowShowing: 'Đang chiếu',
    continueWatching: 'Tiếp tục xem',
    viewAll: 'Xem tất cả',
    myList: 'Của tôi',
    director: 'Đạo diễn',
    castMember: 'Diễn viên',
    latestUpdates: 'Phim Mới Cập Nhật',
    noResults: 'Không tìm thấy phim nào.',
    quality: 'Chất lượng',
    inList: 'Trong danh sách',

    loginPromoTitle: 'Đăng nhập để lưu phim xem tiếp',
    loginPromoDesc: 'Lưu phim đang xem, đồng bộ trên nhiều thiết bị, tạo danh sách riêng – hoàn toàn miễn phí.',
    featWatchProgress: 'Lưu tiến trình xem',
    featFavorite: 'Thêm phim yêu thích',
    featSync: 'Đồng bộ đa thiết bị',
    featList: 'Tạo danh sách riêng',

    chartTrending: 'Sôi nổi nhất',
    chartFavorite: 'Yêu thích nhất',
    chartHotGenre: 'Thể loại Hot',
    viewMore: 'Xem thêm',

    faqTitle: 'Câu hỏi thường gặp (FAQ)',
    faqSubtitle: 'Giải đáp các thắc mắc phổ biến khi trải nghiệm xem phim tại Kv-Netflix',
    faqFreeQ: 'Kv-Netflix có miễn phí xem phim không?',
    faqFreeA: 'Kv-Netflix hoàn toàn miễn phí 100%, không thu phí thành viên, không yêu cầu đăng ký tài khoản. Toàn bộ kho phim Vietsub, lồng tiếng, thuyết minh đều có sẵn để xem online ngay khi bạn truy cập website.',
    faqUpdateQ: 'Kv-Netflix cập nhật phim mới mỗi ngày không?',
    faqUpdateA: 'Kv-Netflix cập nhật các tập phim mới liên tục hàng ngày, ngay sau khi các tập phim được phát sóng tại Nhật Bản hoặc có bản dịch Vietsub chất lượng tốt nhất.',
    faqQualityQ: 'Chất lượng phim tại Kv-Netflix như thế nào?',
    faqQualityA: 'Toàn bộ phim trên Kv-Netflix đều được cung cấp với chất lượng HD/Full HD sắc nét, âm thanh sống động, mang lại trải nghiệm xem chân thực nhất cho người xem.',
    faqDeviceQ: 'Xem phim Kv-Netflix trên điện thoại và Smart TV được không?',
    faqDeviceA: 'Được. Giao diện của Kv-Netflix được thiết kế tối ưu hóa để hiển thị tốt trên mọi loại thiết bị từ điện thoại di động, máy tính bảng cho đến Smart TV thông qua trình duyệt web.',
    faqServerQ: 'Server xem phim của Kv-Netflix có ổn định không?',
    faqServerA: 'Có. Kv-Netflix sử dụng hệ thống máy chủ tốc độ cao và băng thông rộng, giúp giảm thiểu tối đa tình trạng giật lag hay load chậm ngay cả khi xem vào các khung giờ cao điểm.',
    faqSeekQ: 'Kv-Netflix có hỗ trợ tua nhanh, phụ đề tuỳ chỉnh không?',
    faqSeekA: 'Có. Trình phát video của Kv-Netflix hỗ trợ đầy đủ các tính năng hiện đại như tua nhanh, chọn tốc độ phát, bật/tắt hoặc tùy chỉnh kích thước phụ đề một cách linh hoạt.',
    faqTheaterQ: 'Phim chiếu rạp mới ra có trên Kv-Netflix không?',
    faqTheaterA: 'Các bộ phim movie chiếu rạp bom tấn mới nhất luôn được Kv-Netflix cập nhật nhanh chóng ngay khi có bản đẹp hoặc bản dịch chất lượng nhất để phục vụ khán giả.',
    faqDubQ: 'Kv-Netflix có phim lồng tiếng và thuyết minh không?',
    faqDubA: 'Có. Ngoài phụ đề Vietsub, Kv-Netflix còn cung cấp rất nhiều bộ phim có bản thuyết minh hoặc lồng tiếng chất lượng cao dành cho mọi đối tượng khán giả.',
    faqAnimeQ: 'Kv-Netflix chuyên về phim và cả anime đúng không?',
    faqAnimeA: 'Đúng vậy. Kv-Netflix là chuyên trang cung cấp kho tàng phim khổng lồ từ các bộ phim truyền hình (TV Series), phim movie chiếu rạp, OVA cho đến các thể loại anime (phim hoạt hình Nhật Bản) được yêu thích nhất.',
    faqSpeedQ: 'Tốc độ tải trang Kv-Netflix có nhanh không?',
    faqSpeedA: 'Trang web được tối ưu mã nguồn tối đa để đảm bảo tốc độ tải trang cực nhanh, phản hồi tức thì và không gây khó chịu cho người dùng khi tìm kiếm và chọn phim.',

    explore: 'Khám phá',
    history: 'Lịch sử',
    savedMovies: 'Đã lưu',
    account: 'Tài khoản',
    noSavedMovies: 'Chưa lưu phim nào',
    noWatchHistory: 'Chưa có lịch sử xem',
    savedMoviesHint: 'Nhấn lưu để thêm phim vào danh sách',
    watchHistoryHint: 'Bắt đầu xem phim để lưu lịch sử',
    signInToSync: 'Đăng nhập để đồng bộ danh sách và lịch sử xem',
    signInToExplore: 'Đăng nhập để khám phá phim liên quan',
    noWatchHistoryYet: 'Chưa có lịch sử xem',
    startWatchingHint: 'Bắt đầu xem phim để lưu lịch sử',

    connectedDevices: 'Thiết bị kết nối',
    noDevices: 'Chưa có thiết bị nào được ghép nối',
    loading: 'Đang tải...',
    changePassword: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu mới',
    passwordMinHint: '(ít nhất 6 ký tự)',
    changePasswordBtn: 'Đổi mật khẩu',
    changing: 'Đang đổi...',
    passwordChanged: 'Đổi mật khẩu thành công',
    passwordMismatch: 'Mật khẩu xác nhận không khớp',
    fillAllFields: 'Vui lòng nhập đầy đủ mật khẩu',
    passwordMinLength: 'Mật khẩu mới phải có ít nhất 6 ký tự',
    passwordChangeFailed: 'Đổi mật khẩu thất bại',
    recoverAccount: 'Khôi phục tài khoản',
    recoverDescription: 'Tạo khóa khôi phục để đặt lại mật khẩu khi quên. Mỗi lần tạo sẽ vô hiệu hóa khóa cũ.',
    saveKeySafely: 'Lưu khóa này ở nơi an toàn. Bạn sẽ cần nó để khôi phục tài khoản.',
    generateKey: 'Tạo khóa khôi phục',
    generating: 'Đang tạo...',
    generateNewKey: 'Tạo khóa mới',
    createRecoveryKey: 'Tạo khóa khôi phục',
    keyGeneratedError: 'Không thể tạo khóa khôi phục',

    email: 'Email',
    password: 'Mật khẩu',
    name: 'Họ tên',
    noAccount: 'Chưa có tài khoản?',
    hasAccount: 'Đã có tài khoản?',
    registerBtn: 'Đăng ký',
    loginBtn: 'Đăng nhập',
    registering: 'Đang đăng ký...',
    loggingIn: 'Đang đăng nhập...',
    enterPairCode: 'Nhập mã ghép nối',
    pairCodePlaceholder: 'Nhập 6 chữ số',
    pairBtn: 'Ghép nối',
    pairing: 'Đang ghép nối...',
    forgotPassword: 'Quên mật khẩu?',
    loginWithCode: 'Nhập mã',

    scanQR: 'Quét mã trên thiết bị',
    enterCodeOnPC: 'Nhập mã trên PC để ghép nối',
    waitingForPair: 'Đang chờ ghép nối...',
    devicePaired: 'Thiết bị đã ghép nối!',
    enterCodeFromDevice: 'Nhập mã 6 chữ số hiển thị trên thiết bị khác',
    invalidOrExpiredCode: 'Mã không hợp lệ hoặc đã hết hạn',
    loginToPair: 'Bạn cần đăng nhập để tạo mã ghép nối',
    enterCodeOnOtherDevice: 'Cho thiết bị khác xem mã này để ghép nối',
    expiresSoon: 'Mã sẽ hết hạn',
    expiresIn: 'Hết hạn sau:',
    generateNewCode: 'Tạo mã mới',
    waitingForDevice: 'Đang chờ thiết bị khác nhập mã...',
    deviceConnected: 'Thiết bị đã kết nối!',
    deviceConnectedDesc: 'Thiết bị khác đã đăng nhập thành công.',
    failedToGenerateCode: 'Không thể tạo mã',

    resetPassword: 'Khôi phục tài khoản',
    resetPasswordDesc: 'Nhập khóa khôi phục và mật khẩu mới bên dưới.',
    recoveryKey: 'Khóa khôi phục',
    recoveryKeyPlaceholder: 'Khóa khôi phục (VD: abcd-1234-efgh-5678)',
    newPasswordPlaceholder: 'Mật khẩu mới',
    confirmNewPassword: 'Xác nhận mật khẩu mới',
    resetBtn: 'Đặt lại mật khẩu',
    resetting: 'Đang xử lý...',
    resetSuccess: 'Đặt lại thành công',
    resetSuccessDesc: 'Mật khẩu đã được đặt lại. Tất cả thiết bị đã được đăng xuất. Bạn có thể đăng nhập lại ngay.',
    backToHome: 'Về trang chủ',
    invalidKey: 'Khóa không hợp lệ hoặc đã hết hạn',

    loadingStream: 'Đang tải stream...',
    comingSoon: 'Sắp ra mắt',
    notAvailableYet: 'Phim chưa có sẵn để xem',
    checkBackLater: 'Lưu phim này để xem sau và quay lại khi có tập mới.',
    saveForLater: 'Lưu phim để xem sau',
    episode: 'Tập',
    server: 'Server',
    nextEpisode: 'Tập tiếp',
    prevEpisode: 'Tập trước',
    autoPlayNext: 'Tự động phát tập tiếp',
    playNextIn: 'Phát tiếp trong',
    saveMovie: 'Lưu vào danh sách',
    savedMovie: 'Đã lưu',
    savedToMyList: 'Đã lưu vào danh sách của bạn',
    saveToSync: 'Đăng nhập để đồng bộ danh sách phim đã lưu trên mọi thiết bị',

    exploreTitle: 'Phim liên quan đến sở thích của bạn',
    exploreEmpty: 'Xem phim để nhận đề xuất',
    exploreEmptyHint: 'Lịch sử xem sẽ giúp gợi ý phim phù hợp với sở thích của bạn',
    retry: 'Thử lại',
    loadingError: 'Không thể tải phim đề xuất',

    close: 'Đóng',
    cancel: 'Hủy',
    save: 'Lưu',
    delete: 'Xóa',
    confirm: 'Xác nhận',
    back: 'Quay lại',

    mobileSchedule: 'Lịch chiếu',
    mobileAccount: 'Tài khoản',
};

const en: Translations = {
    searchPlaceholder: 'Search movies...',
    login: 'Sign In',
    register: 'Sign Up',
    myAccount: 'My Account',
    logout: 'Sign Out',
    pairDevice: 'Pair Device',

    home: 'Home',
    movies: 'Movies',
    series: 'Series',
    animation: 'Animation',
    tvShows: 'TV Shows',
    koreanDrama: 'K-Drama',
    chineseDrama: 'C-Drama',
    upcoming: 'Upcoming',
    nowShowing: 'Now Showing',
    continueWatching: 'Continue Watching',
    viewAll: 'View All',
    myList: 'My List',
    director: 'Director',
    castMember: 'Cast',
    latestUpdates: 'Latest Updates',
    noResults: 'No movies found.',
    quality: 'Quality',
    inList: 'In My List',

    loginPromoTitle: 'Sign in to save your watch progress',
    loginPromoDesc: 'Save what you watch, sync across devices, create your own list - completely free.',
    featWatchProgress: 'Save watch progress',
    featFavorite: 'Add favorite movies',
    featSync: 'Multi-device sync',
    featList: 'Create your own list',

    chartTrending: 'Trending Now',
    chartFavorite: 'Most Favorite',
    chartHotGenre: 'Hot Genres',
    viewMore: 'View More',

    faqTitle: 'Frequently Asked Questions (FAQ)',
    faqSubtitle: 'Answers to common questions about watching movies on Kv-Netflix',
    faqFreeQ: 'Is watching movies on Kv-Netflix free?',
    faqFreeA: 'Kv-Netflix is 100% free, no membership fees, no account registration required. The entire movie library with Vietnamese subtitles, dubbed and narrated versions is available to watch online the moment you visit the website.',
    faqUpdateQ: 'Are new movies updated daily?',
    faqUpdateA: 'Kv-Netflix updates new episodes continuously every day, right after episodes air in Japan or as soon as the best-quality Vietnamese subtitles are available.',
    faqQualityQ: 'What is the video quality on Kv-Netflix?',
    faqQualityA: 'All movies on Kv-Netflix are provided in crisp HD/Full HD quality with vivid sound, giving viewers the most realistic viewing experience.',
    faqDeviceQ: 'Can I watch Kv-Netflix on phones and Smart TVs?',
    faqDeviceA: 'Yes. The Kv-Netflix interface is optimized to display well on all device types, from mobile phones and tablets to Smart TVs via web browser.',
    faqServerQ: 'Are the streaming servers stable?',
    faqServerA: 'Yes. Kv-Netflix uses a high-speed server system with wide bandwidth, minimizing lag or slow loading even during peak hours.',
    faqSeekQ: 'Does Kv-Netflix support seeking and adjustable subtitles?',
    faqSeekA: 'Yes. The video player supports modern features like fast seeking, playback speed selection, and flexible toggling or resizing of subtitles.',
    faqTheaterQ: 'Are newly released theater movies available on Kv-Netflix?',
    faqTheaterA: 'The latest blockbuster theater movies are always updated quickly on Kv-Netflix as soon as a quality version or best translation is available.',
    faqDubQ: 'Does Kv-Netflix have dubbed and narrated movies?',
    faqDubA: 'Yes. In addition to Vietnamese subtitles, Kv-Netflix offers many movies with high-quality narration or dubbing for all audiences.',
    faqAnimeQ: 'Does Kv-Netflix specialize in movies and anime?',
    faqAnimeA: 'Yes. Kv-Netflix is a dedicated site providing a huge library from TV series, theatrical movies, OVA to the most beloved anime genres.',
    faqSpeedQ: 'Is the Kv-Netflix page loading fast?',
    faqSpeedA: 'The website is maximally optimized to ensure lightning-fast page loads, instant response, and no annoyance when searching for and choosing movies.',

    explore: 'Explore',
    history: 'History',
    savedMovies: 'Saved',
    account: 'Account',
    noSavedMovies: 'No saved movies yet',
    noWatchHistory: 'No watch history yet',
    savedMoviesHint: 'Tap save to add movies to your list',
    watchHistoryHint: 'Start watching to save history',
    signInToSync: 'Sign in to sync your list and watch history',
    signInToExplore: 'Sign in to explore related movies',
    noWatchHistoryYet: 'No watch history yet',
    startWatchingHint: 'Start watching to save history',

    connectedDevices: 'Connected Devices',
    noDevices: 'No devices paired yet',
    loading: 'Loading...',
    changePassword: 'Change Password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    passwordMinHint: '(at least 6 characters)',
    changePasswordBtn: 'Change Password',
    changing: 'Changing...',
    passwordChanged: 'Password changed successfully',
    passwordMismatch: 'Passwords do not match',
    fillAllFields: 'Please fill in all fields',
    passwordMinLength: 'New password must be at least 6 characters',
    passwordChangeFailed: 'Failed to change password',
    recoverAccount: 'Account Recovery',
    recoverDescription: 'Generate a recovery key to reset your password if forgotten. Each new key invalidates the previous one.',
    saveKeySafely: 'Save this key somewhere safe. You will need it to recover your account.',
    generateKey: 'Generate Recovery Key',
    generating: 'Generating...',
    generateNewKey: 'Generate New Key',
    createRecoveryKey: 'Generate Recovery Key',
    keyGeneratedError: 'Failed to generate recovery key',

    email: 'Email',
    password: 'Password',
    name: 'Full Name',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    registerBtn: 'Sign Up',
    loginBtn: 'Sign In',
    registering: 'Registering...',
    loggingIn: 'Signing in...',
    enterPairCode: 'Enter Pairing Code',
    pairCodePlaceholder: 'Enter 6-digit code',
    pairBtn: 'Pair Device',
    pairing: 'Pairing...',
    forgotPassword: 'Forgot password?',
    loginWithCode: 'Enter Code',

    scanQR: 'Scan code on device',
    enterCodeOnPC: 'Enter code on PC to pair',
    waitingForPair: 'Waiting for pairing...',
    devicePaired: 'Device paired successfully!',
    enterCodeFromDevice: 'Enter the 6-digit code shown on another device',
    invalidOrExpiredCode: 'Invalid or expired code',
    loginToPair: 'You need to sign in to generate a pairing code',
    enterCodeOnOtherDevice: 'Show this code to another device to pair',
    expiresSoon: 'Code will expire soon',
    expiresIn: 'Expires in:',
    generateNewCode: 'Generate New Code',
    waitingForDevice: 'Waiting for another device to enter the code...',
    deviceConnected: 'Device Connected!',
    deviceConnectedDesc: 'Another device has signed in successfully.',
    failedToGenerateCode: 'Failed to generate code',

    resetPassword: 'Account Recovery',
    resetPasswordDesc: 'Enter your recovery key and new password below.',
    recoveryKey: 'Recovery Key',
    recoveryKeyPlaceholder: 'Recovery key (e.g. abcd-1234-efgh-5678)',
    newPasswordPlaceholder: 'New password',
    confirmNewPassword: 'Confirm new password',
    resetBtn: 'Reset Password',
    resetting: 'Processing...',
    resetSuccess: 'Password Reset Successful',
    resetSuccessDesc: 'Your password has been reset. All devices have been signed out. You can sign in now.',
    backToHome: 'Back to Home',
    invalidKey: 'Invalid or expired key',

    loadingStream: 'Loading stream...',
    comingSoon: 'Coming Soon',
    notAvailableYet: 'Movie not available yet',
    checkBackLater: 'Save this movie to watch later and check back when new episodes arrive.',
    saveForLater: 'Save for later',
    episode: 'Episode',
    server: 'Server',
    nextEpisode: 'Next Episode',
    prevEpisode: 'Previous Episode',
    autoPlayNext: 'Auto-play next episode',
    playNextIn: 'Playing next in',
    saveMovie: 'Save to My List',
    savedMovie: 'Saved',
    savedToMyList: 'Saved to your list',
    saveToSync: 'Sign in to sync saved movies across devices',

    exploreTitle: 'Movies related to your taste',
    exploreEmpty: 'Watch movies to get recommendations',
    exploreEmptyHint: 'Your watch history helps us suggest movies you will enjoy',
    retry: 'Retry',
    loadingError: 'Failed to load recommendations',

    close: 'Close',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',

    mobileSchedule: 'Schedule',
    mobileAccount: 'Account',
};

export const translations: Record<Lang, Translations> = { vi, en };
