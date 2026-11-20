#!/usr/bin/env bash
# Decrypt an Agency Run result bundle produced by .github/workflows/agency-run.yml.
#   tools/decrypt-results.sh results/run-<id> [private-key.pem]
# Extracts reports/, outreach/, data/raw/ and the run report into the repo root
# (all of them are git-ignored, so nothing plaintext gets committed).
set -euo pipefail
base="${1:?usage: tools/decrypt-results.sh results/run-<id> [key.pem]}"
key="${2:-tmp/results-key.pem}"
k="$(mktemp)"
trap 'rm -f "$k"' EXIT
openssl pkeyutl -decrypt -inkey "$key" -pkeyopt rsa_padding_mode:oaep -in "$base.key.enc" -out "$k"
openssl enc -d -aes-256-cbc -pbkdf2 -in "$base.tgz.enc" -pass "file:$k" | tar xzf -
echo "decrypted $base"
