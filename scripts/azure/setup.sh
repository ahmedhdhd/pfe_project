#!/usr/bin/env bash
# One-time Azure setup (Linux/macOS/WSL). See setup.ps1 for Windows.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env.azure}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy .env.azure.example and fill values."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' | sed 's/\r$//')
set +a

: "${AZURE_RESOURCE_GROUP:?}"
: "${AZURE_LOCATION:?}"
: "${AZURE_WEBAPP_BACKEND:?}"
: "${AZURE_WEBAPP_FRONTEND:?}"
: "${ACR_NAME:?}"
: "${CONTAINER_APP_NAME:?}"
: "${CONTAINERAPPS_ENV:?}"
: "${APP_SERVICE_PLAN:?}"
: "${GITHUB_REPO:?}"
: "${DATABASE_URL:?}"
: "${JWT_SECRET:?}"
: "${JWT_REFRESH_SECRET:?}"
: "${AI_SERVICE_INTERNAL_TOKEN:?}"

RG="$AZURE_RESOURCE_GROUP"
BACKEND_URL="https://${AZURE_WEBAPP_BACKEND}.azurewebsites.net"
FRONTEND_URL="https://${AZURE_WEBAPP_FRONTEND}.azurewebsites.net"

echo "=== QuetzLearn Azure setup ==="
echo "Backend : $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"

az group create --name "$RG" --location "$AZURE_LOCATION" --output none

az appservice plan create \
  --name "$APP_SERVICE_PLAN" \
  --resource-group "$RG" \
  --location "$AZURE_LOCATION" \
  --is-linux \
  --sku B1 \
  --output none

for APP in "$AZURE_WEBAPP_BACKEND" "$AZURE_WEBAPP_FRONTEND"; do
  az webapp create \
    --name "$APP" \
    --resource-group "$RG" \
    --plan "$APP_SERVICE_PLAN" \
    --runtime "NODE:20-lts" \
    --output none
done

az webapp config set \
  --name "$AZURE_WEBAPP_BACKEND" \
  --resource-group "$RG" \
  --startup-file "node dist/index.js" \
  --always-on true \
  --output none

az webapp config appsettings set \
  --name "$AZURE_WEBAPP_BACKEND" \
  --resource-group "$RG" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false \
    WEBSITE_RUN_FROM_PACKAGE=1 \
    FRONTEND_URL="$FRONTEND_URL" \
    DATABASE_URL="$DATABASE_URL" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" \
    AI_SERVICE_INTERNAL_TOKEN="$AI_SERVICE_INTERNAL_TOKEN" \
    SUPABASE_URL="${SUPABASE_URL:-}" \
    SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}" \
    SUPABASE_BUCKET="${SUPABASE_BUCKET:-}" \
  --output none

az webapp config set \
  --name "$AZURE_WEBAPP_FRONTEND" \
  --resource-group "$RG" \
  --startup-file "node server.js" \
  --always-on true \
  --output none

az webapp config appsettings set \
  --name "$AZURE_WEBAPP_FRONTEND" \
  --resource-group "$RG" \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    SCM_DO_BUILD_DURING_DEPLOYMENT=false \
    WEBSITE_RUN_FROM_PACKAGE=1 \
    HOSTNAME=0.0.0.0 \
    NEXT_PUBLIC_API_URL="$BACKEND_URL" \
  --output none

az acr create \
  --name "$ACR_NAME" \
  --resource-group "$RG" \
  --location "$AZURE_LOCATION" \
  --sku Basic \
  --admin-enabled false \
  --output none

az extension add --name containerapp --upgrade 2>/dev/null || true
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait

LOG_ANALYTICS="$(az monitor log-analytics workspace create \
  --resource-group "$RG" \
  --workspace-name "${CONTAINERAPPS_ENV}-logs" \
  --location "$AZURE_LOCATION" \
  --query id -o tsv)"

az containerapp env create \
  --name "$CONTAINERAPPS_ENV" \
  --resource-group "$RG" \
  --location "$AZURE_LOCATION" \
  --logs-workspace-id "$LOG_ANALYTICS" \
  --output none

echo "Building AI service image in ACR..."
az acr build --registry "$ACR_NAME" --image quetzlearn-ai:latest "$REPO_ROOT/ai-service"

ACR_LOGIN="$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)"

az containerapp create \
  --name "$CONTAINER_APP_NAME" \
  --resource-group "$RG" \
  --environment "$CONTAINERAPPS_ENV" \
  --image "${ACR_LOGIN}/quezlearn-ai:latest" \
  --registry-server "$ACR_LOGIN" \
  --registry-identity system \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 2 \
  --cpu 1.0 \
  --memory 2.0Gi \
  --env-vars \
    PORT=8000 \
    AI_SERVICE_INTERNAL_TOKEN=secretref:ai-token \
    DATABASE_URL=secretref:database-url \
    DIRECT_URL=secretref:direct-url \
    OPENROUTER_API_KEY=secretref:openrouter-key \
    GROQ_API_KEY=secretref:groq-key \
    OPENROUTER_HTTP_REFERER="$FRONTEND_URL" \
  --secrets \
    ai-token="$AI_SERVICE_INTERNAL_TOKEN" \
    database-url="$DATABASE_URL" \
    direct-url="${DIRECT_URL:-$DATABASE_URL}" \
    openrouter-key="${OPENROUTER_API_KEY:-}" \
    groq-key="${GROQ_API_KEY:-}" \
  --output none

AI_FQDN="$(az containerapp show --name "$CONTAINER_APP_NAME" --resource-group "$RG" --query properties.configuration.ingress.fqdn -o tsv)"
AI_URL="https://${AI_FQDN}"

az webapp config appsettings set \
  --name "$AZURE_WEBAPP_BACKEND" \
  --resource-group "$RG" \
  --settings AI_SERVICE_URL="$AI_URL" \
  --output none

SUB_ID="$(az account show --query id -o tsv)"
TENANT_ID="$(az account show --query tenantId -o tsv)"
APP_NAME="queztlearn-github-actions"

APP_ID="$(az ad app list --display-name "$APP_NAME" --query '[0].appId' -o tsv)"
if [[ -z "$APP_ID" ]]; then
  APP_ID="$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)"
  az ad sp create --id "$APP_ID" --output none
fi

az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/${SUB_ID}/resourceGroups/${RG}" \
  --output none 2>/dev/null || true

az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters "{
    \"name\": \"queztlearn-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_REPO}:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" \
  --output none 2>/dev/null || true

echo "Running Prisma migrations..."
(
  cd "$REPO_ROOT/backend"
  export DATABASE_URL="${DIRECT_URL:-$DATABASE_URL}"
  npm ci
  npx prisma migrate deploy
  npx ts-node src/scripts/init-vector-db.ts || true
)

echo ""
echo "Setup complete."
echo "Frontend : $FRONTEND_URL"
echo "Backend  : $BACKEND_URL"
echo "AI       : $AI_URL"
echo ""
echo "GitHub secrets:"
echo "  AZURE_CLIENT_ID       = $APP_ID"
echo "  AZURE_TENANT_ID       = $TENANT_ID"
echo "  AZURE_SUBSCRIPTION_ID = $SUB_ID"
echo "  DATABASE_URL          = (Supabase connection string)"
