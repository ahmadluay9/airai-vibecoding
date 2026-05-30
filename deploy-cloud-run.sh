#!/bin/bash
set -euo pipefail

# ============================================================
# Deploy A2A to Cloud Run
# ============================================================

# --- Load environment variables from .env file ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

if [ ! -f "${ENV_FILE}" ]; then
    echo "Error: .env file not found at ${ENV_FILE}"
    exit 1
fi

set +u
set -a
source "${ENV_FILE}"
set +a  
set -u

echo "Loaded configuration from ${ENV_FILE}"

# --- Check for required variables ---
REQUIRED_VARS=("CLOUD_RUN_SERVICE_NAME" "PROJECT_ID" "REGION" "VITE_API_KEY" "VITE_GEMINI_API_KEY")
for VAR_NAME in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR_NAME:-}" ]; then
        echo "Error: Required environment variable '${VAR_NAME}' is missing or empty in .env"
        exit 1
    fi
done

# --- Deploy to Cloud Run ---
echo "Deploying ${CLOUD_RUN_SERVICE_NAME} to Cloud Run..."

ENV_VARS="PROJECT_ID=${PROJECT_ID},REGION=${REGION},VITE_API_KEY=${VITE_API_KEY},VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}"

gcloud run deploy "${CLOUD_RUN_SERVICE_NAME}" \
    --source . \
    --region "${REGION}" \
    --project "${PROJECT_ID}" \
    --set-env-vars "${ENV_VARS}" \
    --allow-unauthenticated

echo "Deployment complete!"