import { Alert } from 'react-native';

/**
 * Extract a user-friendly Vietnamese error message from any error type.
 * Handles: axios errors, network errors, timeout, plain objects, and Error instances.
 */
export function getErrorMessage(err) {
  if (!err) return 'Đã xảy ra lỗi. Vui lòng thử lại.';

  // Timeout — Render free tier cần 30-60s để wake up
  if (err.code === 'ECONNABORTED' || err.name === 'ECONNABORTED') {
    return 'Kết nối quá thời gian. Máy chủ có thể đang khởi động, vui lòng thử lại sau ít phút.';
  }

  // No internet
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return 'Không có kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
  }

  // Plain object thrown from AuthContext: { error: 'Vietnamese message' }
  if (err.error && typeof err.error === 'string') return err.error;

  // Server response Vietnamese message
  const serverMsg = err.response?.data?.error || err.response?.data?.message;
  if (serverMsg) return serverMsg;

  // Error instance with a meaningful .message
  if (err.message && !err.message.startsWith('Request failed')) {
    return err.message;
  }

  // HTTP status fallback
  switch (err.response?.status) {
    case 400: return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
    case 401: return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
    case 403: return 'Bạn không có quyền thực hiện thao tác này.';
    case 404: return 'Không tìm thấy dữ liệu.';
    case 409: return 'Dữ liệu đã tồn tại.';
    case 429: return 'Quá nhiều yêu cầu. Vui lòng thử lại sau.';
    case 500: return 'Lỗi máy chủ. Vui lòng thử lại sau.';
    default:  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  }
}

export function showError(title, err) {
  Alert.alert(title || 'Lỗi', getErrorMessage(err));
}
