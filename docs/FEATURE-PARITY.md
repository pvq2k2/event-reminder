# Đối chiếu tính năng Mobile ↔ Web và đánh giá thiết kế

Căn cứ: các màn trên canvas thiết kế (mobile 25 màn, web 7 board) và `SOLUTION.md`. Ký hiệu: ✅ đã có · 🟡 một phần · ⬜ chưa có · — không áp dụng.

## A. Đánh giá thiết kế: cần cải thiện

| #   | Vấn đề                                                                                                                                                    | Mức        | Đề xuất                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Lời hứa nhắc nhở sai với web.** Màn xin quyền ghi "nhắc đúng giờ, kể cả khi không có Internet"; mock màn hình khóa ngụ ý nhắc ổn định khi đóng ứng dụng | **Cao**    | Đổi chữ thành "nhắc khi ứng dụng đang mở"; thêm gợi ý **xuất `.ics`** cho ngày quan trọng; bỏ/ghi chú màn khóa là "mô phỏng, tuỳ nền tảng" (SOLUTION §9) |
| 2   | **Web thiếu nhiều màn so với mobile** (xem bảng B): chi tiết sự kiện, danh bạ chi tiết/thêm, trạng thái trống/lỗi/tải, sao lưu, quyền thông báo           | **Cao**    | Thiết kế bổ sung theo bảng B, tái dùng mẫu mobile qua Dialog/Sheet                                                                                       |
| 3   | **Chưa có "Tạo nhanh".** Tạo sự kiện đơn giản phải qua 4 bước, nặng cho thao tác thường dùng nhất                                                         | Cao        | Nút "Lưu nhanh" ngay ở bước 1 (tiêu đề + ngày/giờ, dùng mốc nhắc mặc định)                                                                               |
| 4   | **Độ tương phản chữ:** 6 cặp dưới 4.5:1 (Light26/Light27 sáng, Default tối)                                                                               | Đã xử lý   | Đã chỉnh token và có test tự động; **bản vẽ canvas chưa cập nhật** vài sắc độ                                                                            |
| 5   | **Phân biệt chỉ bằng màu** ở chấm sự kiện trên lịch mobile                                                                                                | Trung bình | Thêm hình dạng/chữ viết tắt hoặc xem danh sách ngày ngay bên dưới (đã có panel)                                                                          |
| 6   | **Cỡ chữ nhỏ:** nhãn tab 11px, chú thích 10 đến 11px                                                                                                      | Trung bình | Tối thiểu 12px (0,75rem) cho chữ chức năng                                                                                                               |
| 7   | **Nút nổi "+" không thuộc ZardUI** và che nội dung trên mobile                                                                                            | Trung bình | Dùng nút "Thêm sự kiện" ở tiêu đề (đã dùng ở web); bỏ FAB                                                                                                |
| 8   | **Màn Sao lưu** nói "lưu vào Files/iCloud/Drive", Safari không hỗ trợ File System Access                                                                  | Trung bình | Dùng "Tải về" (blob download) + "Chọn file để nhập"; chữ trung thực theo trình duyệt                                                                     |
| 9   | **Nguy cơ mất dữ liệu** khi xóa dữ liệu trình duyệt chưa có thiết kế                                                                                      | Trung bình | Banner nhắc sao lưu + xin `navigator.storage.persist()`; hiển thị dung lượng đã dùng                                                                     |
| 10  | `⌘K` chỉ đúng với macOS                                                                                                                                   | Thấp       | Hiển thị `Ctrl K` theo nền tảng                                                                                                                          |
| 11  | Nút "Nhắc lại sau 15 phút" trên Dashboard web chưa có đặc tả (snooze)                                                                                     | Thấp       | Bỏ khỏi MVP hoặc thêm vào đặc tả                                                                                                                         |
| 12  | Giá trị số/ngày âm trong mock                                                                                                                             | Đã kiểm    | Ngày 29/8/2026 = 09/10/2026 và Trung thu 2026 đã khớp bộ test lịch âm                                                                                    |

## B. Ma trận tính năng

### B.1 Tính năng có ở ít nhất một nền tảng

| Tính năng                                                                     |          Mobile          |           Web           | Việc cần làm cho web                                                                                                  |
| ----------------------------------------------------------------------------- | :----------------------: | :---------------------: | --------------------------------------------------------------------------------------------------------------------- |
| Hôm nay: ngày dương + âm, thẻ tiếp theo, lịch trình                           |            ✅            |           ✅            | —                                                                                                                     |
| Hôm nay: dải tuần                                                             |            ✅            |            —            | Web dùng lịch nhỏ; không cần                                                                                          |
| Hôm nay: **trạng thái trống**                                                 |            ✅            |           ⬜            | Thiết kế (tái dùng mobile)                                                                                            |
| Hôm nay: **skeleton đang tải**                                                |            ✅            |           ⬜            | Thiết kế; **đã có trong code**                                                                                        |
| Hôm nay: **lỗi lên lịch nhắc** (banner + thử lại)                             |            ✅            |           ⬜            | Thiết kế + toast fallback                                                                                             |
| Lịch tháng + ngày âm + panel ngày                                             |            ✅            |           ✅            | —                                                                                                                     |
| Lịch **Tuần / Ngày / Agenda**                                                 |    🟡 (chỉ nhãn tab)     |    🟡 (chỉ nhãn tab)    | **Cả hai chưa có màn**, thiết kế rồi cài                                                                              |
| Tạo sự kiện **4 bước**                                                        |            ✅            |     🟡 (chỉ bước 2)     | Thiết kế bước 1, 3, 4                                                                                                 |
| **Tạo nhanh**                                                                 |            ⬜            |           ⬜            | Thiết kế mới (mục A.3)                                                                                                |
| Chi tiết sự kiện (đếm ngược, lần tiếp theo, người liên quan)                  |            ✅            |           ⬜            | Thiết kế                                                                                                              |
| Sửa sự kiện                                                                   |   ✅ (dùng lại 4 bước)   |           ⬜            | Dùng lại 4 bước                                                                                                       |
| **Chọn phạm vi sửa/xóa chuỗi lặp**                                            |            ✅            |           ⬜            | Thiết kế (Dialog)                                                                                                     |
| **Xác nhận xóa sự kiện**                                                      | 🟡 (trong sheet phạm vi) |           ⬜            | Thiết kế AlertDialog                                                                                                  |
| Danh bạ: cây Bên nội/Bên ngoại → gia đình → thành viên                        |            ✅            |           ✅            | —                                                                                                                     |
| Danh bạ: **tìm kiếm** (kết quả theo nhóm)                                     |            ✅            |           ⬜            | Thiết kế Command (`⌘K`/`Ctrl K`)                                                                                      |
| Danh bạ: **chi tiết liên hệ**                                                 |            ✅            |           ⬜            | Thiết kế (panel phải/route)                                                                                           |
| Danh bạ: **thêm liên hệ**                                                     |            ✅            |           ⬜            | Thiết kế                                                                                                              |
| Danh bạ: **thêm gia đình**                                                    |            ✅            |           ⬜            | Thiết kế                                                                                                              |
| Danh bạ: **xóa gia đình** (2 chế độ)                                          |            ✅            |           ⬜            | Thiết kế AlertDialog                                                                                                  |
| Danh bạ: xóa liên hệ                                                          |            ⬜            |           ⬜            | Thiết kế (quy tắc ở SOLUTION §4.3)                                                                                    |
| Danh bạ: **trạng thái trống**                                                 |            ✅            |           ⬜            | Thiết kế                                                                                                              |
| Nhập danh bạ                                                                  |   ✅ ("từ điện thoại")   | 🟡 (nút "Nhập từ file") | Nhập **vCard/CSV**; không dùng Contact Picker                                                                         |
| Cài đặt: chế độ, bộ màu                                                       |            ✅            |           ✅            | —                                                                                                                     |
| Cài đặt: **cỡ chữ**                                                           |            ✅            |           ⬜            | Thêm vào WebSettings; **đã có trong code**                                                                            |
| Cài đặt: ngày đầu tuần, hiển thị âm lịch, mốc nhắc mặc định, giờ nhắc cả ngày |            ✅            |           ⬜            | Thiết kế mục Nhắc nhở                                                                                                 |
| **Xin quyền thông báo** + **bị từ chối**                                      |            ✅            |  🟡 (banner Dashboard)  | Dialog xin quyền + Alert hướng dẫn trong Cài đặt                                                                      |
| **Sao lưu / xuất / nhập**                                                     |            ✅            |           ⬜            | Thiết kế; bổ sung `.ics`                                                                                              |
| Thông báo trên màn hình khóa                                                  |            ✅            |            —            | Là UI của hệ điều hành; chỉ cần **đặc tả nội dung** thông báo                                                         |
| Splash                                                                        |            ✅            |           ✅            | Splash in-app (HTML tĩnh + Angular) theo 6 biến thể theme & sáng/tối, responsive; ẩn khi app sẵn sàng (tối thiểu ~1s) |
| Icon ứng dụng                                                                 |            ✅            |           ✅            | Đã xuất PNG vào `public/icons`                                                                                        |
| Responsive đầy đủ                                                             |            —             |           ✅            | Board "Responsive"                                                                                                    |

### B.2 Chỉ có ở web, chưa thiết kế

| Tính năng                                            | Ghi chú                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Gợi ý **cài PWA**                                    | Nút/banner "Cài ứng dụng" (`beforeinstallprompt`)                |
| Chỉ báo **offline** + thông báo **có phiên bản mới** | `SwUpdate` của Angular                                           |
| **Toast nhắc trong ứng dụng**                        | Khi không có quyền thông báo (`InAppReminderScheduler.fallback`) |
| **Command palette**                                  | `⌘K`/`Ctrl K`: tìm sự kiện/người, tạo nhanh                      |
| Phím tắt                                             | `N` tạo sự kiện, `T` hôm nay, `←/→` đổi tháng                    |
| Cảnh báo **dữ liệu chỉ ở trình duyệt**               | Nhắc sao lưu định kỳ, `storage.persist()`                        |
| Trang 404 / lỗi tải tài nguyên                       |                                                                  |

### B.3 Có trong đặc tả hoặc dữ liệu nhưng chưa có thiết kế ở cả hai nền tảng

| Tính năng                                                  | Hiện trạng                                                             | Đề xuất                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Đánh dấu **hoàn thành / hủy** sự kiện                      | `status` có trong dữ liệu; mock có nhóm "Xong" nhưng không có thao tác | Checkbox ở dòng lịch trình + menu              |
| **Hoãn nhắc** (snooze)                                     | Chỉ có nút trong mock web                                              | Quyết định có/không cho MVP                    |
| Sự kiện **nhiều ngày** (ngày kết thúc)                     | Engine hỗ trợ, form chưa có                                            | Thêm "Ngày kết thúc" ở bước 2                  |
| **Sinh nhật liên hệ → sự kiện** tự động                    | Dữ liệu có ngày sinh dương/âm                                          | Nút "Tạo sự kiện sinh nhật" ở chi tiết liên hệ |
| **Hoàn tác** sau khi xóa                                   | Chưa có                                                                | Toast "Đã xóa · Hoàn tác"                      |
| **Xem trước các lần lặp** ("5 lần tới")                    | Chỉ có ở chi tiết                                                      | Hiển thị ngay tại bước 3                       |
| **Tìm kiếm sự kiện**                                       | Chỉ tìm danh bạ                                                        | Mở rộng Command palette                        |
| Cảnh báo ngày âm không tồn tại (ví dụ ngày 30 tháng thiếu) | Engine bỏ qua lần đó                                                   | Thông báo ngay khi chọn                        |

## C. Thứ tự ưu tiên thiết kế bổ sung

**P0 (chặn MVP):** tạo sự kiện bước 1/3/4 + **Tạo nhanh**; chi tiết/sửa/xóa sự kiện + chọn phạm vi chuỗi lặp; chi tiết/thêm liên hệ, thêm/xóa gia đình; **quyền thông báo (xin/từ chối)**; **sao lưu + `.ics`**; trạng thái trống/tải/lỗi; sửa lại câu chữ nhắc nhở (A.1).

**P1:** Lịch Tuần/Agenda; tìm kiếm `⌘K`; cài đặt nhắc nhở đầy đủ + cỡ chữ; nhập vCard/CSV; PWA (cài, offline, cập nhật); toast nhắc trong ứng dụng; hoàn thành/hủy sự kiện.

**P2:** Phím tắt; lịch Ngày; sinh nhật liên hệ tự động tạo sự kiện; hoàn tác; snooze.
