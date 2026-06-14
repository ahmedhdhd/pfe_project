#Requires -Version 5.1
<#
.SYNOPSIS
  Creates Azure resources for QuetzLearn LMS (student-friendly hybrid setup).

.DESCRIPTION
  Creates:
    - Resource group
    - App Service Plan (B1 Linux)
    - Backend Web App (Node 20)
    - Frontend Web App (Node 20)
    - Azure Container Registry
    - Container Apps environment + AI service

  Database stays on Supabase (or your own Postgres) — not created here.

.PREREQUISITES
  1. Azure CLI: https://learn.microsoft.com/cli/azure/install-azure-cli-windows
  2. Login: az login
  3. Copy config.ps1.example -> config.ps1 and fill values
  4. Active Azure for Students subscription

.EXAMPLE
  .\setup.ps1
#>
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $ScriptDir "config.ps1")

Write-Host "Using subscription $SubscriptionId" -ForegroundColor Cyan
az account set --subscription $SubscriptionId

Write-Host "Creating resource group $ResourceGroup in $Location..." -ForegroundColor Cyan
az group create --name $ResourceGroup --location $Location | Out-Null

Write-Host "Creating App Service Plan $AppServicePlan (B1 Linux)..." -ForegroundColor Cyan
az appservice plan create `
  --name $AppServicePlan `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku B1 `
  --is-linux | Out-Null

Write-Host "Creating backend app $BackendAppName..." -ForegroundColor Cyan
az webapp create `
  --name $BackendAppName `
  --resource-group $ResourceGroup `
  --plan $AppServicePlan `
  --runtime "NODE:20-lts" | Out-Null

az webapp config set `
  --name $BackendAppName `
  --resource-group $ResourceGroup `
  --startup-file "node dist/index.js" `
  --always-on true | Out-Null

Write-Host "Creating frontend app $FrontendAppName..." -ForegroundColor Cyan
az webapp create `
  --name $FrontendAppName `
  --resource-group $ResourceGroup `
  --plan $AppServicePlan `
  --runtime "NODE:20-lts" | Out-Null

az webapp config set `
  --name $FrontendAppName `
  --resource-group $ResourceGroup `
  --startup-file "node server.js" `
  --always-on true | Out-Null

Write-Host "Creating Container Registry $AcrName..." -ForegroundColor Cyan
az acr create `
  --name $AcrName `
  --resource-group $ResourceGroup `
  --location $Location `
  --sku Basic `
  --admin-enabled true | Out-Null

Write-Host "Creating Container Apps environment $ContainerEnv..." -ForegroundColor Cyan
az containerapp env create `
  --name $ContainerEnv `
  --resource-group $ResourceGroup `
  --location $Location | Out-Null

$acrLoginServer = az acr show --name $AcrName --resource-group $ResourceGroup --query loginServer -o tsv
$acrUser = az acr credential show --name $AcrName --resource-group $ResourceGroup --query username -o tsv
$acrPass = az acr credential show --name $AcrName --resource-group $ResourceGroup --query "passwords[0].value" -o tsv

Write-Host "Creating AI Container App $AiAppName..." -ForegroundColor Cyan
az containerapp create `
  --name $AiAppName `
  --resource-group $ResourceGroup `
  --environment $ContainerEnv `
  --image "mcr.microsoft.com/k8se/quickstart:latest" `
  --target-port 8000 `
  --ingress external `
  --registry-server $acrLoginServer `
  --registry-username $acrUser `
  --registry-password $acrPass `
  --cpu 0.5 `
  --memory 1Gi `
  --min-replicas 0 `
  --max-replicas 2 | Out-Null

$aiUrl = az containerapp show --name $AiAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
$aiServiceUrl = "https://$aiUrl"

Write-Host "Setting backend application settings..." -ForegroundColor Cyan
az webapp config appsettings set `
  --name $BackendAppName `
  --resource-group $ResourceGroup `
  --settings `
    NODE_ENV=production `
    PORT=4000 `
    WEBSITES_PORT=4000 `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true `
    DATABASE_URL=$DatabaseUrl `
    DIRECT_URL=$DirectUrl `
    JWT_SECRET=$JwtSecret `
    JWT_REFRESH_SECRET=$JwtRefreshSecret `
    JWT_EXPIRES_IN=15m `
    JWT_REFRESH_EXPIRES_IN=7d `
    FRONTEND_URL=$FrontendUrl `
    AI_SERVICE_URL=$aiServiceUrl `
    AI_SERVICE_INTERNAL_TOKEN=$AiInternalToken `
    SUPABASE_URL=$SupabaseUrl `
    SUPABASE_SERVICE_ROLE_KEY=$SupabaseServiceRoleKey `
    SUPABASE_BUCKET=$SupabaseBucket `
    SUPABASE_S3_ACCESS_KEY_ID=$SupabaseS3AccessKeyId `
    SUPABASE_S3_SECRET_ACCESS_KEY=$SupabaseS3SecretAccessKey `
    SUPABASE_S3_REGION=$SupabaseS3Region `
    SMTP_HOST=$SmtpHost `
    SMTP_PORT=$SmtpPort `
    SMTP_USER=$SmtpUser `
    SMTP_PASS=$SmtpPass `
    SMTP_FROM=$SmtpFrom | Out-Null

Write-Host "Setting frontend application settings..." -ForegroundColor Cyan
az webapp config appsettings set `
  --name $FrontendAppName `
  --resource-group $ResourceGroup `
  --settings `
    NODE_ENV=production `
    PORT=3000 `
    WEBSITES_PORT=3000 `
    SCM_DO_BUILD_DURING_DEPLOYMENT=true `
    NEXT_PUBLIC_API_URL=$BackendUrl | Out-Null

Write-Host ""
Write-Host "Azure resources created." -ForegroundColor Green
Write-Host "  Backend:  $BackendUrl"
Write-Host "  Frontend: $FrontendUrl"
Write-Host "  AI:       $aiServiceUrl"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run database migrations on Supabase (see deploy.ps1 or backend README)"
Write-Host "  2. Run .\deploy.ps1 to build and publish all services"
Write-Host "  3. Run init-vector-db for RAG: npx ts-node backend/src/scripts/init-vector-db.ts"
