# Azure deployment with Docker + GitHub Actions

This repo now uses one simple Azure flow:

- build Docker images from `backend/Dockerfile`, `frontend/Dockerfile`, and `ai-service/Dockerfile`
- push them to Azure Container Registry
- update Azure Web Apps with the new image tags
- run Prisma migrations once in the GitHub Actions workflow before the backend image is updated

## What you need

- Azure subscription
- Azure Container Registry
- 3 Azure Web Apps for Containers:
  - backend API
  - frontend web app
  - AI service
- Supabase database connection strings
- GitHub secrets for Azure login and the database URL

## Keep these files

- `.github/workflows/deploy-azure.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `ai-service/Dockerfile`

## Delete or ignore old Azure deployment code

The old PowerShell setup/deploy scripts are no longer used:

- `deploy/azure/`
- `scripts/azure/`
- `.github/workflows/azure-deploy.yml`

## Required GitHub secrets

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `DATABASE_URL`

## Required GitHub variables

- `AZURE_RESOURCE_GROUP`
- `AZURE_ACR_NAME`
- `AZURE_BACKEND_APP`
- `AZURE_FRONTEND_APP`
- `AZURE_AI_APP`
- `NEXT_PUBLIC_API_URL`
- `AI_SERVICE_URL`
- `FRONTEND_URL` (e.g. `https://teslaacademy.dedyn.io` — used by Stripe OAuth redirect after connect)

## Workflow behavior

1. Install backend dependencies
2. Run `prisma migrate deploy`
3. Build and push the backend image to ACR
4. Build and push the frontend image to ACR
5. Build and push the AI image to ACR
6. Update the Azure Web Apps to the new images

## Notes

- `NEXT_PUBLIC_API_URL` must point to the backend public URL.
- `FRONTEND_URL` must point to the frontend public URL (same host students/admins use).
- `AI_SERVICE_URL` must point to the AI service public URL.
- Stripe Connect OAuth callback uses the frontend URL (`FRONTEND_URL/admin/organization-config/config/stripe/callback`), which is proxied to the backend by a Next.js route handler. Register that exact URL in the Stripe Dashboard redirect URIs.
- Do not redeploy an older commit that predates the Stripe callback route (`frontend/src/app/admin/organization-config/config/stripe/callback/route.ts`) or OAuth will return a frontend 404.
- If you change either URL, update the GitHub variables and re-run the workflow.
