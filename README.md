# Sàn thương mại điện tử nông sản (Nông Sản Sạch)

Dự án gồm **giao diện tĩnh** (HTML/CSS/JS) và **API Node.js (Express) + PostgreSQL**.

---

## Yêu cầu môi trường

- [Node.js](https://nodejs.org/) (khuyến nghị LTS)
- [PostgreSQL](https://www.postgresql.org/download/) đang chạy cục bộ

---

## 1. Tạo cơ sở dữ liệu

Script mặc định trong code dùng database tên **`ECommerce`**, user **`postgres`**, mật khẩu **`12345678`** (trùng với `server/.env` và `server/db.js`).

1. Mở **pgAdmin** hoặc `psql` và tạo database (nếu chưa có):

```sql
CREATE DATABASE "ECommerce" ENCODING 'UTF8';
```

2. Chạy file khởi tạo schema (từ thư mục gốc repo):

```bash
psql -U postgres -d ECommerce -f database/database_gen.sql
```

**Lưu ý:** File SQL có lệnh `ALTER USER postgres WITH PASSWORD '12345678';`. Nếu mật khẩu Postgres của bạn khác, chỉnh lại cho khớp hoặc bỏ qua dòng đó và cập nhật `DATABASE_URL` trong `server/.env`.

---

## 2. Cấu hình backend

Trong thư mục `server/`, file `.env` mẫu:

- `DATABASE_URL` — chuỗi kết nối PostgreSQL
- `JWT_SECRET` — chuỗi bí mật ký JWT (nên đổi khi triển khai thật)
- `PORT` — cổng API (mặc định **3000**)

Sau khi sửa `.env`, không cần làm thêm bước nào khác nếu chỉ chạy local.

---

## 3. Chạy API server

```bash
cd server
npm install
npm start
```

Chạy có tự động nạp lại khi sửa code:

```bash
npm run dev
```

Khi thành công, terminal sẽ in: `Server listening on http://localhost:3000`.

---

## 4. Chạy thử giao diện (frontend)

Trang gọi API tới `http://localhost:3000` (ví dụ `features/home/home.js`). Nên mở site qua **HTTP** (không mở trực tiếp file `file://`) để tránh hạn chế trình duyệt.

Từ **thư mục gốc** của repo, ví dụ dùng `serve` (cổng **8080** để không trùng với API **3000**):

```bash
npx --yes serve . -p 8080
```

Sau đó mở trình duyệt:

- Trang chủ: `http://localhost:8080/features/home/index.html`

Các trang khác (đăng nhập, đăng ký, …) nằm trong `features/` — điều hướng theo link trên giao diện hoặc mở trực tiếp file `.html` tương ứng dưới cùng host `http://localhost:8080/...`.

**Thứ tự chạy thử:** bật PostgreSQL → chạy bước 1 (schema) → bước 3 (API) → bước 4 (static server).

---

## 5. Kiểm tra nhanh API

- **Ping:** trình duyệt hoặc terminal:

```bash
curl http://localhost:3000/api/ping
```

Kỳ vọng: JSON dạng `{ "ok": true, "ts": ... }`.

- **Sản phẩm (GET):** `http://localhost:3000/api/products` (cần đã có dữ liệu bảng sản phẩm trong DB).

---

## 6. Kiểm tra kết nối PostgreSQL (tùy chọn)

Trong `psql`, sau khi `\c ECommerce`:

```sql
SELECT NOW();
```

Nếu trả về thời gian server là DB đã chạy và kết nối được.

---

# Cài đặt môi trường dành cho người sử dụng Docker và Nix-OS (hoặc nix-packages manager)

- [Docker](https://www.docker.com/): PostgreSQL chạy trên docker
- [Nix](https://nixos.org/): Quản lí node bằng nix

## Khởi tạo môi trường

Chạy lệnh sau để khởi chạy PostgreSQL trong Docker và Node từ Nix:

```bash
cd Infrastructure/docker && docker-compose up postgre -d
```

Mỗi khi vào code, chạy lệnh sau để vào môi trường Nix:
```bash
nix develop
```

---

## Tài liệu nhóm (nếu cần bổ sung)

- Link repo: *(điền URL)*
- Báo cáo ngắn gọn 1 trang: *(đính kèm / link)*
- Phân chia công việc: *(ghi tên thành viên và phần việc)*
