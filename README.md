# Event Reminder (web)

Quản lý sự kiện, lịch âm Việt Nam và người thân. **Angular 21 · ZardUI · Tailwind v4 · IndexedDB (Dexie) · PWA offline-first.**

## Chạy

```bash
nvm use            # Node 22 (xem .nvmrc)
npm ci
npm start          # http://localhost:4200  → /settings → "Nạp dữ liệu mẫu"
```

| Lệnh | Việc |
|---|---|
| `npm start` | Chạy dev server |
| `npm run check` | `format:check` + `lint` + `test:ci` + `build` (đúng như CI) |
| `npm test` | Test chế độ watch |
| `npm run format` | Prettier |
| `npm run build` | Build production (PWA chỉ bật ở bản này) |

## Tài liệu

| File | Nội dung |
|---|---|
| [`docs/SOLUTION.md`](docs/SOLUTION.md) | Giải pháp kỹ thuật cho web: kiến trúc, dữ liệu, lịch âm, lặp, nhắc nhở (và giới hạn), theme, roadmap |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | Convention bắt buộc: lớp, đặt tên, Angular, Tailwind/ZardUI, responsive, a11y, test, Git |
| [`docs/FEATURE-PARITY.md`](docs/FEATURE-PARITY.md) | Đối chiếu tính năng mobile ↔ web, đánh giá thiết kế, ưu tiên |

## Đã có và đã kiểm chứng
- Lịch âm hai chiều (mốc Tết 2021–2028, tháng nhuận 2023, khứ hồi từng ngày 2020–2032).
- Engine lặp: ngày/tuần/tháng/năm dương, năm âm (chính sách tháng nhuận), kết thúc, ngoại lệ.
- Tính giờ nhắc, đối soát lịch nhắc, scheduler trong ứng dụng.
- IndexedDB: sự kiện, danh bạ phân cấp (quy tắc xóa), cài đặt.
- Theme: 3 bộ màu × sáng/tối/tự động, 5 cỡ chữ, kiểm tra WCAG AA tự động.
- Khung responsive, các trang Hôm nay, Lịch, Cài đặt hoạt động; PWA (manifest + service worker + icon).

## Chưa làm (xem SOLUTION §12)
Form tạo/sửa sự kiện 4 bước, danh bạ CRUD, xuất `.ics`/sao lưu, E2E, cài component ZardUI (`npx zard-cli init`).

## Lưu ý
- **Nhắc nhở web có giới hạn nền tảng**: SOLUTION §9. Đừng hứa "nhắc khi đóng trình duyệt" trong giao diện.
- `.npmrc` đặt `legacy-peer-deps=true` vì npm 10 lỗi `edgesOut` với cây phụ thuộc mặc định; thử bỏ khi dùng npm ≥ 11.
- Angular CLI mới nhất đòi Node cao hơn môi trường dựng nên base dùng Angular 21.2; nâng bằng `ng update`.
