#Requires -Version 5.1
<#
.SYNOPSIS
  Builds and deploys QuetzLearn LMS to Azure.

.DESCRIPTION
  - Builds & pushes AI service image to ACR, updates Container App
  - Deploys backend (zip deploy with Oryx build)
  - Deploys frontend (standalone Next.js zip)

.PREREQUISITES
  - setup.ps1 already run
  - config.ps1 filled in
  - Node.js 20+ and npm installed locally

.EXAMPLE
  .\deploy.ps1
#>
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
. (Join-Path $ScriptDir "config.ps1")

az account set --subscription $SubscriptionId

function New-ZipDeployPackage {
  param(
    [string]$SourceDir,
    [string]$ZipPath,
    [string[]]$Exclude = @("node_modules", ".git", ".env", ".next")
  )

  if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
  $temp = Join-Path $env:TEMP ("queztlearn-deploy-" + [guid]::NewGuid().ToString())
  New-Item -ItemType Directory -Path $temp | Out-Null

  robocopy $SourceDir $temp /E /XD $Exclude /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

  Compress-Archive -Path (Join-Path $temp "*") -DestinationPath $ZipPath -Force
  Remove-Item $temp -Recurse -Force
}

Write-Host "=== 1/3 AI service (Container Apps) ===" -ForegroundColor Cyan
$aiServiceDir = Join-Path $RepoRoot "ai-service"
az acr build `
  --registry $AcrName `
  --image "queztlearn-ai:latest" `
  --file (Join-Path $aiServiceDir "Dockerfile") `
  $aiServiceDir

$acrLoginServer = az acr show --name $AcrName --resource-group $ResourceGroup --query loginServer -o tsv
$image = "$acrLoginServer/queztlearn-ai:latest"

az containerapp secret set `
  --name $AiAppName `
  --resource-group $ResourceGroup `
  --secrets `
    ai-internal-token=$AiInternalToken `
    database-url=$DatabaseUrl `
    direct-url=$DirectUrl `
    openrouter-key=$OpenRouterApiKey `
    groq-key=$GroqApiKey | Out-Null

az containerapp update `
  --name $AiAppName `
  --resource-group $ResourceGroup `
  --image $image `
  --set-env-vars `
    PORT=8000 `
    AI_SERVICE_INTERNAL_TOKEN=secretref:ai-internal-token `
    DATABASE_URL=secretref:database-url `
    DIRECT_URL=secretref:direct-url `
    OPENROUTER_API_KEY=secretref:openrouter-key `
    GROQ_API_KEY=secretref:groq-key `
    OPENROUTER_HTTP_REFERER=$FrontendUrl `
    OPENROUTER_APP_TITLE="QuetzLearn LMS" | Out-Null

$aiFqdn = az containerapp show --name $AiAppName --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
$aiServiceUrl = "https://$aiFqdn"
Write-Host "AI service URL: $aiServiceUrl" -ForegroundColor Green

az webapp config appsettings set `
  --name $BackendAppName `
  --resource-group $ResourceGroup `
  --settings AI_SERVICE_URL=$aiServiceUrl | Out-Null

Write-Host "=== 2/3 Backend (App Service) ===" -ForegroundColor Cyan
$backendDir = Join-Path $RepoRoot "backend"
Push-Location $backendDir
npm ci
npm run build
npx prisma generate
Pop-Location

$backendZip = Join-Path $env:TEMP "queztlearn-backend.zip"
New-ZipDeployPackage -SourceDir $backendDir -ZipPath $backendZip -Exclude @("node_modules", ".git", ".env")

az webapp deployment source config-zip `
  --resource-group $ResourceGroup `
  --name $BackendAppName `
  --src $backendZip | Out-Null

Write-Host "Backend deployed to $BackendUrl" -ForegroundColor Green

Write-Host "=== 3/3 Frontend (App Service) ===" -ForegroundColor Cyan
$frontendDir = Join-Path $RepoRoot "frontend"
Push-Location $frontendDir
$env:NEXT_PUBLIC_API_URL = $BackendUrl
npm ci
npm run build
Pop-Location

$frontendStage = Join-Path $env:TEMP ("queztlearn-frontend-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $frontendStage | Out-Null

Copy-Item (Join-Path $frontendDir "package.json") $frontendStage
Copy-Item (Join-Path $frontendDir "package-lock.json") $frontendStage
Copy-Item (Join-Path $frontendDir ".next\standalone\*") $frontendStage -Recurse
Copy-Item (Join-Path $frontendDir ".next\static") (Join-Path $frontendStage ".next\static") -Recurse
Copy-Item (Join-Path $frontendDir "public") (Join-Path $frontendStage "public") -Recurse

$frontendZip = Join-Path $env:TEMP "queztlearn-frontend.zip"
if (Test-Path $frontendZip) { Remove-Item $frontendZip -Force }
Compress-Archive -Path (Join-Path $frontendStage "*") -DestinationPath $frontendZip -Force
Remove-Item $frontendStage -Recurse -Force

az webapp deployment source config-zip `
  --resource-group $ResourceGroup `
  --name $FrontendAppName `
  --src $frontendZip | Out-Null

Write-Host ""
Write-Host "Deployment complete." -ForegroundColor Green
Write-Host "  Frontend: $FrontendUrl"
Write-Host "  Backend:  $BackendUrl/health"
Write-Host "  AI:       $aiServiceUrl"
Write-Host ""
Write-Host "If this is the first deploy, run migrations:" -ForegroundColor Yellow
Write-Host "  cd backend && npx prisma migrate deploy"
Write-Host "  npx ts-node src/scripts/init-vector-db.ts"
