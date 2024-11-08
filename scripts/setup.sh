#!/bin/sh

# Check if the Docker network already exists
if ! docker network inspect klark-network >/dev/null 2>&1; then
  docker network create klark-network
else
  echo "Network 'klark-network' already exists, skipping creation."
fi

# Check if the PostgreSQL container already exists
if [ "$(docker ps -aq -f name=postgres-klark)" ]; then
  if [ "$(docker ps -q -f name=postgres-klark)" ]; then
    echo "Container 'postgres-klark' is already running, skipping creation."
  else
    echo "Container 'postgres-klark' exists but is not running. Starting container."
    docker start postgres-klark
  fi
else
  # Run the PostgreSQL container if it does not already exist
  docker run --name postgres-klark \
    --network klark-network \
    -e POSTGRES_USER=username \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=klarkdb \
    -p 5432:5432 \
    -v /home/raj/projects/web/klark/db_data:/var/lib/postgresql/data \
    -d postgres:latest
fi

# docker exec -it postgres-klark psql -U username -d klarkdb
