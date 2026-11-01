# Amanah Pay

Merchant-led installment plans with customer account access and payment tracking. The repository contains a Spring Boot API, a MySQL database schema managed by Flyway, and a separately deployable React/Vite frontend.

## Prerequisites

- Java 21 and Maven for backend development.
- Node.js 22 and npm for frontend development.
- Docker Desktop (or another Docker Engine) for container builds and Compose.
- Google Cloud CLI for Cloud Build and Cloud Run deployment.

## Run locally

Copy `backend/.env.example` to `backend/.env` and fill in the local database, mail, JWT, and OTP settings. Do not commit `.env` files. Compose reads that file for variable substitution and passes it to the backend; use Compose's `--env-file` option rather than shell-sourcing it.

From the repository root:

```sh
docker compose --env-file backend/.env up --build
```

The frontend is available at `http://localhost:5173`, the API at `http://localhost:8080`, MySQL at `localhost:3306`, and Mailpit at `http://localhost:8025`. OTP emails use the configured SMTP provider (Brevo in the current local configuration); Mailpit is not an automatic fallback. To use Mailpit directly, set `MAIL_HOST=mailpit`, `MAIL_PORT=1025`, and `MAIL_STARTTLS=false`. The local Nginx `/api/` proxy resolves the Compose service name `backend`; this proxy is for Compose, not for the separately deployed Cloud Run services.

Stop the stack with `docker compose --env-file backend/.env down`. Add `--volumes` only when you intentionally want to delete the local MySQL data.

## Local checks

Backend tests require Java 21:

```sh
cd backend
mvn clean test
```

Frontend checks:

```sh
cd frontend
npm ci
npm run lint
npm test
npm run build
```

## Build the Docker images locally

Run these commands from the repository root. The final context argument is intentionally the matching subdirectory, so neither build expects a root `Dockerfile`.

```sh
docker build -t amanahpay-backend:local -f backend/Dockerfile backend/
docker build -t amanahpay-frontend:local -f frontend/Dockerfile frontend/
```

For a frontend image that will run outside Compose, set the backend URL as the Nginx API proxy upstream at build time. Browser requests remain same-origin, so the refresh cookie continues to work with the current `SameSite=Lax` setting.

```sh
docker build -t amanahpay-frontend:cloud-run \
  --build-arg API_PROXY_UPSTREAM=https://BACKEND_SERVICE_URL/api/ \
  -f frontend/Dockerfile frontend/
```

The Compose setup uses the default `http://backend:8080/api/` upstream. Both Docker contexts exclude local `.env` files and generated build output.

## Google Cloud Build and Cloud Run

The project is a monorepo with independent frontend and backend builds:

| Service | Cloud Build config | Dockerfile | Build context | Cloud Run container port |
| --- | --- | --- | --- | --- |
| Backend | `cloudbuild/backend.yaml` | `backend/Dockerfile` | `backend/` | 8080 |
| Frontend | `cloudbuild/frontend.yaml` | `frontend/Dockerfile` | `frontend/` | 80 |

The images are tagged with the Cloud Build ID and pushed to Artifact Registry. Cloud Run deployment steps are disabled by default. To deploy from a build or trigger, set `_DEPLOY_TO_RUN=true` and provide the service-specific substitutions described below. The frontend build uses `_API_URL` as its Nginx proxy upstream base: use `https://BACKEND_SERVICE_URL` without a trailing slash for a Cloud Run backend. Nginx proxies `/api/` on the frontend origin to that backend. The backend build uses `_FRONTEND_ORIGIN` for CORS and the app base URL. The root `.gcloudignore` includes `.gitignore`, so local `.env` files are excluded from `gcloud builds submit` uploads as well as from Docker build contexts.

### One-time project setup

Set the target project and region, then enable the required APIs and create the Docker repository:

```sh
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-south1"
export AR_REPOSITORY="amanahpay"

gcloud config set project "$PROJECT_ID"
gcloud services enable \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  vpcaccess.googleapis.com

gcloud artifacts repositories create "$AR_REPOSITORY" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Amanah Pay container images"
```

Create these Secret Manager secrets and add the corresponding values as secret versions before deploying the backend:

| Secret | Value |
| --- | --- |
| `amanah-db-url` | JDBC URL for the production MySQL database; host must be reachable from Cloud Run |
| `amanah-db-user` | Database username |
| `amanah-db-password` | Database password |
| `amanah-jwt-secret` | Base64-encoded signing key used by the application |
| `amanah-otp-pepper` | Private OTP hashing pepper |
| `amanah-mail-username` | SMTP provider username |
| `amanah-mail-password` | SMTP provider password/API credential |

Example creation and secure version upload (repeat for each secret; do not put secret values into shell history or build substitutions):

```sh
gcloud secrets create amanah-db-url --replication-policy=automatic
gcloud secrets versions add amanah-db-url --data-file=/secure/path/db-url.txt
```

Use the same commands for the other names above. Pin the numeric secret version in the Cloud Build substitutions instead of using `latest` for environment-variable secrets.

The backend config defaults to production profile, port 8080, SMTP STARTTLS, and Secret Manager references. Before deployment, set `_FRONTEND_ORIGIN` to the exact public origin of the frontend (scheme and host, no path), `_MAIL_FROM` to a verified sender, and the secret-name substitutions if you use different Secret Manager names. For a private MySQL address, set `_VPC_CONNECTOR` to a Serverless VPC Access connector name in the same region; the build config routes private-range egress through it. The JDBC URL still needs to identify the reachable MySQL host and database.

### Build and publish images

From the repository root:

```sh
gcloud builds submit . \
  --config=cloudbuild/backend.yaml \
  --substitutions="_REGION=$REGION,_AR_REPOSITORY=$AR_REPOSITORY"

gcloud builds submit . \
  --config=cloudbuild/frontend.yaml \
  --substitutions="_REGION=$REGION,_AR_REPOSITORY=$AR_REPOSITORY,_API_URL=https://BACKEND_SERVICE_URL"
```

These builds publish images but do not deploy them. For Cloud Run deployment, use the same commands with `_DEPLOY_TO_RUN=true` and the deployment substitutions. Example backend deployment (the frontend must already have a stable URL):

```sh
gcloud builds submit . \
  --config=cloudbuild/backend.yaml \
  --substitutions="_REGION=$REGION,_AR_REPOSITORY=$AR_REPOSITORY,_SERVICE_NAME=amanahpay-backend,_DEPLOY_TO_RUN=true,_FRONTEND_ORIGIN=https://FRONTEND_SERVICE_URL,_MAIL_FROM=VERIFIED_SENDER_EMAIL,_RUN_SERVICE_ACCOUNT=$RUNTIME_SA"
```

Example frontend deployment after the backend URL is available:

```sh
gcloud builds submit . \
  --config=cloudbuild/frontend.yaml \
  --substitutions="_REGION=$REGION,_AR_REPOSITORY=$AR_REPOSITORY,_SERVICE_NAME=amanahpay-frontend,_DEPLOY_TO_RUN=true,_API_URL=https://BACKEND_SERVICE_URL"
```

For a first deployment without custom domains, deploy the frontend once to obtain its Cloud Run URL, then deploy the backend with that frontend origin, and finally rebuild/redeploy the frontend with the backend URL. The first frontend revision can use a temporary HTTPS API URL while the backend is being created. With custom domains already assigned, use those stable origins directly.

### Trigger settings to fix the current build

The repository has separate configs now, but the existing GitHub trigger is configured remotely with inline Docker build steps that use `- . -f Dockerfile`. That is why Cloud Build looks for `/workspace/Dockerfile`. Update the trigger’s build configuration to use a repository config file after these changes are committed and pushed; the trigger cannot consume unpushed local files.

For each existing trigger, edit the build configuration type from a Dockerfile build to **Cloud Build configuration file (yaml or json)** and set:

- Backend config path: `cloudbuild/backend.yaml`
- Frontend config path: `cloudbuild/frontend.yaml`
- Source location: repository root (the config itself selects the `backend/` or `frontend/` build context)
- Optional included-file filters: `backend/**` plus `cloudbuild/backend.yaml` for the backend trigger; `frontend/**` plus `cloudbuild/frontend.yaml` for the frontend trigger. Set `_API_URL` on the frontend trigger to the backend HTTPS origin for a Cloud Run build.

Keep `_DEPLOY_TO_RUN=false` for build-only triggers. Enable deployment only on a release trigger after its substitutions, secrets, and IAM are ready. This repository change does not alter any remote trigger.

### IAM and production database

Use a dedicated runtime identity for the backend. These commands assume you have set `BUILD_SA` to the service account shown on the Cloud Build trigger and `RUNTIME_SA` to the backend Cloud Run service account email. If `_RUN_SERVICE_ACCOUNT` is left empty, Cloud Run uses its project default service identity instead.

```sh
gcloud iam service-accounts create amanahpay-runtime --display-name="Amanah Pay Cloud Run runtime"
export RUNTIME_SA="amanahpay-runtime@$PROJECT_ID.iam.gserviceaccount.com"

gcloud artifacts repositories add-iam-policy-binding "$AR_REPOSITORY" \
  --location="$REGION" \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --member="serviceAccount:$BUILD_SA" \
  --role="roles/iam.serviceAccountUser"

for secret in amanah-db-url amanah-db-user amanah-db-password amanah-jwt-secret amanah-otp-pepper amanah-mail-username amanah-mail-password; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$RUNTIME_SA" \
    --role="roles/secretmanager.secretAccessor"
done
```

Pass `_RUN_SERVICE_ACCOUNT=$RUNTIME_SA` to the backend Cloud Build config when deploying. The Cloud Build trigger identity needs Artifact Registry Writer, Cloud Run Admin, and Service Account User on the chosen runtime identity. If it attaches a VPC connector, also grant it permission to use that connector (for example, `roles/vpcaccess.user` at the appropriate scope). The runtime identity needs Secret Manager Secret Accessor on each backend secret. The Cloud Build account is selected in the Cloud Build trigger; it is not configured by this repository.

Cloud Run does not provide a persistent MySQL database. Use a managed production MySQL service, such as Cloud SQL for MySQL, and configure `DB_URL`, `DB_USER`, and `DB_PASSWORD` through Secret Manager. For a Cloud SQL private IP, configure Cloud Run VPC egress with `_VPC_CONNECTOR`; do not expect the Compose `mysql` service to exist in Cloud Run. The current backend uses the standard MySQL JDBC driver, so its JDBC endpoint must be reachable as a regular MySQL host from the service network. The Compose database and Mailpit are local development services only.

The backend must be reachable by browser clients for customer and merchant API calls, so the config deploys it as an unauthenticated Cloud Run ingress service; application JWT authorization remains in the API. The frontend is also public. Restrict database ingress and grant only the roles needed by the Cloud Build principal and Cloud Run service identity.

The frontend proxies API requests server-side through Nginx, which keeps browser calls and refresh cookies on the frontend origin even when frontend and backend use separate `*.run.app` hostnames. Set `_API_URL` to the backend HTTPS service URL and `_FRONTEND_ORIGIN` to the frontend HTTPS service URL. Custom domains can be added later for branding.

## Product boundary

The merchant sets eligibility and sells at a fixed deferred price agreed upfront. The merchant pays Amanah Pay's disclosed SaaS fee. Customers pay the merchant directly by UPI or a gateway arrangement that settles directly to the merchant. Product, Shariah, and regulatory assumptions must be confirmed by qualified advisers before public claims or launch.
