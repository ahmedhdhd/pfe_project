# Azure deployment with Docker + GitHub Actions

This repo now uses one simple Azure flow:

- build Docker images from `backend/Dockerfile`, `frontend/Dockerfile`, and `ai-service/Dockerfile`
- push them to Azure Container Registry
- update Azure Container Apps with the new image tags
- run Prisma migrations once in the GitHub Actions workflow before the backend image is updated

## What you need

- Azure subscription
- Azure Container Registry
- 3 Azure Container Apps:
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

## Workflow behavior

1. Install backend dependencies
2. Run `prisma migrate deploy`
3. Build and push the backend image to ACR
4. Build and push the frontend image to ACR
5. Build and push the AI image to ACR
6. Update the Azure Container Apps to the new images

## Notes

- `NEXT_PUBLIC_API_URL` must point to the backend public URL.
- `AI_SERVICE_URL` must point to the AI service public URL.
- If you change either URL, update the GitHub variables and re-run the workflow.
