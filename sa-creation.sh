#!/bin/bash
set -euo pipefail

# ==============================================================================
# Generate Service Account JSON Key for GitHub Actions (Option A)
# ==============================================================================

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${CYAN}  Generate Service Account JSON Key (Option A)${NC}"
echo -e "${CYAN}=======================================================================${NC}"

# Load environment variables from .env file if it exists
if [[ -f ".env" ]]; then
  echo -e "${YELLOW}-> Loading variables from .env file...${NC}"
  set -a
  source .env
  set +a
fi

# --- Variables: MUST BE DEFINED IN .ENV OR ENVIRONMENT ---
if [[ -z "${PROJECT_ID:-}" ]] || [[ -z "${SA_NAME:-}" ]] || [[ -z "${USER_EMAIL:-}" ]]; then
  echo -e "${RED}Error: Missing required environment variables.${NC}"
  echo -e "Please ensure ${YELLOW}PROJECT_ID${NC}, ${YELLOW}SA_NAME${NC}, and ${YELLOW}USER_EMAIL${NC} are defined in your .env file."
  exit 1
fi

SERVICE_ACCOUNT="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
KEY_FILENAME="gcp-sa-key.json"

echo -e "Preparing to generate JSON key for [${YELLOW}${SERVICE_ACCOUNT}${NC}]..."

# 1. Google Cloud Authentication
echo -e "\n${CYAN}[1/3] Authenticating with Google Cloud...${NC}"
echo -e "  ${YELLOW}→${NC} Initiating login for ${USER_EMAIL} (forced reauthentication)..."
gcloud auth login "${USER_EMAIL}" --force

# Verify login was successful
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [[ -z "$ACTIVE_ACCOUNT" ]]; then
  echo -e "  ${RED}Error: Authentication failed or was cancelled. Exiting.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Authenticated as: ${ACTIVE_ACCOUNT}"

# Set the active project in gcloud config to avoid project mismatch warnings
echo -e "  ${YELLOW}→${NC} Setting active gcloud project to ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}" >/dev/null 2>&1

# 2. Check if Service Account exists
echo -e "\n${CYAN}[2/3] Verifying Service Account exists...${NC}"
if ! gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo -e "${RED}Error: Service Account '${SERVICE_ACCOUNT}' does not exist in project '${PROJECT_ID}'.${NC}"
  echo -e "Please run the setup-wip.sh script first or create the service account manually."
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Service Account confirmed."

# 3. Generate the key
echo -e "\n${CYAN}[3/3] Generating Service Account Key...${NC}"
if [[ -f "${KEY_FILENAME}" ]]; then
  echo -e "${YELLOW}→ Warning: ${KEY_FILENAME} already exists locally. Overwriting...${NC}"
  rm "${KEY_FILENAME}"
fi

gcloud iam service-accounts keys create "${KEY_FILENAME}" \
  --iam-account="${SERVICE_ACCOUNT}" \
  --project="${PROJECT_ID}"

# Final Instructions
echo ""
echo -e "${GREEN}=======================================================================${NC}"
echo -e "${GREEN}✅ Key successfully generated: ${KEY_FILENAME}${NC}"
echo -e "${GREEN}=======================================================================${NC}"
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY INSTRUCTIONS:${NC}"
echo -e "1. Copy the contents of ${CYAN}${KEY_FILENAME}${NC}."
echo -e "2. Go to your GitHub Repository -> Settings -> Secrets and variables -> Actions."
echo -e "3. Create a new repository secret named ${CYAN}GCP_SA_KEY${NC} and paste the contents."
echo -e "4. Once uploaded to GitHub, delete the local file immediately by running:"
echo -e "   ${RED}rm ${KEY_FILENAME}${NC}"
echo -e "${CYAN}=======================================================================${NC}"