# TeslaAcademy LMS — Backend API

Express.js + Prisma + PostgreSQL backend for TeslaAcademy LMS.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database URL, JWT secrets, AWS keys, and Flouci keys
```

### 3. Set up database
```bash
# Push schema to your PostgreSQL database
npm run prisma:push

# Or run migrations (for production)
npm run prisma:migrate
```

### 4. Run development server
```bash
npm run dev
```

Server starts on `http://localhost:4000`

---

## Project Structure

```
src/
├── controllers/
│   ├── adminAuth.controller.ts    # Admin/teacher registration, login, invite
│   ├── studentAuth.controller.ts  # Student auth + OTP phone login
│   ├── organization.controller.ts # Org creation + white-label config
│   ├── batch.controller.ts        # Batch CRUD + Flouci checkout
│   ├── content.controller.ts      # Content CRUD + video progress tracking
│   ├── testSeries.controller.ts   # Test series, tests, sections, questions
│   ├── attempt.controller.ts      # Test attempt lifecycle + auto-scoring
│   └── misc.controller.ts         # Teachers, subjects, chapters, topics,
│                                   # schedules, orders, uploads, profile
├── middleware/
│   ├── auth.ts                    # JWT authentication + role guards
│   ├── errorHandler.ts            # Global error handler (Prisma errors too)
│   └── validate.ts                # express-validator helper
├── routes/
│   ├── admin.*.routes.ts          # Admin-scoped routes (/admin/...)
│   └── student.*.routes.ts        # Student-scoped routes (/api/...)
└── utils/
    ├── prisma.ts                  # Prisma client singleton
    ├── jwt.ts                     # Sign/verify access + refresh tokens
    ├── response.ts                # sendSuccess / sendError / sendPaginated
    ├── email.ts                   # Nodemailer helpers (verify, invite, reset)
    ├── s3.ts                      # AWS S3 signed URLs + multipart upload
    └── logger.ts                  # Winston logger

prisma/
└── schema.prisma                  # 18-model PostgreSQL schema
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_EXPIRES_IN` | Access token TTL (default: `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) |
| `PORT` | Server port (default: `4000`) |
| `FRONTEND_URL` | Frontend origin for CORS |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `AWS_REGION` | S3 bucket region |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_CLOUDFRONT_URL` | CloudFront CDN base URL |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email config |
| `FLOUCI_PUBLIC_KEY` | Flouci public key |
| `FLOUCI_PRIVATE_KEY` | Flouci private key |

---

## Key Design Decisions

### Multi-tenancy
Every query is scoped by `organizationId` extracted from the JWT payload. Students of one org can never access another org's data.

### Auth Flow
- Admin/Teacher: email → verify → set password → login → JWT
- Student: same as above, OR phone → OTP → JWT
- All tokens: 15-min access token + 7-day refresh token (stored in `refresh_tokens` table)
- Token refresh: POST `/api/auth/refresh-token` or `/admin/auth/refresh`

### Video Upload (HLS Multipart)
Three-step flow: `initiate` → browser uploads chunks directly to S3 → `complete`. Backend only orchestrates presigned URLs; bytes never touch the server.

### Test Scoring
Auto-scored on submit: MCQ/True-False by `isCorrect` option flag, Numerical by exact float match, Fill-Blank by case-insensitive string match. Negative marks applied for wrong answers. Rank/percentile calculated against all completed attempts for that test.

### Payments (Flouci)
1. `POST /api/batches/:id/checkout` → creates an internal order + Flouci hosted checkout link
2. Frontend redirects the student to Flouci
3. `POST /api/batches/verify-payment` → verifies the Flouci payment status → enrolls the user
