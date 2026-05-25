#!/bin/bash
set -euo pipefail

# ==============================================================================
# Setup/Update Google Cloud Workload Identity Federation for GitHub Actions
# SERVICE_ACCOUNT={"SERVICE_ACCOUNT_NAME}@{PROJECT_ID}.iam.gserviceaccount.com"
# ==============================================================================

# Load environment variables from .env file if it exists
if [[ -f ".env" ]]; then
  echo "-> Loading variables from .env file..."
  # set -a automatically exports all variables defined
  set -a
  source .env
  set +a
fi

# --- Variables: MUST BE DEFINED IN .ENV OR ENVIRONMENT ---
if [[ -z "${PROJECT_ID:-}" ]] || [[ -z "${SA_NAME:-}" ]] || [[ -z "${GITHUB_REPOS:-}" ]]; then
  echo "Error: Missing required environment variables."
  echo "Please ensure PROJECT_ID, SA_NAME, and GITHUB_REPOS are defined in your .env file."
  exit 1
fi

# Convert space-separated GITHUB_REPOS string from .env to an array
read -r -a GITHUB_REPOS_ARRAY <<< "${GITHUB_REPOS}"

SERVICE_ACCOUNT="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_NAME="${POOL_NAME:-"github-pool"}"
PROVIDER_NAME="${PROVIDER_NAME:-"github-provider"}"
# ----------------------------------------------

echo "Starting Workload Identity setup for [${GITHUB_REPOS_ARRAY[*]}] in project ${PROJECT_ID}..."

# 1. Handle the Service Account
echo "-> Checking Service Account '${SERVICE_ACCOUNT}' state..."
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "-> Service Account '${SERVICE_ACCOUNT}' already exists."
else
  echo "-> Creating Service Account: ${SA_NAME}..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Actions Service Account"
  
  # Optional: Wait a few seconds to ensure GCP IAM propagation before proceeding
  sleep 5
fi

# 2. Handle the Workload Identity Pool
echo "-> Checking Workload Identity Pool '${POOL_NAME}' state..."
POOL_STATE=$(gcloud iam workload-identity-pools describe "${POOL_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(state)" 2>/dev/null || echo "MISSING")

if [[ "${POOL_STATE}" == "ACTIVE" ]]; then
  echo "-> Pool '${POOL_NAME}' exists and is active."
elif [[ "${POOL_STATE}" == "DELETED" ]]; then
  echo "-> Pool '${POOL_NAME}' was soft-deleted. Undeleting..."
  gcloud iam workload-identity-pools undelete "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" > /dev/null
else
  echo "-> Creating Workload Identity Pool: ${POOL_NAME}..."
  gcloud iam workload-identity-pools create "${POOL_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --display-name="GitHub Actions Pool"
fi

# 3. Prepare the CEL condition for multiple repos
# This joins the array into a string like: 'repo1', 'repo2'
CONDITION_REPOS=$(printf "'%s'," "${GITHUB_REPOS_ARRAY[@]}" | sed 's/,$//')
ATTR_CONDITION="assertion.repository in [${CONDITION_REPOS}]"

# 4. Handle the OIDC Provider
echo "-> Checking Workload Identity Provider '${PROVIDER_NAME}' state..."
PROVIDER_STATE=$(gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --format="value(state)" 2>/dev/null || echo "MISSING")

if [[ "${PROVIDER_STATE}" == "ACTIVE" ]]; then
  echo "-> Updating existing Workload Identity Provider with latest conditions..."
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --attribute-condition="${ATTR_CONDITION}"
elif [[ "${PROVIDER_STATE}" == "DELETED" ]]; then
  echo "-> Provider '${PROVIDER_NAME}' was soft-deleted. Undeleting and updating..."
  gcloud iam workload-identity-pools providers undelete "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" > /dev/null
  gcloud iam workload-identity-pools providers update-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --attribute-condition="${ATTR_CONDITION}"
else
  echo "-> Creating Workload Identity Provider: ${PROVIDER_NAME}..."
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_NAME}" \
    --project="${PROJECT_ID}" \
    --location="global" \
    --workload-identity-pool="${POOL_NAME}" \
    --display-name="GitHub Actions Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
    --attribute-condition="${ATTR_CONDITION}" \
    --issuer-uri="https://token.actions.githubusercontent.com"
fi

# 5. Retrieve numeric Project Number
echo "-> Fetching Project Number..."
PROJECT_NUMBER=$(gcloud projects describe "${PROJECT_ID}" --format="value(projectNumber)")

# 6. Loop through repos and grant IAM bindings
for REPO in "${GITHUB_REPOS_ARRAY[@]}"; do
  echo "-> Granting ${REPO} access to ${SERVICE_ACCOUNT}..."
  gcloud iam service-accounts add-iam-policy-binding "${SERVICE_ACCOUNT}" \
    --project="${PROJECT_ID}" \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${REPO}" > /dev/null
done

# 7. Final Output
echo ""
echo "======================================================================="
echo "✅ Setup & Update Complete!"
echo "======================================================================="
echo "Workload Identity Provider identifier:"
echo ""
gcloud iam workload-identity-pools providers describe "${PROVIDER_NAME}" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="${POOL_NAME}" \
  --format="value(name)"
echo "======================================================================="