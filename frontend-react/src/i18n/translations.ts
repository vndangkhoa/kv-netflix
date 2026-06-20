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
    upcoming: string;
    nowShowing: string;
    continueWatching: string;
    viewAll: string;
    myList: string;
    director: string;
    castMember: string;
    latestUpdates: string;
    noResults: string;

    // My List / Account
    explore: string;
    history: string;
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
    episode: string;
    server: string;
    nextEpisode: string;
    prevEpisode: string;
    autoPlayNext: string;
    playNextIn: string;

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
}

const vi: Translations = {
    searchPlaceholder: 'Tìm kiếm phim...',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    myAccount: 'Tài khoản của tôi',
    logout: 'Đăng xuất',
    pairDevice: 'Ghép nối',

    home: 'Trang chủ',
    movies: 'Phim lẻ',
    series: 'Phim bộ',
    animation: 'Hoạt hình',
    tvShows: 'TV Shows',
    upcoming: 'Sắp chiếu',
    nowShowing: 'Đang chiếu',
    continueWatching: 'Tiếp tục xem',
    viewAll: 'Xem tất cả',
    myList: 'Danh sách của tôi',
    director: 'Đạo diễn',
    castMember: 'Diễn viên',
    latestUpdates: 'Phim Mới Cập Nhật',
    noResults: 'Không tìm thấy phim nào.',

    explore: 'Khám phá',
    history: 'Lịch sử',
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
    episode: 'Tập',
    server: 'Server',
    nextEpisode: 'Tập tiếp',
    prevEpisode: 'Tập trước',
    autoPlayNext: 'Tự động phát tập tiếp',
    playNextIn: 'Phát tiếp trong',

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
    upcoming: 'Upcoming',
    nowShowing: 'Now Showing',
    continueWatching: 'Continue Watching',
    viewAll: 'View All',
    myList: 'My List',
    director: 'Director',
    castMember: 'Cast',
    latestUpdates: 'Latest Updates',
    noResults: 'No movies found.',

    explore: 'Explore',
    history: 'History',
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
    episode: 'Episode',
    server: 'Server',
    nextEpisode: 'Next Episode',
    prevEpisode: 'Previous Episode',
    autoPlayNext: 'Auto-play next episode',
    playNextIn: 'Playing next in',

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
};

export const translations: Record<Lang, Translations> = { vi, en };
