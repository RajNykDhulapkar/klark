#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  print_error "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Create network if it doesn't exist
if ! docker network inspect app-network >/dev/null 2>&1; then
  print_status "Creating Docker network: app-network"
  docker network create app-network
else
  print_warning "Network 'app-network' already exists, skipping creation."
fi

# Function to start or create container
start_or_create_container() {
  local name=$1
  local create_command=$2

  if [ "$(docker ps -aq -f name=$name)" ]; then
    if [ "$(docker ps -q -f name=$name)" ]; then
      print_warning "Container '$name' is already running."
    else
      print_status "Starting existing container '$name'..."
      docker start $name
    fi
  else
    print_status "Creating container '$name'..."
    eval $create_command
  fi
}

# Create data directories
mkdir -p /home/raj/projects/web/klark/{db_data,minio_data,chroma_data}

# PostgreSQL
POSTGRES_CMD="docker run --name klark_db \
  --network app-network \
  -e POSTGRES_USER=username \
  -e POSTGRES_DB=klarkdb \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -v /home/raj/projects/web/klark/db_data:/var/lib/postgresql/data \
  -d postgres:14-alpine"

start_or_create_container "klark_db" "$POSTGRES_CMD"

# MinIO
MINIO_CMD="docker run --name klark_minio \
  --network app-network \
  -e MINIO_ROOT_USER=minio_username \
  -e MINIO_ROOT_PASSWORD=minio_password \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /home/raj/projects/web/klark/minio_data:/data \
  -d minio/minio server /data --console-address ':9001'"

start_or_create_container "klark_minio" "$MINIO_CMD"

# ChromaDB
CHROMA_CMD="docker run --name klark_chroma \
  --network app-network \
  -p 8000:8000 \
  -v /home/raj/projects/web/klark/chroma_data:/chroma/chroma \
  -d ghcr.io/chroma-core/chroma:latest"

start_or_create_container "klark_chroma" "$CHROMA_CMD"

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 5

# Install and configure MinIO client
if ! command -v mc &>/dev/null; then
  print_status "Installing MinIO client..."
  curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
  chmod +x mc
  sudo mv mc /usr/local/bin/
fi

# Configure MinIO client
print_status "Configuring MinIO client..."
mc alias set klark_minio http://localhost:9000 minio_username minio_password

# Create bucket if it doesn't exist
if ! mc ls klark_minio/uploads &>/dev/null; then
  print_status "Creating 'uploads' bucket..."
  mc mb klark_minio/uploads
  mc policy set private klark_minio/uploads
fi

print_status "Setup complete! Services are available at:"
echo -e "${GREEN}PostgreSQL:${NC} localhost:5432"
echo -e "${GREEN}MinIO S3:${NC} localhost:9000"
echo -e "${GREEN}MinIO Console:${NC} localhost:9001"
echo -e "${GREEN}ChromaDB:${NC} localhost:8000"
