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
readonly BACKEND_ARCHIVE_SIZE="58686464"
readonly FRONTEND_ARCHIVE_SIZE="26088448"
readonly BACKEND_ARCHIVE_SHA256="c214ad1cac655d3069898ad2188dc2b7418b61abd9618d763e0c2761135274b8"
readonly FRONTEND_ARCHIVE_SHA256="d5ced6be58283bde85a571d47488d37183c1785d94bda8fa533dddda2a606f28"

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

# Calculates a SHA-256 checksum using a utility available on Linux or macOS.
calculate_sha256() {
  local archive_path="$1"
  local checksum_output

  if command -v sha256sum >/dev/null 2>&1; then
    checksum_output="$(sha256sum "${archive_path}")"
  elif command -v shasum >/dev/null 2>&1; then
    checksum_output="$(shasum --algorithm 256 "${archive_path}")"
  else
    error "Cannot verify ${archive_path}: neither 'sha256sum' nor 'shasum' is available."
    exit 1
  fi

  printf '%s\n' "${checksum_output%% *}"
}

# Rejects Git LFS pointers, incomplete downloads, and corrupted image archives.
validate_archive() {
  local archive_path="$1"
  local expected_size="$2"
  local expected_sha256="$3"
  local actual_size
  local actual_sha256

  actual_size="$(wc -c <"${archive_path}")"
  actual_size="${actual_size//[[:space:]]/}"

  if [[ "${actual_size}" -lt 1024 ]] && grep -Fqx \
    'version https://git-lfs.github.com/spec/v1' "${archive_path}"; then
    error "Archive ${archive_path} is a Git LFS pointer, not a Docker image."
    error "Install Git LFS, then run 'git lfs pull' in the repository and try again."
    exit 1
  fi

  if [[ "${actual_size}" != "${expected_size}" ]]; then
    error "Archive ${archive_path} has an unexpected size: ${actual_size} bytes; expected ${expected_size}."
    error "Restore it with 'git lfs pull && git lfs checkout' and try again."
    exit 1
  fi

  actual_sha256="$(calculate_sha256 "${archive_path}")"

  if [[ "${actual_sha256}" != "${expected_sha256}" ]]; then
    error "Archive ${archive_path} failed the SHA-256 integrity check."
    error "Expected ${expected_sha256}, but received ${actual_sha256}."
    error "Restore it with 'git lfs pull && git lfs checkout' and try again."
    exit 1
  fi

  info "Archive ${archive_path} passed the integrity check."
}

ensure_image() {
  local image_name="$1"
  local archive_path="$2"
  local expected_size="$3"
  local expected_sha256="$4"

  if docker image inspect "${image_name}" >/dev/null 2>&1; then
    info "Docker image ${image_name} already exists; loading is not required."
    return
  fi

  if [[ ! -f "${archive_path}" ]]; then
    error "Docker image ${image_name} is missing, and archive ${archive_path} was not found."
    exit 1
  fi

  info "Checking Docker image archive ${archive_path}."
  validate_archive "${archive_path}" "${expected_size}" "${expected_sha256}"

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

  ensure_image \
    "${BACKEND_IMAGE}" \
    "${BACKEND_ARCHIVE}" \
    "${BACKEND_ARCHIVE_SIZE}" \
    "${BACKEND_ARCHIVE_SHA256}"
  ensure_image \
    "${FRONTEND_IMAGE}" \
    "${FRONTEND_ARCHIVE}" \
    "${FRONTEND_ARCHIVE_SIZE}" \
    "${FRONTEND_ARCHIVE_SHA256}"

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

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
