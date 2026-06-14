# Deploy QuetzLearn LMS to Azure (Student Account)

Full-stack deployment: **Next.js frontend** + **Express backend** + **FastAPI AI service**, with **Supabase** for PostgreSQL and file storage.

| Service | Azure resource | Default URL |
|---------|----------------|-------------|
| Frontend | App Service (Node 20) | `https://queztlearn-web.azurewebsites.net` |
| Backend API | App Service (Node 20) | `https://queztlearn-api.azurewebsites.net` |
| AI service | Container Apps + ACR | `https://queztlearn-ai.<region>.azurecontainerapps.io` |
| Database | Supabase (external) | — |
| Media storage | Supabase Storage (external) | — |

Estimated cost: **~$25–35/month** (1× App Service Plan B1 + Container Apps consumption). Fits Azure for Students credit.

---

## Prerequisites

1. [Azure for Students](https://azure.microsoft.com/en-us/free/students/) account
2. [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed
3. [Supabase](https://supabase.com) project (free tier)
4. GitHub repo with this code pushed to `main`
5. Node.js 20 locally (for one-time setup script migrations)

---

## Step 1 — Supabase setup

1. Create a Supabase project.
2. **Database → Connection string**:
   - **Transaction pooler** → use as `DATABASE_URL` (backend runtime)
   - **Direct connection** → use as `DIRECT_URL` (migrations + AI service)
3. **SQL Editor** — pgvector is applied automatically by Prisma migrations (`20260504_add_pgvector_rag`).
4. **Storage** — create a bucket; note keys from Project Settings → API / Storage → S3 Access Keys.
5. Generate secrets locally:

```powershell
# JWT secrets (run twice for two different values)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# AI internal token (must match in backend + ai-service)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Super admin password hash (optional)
node -e "console.log(require('bcryptjs').hashSync('YourPassword123', 12))"
```

---

## Step 2 — Configure Azure env file

```powershell
copy scripts\azure\.env.azure.example scripts\azure\.env.azure
```

Edit `scripts/azure/.env.azure`:

- Set **globally unique** names: `AZURE_WEBAPP_BACKEND`, `AZURE_WEBAPP_FRONTEND`, `ACR_NAME` (letters/numbers only, no hyphens for ACR)
- Set `GITHUB_REPO` to `your-username/your-repo-name`
- Fill Supabase URLs, JWT secrets, AI token, OpenRouter/Groq keys
- Pick a region close to you, e.g. `francecentral` or `westeurope`

---

## Step 3 — Run one-time Azure setup

```powershell
az login
az account set --subscription "<your-student-subscription-id>"
.\scripts\azure\setup.ps1
```

This script:

- Creates resource group, App Service plan (B1), two web apps, ACR, Container Apps environment
- Builds and deploys the AI service container
- Configures all App Service environment variables
- Runs Prisma migrations against Supabase
- Creates GitHub OIDC credentials for CI/CD

**Note:** App names must be globally unique across Azure. If `queztlearn-api` is taken, change names in `.env.azure` and update `.github/workflows/deploy-azure.yml` env block to match.

---

## Step 4 — GitHub secrets & variables

Go to **GitHub → your repo → Settings → Secrets and variables → Actions**.

### Secrets (required)

| Secret | Value |
|--------|-------|
| `AZURE_CLIENT_ID` | Printed by setup script |
| `AZURE_TENANT_ID` | Printed by setup script |
| `AZURE_SUBSCRIPTION_ID` | Printed by setup script |
| `DATABASE_URL` | Supabase **direct** URL (for migrations in CI) |

### Variables (optional — only if you changed default app names)

| Variable | Example |
|----------|---------|
| `AZURE_WEBAPP_BACKEND` | `queztlearn-api` |

---

## Step 5 — Deploy via GitHub Actions

Push to `main`:

```powershell
git add .
git commit -m "Add Azure deployment pipeline"
git push origin main
```

Or trigger manually: **Actions → Deploy to Azure → Run workflow**.

The workflow (`.github/workflows/deploy-azure.yml`):

1. Runs `prisma migrate deploy`
2. Builds & deploys backend to App Service
3. Builds & deploys frontend (with `NEXT_PUBLIC_API_URL` baked in)
4. Rebuilds AI service image in ACR and updates Container App

---

## Step 6 — Verify

```text
GET https://queztlearn-api.azurewebsites.net/health
GET https://queztlearn-ai.<region>.azurecontainerapps.io/health
Open https://queztlearn-web.azurewebsites.net
```

---

## Architecture

```
GitHub (push main)
    │
    ▼
GitHub Actions
    ├── prisma migrate deploy  ──► Supabase PostgreSQL
    ├── deploy backend zip       ──► App Service (queztlearn-api)
    ├── deploy frontend zip      ──► App Service (queztlearn-web)
    └── ACR build + update       ──► Container App (queztlearn-ai)
```

---

## Troubleshooting

### App name already taken
Change names in `.env.azure` and the `env:` block in `.github/workflows/deploy-azure.yml`.

### Backend 503 after deploy
- Azure Portal → App Service → Log stream
- Confirm startup command is `node dist/index.js`
- Check `DATABASE_URL` in App Service → Configuration

### Frontend shows API errors
- `NEXT_PUBLIC_API_URL` is set at **build time** in CI — must match backend URL
- Re-run workflow after fixing `AZURE_WEBAPP_BACKEND` variable

### AI features fail
- Verify `AI_SERVICE_INTERNAL_TOKEN` matches in backend App Settings and Container App secrets
- Check Container App logs: Azure Portal → Container Apps → Log stream
- Ensure `OPENROUTER_API_KEY` is set in Container App

### Migrations fail in CI
- Use Supabase **direct** connection string in GitHub secret `DATABASE_URL`
- Pooler URL (port 6543) can fail for DDL migrations

### CORS / cookies
Backend allows all origins with credentials. Production cookies require HTTPS — default Azure URLs use HTTPS automatically.

---

## Files added

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-azure.yml` | CI/CD pipeline |
| `scripts/azure/setup.ps1` | One-time Azure provisioning (Windows) |
| `scripts/azure/setup.sh` | Same for Linux/macOS/WSL |
| `scripts/azure/.env.azure.example` | Config template |
| `backend/Dockerfile` | Optional container deploy |
| `frontend/Dockerfile` | Optional container deploy |

---

## Updating environment variables later

**Backend / frontend:** Azure Portal → App Service → Settings → Environment variables

**AI service:** Azure Portal → Container Apps → `queztlearn-ai` → Containers → Environment variables

After changing `NEXT_PUBLIC_API_URL` or backend URL, re-run the GitHub Actions deploy workflow.
