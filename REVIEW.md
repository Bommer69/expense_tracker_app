# Review Dự án: Quản lý Chi tiêu Thông minh (Smart Expense Tracker)

Dự án này là một ứng dụng quản lý tài chính cá nhân toàn diện, kết hợp sức mạnh của Node.js (Backend) và React Native Expo (Mobile), tích hợp trí tuệ nhân tạo (AI) để giúp người dùng theo dõi và tối ưu hóa chi tiêu.

## 1. Kiến trúc Hệ thống
- **Backend**: 
  - Framework: Express.js
  - Database: MongoDB (Mongoose)
  - Auth: JWT (JSON Web Tokens)
  - AI: Ollama (llama3.2) tích hợp qua LangChain
- **Mobile**:
  - Framework: React Native (Expo)
  - Navigation: Expo Router (Tab-based)
  - State: Context API & Custom Hooks
  - UI: Modern & Clean Design (Dark Mode support)

## 2. Các Tính năng Chính
- **Xác thực người dùng**: Đăng ký, Đăng nhập bảo mật.
- **Màn hình Giới thiệu (Onboarding)**: Hướng dẫn người dùng mới.
- **Quản lý Giao dịch**: Thêm/Sửa/Xóa thu nhập và chi phí.
- **Quản lý Tài khoản**: Theo dõi số dư từ nhiều nguồn (Tiền mặt, Ngân hàng, Ví điện tử).
- **Quản lý Ngân sách**: Thiết lập hạn mức chi tiêu theo danh mục hàng tháng.
- **Trợ lý AI**: Chat với AI để phân tích thói quen chi tiêu và nhận lời khuyên tài chính.
- **Giao diện tùy biến**: Hỗ trợ chế độ sáng/tối (Light/Dark Mode).

## 3. Kế hoạch Thực hiện
1.  **Backend Refinement**: 
    - Đảm bảo tất cả các API (Auth, Transactions, Budgets, Accounts, AI) hoạt động ổn định.
    - Cấu hình Middleware xử lý lỗi tập trung.
2.  **Mobile UI/UX Upgrade**:
    - Cập nhật giao diện chuyên nghiệp hơn cho tất cả các Tab.
    - Tối ưu hóa hiệu suất cuộn và chuyển trang.
3.  **AI Integration**:
    - Kết nối Mobile với AI API của Backend.
    - Tạo giao diện Chat mượt mà.
4.  **Final Review**:
    - Kiểm tra toàn bộ luồng người dùng (User Flow).
    - Đảm bảo ứng dụng chạy tốt trên cả Web và Mobile.

---
*Ngày bắt đầu: 05/05/2026*
*Trạng thái: Đang thực hiện*
