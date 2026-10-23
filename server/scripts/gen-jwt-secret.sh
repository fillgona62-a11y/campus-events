#!/usr/bin/env bash
# Generate a strong random JWT secret (S4) and print it for .env.
# Usage:  bash gen-jwt-secret.sh
# Then paste the value into server/.env as JWT_SECRET=... and restart the app.
# Note: rotating the secret invalidates all existing tokens (everyone re-login once).
set -u

SECRET="$(openssl rand -base64 48)"

echo "Generated JWT secret (48 random bytes, base64):"
echo
echo "  $SECRET"
echo
echo "Write it to server/.env:"
echo "  JWT_SECRET=$SECRET"
echo
echo "Then restart the app (e.g. pm2 restart campus-events)."
