#!/bin/bash

# Check if the Docker network already exists
if ! docker network inspect app-network >/dev/null 2>&1; then
  docker network create app-network
else
  echo "Network 'app-network' already exists, skipping creation."
fi

# Check if the PostgreSQL container already exists
if [ "$(docker ps -aq -f name=klark_db)" ]; then
  if [ "$(docker ps -q -f name=klark_db)" ]; then
    echo "Container 'klark_db' is already running, skipping creation."
  else
    echo "Container 'klark_db' exists but is not running. Starting container."
    docker start postgres-klark
  fi
else
  # Run the PostgreSQL container if it does not already exist
  docker run --name klark_db \
    --network app-network \
    -e POSTGRES_USER=username \
    -e POSTGRES_DB=klarkdb \
    -e POSTGRES_PASSWORD=password \
    -p 5432:5432 \
    -v /home/raj/projects/web/klark/db_data:/var/lib/postgresql/data \
    -d postgres:14-alpine
fi

# docker exec -it klark_db psql -U username -d klarkdb
