#Requires -Version 5.1
<#
.SYNOPSIS
  Runs Prisma migrations and pgvector setup against your production database.

.EXAMPLE
  .\migrate-db.ps1
#>
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..\..")
. (Join-Path $ScriptDir "config.ps1")

$backendDir = Join-Path $RepoRoot "backend"
Push-Location $backendDir

$env:DATABASE_URL = $DatabaseUrl
if ($DirectUrl) { $env:DIRECT_URL = $DirectUrl }

Write-Host "Running prisma migrate deploy..." -ForegroundColor Cyan
npm ci
npx prisma migrate deploy

Write-Host "Initializing pgvector tables..." -ForegroundColor Cyan
npx ts-node src/scripts/init-vector-db.ts

Pop-Location
Write-Host "Database ready." -ForegroundColor Green
