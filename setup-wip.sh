#!/bin/bash
set -euo pipefail

# ==============================================================================
# Setup/Update Google Cloud Workload Identity Federation for GitHub Actions
# ==============================================================================

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}=======================================================================${NC}"
echo -e "${CYAN}  GCP Workload Identity Setup for GitHub Actions${NC}"
echo -e "${CYAN}=======================================================================${NC}"

# Load environment variables from .env file if it exists
if [[ -f ".env" ]]; then
  echo -e "${YELLOW}-> Loading variables from .env file...${NC}"
  # set -a automatically exports all variables defined
  set -a
  source .env
  set +a
fi

# --- Variables: MUST BE DEFINED IN .ENV OR ENVIRONMENT ---
if [[ -z "${PROJECT_ID:-}" ]] || [[ -z "${SA_NAME:-}" ]] || [[ -z "${GITHUB_REPOS:-}" ]] || [[ -z "${USER_EMAIL:-}" ]]; then
  echo -e "${RED}Error: Missing required environment variables.${NC}"
  echo -e "Please ensure ${YELLOW}PROJECT_ID${NC}, ${YELLOW}SA_NAME${NC}, ${YELLOW}GITHUB_REPOS${NC}, and ${YELLOW}USER_EMAIL${NC} are defined."
  exit 1
fi

# Clean up commas (if any) and convert to an array
# This allows GITHUB_REPOS="owner/repo1, owner/repo2" OR "owner/repo1 owner/repo2"
CLEAN_REPOS="${GITHUB_REPOS//,/ }"
read -r -a GITHUB_REPOS_ARRAY <<< "${CLEAN_REPOS}"

SERVICE_ACCOUNT="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_NAME="${POOL_NAME:-"github-pool"}"
PROVIDER_NAME="${PROVIDER_NAME:-"github-provider"}"
# ----------------------------------------------

echo -e "Starting Workload Identity setup for [${YELLOW}${GITHUB_REPOS_ARRAY[*]}${NC}] in project ${YELLOW}${PROJECT_ID}${NC}...\n"

# 0. Google Cloud Authentication
echo -e "${CYAN}[0/7] Authenticating with Google Cloud...${NC}"
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

# 1. Enable Required APIs
echo -e "${CYAN}[1/7] Ensuring required GCP APIs are enabled...${NC}"
gcloud services enable iamcredentials.googleapis.com cloudresourcemanager.googleapis.com \
  --project="${PROJECT_ID}" >/dev/null

# 2. Handle the Service Account
echo -e "${CYAN}[2/7] Checking Service Account '${SERVICE_ACCOUNT}'...${NC}"
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo -e "  ${GREEN}✓${NC} Service Account already exists."
else
  echo -e "  ${YELLOW}→${NC} Creating Service Account: ${SA_NAME}..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Actions Service Account"
  
  # Wait a few seconds to ensure GCP IAM propagation before proceeding
  sleep 5
fi

# 3. Handle the Workload Identity Pool
echo -e "${CYAN}[3/7] Checking Workload Identity Pool '${POOL_NAME}'...${NC}"
POOL_STATE=$(gcloud iam workload-identity-pools describe "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(state)" 2>/dev/null || echo "MISSING")

if [[ "${POOL_STATE}" == "ACTIVE" ]]; then
  echo -e "  ${GREEN}✓${NC} Pool exists and is active."
elif [[ "${POOL_STATE}" == "DELETED" ]]; then
  echo -e "  ${YELLOW}→${NC} Pool was soft-deleted. Undeleting..."
  gcloud iam workload-identity-pools undelete "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" > /dev/null
else
  echo -e "  ${YELLOW}→${NC} Creating Workload Identity Pool..."
  gcloud iam workload-identity-pools create "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"
fi

# 4. Prepare the CEL condition for multiple repos
# This joins the array into a string like: 'repo1', 'repo2'
CONDITION_REPOS=$(printf "'%s'," "${GITHUB_REPOS_ARRAY[@]}" | sed 's/,$//')
ATTR_CONDITION="assertion.repository in [${CONDITION_REPOS}]"

# 5. Handle the OIDC Provider
echo -e "${CYAN}[5/7] Checking Workload Identity Provider '${PROVIDER_NAME}'...${NC}"
PROVIDER_STATE=$(gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --format="value(state)" 2>/dev/null || echo "MISSING")

if [[ "${PROVIDER_STATE}" == "ACTIVE" ]]; then
  echo -e "  ${YELLOW}→${NC} Updating existing Provider with latest repository conditions..."
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --attribute-condition="${ATTR_CONDITION}" > /dev/null
elif [[ "${PROVIDER_STATE}" == "DELETED" ]]; then
  echo -e "  ${YELLOW}→${NC} Provider was soft-deleted. Undeleting and updating..."
  gcloud iam workload-identity-pools providers undelete "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" > /dev/null
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --attribute-condition="${ATTR_CONDITION}" > /dev/null
else
  echo -e "  ${YELLOW}→${NC} Creating Workload Identity Provider..."
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="${ATTR_CONDITION}" \
    --issuer-uri="https://token.actions.githubusercontent.com" > /dev/null
fi
echo -e "  ${GREEN}✓${NC} Provider configured with conditions: ${ATTR_CONDITION}"

# 6. Retrieve numeric Project Number
echo -e "${CYAN}[6/7] Fetching Project Number...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")
echo -e "  ${GREEN}✓${NC} Project Number: ${PROJECT_NUMBER}"

# 7. Loop through repos and grant IAM bindings
echo -e "${CYAN}[7/7] Binding IAM roles for repositories...${NC}"
for REPO in "${GITHUB_REPOS_ARRAY[@]}"; do
  echo -e "  ${YELLOW}→${NC} Granting ${REPO} access to impersonate ${SERVICE_ACCOUNT}..."
  gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${REPO}" > /dev/null
done

# Final Output
echo ""
echo -e "${GREEN}=======================================================================${NC}"
echo -e "${GREEN}✅ Setup & Update Complete!${NC}"
echo -e "${GREEN}=======================================================================${NC}"
echo -e "Add this workload identity provider to your GitHub Actions YAML:"
echo ""

WIP_NAME=$(gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --format="value(name)")

echo -e "  ${CYAN}workload_identity_provider: '${WIP_NAME}'${NC}"
echo -e "  ${CYAN}service_account: '${SERVICE_ACCOUNT}'${NC}"
echo -e "${GREEN}=======================================================================${NC}"