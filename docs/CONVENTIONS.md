# Convention dự án Event Reminder (Angular + ZardUI)

Tài liệu này là chuẩn bắt buộc cho mọi PR. Phần nào ESLint/test thực thi được thì máy kiểm tra; phần còn lại do reviewer kiểm tra theo checklist ở §13.

## 1. Nguyên tắc chung
1. **Đơn giản trước, tổng quát sau.** Không thêm thư viện hay lớp trừu tượng khi chưa có hai chỗ dùng.
2. **Nghiệp vụ nằm trong `core/domain`** (hàm thuần, có test). UI chỉ ghép nối.
3. **Một nguồn sự thật cho dữ liệu:** IndexedDB. Không cache bản sao lâu dài trong state.
4. **Token thay vì giá trị cứng:** màu, bo góc, cỡ chữ lấy từ token theme.
5. **Mọi màn hình có đủ trạng thái:** đang tải, trống, lỗi, bình thường.
6. **Tiếng Việt cho mọi chuỗi hiển thị**; mã, tên biến, commit bằng tiếng Anh (comment giải thích "vì sao" có thể bằng tiếng Việt).

## 2. Công cụ và phiên bản
- Node theo `.nvmrc` (22), npm, `npm ci` (có `.npmrc` `legacy-peer-deps=true`, xem README).
- Angular 21 (standalone, zoneless), TypeScript `strict`, Tailwind CSS v4, Vitest, Dexie 4.
- Cổng chất lượng cục bộ và CI: `npm run check` = format:check + lint + test:ci + build.
- **Ngân sách bundle:** initial ≤ 500 KB chưa nén (đang 388 KB). Vượt thì phải giải trình trong PR.
- Thêm dependency: nêu lý do trong PR, kiểm tra kích thước (`ng build --stats-json`), giấy phép, tần suất bảo trì. Thư viện chỉ dùng cho vài hàm nhỏ thì tự viết.

## 3. Kiến trúc lớp và phụ thuộc

```text
features ─► core/data · core/notifications · core/theme · shared
core/data · core/notifications ─► core/domain
core/domain ─► (không gì cả)
shared ─► core/domain
features không import chéo nhau
```

| Thư mục | Chứa | Không được chứa |
|---|---|---|
| `core/domain` | Kiểu, hàm thuần (ngày, lịch âm, lặp, nhắc, validation) | Angular, Dexie, RxJS, `Date.now()`, DOM |
| `core/data` | Dexie schema, repository, use case (`*.service.ts`), `Clock` | Component, template |
| `core/notifications` | Port `ReminderScheduler`, adapter, reconciler, quyền | Logic tính lịch lặp (thuộc domain) |
| `core/theme` | `ThemeService`, test token | Màu cứng ngoài `styles.css` |
| `core/layout` | `AppShell` | Nghiệp vụ |
| `features/<tên>` | Trang (`*.page.ts`), component riêng của feature | Truy vấn DB trực tiếp, import feature khác |
| `shared/ui` | Component tái dùng không biết nghiệp vụ cụ thể | Truy vấn DB |
| `shared/utils` | Hàm tiện ích thuần | |

ESLint chặn: domain import `@angular/*`, `dexie`, `rxjs`, hoặc tầng trên; feature import chéo.

- **Alias:** dùng `@core/*`, `@shared/*`, `@features/*` khi import **qua ranh giới thư mục cấp cao**; dùng đường dẫn tương đối trong cùng thư mục.
- **Use case:** ghi dữ liệu đi qua service (ví dụ `EventService`) để luôn `reconcile()` lời nhắc. Component không gọi `repository.create/update/delete` trực tiếp.
- **Thời gian:** luôn qua `Clock` để test được. Không gọi `Date.now()` trong domain hay component.

## 4. Đặt tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| File | `kebab-case`, hậu tố theo vai trò | `today.page.ts`, `event.repository.ts`, `event.service.ts`, `lunar.spec.ts` |
| Class | `PascalCase`, **không** thêm hậu tố `Component`, giữ hậu tố vai trò khi cần | `TodayPage`, `CalendarPage`, `EventRepository`, `ThemeService` |
| Selector | tiền tố `app-`, `kebab-case` | `app-today-page` |
| Selector (ngoại lệ) | mã ZardUI copy-source trong `shared/components`, `shared/core` giữ tiền tố `zard-` của upstream; ESLint miễn trừ (xem `eslint.config.js`) | `zard-button` |
| Hằng toàn cục | `UPPER_SNAKE_CASE` | `APP_DB`, `MAX_TIMEOUT` |
| Hàm/biến | `camelCase`, động từ cho hàm | `getOccurrencesInRange`, `computeFireAt` |
| Signal | danh từ, không hậu tố `$` hoặc `Signal` | `occurrences`, `selected` |
| Observable (nếu có) | hậu tố `$` | `changes$` |
| Kiểu domain | danh từ, không tiền tố `I` | `AppEvent`, `Occurrence` |
| Test | `describe` theo hàm/lớp, `it` mô tả hành vi bằng tiếng Việt | `it('hằng tháng ngày 31: clamp vs skip')` |
| Nhánh Git | `feat/…`, `fix/…`, `chore/…`, `docs/…` | `feat/event-form-steps` |

## 5. Quy tắc Angular
1. Chỉ **standalone component**; không NgModule.
2. `changeDetection: ChangeDetectionStrategy.OnPush` cho mọi component (ESLint bắt buộc).
3. **Signals** cho state; `input()`, `output()`, `model()`, `computed()`, `effect()` chỉ khi cần tác dụng phụ. Không dùng `@Input()/@Output()` decorator.
4. DI bằng `inject()` ở field, không constructor injection.
5. Control flow `@if / @for / @switch`; `@for` luôn có `track` ổn định (id, không dùng index nếu có id).
6. Host binding/class qua thuộc tính `host: {}`, không dùng `@HostBinding`.
7. Route: `loadComponent` lazy cho mỗi feature; có `title`; tham số route nhận bằng `input()` (`withComponentInputBinding`).
8. Form: Reactive Forms có kiểu (`FormGroup<…>`), validation dùng hàm thuần từ domain.
9. Không `any`; dùng `unknown` rồi thu hẹp. Không `!` (non-null) trừ khi đã kiểm tra ngay phía trên (ghi chú).
10. Template ngắn: logic phức tạp đưa vào `computed()`/hàm, không viết biểu thức dài trong template.
11. Dữ liệu từ Dexie vào UI: `toSignal(from(liveQuery(...)))` với giá trị khởi tạo `null` = đang tải.
12. Không subscribe thủ công trong component; dùng `toSignal` hoặc `takeUntilDestroyed`.
13. Ngày lịch là `string` ISO (`YYYY-MM-DD`); **không** dùng `Date` cho ngày lịch.

## 6. Giao diện: Tailwind v4 + ZardUI

### 6.1 Token
- Chỉ dùng class theo token: `bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary text-primary-foreground`, `bg-destructive`, và nhóm sự kiện `bg-event-memorial/20 text-event-memorial-ink`.
- **Cấm** mã màu (`#fff`, `rgb()`), cấm class màu cứng của Tailwind (`bg-blue-500`, `text-gray-600`) trong `src/app`. Màu mới = thêm token vào **cả 6 biến thể** trong `styles.css` rồi chạy test tương phản.
- Bo góc: `rounded-md/lg/xl` (bám `--radius`). Không dùng `rounded-[13px]`.
- Cỡ chữ: dùng thang Tailwind (`text-sm`, `text-xl`); đơn vị `rem`, **không `px` cho cỡ chữ**, để tôn trọng cỡ chữ người dùng chọn.

### 6.2 `mergeClasses()` và component
- Gộp class bằng `mergeClasses()` (`@shared/utils/merge-classes`); class sau thắng class trước.
- Component dùng chung nhận biến thể qua `input()`; nếu nhiều biến thể dùng `class-variance-authority`.
- **ZardUI:** thêm bằng `npx zard-cli add <tên>`, mã sinh ra **thuộc về dự án** (được sửa). Ghi vào PR khi sửa component sinh sẵn. Không bọc lại component Zard nếu chỉ để đổi vài class: dùng `class` truyền vào.
- Ưu tiên dùng component ZardUI cho: button, input, select, switch, tabs, dialog, sheet, table, calendar, badge, avatar, alert, skeleton, dropdown, command. Không tự viết lại.

### 6.3 Theme
- Bộ màu qua class trên `<html>`: không class = Default, `theme-light26`, `theme-light27`; chế độ tối thêm `dark`.
- Thay đổi theme **chỉ** qua `ThemeService`. Không đọc/ghi class `dark` ở nơi khác.
- Mọi thay đổi token phải qua `theme-contrast.spec.ts` (≥ 4.5:1 cho chữ thường).

## 7. Responsive (quy ước cốt lõi)

### 7.1 Breakpoint (Tailwind mặc định, không tự đặt thêm)
| Tên | Rộng | Dùng cho |
|---|---|---|
| mặc định | < 640px | Mobile (viết trước) |
| `sm` | ≥ 640px | Mobile lớn/ngang (ít dùng) |
| `md` | ≥ 768px | Tablet: rail icon, Dialog thay Sheet |
| `lg` | ≥ 1024px | Desktop: sidebar đầy đủ, hai cột |
| `xl` | ≥ 1280px | Giới hạn bề rộng nội dung (`max-w-*`) |

### 7.2 Quy tắc
1. **Mobile-first:** class mặc định cho mobile, thêm `md:`/`lg:` cho màn lớn. Không viết `max-md:` trừ khi bất khả kháng.
2. **Một bộ token, một nội dung:** chỉ đổi cách sắp xếp và mức chi tiết, không đổi màu, bo góc hay chữ theo kích thước.
3. **Ưu tiên CSS** (`hidden md:flex`, `grid lg:grid-cols-[1fr_320px]`). Chỉ dùng `BreakpointObserver` khi phải đổi **component** (Dialog ↔ Sheet), bọc trong một service/signal dùng chung `isDesktop`.
4. **Vùng chạm:** nút, ô nhập, mục điều hướng cao tối thiểu 44px trên mobile (`h-11 md:h-9`).
5. **Không cuộn ngang trang.** Bảng/lịch rộng cuộn trong khung riêng hoặc đổi sang dạng thẻ ở mobile.
6. **Bề rộng nội dung:** `mx-auto max-w-5xl` (trang thường) hoặc `max-w-6xl` (lịch, bảng); luôn có `p-4 md:p-6`.
7. **Khoảng đệm đáy mobile** cho thanh tab (`pb-24 md:pb-0`) và `env(safe-area-inset-*)`.
8. **Mẫu chuyển đổi chuẩn:**

| Desktop | Mobile |
|---|---|
| Sidebar | Thanh tab dưới (4 mục) |
| Dialog nhiều bước | Sheet từ dưới, cao toàn màn hình |
| Table | Danh sách thẻ, ẩn cột phụ |
| Lịch: chip tên | Lịch: chấm + panel ngày bên dưới |
| Master-detail 2 vùng | Điều hướng cây → chi tiết (route riêng) |
| Ô tìm `⌘K` | Icon → tìm toàn màn hình |

9. **Kiểm thử bắt buộc ở 360, 768, 1280** (và zoom 200%) trước khi merge UI mới.

## 8. Khả năng truy cập (a11y)
- Mọi điều khiển có tên truy cập (`aria-label` nếu chỉ có icon); icon trang trí `aria-hidden`.
- **Không dựa vào màu đơn thuần:** badge luôn có nhãn chữ (`z-badge` + label).
- Điều hướng bàn phím đầy đủ; focus nhìn thấy (`ring`); Dialog/Sheet giữ focus và đóng bằng `Esc`.
- Nhóm lựa chọn dùng `role="radiogroup"/"radio"` + `aria-checked`.
- Tôn trọng `prefers-reduced-motion`; không hoạt ảnh bắt buộc.
- Trạng thái đang tải: `aria-busy`; lỗi: vùng `role="alert"`.
- Tương phản ≥ 4.5:1 (test tự động), chữ lớn ≥ 3:1.

## 9. Dữ liệu
- Truy cập qua repository; nhiều bảng liên quan phải nằm trong **một transaction** (`db.transaction`).
- Thêm trường/store: tăng `version(n+1)` + `upgrade()`; **không sửa** version cũ; có test migration.
- ID `crypto.randomUUID()`; thời điểm tạo/sửa là ISO 8601 UTC; ngày lịch là `YYYY-MM-DD` giờ Việt Nam.
- Dữ liệu đọc từ DB/`localStorage` coi là **không tin cậy**: kiểm tra kiểu, giá trị hỏng quay về mặc định.
- Truy vấn lịch theo **khoảng ngày**, không truy vấn từng ô.
- Xóa: tuân quy tắc ở SOLUTION §4.3; thao tác phá hủy luôn có xác nhận (và hoàn tác nếu khả thi).

## 10. Lỗi và trạng thái
- Lỗi nghiệp vụ dùng lớp lỗi có kiểu (`EventValidationError`); UI hiển thị thông điệp tiếng Việt, ngắn, nói rõ cách khắc phục.
- Không nuốt lỗi im lặng; `catch` phải xử lý hoặc ghi nhận. `try/catch` quanh `localStorage` được phép bỏ qua (chế độ riêng tư).
- Mỗi danh sách: skeleton (đang tải) → trống (có hành động gợi ý) → lỗi (có nút thử lại).
- Lỗi lên lịch nhắc **không** làm hỏng việc lưu sự kiện: lưu trước, báo lỗi nhắc và cho thử lại.

## 11. Nội dung và định dạng
- Chuỗi giao diện tiếng Việt, câu ngắn, xưng hô trung tính. Gom chuỗi dài lặp lại vào hằng số; sẽ trích sang i18n khi cần đa ngôn ngữ.
- Ngày hiển thị `dd/MM/yyyy`; ngày âm `d/M` (kèm `nhuận`), năm Can Chi khi cần. Dùng hàm trong `shared/utils/format` và `core/domain/lunar`.
- Giờ 24h `HH:mm`.

## 12. Kiểm thử
| Loại | Công cụ | Yêu cầu |
|---|---|---|
| Domain (ngày, lịch âm, lặp, nhắc, validation) | Vitest | **Bắt buộc** cho mọi hàm mới; độ phủ domain ≥ 90% |
| Repository/Service | Vitest + `fake-indexeddb` | Mỗi quy tắc xóa/ràng buộc có test |
| Component | Vitest + TestBed | Hành vi người dùng thấy, không test chi tiết cài đặt |
| Theme | `theme-contrast.spec.ts` | Chạy mỗi PR |
| E2E | Playwright | Luồng chính: tạo → hiển thị → sửa → xóa; offline |
- Mẫu AAA; một `it` kiểm một hành vi. Test dùng `Clock`/dữ liệu cố định, **không** phụ thuộc ngày hiện tại.
- Test lịch âm dùng các mốc đã xác minh; thêm mốc mới kèm nguồn đối chiếu trong commit.
- Sửa lỗi = thêm test tái hiện lỗi trước.

## 13. Git, review và Definition of Done
- **Conventional Commits:** `feat(calendar): thêm chế độ agenda`, `fix(lunar): …`, `docs: …`, `chore: …`. Một PR một mục đích, nhỏ (< 400 dòng đổi là lý tưởng).
- Nhánh `main` luôn xanh; merge bằng squash qua PR; CI (`format:check`, `lint`, `test:ci`, `build`) phải đạt.

**Checklist PR (reviewer kiểm tra):**
- [ ] Không phá quy tắc phụ thuộc lớp; domain vẫn thuần.
- [ ] Không màu/kích thước cứng; dùng token và thang Tailwind.
- [ ] Có đủ loading / trống / lỗi cho phần UI mới.
- [ ] Responsive đã xem ở 360 / 768 / 1280; nút ≥ 44px trên mobile.
- [ ] A11y: tên truy cập, focus, không chỉ dựa vào màu.
- [ ] Có test cho logic mới; test không phụ thuộc ngày hiện tại.
- [ ] Thay đổi schema có migration + test.
- [ ] Bundle không vượt ngân sách; không thêm dependency vô cớ.
- [ ] Tài liệu (SOLUTION/CONVENTIONS) cập nhật nếu đổi quyết định.

**Definition of Done:** hoạt động offline; qua CI; qua checklist; được review; tài liệu cập nhật; không có `TODO` mà không gắn mã phase.

## 14. Tài liệu và quyết định
- Quyết định kiến trúc mới ghi vào SOLUTION §2.3 (ADR rút gọn): bối cảnh, lựa chọn, hệ quả.
- `TODO` trong mã phải có mã phase (`TODO(P6): …`).
