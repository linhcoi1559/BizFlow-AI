# 🚀 BizFlow AI — Hướng dẫn cài đặt trên máy mới

> **Repo**: https://github.com/linhcoi1559/BizFlow-AI.git
> **Branch**: `master`

---

## 1. Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|-----------|---------------------|---------|
| **Node.js** | 20+ | Khuyến nghị LTS |
| **npm** | 10+ | Đi kèm Node.js |
| **Git** | 2.30+ | |

---

## 2. Clone dự án

```bash
git clone https://github.com/linhcoi1559/BizFlow-AI.git
cd BizFlow-AI
```

---

## 3. Cài đặt dependencies

```bash
npm install
```

---

## 4. Cấu hình biến môi trường

Tạo file `.env` từ template:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Sau đó mở `.env` và điền các giá trị:

```env
# === BẮT BUỘC ===
DATABASE_URL="file:./dev.db"

# === AI (cần để dùng tính năng AI Workspace) ===
GEMINI_API_KEY="your-gemini-api-key-here"

# === SUPABASE AUTH (tùy chọn — bỏ trống để chạy Demo Mode) ===
# NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"

# === DEMO MODE (bật nếu chạy local không cần auth) ===
# BIZFLOW_DEMO_MODE="true"
```

### Chế độ chạy:

- **Local demo** (không cần auth): Chỉ cần `DATABASE_URL`. Bỏ trống cả 2 biến Supabase.
- **Có Authentication**: Điền cả `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **GEMINI_API_KEY**: Lấy từ [Google AI Studio](https://aistudio.google.com/apikey). Không bắt buộc nhưng cần để dùng AI extraction.

---

## 5. Khởi tạo database

```bash
# Tạo database SQLite + apply migrations
npx prisma migrate deploy

# Seed dữ liệu demo (tổ chức, clients, projects, templates...)
npx prisma db seed
```

> ⚠️ Lệnh seed sẽ **xóa sạch** dữ liệu cũ và tạo lại demo data. Chỉ chạy trên database phát triển local.

---

## 6. Chạy ứng dụng

```bash
npm run dev
```

Mở trình duyệt tại: **http://localhost:3000**

---

## 7. Các lệnh hữu ích

| Lệnh | Mô tả |
|-------|--------|
| `npm run build` | Build production |
| `npm run lint` | Kiểm tra ESLint |
| `npx tsc --noEmit` | Kiểm tra TypeScript |
| `npm test` | Chạy test suite |
| `npx prisma studio` | Mở Prisma Studio (xem/sửa DB qua UI) |
| `npx prisma generate` | Tạo lại Prisma Client sau khi đổi schema |
| `npx prisma migrate dev` | Tạo migration mới (khi phát triển) |

---

## 8. Cấu trúc dự án

```
BizFlow-AI/
├── prisma/              # Schema, migrations, seed
├── src/
│   ├── app/             # Next.js App Router (routes + Server Actions)
│   ├── components/      # React components (client & server)
│   ├── lib/             # Prisma, auth, organization, utils
│   ├── services/        # AI providers, documents, execution
│   └── proxy.ts         # Supabase cookie refresh
├── tests/               # Security & unit tests
├── scripts/             # Verification & deployment scripts
├── .env.example         # Template biến môi trường
├── AGENTS.md            # Project context & architecture
└── README.md            # Tổng quan dự án
```

---

## 9. Lấy Gemini API Key

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey)
2. Đăng nhập Google Account
3. Click **"Create API Key"**
4. Copy key và dán vào `GEMINI_API_KEY` trong file `.env`

---

## 10. Checklist nhanh

- [ ] `git clone https://github.com/linhcoi1559/BizFlow-AI.git`
- [ ] `cd BizFlow-AI`
- [ ] `npm install`
- [ ] Tạo `.env` từ `.env.example`
- [ ] Điền `DATABASE_URL="file:./dev.db"`
- [ ] `npx prisma migrate deploy`
- [ ] `npx prisma db seed`
- [ ] `npm run dev`
- [ ] Mở http://localhost:3000 ✅

---

## Troubleshooting

- **Lỗi Prisma**: Xóa `node_modules/.prisma` rồi chạy `npx prisma generate` lại.
- **Port 3000 bị chiếm**: Dùng `npm run dev -- -p 3001`.
- **Lỗi SQLite trên máy mới**: Chạy lại `npx prisma migrate deploy` để tạo file `dev.db`.
