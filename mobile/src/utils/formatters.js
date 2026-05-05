// Currency formatting for Vietnamese Dong
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Date formatting
export const formatDate = (date, format = 'vi-VN') => {
  const d = new Date(date);
  return d.toLocaleDateString(format, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateShort = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN');
};

// Get current month in YYYY-MM format
export const getCurrentMonth = () => {
  return new Date().toISOString().slice(0, 7);
};

// Get month name
export const getMonthName = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
};