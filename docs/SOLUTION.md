# Tài liệu giải pháp kỹ thuật: Event Reminder (Web, Angular + ZardUI)

- **Nền tảng:** Web responsive + PWA (cài được, chạy offline)
- **Framework:** Angular 21 (standalone, signals, zoneless) · TypeScript strict
- **UI:** ZardUI (copy-source, Tailwind CSS v4) · token theme riêng, xem §10
- **Lưu trữ:** IndexedDB qua Dexie, offline-first, không backend, không tài khoản
- **Lịch:** Dương lịch + âm lịch Việt Nam (đã cài đặt và kiểm thử)
- **Nhắc nhở:** Web Notifications + Service Worker, **có giới hạn nền tảng**, xem §9
- **Trạng thái:** Base đã dựng và kiểm chứng (`lint` + 119 test + `build` đạt). UI nghiệp vụ còn lại theo §12.
- **Thay thế:** tài liệu gốc React Native + Expo (SQLite). Phần nghiệp vụ giữ nguyên, phần nền tảng viết lại.

---

## 1. Mục tiêu và phạm vi

Ứng dụng quản lý sự kiện cá nhân: nhắc trước giờ diễn ra, quản lý người thân theo **Bên nội/Bên ngoại → Gia đình → Thành viên**, xem và nhập ngày theo dương lịch/âm lịch Việt Nam. Chạy tốt trên điện thoại, máy tính bảng và máy tính để bàn bằng **một codebase**.

### 1.1 Mục tiêu MVP
1. Tạo, xem, sửa, xóa sự kiện (tạo theo 4 bước, có chế độ tạo nhanh).
2. Sự kiện một lần và lặp ngày/tuần/tháng/năm; lặp hằng năm theo dương lịch hoặc âm lịch (có chính sách tháng nhuận).
3. Nhiều mốc nhắc cho một sự kiện.
4. Bốn mục chính: Hôm nay, Lịch, Danh bạ, Cài đặt.
5. Danh bạ phân cấp, một người thuộc nhiều gia đình không nhân bản hồ sơ.
6. Giao diện Sáng/Tối/Tự động, 3 bộ màu, 5 cỡ chữ.
7. Dữ liệu lưu cục bộ, có **xuất/nhập sao lưu** (nâng từ "sau MVP" lên MVP vì lý do ở §9 và §13).
8. Cài được như ứng dụng (PWA) và dùng được khi mất mạng.

### 1.2 Ngoài phạm vi MVP
Đăng nhập, đồng bộ cloud/nhiều thiết bị, đồng bộ hai chiều Google/Apple Calendar, Web Push từ máy chủ, chia sẻ gia đình, AI tạo lịch.

### 1.3 Thay đổi so với bản mobile

| Chủ đề | Bản mobile (RN/Expo) | Bản web (tài liệu này) | Lý do |
|---|---|---|---|
| Framework | React Native + Expo Router | Angular 21 + Angular Router | Quyết định của dự án |
| Lưu trữ | SQLite (`expo-sqlite`) | IndexedDB (Dexie) | SQLite không chạy native trên trình duyệt; IndexedDB là chuẩn |
| Quan hệ dữ liệu | Bảng rời `recurrence_rules`, `reminders`, `event_exceptions` | **Aggregate**: rule/reminders/exceptions nằm trong bản ghi sự kiện | Một lần ghi là nguyên tử; bỏ join |
| State UI | Zustand | Signals + `liveQuery` | Không cần thư viện state |
| Form | React Hook Form + Zod | Reactive Forms (typed) + validator thuần | Bỏ Zod giảm bundle ban đầu từ 842 KB xuống 387 KB (chưa nén) |
| Notification | `expo-notifications` (lên lịch cục bộ trong OS) | Timer + Service Worker khi ứng dụng mở | **Web không có API lên lịch cục bộ**, xem §9 |
| Accent hệ điều hành | `SystemAccentColorProvider` | Bỏ; thay bằng 3 bộ màu | Web không có API accent chung |
| Cỡ chữ | Font scale RN | `rem` + biến `--app-font-size` | Tôn trọng zoom trình duyệt |
| Điều hướng | Tab dưới | Responsive: tab dưới, rail, sidebar | Một codebase nhiều kích thước |
| Theme | 9 màu chủ đạo | 3 bộ màu (Default, Light26, Light27) × sáng/tối | Bộ màu do thiết kế cung cấp |

---

## 2. Quyết định kiến trúc

### 2.1 Stack

| Thành phần | Công nghệ | Trách nhiệm |
|---|---|---|
| Framework | Angular 21.2, standalone, zoneless | UI, routing, DI |
| Ngôn ngữ | TypeScript strict | Kiểu dữ liệu, kiểm tra tĩnh |
| UI kit | ZardUI + Tailwind CSS v4 | Component có thể sở hữu mã nguồn |
| Icon | SVG nội bộ (`AppIcon`), ZardUI sẽ thêm bộ icon riêng | |
| Database | Dexie 4 (IndexedDB) | Dữ liệu bền vững, `liveQuery` |
| Ngày giờ | Module domain thuần (`date.ts`) | Ngày là chuỗi `YYYY-MM-DD`, không dùng `Date` cho ngày lịch |
| Lịch âm | `lunar.ts` (thuật toán Hồ Ngọc Đức, UTC+7) | Hàm thuần |
| PWA | `@angular/service-worker` | Cache offline, cài ứng dụng |
| Font | `@fontsource/be-vietnam-pro` (tự host) | Offline, không phụ thuộc CDN |
| Test | Vitest (qua `ng test`), `fake-indexeddb` | Unit + tích hợp |
| Lint/format | angular-eslint, Prettier | Chuẩn mã |

### 2.2 Nguyên tắc
1. IndexedDB là nguồn dữ liệu chính. Component **không** truy vấn DB trực tiếp, đi qua repository/service.
2. `core/domain` là TypeScript thuần: không import Angular, Dexie, RxJS (ESLint chặn).
3. Recurrence engine và lunar converter là hàm thuần, có test.
4. Hệ thống nhắc nằm sau interface `ReminderScheduler`, thay được bằng mock hoặc adapter khác.
5. Lưu sự kiện lặp dưới dạng **quy tắc**, không tạo sẵn các lần diễn ra.
6. Schema có phiên bản; thay đổi bằng `version(n+1)` kèm `upgrade()`, không sửa phiên bản cũ.
7. Mọi danh sách có đủ trạng thái: đang tải (skeleton), trống, lỗi.
8. Theme và font scale lưu `localStorage` (đọc đồng bộ) để áp dụng trước lần render đầu.

### 2.3 Các quyết định đã chốt (ADR rút gọn)

| # | Quyết định | Lựa chọn khác đã cân nhắc | Hệ quả |
|---|---|---|---|
| 1 | Dexie/IndexedDB | SQLite WASM (OPFS) | Gọn, ổn định, có `liveQuery`. Không có SQL; truy vấn theo khoảng ngày dùng index `startDate` rồi lọc/sinh lần lặp trong bộ nhớ (đủ cho dữ liệu cá nhân) |
| 2 | Sự kiện là aggregate | Chuẩn hóa như SQLite | Ghi nguyên tử; không có ràng buộc FK ở tầng DB nên repository tự giữ toàn vẹn (đã có test) |
| 3 | Signals + `liveQuery`, không NgRx | NgRx / Signal Store | Ít code; UI tự cập nhật khi DB đổi |
| 4 | ZardUI copy-source | Spartan, Angular Material | Sở hữu mã, cùng hệ token shadcn, hợp Tailwind v4 |
| 5 | Tự host font | Google Fonts | Cần cho offline và build không phụ thuộc mạng |
| 6 | Bỏ Zod | Giữ Zod | Bundle ban đầu 842 KB → 387 KB (chưa nén); validator thuần đủ dùng |
| 7 | Cửa sổ lên lịch nhắc 14 ngày + reconcile | Lên lịch toàn bộ | Giới hạn `setTimeout` ~24,8 ngày; tự sửa lệch |

---

## 3. Cấu trúc thư mục (đã dựng)

```text
event-reminder-web/
├── docs/                         # SOLUTION.md, CONVENTIONS.md, FEATURE-PARITY.md
├── public/                       # manifest.webmanifest, icons (từ thiết kế app icon)
├── src/
│   ├── styles.css                # Tailwind v4 + token theme + @theme inline
│   ├── test-setup.ts             # fake-indexeddb cho test
│   └── app/
│       ├── app.ts / app.config.ts / app.routes.ts
│       ├── core/                 # hạ tầng + nghiệp vụ, không chứa UI nghiệp vụ
│       │   ├── domain/           # THUẦN: date, lunar, recurrence, reminders, validation, models
│       │   ├── data/             # db (Dexie), repositories, EventService, Clock, seed
│       │   ├── notifications/    # ReminderScheduler (port), InAppReminderScheduler, Reconciler, Permission
│       │   ├── theme/            # ThemeService + test tương phản WCAG
│       │   └── layout/           # AppShell responsive
│       ├── features/             # mỗi feature là một route lazy
│       │   ├── today/  calendar/  contacts/  settings/  events/
│       └── shared/
│           ├── ui/               # component dùng chung (icon, event-badge, sau này: ZardUI)
│           └── utils/            # cn(), format
└── .github/workflows/ci.yml
```

**Quy tắc phụ thuộc** (ESLint thực thi một phần):

```text
features ──► core/data, core/notifications, core/theme, shared
core/data, core/notifications ──► core/domain
core/domain ──► (không gì cả)
shared ──► core/domain (chỉ kiểu và hàm thuần)
features KHÔNG import chéo nhau
```

---

## 4. Điều hướng và màn hình

### 4.1 Routes

| Route | Màn hình | Trạng thái |
|---|---|---|
| `/today` | Hôm nay | Có dữ liệu thật, skeleton/trống |
| `/calendar` | Lịch tháng + ngày âm + panel ngày | Có dữ liệu thật |
| `/contacts` | Cây danh bạ (đọc) | Khung, CRUD ở Phase 6 |
| `/settings` | Giao diện, bộ màu, cỡ chữ, quyền thông báo | Có, thiếu dữ liệu/sao lưu |
| `/events/new` | Tạo sự kiện 4 bước | Khung |
| `/events/:id` | Chi tiết/sửa/xóa | Khung |

### 4.2 Responsive (một nguồn nội dung, ba cách sắp xếp)

| Thành phần | Mobile < 768 | Tablet ≥ 768 | Desktop ≥ 1024 |
|---|---|---|---|
| Điều hướng chính | Thanh tab dưới | Rail icon | Sidebar đầy đủ |
| Tạo/sửa sự kiện | Sheet toàn màn hình | Dialog | Dialog |
| Danh sách thành viên | Danh sách thẻ | Bảng rút gọn | Bảng đầy đủ |
| Lịch tháng | Chấm sự kiện + panel ngày bên dưới | Chip tên sự kiện | Chip + panel bên phải |
| Danh bạ | Điều hướng cây → chi tiết | Hai vùng | Hai vùng |
| Tìm kiếm | Icon → toàn màn hình | Ô tìm kiếm | Ô tìm kiếm + `⌘K` |
| Nút/ô nhập | cao 44px | 36px | 36px |

Quy ước chi tiết ở `CONVENTIONS.md` §7.

### 4.3 Hôm nay, Lịch, Danh bạ, Cài đặt
Giữ nguyên chức năng và tiêu chí nghiệm thu của tài liệu gốc (§4.1 đến §4.4), bổ sung:
- **Lịch:** chuyển tháng giữ nguyên ngày đang chọn (kẹp về ngày cuối tháng nếu cần), truy vấn **một lần theo khoảng 42 ô**, không truy vấn từng ô. *(Đã cài đặt)*
- **Danh bạ, quy tắc xóa** *(đã cài đặt ở repository, có test)*: gỡ khỏi gia đình không xóa hồ sơ; xóa gia đình có hai chế độ (`unlink-only`, `remove-exclusive-contacts`); xóa liên hệ không xóa sự kiện, chỉ gỡ liên kết khi người dùng xác nhận.
- **Cài đặt:** thêm mục **Dữ liệu và sao lưu** (xuất JSON, nhập, xuất `.ics`) và trạng thái **quyền thông báo** với 4 trạng thái (chưa hỏi, đã cấp, bị từ chối, không hỗ trợ).

---

## 5. Mô hình dữ liệu (IndexedDB, schema v1)

| Store | Khóa / index | Ghi chú |
|---|---|---|
| `events` | `id`, `startDate`, `status`, `category` | Aggregate: `rule`, `reminders[]`, `exceptions[]`, `contactIds[]` nằm trong bản ghi |
| `contactGroups` | `id`, `kind`, `sortOrder` | Seed sẵn Bên nội, Bên ngoại (`populate`) |
| `families` | `id`, `groupId` | |
| `contacts` | `id`, `displayName` | `birthLunar` riêng, không suy ra mọi ngày sinh là dương lịch |
| `familyMembers` | `id`, `familyId`, `contactId`, **unique** `[familyId+contactId]` | Một người nhiều gia đình |
| `notificationSchedules` | `id`, `eventId`, `scheduledAt`, **unique** `[occurrenceKey+reminderId]` | Trạng thái `scheduled/failed/cancelled/delivered` |
| `settings` | `key` | Giá trị có kiểu, đọc hỏng thì dùng mặc định |

- ID: `crypto.randomUUID()`. Ngày: chuỗi `YYYY-MM-DD`. Giờ: `HH:mm`. Múi giờ mặc định `Asia/Ho_Chi_Minh` (UTC+7, không DST).
- Ngày cả ngày là **ngày lịch**, không ép sang UTC.
- `event_contacts` của bản mobile được gộp vào `events.contactIds`.

---

## 6. Ngày giờ và lịch âm *(đã cài đặt)*

- Dương lịch là chuẩn cho giờ diễn ra và giờ nhắc; âm lịch để hiển thị, nhập và xác định lặp âm lịch.
- API: `gregorianToLunar(iso): LunarDate`, `lunarToGregorian(lunar): ISODate | null` (null nếu ngày âm không tồn tại: tháng nhuận không có, ngày 30 của tháng thiếu).
- Test hiện có: mùng 1 Tết 2021–2028, Trung thu 2026 (15/8 = 25/9/2026), 29/8/2026 = 09/10/2026, tháng nhuận 2 năm 2023, cuối năm âm, **khứ hồi từng ngày 2020–2032**, Can Chi.
- **Việc còn lại:** đối chiếu thêm với một bảng lịch Việt Nam chính thống cho các năm xa hơn (trước 2020, sau 2032) và các ngày biên tháng thiếu/đủ. Thuật toán thiên văn có thể lệch ở năm hiếm gặp.
- Ngày âm không tồn tại trong một năm: engine **bỏ qua** lần đó (chính sách hiện tại). Cần hiển thị cảnh báo khi người dùng chọn tổ hợp dễ gặp (ví dụ ngày 30).

---

## 7. Recurrence engine *(đã cài đặt)*

`getOccurrencesInRange(event, from, to)` trả về các lần diễn ra trong khoảng, sinh lười (generator) từ quy tắc.

| Quy tắc | Ghi chú |
|---|---|
| `none`, `daily`, `weekly` (nhiều thứ, mỗi N tuần) | Tuần tính từ thứ Hai của tuần chứa ngày bắt đầu |
| `monthly` | `missingDay: 'clamp' \| 'skip'` cho ngày 29/30/31 |
| `yearly-solar` | 29/2 chuyển về 28/2 năm thường |
| `yearly-lunar` | `leapPolicy: 'regular' \| 'leap' \| 'both'` |
| Kết thúc | `never`, `until`, `count` (số lần **tính cả lần bị bỏ qua**) |

- **Occurrence key** ổn định: một lần `id:single`; dương lịch `id:YYYY-MM-DD`; âm lịch `id:L{năm}-{tháng}[N]-{ngày}` (`N` = nhuận).
- **Ngoại lệ:** `skip` và `override` (đổi ngày, giờ, tiêu đề). Override có thể dời một lần vào/ra khỏi khoảng đang xem.
- **Sửa "lần này và các lần sau"** (chưa có UI): cài bằng cách đặt `until` cho chuỗi cũ và tạo sự kiện mới với quy tắc mới từ ngày đó. Cần test riêng trước khi làm UI.

---

## 8. Validation
`validateEventDraft` (thuần, có test): tiêu đề rỗng, ngày/giờ sai định dạng, giờ kết thúc trước giờ bắt đầu (cho phép qua nửa đêm khi khác ngày), `weekly` thiếu thứ, khoảng lặp < 1... `EventRepository` chặn dữ liệu sai bằng `EventValidationError`.

---

## 9. Nhắc nhở trên web: giới hạn và cách giảm thiểu

> **Đây là rủi ro lớn nhất khi chuyển từ mobile sang web.** Bản mobile nhờ hệ điều hành giữ lịch; trên web **không có API chuẩn để lên lịch thông báo cục bộ khi trình duyệt không chạy mã của trang**.

### 9.1 Sự thật nền tảng

| Tình huống | Có nhắc được không |
|---|---|
| Tab/PWA đang mở (kể cả nền) | **Có**: timer + Service Worker `showNotification` |
| Tab đã đóng, trình duyệt vẫn chạy nền | Không đảm bảo, tùy trình duyệt |
| PWA cài trên Android/desktop, đã đóng | Không đảm bảo. Periodic Background Sync chỉ có ở Chromium, khoảng cách dài, không chính xác |
| iOS Safari | Chỉ Web Push cho PWA đã thêm vào Màn hình chính, **cần máy chủ đẩy** |
| Notification Triggers API | Chưa là chuẩn, Chrome đã dừng thử nghiệm: **không dựa vào** |

### 9.2 Chiến lược nhiều lớp

1. **Lớp 1, đã cài đặt:** `InAppReminderScheduler` hẹn timer cho lời nhắc trong cửa sổ 14 ngày; hiện qua Service Worker nếu có quyền, ngược lại hiện toast trong ứng dụng (`fallback` signal).
2. **Lớp 2, bắt buộc cho MVP:** **Xuất `.ics` có `VALARM`** để hệ điều hành/Google/Apple Calendar nhắc thay ứng dụng. Với sự kiện âm lịch, ICS không biểu diễn được lịch âm nên **xuất từng lần diễn ra cho N năm tới** (mặc định 10 năm) dưới dạng nhiều `VEVENT`. Đây là cách duy nhất không cần máy chủ mà nhắc được khi đóng trình duyệt.
3. **Lớp 3, tùy chọn:** Periodic Background Sync trên Chromium để đối soát và hiện nhắc còn thiếu (best-effort).
4. **Lớp 4, ngoài MVP:** Web Push (VAPID) cần backend nhỏ gửi push theo lịch. **Mâu thuẫn với "không backend"**, cần quyết định riêng.

### 9.3 Đối soát (reconcile)
Hai nơi (IndexedDB và hệ thống nhắc) không thể nguyên tử. `ReminderReconciler.reconcile()` idempotent, chạy khi: mở ứng dụng, tab hiện lại, mỗi giờ, và sau mỗi thay đổi qua `EventService`. Nó dựng lại tập lời nhắc mong muốn bằng hàm thuần `buildReminderPlans`, hủy cái thừa, thêm cái thiếu, rồi ghi `notificationSchedules` (`scheduled` hoặc `failed`).

### 9.4 Quy tắc tính giờ nhắc *(đã cài đặt, có test)*
- Có giờ: `fireAt = giờ bắt đầu − offsetMinutes`.
- Cả ngày: lấy ngày diễn ra tại `allDayReminderTime` (mặc định 09:00); offset là bội số 1440 thì lùi đúng số ngày; **không trừ phút từ 00:00**.
- Cửa sổ hẹn giờ 14 ngày (giới hạn `setTimeout` ~24,8 ngày); lời nhắc xa hơn được lên lịch ở lần reconcile sau.

### 9.5 UX bắt buộc
Trạng thái quyền rõ ràng ở Cài đặt; câu chữ trung thực "chỉ nhắc khi ứng dụng đang mở"; gợi ý cài PWA; gợi ý xuất `.ics` cho ngày quan trọng (giỗ, sinh nhật); toast khi không có quyền.

---

## 10. Theme, ZardUI và responsive

### 10.1 Cách ZardUI nhận theme
ZardUI dùng biến CSS kiểu shadcn (`--background`, `--primary`, `--border`, `--radius`...) trong `src/styles.css`, ánh xạ sang Tailwind bằng `@theme inline`. Mọi component, dù viết tay hay thêm bằng `zard-cli`, chỉ dùng **token** (`bg-primary`, `text-muted-foreground`), không dùng mã màu.

### 10.2 Ba bộ màu × sáng/tối
Chọn bằng class trên `<html>`: không class = Default, `theme-light26`, `theme-light27`; thêm `dark` cho chế độ tối. `ThemeService` quản lý (signals, lưu `localStorage`, theo dõi `prefers-color-scheme` khi ở chế độ Tự động).

### 10.3 Ánh xạ token

| Token của thiết kế | Token ZardUI |
|---|---|
| `--bg` | `background` |
| `--text` | `foreground`, `card-foreground`, `popover-foreground` |
| `--surface` | `card`, `popover`, `sidebar` |
| `--primary` / `--on-primary` | `primary` / `primary-foreground`, `ring`, `sidebar-primary` |
| `--off` | `secondary`, `muted` |
| `--muted` | `muted-foreground` |
| `--glow` | `accent`, `sidebar-accent` (hover, mục đang chọn) |
| `--divider` | `border`, `input` (đậm hơn) |
| `--error` | `destructive` |
| `--truth`, `--dare`, `--drink`, `--ok` | `event-work`, `event-birthday`, `event-memorial`, `event-done` (+ bản `-ink` cho chữ) |

### 10.4 Điều chỉnh để đạt WCAG AA
Kiểm tra 11 cặp màu chữ/nền × 6 biến thể phát hiện 6 cặp dưới 4.5:1. Đã chỉnh nhẹ (test `theme-contrast.spec.ts` giữ cho không tái phạm):

| Biến thể | Token | Cũ | Mới |
|---|---|---|---|
| Light26 sáng | `muted-foreground` | `#55706d` | `#4e6966` |
| Light26 sáng | `destructive` | `#d9472b` | `#d3442b` |
| Light26 sáng | `event-birthday-ink` | `#c7432a` | `#bb3d2a` |
| Light27 sáng | `primary` | `#2f6bf0` | `#2f66e6` |
| Light27 sáng | `event-work-ink` | `#2f6bf0` | `#2457e0` (`--truth-ink` của bạn) |
| Default tối | `event-work-ink` | `#8b86ff` | `#938eff` |

> Các bản thiết kế (canvas) vẽ trước điều chỉnh này; chênh lệch chỉ vài sắc độ.

### 10.5 Cài ZardUI vào project
Chưa chạy được trong môi trường dựng base (CLI lấy component từ `zardui.com/r`). Chạy trên máy dev:

```bash
npx zard-cli init            # sinh components.json, chọn thư mục components
npx zard-cli add button badge card dialog sheet tabs table calendar input select switch avatar alert skeleton
```
Sau khi thêm, gộp token do CLI sinh với token trong `src/styles.css` (giữ token của dự án), kiểm tra lại `npm run check`. Tên component cụ thể xác nhận theo tài liệu ZardUI tại thời điểm cài.

---

## 11. State management

| Loại | Nơi lưu |
|---|---|
| Dữ liệu nghiệp vụ | IndexedDB (nguồn sự thật) |
| Dữ liệu hiển thị | `liveQuery` → `toSignal` (tự cập nhật khi DB đổi) |
| Trạng thái màn hình (ngày chọn, tháng xem) | `signal()` trong component |
| Theme, cỡ chữ | `ThemeService` (signals + `localStorage`) |
| Quyền thông báo | `NotificationPermissionService` (signal) |

Use case ghi dữ liệu đi qua `EventService` để luôn kích hoạt `reconcile()`. Không giữ bản sao dữ liệu nghiệp vụ lâu dài ngoài DB.

---

## 12. Roadmap

Hoàn thành ✅ · Một phần 🟡 · Chưa ⬜. Thời gian cho một developer đã quen Angular; chưa gồm thiết kế lại hay lỗi nền tảng.

| Phase | Nội dung | Trạng thái | Còn lại |
|---|---|---|---|
| **0 Khởi tạo** | Angular, strict, ESLint, Prettier, CI, PWA, Tailwind v4, path alias | ✅ | Chạy `zard-cli init` (0,5 ngày) |
| **1 Domain + DB** | Models, Dexie v1, repository, validation | ✅ | Thêm `import/export` (xem P7) |
| **2 Theme + CRUD sự kiện** | Theme/font scale ✅, shell ✅, Hôm nay ✅, Lịch tháng ✅ | 🟡 | Form 4 bước + tạo nhanh, chi tiết/sửa/xóa, Cài đặt đầy đủ (3 đến 4 ngày) |
| **3 Lịch âm** | Converter + test | ✅ | Đối chiếu bảng chuẩn thêm (0,5 ngày) |
| **4 Recurrence** | Engine + exception | ✅ | UI "chỉ lần này / lần này và sau / toàn bộ" (1 đến 2 ngày) |
| **5 Nhắc nhở** | Port + adapter in-app, reconciler, quyền | 🟡 | Click thông báo → mở sự kiện (SW), **xuất `.ics`**, toast fallback UI, Periodic Sync tùy chọn (2 đến 4 ngày) |
| **6 Danh bạ** | Quy tắc dữ liệu ✅ (repo + test) | 🟡 | UI CRUD, tìm kiếm, chi tiết liên hệ, xác nhận xóa, nhập vCard/CSV (3 đến 4 ngày) |
| **7 Kiểm thử + phát hành** | 119 unit/integration ✅ | 🟡 | E2E (Playwright), axe, Lighthouse PWA, test iOS/Android/desktop thật, xuất/nhập sao lưu, hosting HTTPS (3 đến 5 ngày) |

Tổng còn lại: khoảng **2,5 đến 4 tuần** cho một developer.

---

## 13. Kiểm thử

**Đã có (119 test):** lunar (17), recurrence (12), reminders (4), validation (7), repository + quy tắc xóa + settings (6), app (1), tương phản WCAG 6 biến thể (72).

**Cần thêm:**
- **E2E (Playwright):** tạo sự kiện lặp âm lịch, mở lại ứng dụng dữ liệu còn, đổi theme, offline (tắt mạng sau lần tải đầu).
- **Nhắc nhở:** quyền cấp/từ chối/đổi, sửa/xóa sau khi đã hẹn, nhiều sự kiện cùng giờ, tab ẩn/hiện, khởi động lại trình duyệt, scheduler lỗi.
- **Dữ liệu:** migration giữa các phiên bản schema, dữ liệu hỏng, xóa dữ liệu trình duyệt (cảnh báo + sao lưu).
- **Responsive:** 360, 768, 1280 px; xoay màn hình; zoom 200%.
- **A11y:** axe tự động, điều hướng bàn phím, focus trong Dialog/Sheet, `prefers-reduced-motion`.

---

## 14. Tiêu chí nghiệm thu MVP

- [ ] Bốn mục chính hoạt động ổn định trên 360, 768, 1280 px.
- [ ] Dữ liệu lưu cục bộ, còn sau khi đóng/mở lại và khi offline.
- [ ] Tạo/sửa/xóa sự kiện không làm lệch lời nhắc (reconcile đúng).
- [ ] Lặp ngày/tuần/tháng/năm đúng quy tắc đã công bố; âm lịch xử lý tháng nhuận theo lựa chọn rõ ràng.
- [ ] Ngày âm được xác minh bằng bộ test và đối chiếu bảng chuẩn.
- [ ] Danh bạ phân cấp đúng, không nhân bản hồ sơ khi liên kết nhiều gia đình.
- [ ] Theme (3 × sáng/tối) và cỡ chữ áp dụng toàn ứng dụng; tương phản AA (test tự động).
- [ ] Trạng thái quyền thông báo rõ ràng; **giới hạn nhắc trên web được nói thẳng với người dùng**.
- [ ] Có xuất `.ics` (VALARM) và xuất/nhập sao lưu JSON.
- [ ] Cài được PWA, Lighthouse PWA đạt, không lỗi axe nghiêm trọng.
- [ ] E2E luồng chính xanh trên CI.

---

## 15. Khởi chạy

```bash
nvm use                      # Node 22 (xem .nvmrc)
npm ci
npm start                    # http://localhost:4200
npm run check                # format + lint + test + build
```

Mở `/settings` ở chế độ dev, bấm **Nạp dữ liệu mẫu** (giỗ ông nội 29/8 âm, sinh nhật, tiền điện hằng tháng, gia đình mẫu).

> `.npmrc` đặt `legacy-peer-deps=true`: npm 10 gặp lỗi `edgesOut` khi giải cây phụ thuộc mặc định trong lúc dựng base. Thử bỏ khi dùng npm ≥ 11.

---

## 16. Rủi ro và câu hỏi mở

1. **Nhắc khi đóng trình duyệt** (§9): chấp nhận mô hình `.ics` + nhắc khi mở, hay làm backend Web Push?
2. **Mất dữ liệu:** người dùng xóa dữ liệu trình duyệt là mất sạch. Cần nhắc sao lưu định kỳ và xin `navigator.storage.persist()`.
3. **iOS:** hỗ trợ PWA/Web Push của Safari có điều kiện; cần thử trên thiết bị thật.
4. **Độ chính xác lịch âm** ở năm xa: cần bảng đối chiếu chính thống.
5. **Nhập danh bạ điện thoại:** Contact Picker API hạn chế; dùng nhập vCard/CSV.
6. **Phiên bản Angular:** base dùng 21.2 vì Angular CLI mới nhất đòi Node cao hơn môi trường dựng; nâng bằng `ng update`.
