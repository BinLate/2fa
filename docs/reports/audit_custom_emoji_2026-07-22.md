# Báo cáo Kiểm tra mã nguồn (Audit Report) - Tích hợp Custom Emoji

**Ngày thực hiện:** 22/07/2026
**Phạm vi:** Kiểm toán mã nguồn các file mới thêm và sửa đổi phục vụ tính năng Telegram Custom Emoji trên Keyboard Buttons.
**Kiểm toán viên:** Antigravity Code Auditor (Bác Sĩ Code Khang)

---

## 📊 Tổng quan (Summary)
*   🔴 Vấn đề nghiêm trọng (Critical Issues): 0
*   🟡 Cảnh báo cần lưu ý (Warnings): 1
*   🟢 Đề xuất tối ưu (Suggestions): 1

---

## 🔴 Vấn đề nghiêm trọng (Critical Issues)
*   **Không phát hiện lỗi nghiêm trọng.**
    *   Mã nguồn mới hoạt động độc lập, có cơ chế fail-safe tốt khi xử lý chuỗi không có thẻ HTML.
    *   Đã chạy 309/309 bài unit tests thành công, không làm ảnh hưởng đến các tính năng cốt lõi khác của hệ thống.

---

## 🟡 Cảnh báo cần lưu ý (Warnings)
### 1. Hỗ trợ dấu nháy đơn trong thuộc tính `emoji-id`
*   **Mô tả:** Trong biểu thức chính quy hiện tại ở [button_helpers.py](file:///d:/Code/Vibe/bot-telegram/core/utils/button_helpers.py):
    ```python
    match = re.search(r'<tg-emoji\s+emoji-id="([^"]+)">.*?</tg-emoji>', text)
    ```
    Regex này chỉ bắt được trường hợp thuộc tính dùng dấu nháy kép `emoji-id="..."`. Nếu người dùng cấu hình thủ công hoặc copy-paste từ nguồn có dấu nháy đơn `emoji-id='...'`, Regex sẽ bỏ sót và thẻ HTML thô vẫn hiển thị lên nút bấm.
*   **Hậu quả:** Hiển thị lỗi nhãn nút bấm nếu dùng nháy đơn.
*   **Phác đồ điều trị:** Nâng cấp biểu thức chính quy để hỗ trợ cả dấu nháy đơn và nháy kép:
    ```python
    r'<tg-emoji\s+emoji-id=["\']([^"\']+)["\']\s*>.*?</tg-emoji>'
    ```

---

## 🟢 Đề xuất tối ưu (Suggestions)
### 1. Xử lý nhiều thẻ `<tg-emoji>` trong cùng một văn bản nút bấm
*   **Mô tả:** Nếu người dùng vô tình đặt nhiều thẻ custom emoji trong tên sản phẩm, hàm trích xuất hiện tại chỉ lấy ID của emoji đầu tiên (do dùng `re.search`), nhưng lại xóa sạch toàn bộ các thẻ (do dùng `re.sub` thay thế tất cả). Đây là hành vi hợp lý vì Telegram chỉ cho phép 1 icon trên 1 nút bấm. Tuy nhiên, để đảm bảo tính tường minh, ta nên ghi chú rõ ràng điều này hoặc xử lý chặt chẽ hơn.
*   **Phác đồ điều trị:** Giữ nguyên cơ chế hiện tại nhưng thêm ghi chú/comment trong code để lập trình viên sau này dễ bảo trì.

---

## 📋 Kế hoạch hành động (Action Plan)
*   **Bước 1:** Nâng cấp Regex trong `core/utils/button_helpers.py` để hỗ trợ dấu nháy đơn/kép linh hoạt.
*   **Bước 2:** Bổ sung unit test case cho dấu nháy đơn để kiểm chứng.
