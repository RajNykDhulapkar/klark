#!/bin/bash
set -e
echo "Starting Klark Next.js Application..."

# Function to check required environment variables
check_required_vars() {
  local missing_vars=0

  # List of required environment variables as a space-separated string
  REQUIRED_VARS="DATABASE_URL STRIPE_SECRET_KEY RESEND_API_KEY STRIPE_WEBHOOK_SECRET OPEN_AI_MODEL OPENAI_API_KEY OPENAI_VERBOSE LAST_K_CHAT_HISTORY NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY NEXT_PUBLIC_POSTHOG_KEY NEXT_PUBLIC_POSTHOG_HOST"

  for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
      echo "ERROR: Required environment variable ${var} is not set"
      missing_vars=1
    fi
  done

  # Exit if any required variables are missing
  if [ $missing_vars -ne 0 ]; then
    echo "Missing required environment variables. Please set them and try again."
    exit 1
  fi
}

# Function to wait for services
wait_for_services() {
  echo "Waiting for PostgreSQL database to be ready..."
  until pg_isready -h db -p 5432 -U ${POSTGRES_USER}; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
  done
  echo "PostgreSQL is up"

  echo "Waiting for MinIO to be ready..."
  until curl -sf "${MINIO_ENDPOINT}/minio/health/live" >/dev/null 2>&1; do
    echo "MinIO is unavailable - sleeping"
    sleep 2
  done
  echo "MinIO is up"

  sleep 5
}

setup_minio() {
  echo "Setting up MinIO..."
  mc alias set klark_minio ${MINIO_ENDPOINT} ${MINIO_ACCESS_KEY} ${MINIO_SECRET_KEY}

  if ! mc ls klark_minio/uploads >/dev/null 2>&1; then
    echo "Creating 'uploads' bucket..."
    mc mb klark_minio/uploads
    mc policy set private klark_minio/uploads
  fi
}

# Main execution
check_required_vars
wait_for_services
setup_minio

# Run drizzle-kit migrations
echo "Running database migrations..."
pnpm run db:migrate
echo "Migrations completed successfully."

# Start the Next.js application
echo "Starting Next.js application..."
exec pnpm start
