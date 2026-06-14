#Requires -Version 5.1
<#
.SYNOPSIS
  One-time Azure setup for QuetzLearn LMS (Supabase + App Service + Container Apps).

.USAGE
  1. Copy scripts/azure/.env.azure.example  scripts/azure/.env.azure and fill values
  2. az login
  3. .\scripts\azure\setup.ps1

  Then add GitHub secrets printed at the end and push to main.
#>

param(
  [string]$EnvFile = "$PSScriptRoot\.env.azure"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Load-EnvFile {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Missing $Path  copy .env.azure.example and fill in your values."
  }
  $vars = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim().Trim('"')
    $vars[$key] = $val
  }
  return $vars
}

function Require-Key {
  param([hashtable]$Map, [string]$Key)
  if (-not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Map[$Key])) {
    throw "Required value missing in .env.azure: $Key"
  }
  return $Map[$Key]
}

$config = Load-EnvFile -Path $EnvFile

$RG          = Require-Key $config "AZURE_RESOURCE_GROUP"
$LOCATION    = Require-Key $config "AZURE_LOCATION"
$BACKEND_APP = Require-Key $config "AZURE_WEBAPP_BACKEND"
$FRONTEND_APP= Require-Key $config "AZURE_WEBAPP_FRONTEND"
$ACR_NAME    = Require-Key $config "ACR_NAME"
$CA_NAME     = Require-Key $config "CONTAINER_APP_NAME"
$CA_ENV      = Require-Key $config "CONTAINERAPPS_ENV"
$PLAN        = Require-Key $config "APP_SERVICE_PLAN"
$GITHUB_REPO = Require-Key $config "GITHUB_REPO"

$BACKEND_URL  = "https://$BACKEND_APP.azurewebsites.net"
$FRONTEND_URL = "https://$FRONTEND_APP.azurewebsites.net"

Write-Host "`n=== QuetzLearn Azure setup ===" -ForegroundColor Cyan
Write-Host "Resource group : $RG"
Write-Host "Backend URL    : $BACKEND_URL"
Write-Host "Frontend URL   : $FRONTEND_URL`n"

$existingRgLocation = az group show --name $RG --query location -o tsv 2>$null
if ($LASTEXITCODE -eq 0 -and $existingRgLocation -and $existingRgLocation.Trim().ToLowerInvariant() -ne $LOCATION.Trim().ToLowerInvariant()) {
  throw "Resource group '$RG' already exists in '$existingRgLocation'. Set AZURE_LOCATION to the same region, or use a new resource group."
}

#  Resource group 
az group create --name $RG --location $LOCATION --output none

#  App Service Plan (Linux B1  shared by frontend + backend) 
$planExists = $false
az appservice plan show --name $PLAN --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -eq 0) { $planExists = $true }
if (-not $planExists) {
  az appservice plan create `
    --name $PLAN `
    --resource-group $RG `
    --location $LOCATION `
    --is-linux `
    --sku B1 `
    --output none
}

#  Backend Web App 
az webapp show --name $BACKEND_APP --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -ne 0) {
  az webapp create `
    --name $BACKEND_APP `
    --resource-group $RG `
    --plan $PLAN `
    --runtime "NODE:20-lts" `
    --output none
}

az webapp config set `
  --name $BACKEND_APP `
  --resource-group $RG `
  --startup-file "node dist/index.js" `
  --always-on true `
  --output none

az webapp config appsettings set `
  --name $BACKEND_APP `
  --resource-group $RG `
  --settings `
    NODE_ENV=production `
    PORT=8080 `
    SCM_DO_BUILD_DURING_DEPLOYMENT=false `
    WEBSITE_RUN_FROM_PACKAGE=1 `
    FRONTEND_URL=$FRONTEND_URL `
    DATABASE_URL="$($config['DATABASE_URL'])" `
    JWT_SECRET="$($config['JWT_SECRET'])" `
    JWT_REFRESH_SECRET="$($config['JWT_REFRESH_SECRET'])" `
    JWT_EXPIRES_IN=15m `
    JWT_REFRESH_EXPIRES_IN=7d `
    SUPABASE_URL="$($config['SUPABASE_URL'])" `
    SUPABASE_SERVICE_ROLE_KEY="$($config['SUPABASE_SERVICE_ROLE_KEY'])" `
    SUPABASE_BUCKET="$($config['SUPABASE_BUCKET'])" `
    SUPABASE_S3_ACCESS_KEY_ID="$($config['SUPABASE_S3_ACCESS_KEY_ID'])" `
    SUPABASE_S3_SECRET_ACCESS_KEY="$($config['SUPABASE_S3_SECRET_ACCESS_KEY'])" `
    SUPABASE_S3_REGION="$($config['SUPABASE_S3_REGION'])" `
    AI_SERVICE_INTERNAL_TOKEN="$($config['AI_SERVICE_INTERNAL_TOKEN'])" `
    SMTP_HOST="$($config['SMTP_HOST'])" `
    SMTP_PORT="$($config['SMTP_PORT'])" `
    SMTP_USER="$($config['SMTP_USER'])" `
    SMTP_PASS="$($config['SMTP_PASS'])" `
    SMTP_FROM="$($config['SMTP_FROM'])" `
    SUPER_ADMIN_EMAIL="$($config['SUPER_ADMIN_EMAIL'])" `
    SUPER_ADMIN_PASSWORD_HASH="$($config['SUPER_ADMIN_PASSWORD_HASH'])" `
    LIVEKIT_URL="$($config['LIVEKIT_URL'])" `
    LIVEKIT_API_KEY="$($config['LIVEKIT_API_KEY'])" `
    LIVEKIT_API_SECRET="$($config['LIVEKIT_API_SECRET'])" `
    FLOUCI_PUBLIC_KEY="$($config['FLOUCI_PUBLIC_KEY'])" `
    FLOUCI_PRIVATE_KEY="$($config['FLOUCI_PRIVATE_KEY'])" `
  --output none

#  Frontend Web App 
az webapp show --name $FRONTEND_APP --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -ne 0) {
  az webapp create `
    --name $FRONTEND_APP `
    --resource-group $RG `
    --plan $PLAN `
    --runtime "NODE:20-lts" `
    --output none
}

az webapp config set `
  --name $FRONTEND_APP `
  --resource-group $RG `
  --startup-file "node server.js" `
  --always-on true `
  --output none

az webapp config appsettings set `
  --name $FRONTEND_APP `
  --resource-group $RG `
  --settings `
    NODE_ENV=production `
    PORT=8080 `
    SCM_DO_BUILD_DURING_DEPLOYMENT=false `
    WEBSITE_RUN_FROM_PACKAGE=1 `
    HOSTNAME=0.0.0.0 `
    NEXT_PUBLIC_API_URL=$BACKEND_URL `
  --output none

#  Container Registry 
az acr show --name $ACR_NAME --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -ne 0) {
  az acr create `
    --name $ACR_NAME `
    --resource-group $RG `
    --location $LOCATION `
    --sku Basic `
    --admin-enabled false `
    --output none
}

$ACR_LOGIN = az acr show --name $ACR_NAME --query loginServer -o tsv

#  Container Apps environment 
az extension add --name containerapp --upgrade 2>$null
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

az monitor log-analytics workspace show --resource-group $RG --workspace-name "$CA_ENV-logs" --output none 2>$null
if ($LASTEXITCODE -eq 0) {
  $LOG_ANALYTICS = az monitor log-analytics workspace show `
    --resource-group $RG `
    --workspace-name "$CA_ENV-logs" `
    --query id -o tsv
} else {
  $LOG_ANALYTICS = az monitor log-analytics workspace create `
    --resource-group $RG `
    --workspace-name "$CA_ENV-logs" `
    --location $LOCATION `
    --query id -o tsv
}

az containerapp env show --name $CA_ENV --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -ne 0) {
  az containerapp env create `
    --name $CA_ENV `
    --resource-group $RG `
    --location $LOCATION `
    --logs-workspace-id $LOG_ANALYTICS `
    --output none
}

# Grant ACR pull to Container Apps environment managed identity
$CA_ENV_ID = az containerapp env show --name $CA_ENV --resource-group $RG --query id -o tsv
$ACR_ID = az acr show --name $ACR_NAME --resource-group $RG --query id -o tsv
$ACR_PULL_ROLE = "7f951dda-4ed3-4680-a7ca-43fe172d538d"
$PRINCIPAL_ID = az containerapp env show --name $CA_ENV --resource-group $RG --query identity.principalId -o tsv
if ($PRINCIPAL_ID) {
  az role assignment create --assignee $PRINCIPAL_ID --role $ACR_PULL_ROLE --scope $ACR_ID --output none 2>$null
}

# Build initial AI image locally via ACR
Write-Host "Building initial AI service image in ACR (may take a few minutes)..." -ForegroundColor Yellow
$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
az acr build --registry $ACR_NAME --image quetzlearn-ai:latest "$repoRoot\ai-service"

#  Container App (AI service) 
$AI_TOKEN = $config['AI_SERVICE_INTERNAL_TOKEN']
$DB_URL   = $config['DATABASE_URL']
$DIRECT   = $config['DIRECT_URL']
$OR_KEY   = $config['OPENROUTER_API_KEY']
$GROQ     = $config['GROQ_API_KEY']

az containerapp show --name $CA_NAME --resource-group $RG --output none 2>$null
if ($LASTEXITCODE -ne 0) {
  az containerapp create `
    --name $CA_NAME `
    --resource-group $RG `
    --environment $CA_ENV `
    --image "${ACR_LOGIN}/quezlearn-ai:latest" `
    --registry-server $ACR_LOGIN `
    --registry-identity system `
    --target-port 8000 `
    --ingress external `
    --min-replicas 0 `
    --max-replicas 2 `
    --cpu 1.0 `
    --memory 2.0Gi `
    --env-vars `
      PORT=8000 `
      AI_SERVICE_INTERNAL_TOKEN=secretref:ai-token `
      DATABASE_URL=secretref:database-url `
      DIRECT_URL=secretref:direct-url `
      OPENROUTER_API_KEY=secretref:openrouter-key `
      GROQ_API_KEY=secretref:groq-key `
      OPENROUTER_HTTP_REFERER=$FRONTEND_URL `
    --secrets `
      ai-token=$AI_TOKEN `
      database-url=$DB_URL `
      direct-url=$DIRECT `
      openrouter-key=$OR_KEY `
      groq-key=$GROQ `
    --output none
}

$AI_URL = az containerapp show --name $CA_NAME --resource-group $RG --query properties.configuration.ingress.fqdn -o tsv
$AI_URL = "https://$AI_URL"

# Point backend at AI service
az webapp config appsettings set `
  --name $BACKEND_APP `
  --resource-group $RG `
  --settings AI_SERVICE_URL=$AI_URL `
  --output none

Write-Host "AI service URL: $AI_URL" -ForegroundColor Green

#  GitHub Actions OIDC 
$APP_NAME = "Tesla-github-actions"
$SUB_ID = az account show --query id -o tsv
$TENANT_ID = az account show --query tenantId -o tsv

$APP_ID = az ad app list --display-name $APP_NAME --query "[0].appId" -o tsv
if (-not $APP_ID) {
  $APP_ID = az ad app create --display-name $APP_NAME --query appId -o tsv
  $SP_ID = az ad sp create --id $APP_ID --query id -o tsv
} else {
  $SP_ID = az ad sp show --id $APP_ID --query id -o tsv
}

az role assignment create `
  --assignee $APP_ID `
  --role Contributor `
  --scope "/subscriptions/$SUB_ID/resourceGroups/$RG" `
  --output none 2>$null

$FED_NAME = "queztlearn-main"
az ad app federated-credential create `
  --id $APP_ID `
  --parameters "{
    `"name`": `"$FED_NAME`",
    `"issuer`": `"https://token.actions.githubusercontent.com`",
    `"subject`": `"repo:${GITHUB_REPO}:ref:refs/heads/main`",
    `"audiences`": [`"api://AzureADTokenExchange`"]
  }" `
  --output none 2>$null

#  Run initial DB migration 
Write-Host "`nRunning Prisma migrations against Supabase..." -ForegroundColor Yellow
Push-Location "$repoRoot\backend"
$dbMigrateUrl = $config['DIRECT_URL']
if (-not $dbMigrateUrl) { $dbMigrateUrl = $config['DATABASE_URL'] }
$env:DATABASE_URL = $dbMigrateUrl
npm ci 2>$null
npx prisma migrate deploy
npx --yes ts-node src/scripts/init-vector-db.ts 2>$null
Pop-Location

#  Summary 
Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Azure setup complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Frontend : $FRONTEND_URL"
Write-Host "Backend  : $BACKEND_URL"
Write-Host "AI       : $AI_URL"
Write-Host ""
Write-Host "Add these GitHub repository SECRETS (Settings  Secrets  Actions):"
Write-Host "  AZURE_CLIENT_ID      = $APP_ID"
Write-Host "  AZURE_TENANT_ID      = $TENANT_ID"
Write-Host "  AZURE_SUBSCRIPTION_ID= $SUB_ID"
Write-Host "  DATABASE_URL         = (your Supabase DIRECT_URL or pooler URL)"
Write-Host ""
Write-Host "Optional GitHub VARIABLES (Settings  Variables  Actions):"
Write-Host "  AZURE_RESOURCE_GROUP = $RG"
Write-Host "  AZURE_WEBAPP_BACKEND = $BACKEND_APP"
Write-Host "  AZURE_WEBAPP_FRONTEND= $FRONTEND_APP"
Write-Host "  ACR_NAME             = $ACR_NAME"
Write-Host "  CONTAINER_APP_NAME   = $CA_NAME"
Write-Host "  CONTAINERAPPS_ENV    = $CA_ENV"
Write-Host ""
Write-Host "Next: push to main  GitHub Actions will deploy automatically."
Write-Host "Health checks:"
Write-Host "  $BACKEND_URL/health"
Write-Host "  $AI_URL/health"
Write-Host ""

