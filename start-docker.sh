#!/usr/bin/env bash
# Loads the packaged Docker images when needed and starts the application with Compose.

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly COMPOSE_FILE="${SCRIPT_DIR}/docker-compose.yml"
readonly BACKEND_IMAGE="mini-survey-backend:latest"
readonly FRONTEND_IMAGE="mini-survey-frontend:latest"
readonly BACKEND_ARCHIVE="${SCRIPT_DIR}/mini-survey-backend.tar"
readonly FRONTEND_ARCHIVE="${SCRIPT_DIR}/mini-survey-frontend.tar"

info() {
  printf '[INFO] %s\n' "$1"
}

error() {
  printf '[ERROR] %s\n' "$1" >&2
}

require_command() {
  local command_name="$1"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    error "Required command '${command_name}' was not found."
    exit 1
  fi
}

ensure_image() {
  local image_name="$1"
  local archive_path="$2"

  if docker image inspect "${image_name}" >/dev/null 2>&1; then
    info "Docker image ${image_name} already exists; loading is not required."
    return
  fi

  if [[ ! -f "${archive_path}" ]]; then
    error "Docker image ${image_name} is missing, and archive ${archive_path} was not found."
    exit 1
  fi

  info "Loading Docker image ${image_name} from ${archive_path}."
  docker image load --input "${archive_path}"

  if ! docker image inspect "${image_name}" >/dev/null 2>&1; then
    error "Archive ${archive_path} did not provide the expected image ${image_name}."
    exit 1
  fi

  info "Docker image ${image_name} was loaded successfully."
}

wait_for_frontend() {
  local application_url="$1"

  if ! command -v curl >/dev/null 2>&1; then
    info "curl is unavailable; skipping the HTTP readiness check."
    return
  fi

  info "Waiting for the frontend at ${application_url}."

  for _ in {1..30}; do
    if curl --fail --silent --show-error --output /dev/null "${application_url}"; then
      info "The application is available at ${application_url}."
      return
    fi

    sleep 1
  done

  error "The containers started, but ${application_url} did not respond within 30 seconds."
  exit 1
}

main() {
  require_command docker

  if ! docker compose version >/dev/null 2>&1; then
    error "Docker Compose v2 is unavailable. Install it or enable it in Docker Desktop."
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    error "Docker Engine is not running. Start Docker Desktop and try again."
    exit 1
  fi

  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    error "Compose file ${COMPOSE_FILE} was not found."
    exit 1
  fi

  ensure_image "${BACKEND_IMAGE}" "${BACKEND_ARCHIVE}"
  ensure_image "${FRONTEND_IMAGE}" "${FRONTEND_ARCHIVE}"

  info "Starting the application with Docker Compose."
  docker compose --file "${COMPOSE_FILE}" up --detach --no-build

  info "Container status:"
  docker compose --file "${COMPOSE_FILE}" ps

  local published_address
  published_address="$(docker compose --file "${COMPOSE_FILE}" port frontend 80)"
  local application_url="http://${published_address/0.0.0.0/localhost}"

  info "Application URL: ${application_url}"
  wait_for_frontend "${application_url}"
}

main "$@"
