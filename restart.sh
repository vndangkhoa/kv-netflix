#!/bin/bash

# Script to launch or restart the kv-netflix project using docker compose.

set -e # Exit immediately if a command exits with a non-zero status.

echo "--- Stopping existing containers (if any) ---"
docker compose down

echo "--- Pulling latest images and building services ---"
# This will pull necessary base images and rebuild/recreate services defined in docker-compose.yml
docker compose up -d --build

echo "-------------------------------------------------"
echo "--- Checking Active Ports ---"
docker compose port streamflow 8000
echo "-----------------------------"