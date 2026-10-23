#!/usr/bin/env bash
# Pre-deploy checklist for campus-events (run on the server before deploying v2).
# Verifies: JWT secret strength, online seed.js ADMIN_RESET_PASSWORD mechanism,
# SMTP configuration, and that migrations ran on startup.
set -u

APP_DIR="${APP_DIR:-$HOME/campus-events}"
ENV_FILE="$APP_DIR/server/.env"
WARN=0

echo "===== campus-events pre-deploy check ====="

# 1. JWT_SECRET must not be the default/weak value (RB-04)
if [ -f "$ENV_FILE" ]; then
  SECRET="$(grep -E '^JWT_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  if [ -z "$SECRET" ]; then
    echo "[WARN] JWT_SECRET is not set in $ENV_FILE"
    WARN=1
  elif [ "$SECRET" = "campus-events-dev-secret-do-not-use-in-prod" ] || [ ${#SECRET} -lt 32 ]; then
    echo "[WARN] JWT_SECRET is the default value or too short (<32 chars)."
    echo "       Rotate it: bash server/scripts/gen-jwt-secret.sh"
    WARN=1
  else
    echo "[OK] JWT_SECRET is set and looks strong."
  fi
else
  echo "[WARN] $ENV_FILE not found (production keeps .env outside the deploy tar)."
  WARN=1
fi

# 2. Online seed.js must NOT contain the ADMIN_RESET_PASSWORD mechanism
#    (it could overwrite user passwords on restart — F1 risk).
SEED_FILE="$APP_DIR/server/src/db/seed.js"
if [ -f "$SEED_FILE" ]; then
  if grep -q "ADMIN_RESET_PASSWORD" "$SEED_FILE"; then
    echo "[WARN] $SEED_FILE contains ADMIN_RESET_PASSWORD — align it with the local"
    echo "       source (remove that mechanism) BEFORE deploying F1."
    WARN=1
  else
    echo "[OK] seed.js has no ADMIN_RESET_PASSWORD mechanism."
  fi
else
  echo "[WARN] $SEED_FILE not found (already deployed? check path)."
  WARN=1
fi

# 3. SMTP configured, or DEV_ECHO=1 for development
if [ -f "$ENV_FILE" ]; then
  DEV_ECHO="$(grep -E '^SMTP_DEV_ECHO=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  SMTP_USER="$(grep -E '^SMTP_USER=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  SMTP_AUTH="$(grep -E '^SMTP_AUTH_CODE=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
  if [ "$DEV_ECHO" = "1" ]; then
    echo "[OK] SMTP_DEV_ECHO=1 (dev mode: no real email, code echoed in response/log)."
  elif [ -z "$SMTP_USER" ] || [ -z "$SMTP_AUTH" ]; then
    echo "[WARN] SMTP_USER or SMTP_AUTH_CODE not set and DEV_ECHO is off."
    echo "       Configure SMTP or set SMTP_DEV_ECHO=1."
    WARN=1
  else
    echo "[OK] SMTP configured with user $SMTP_USER."
  fi
fi

# 4. Startup log check: migration completed (requires app already restarted)
PM2_LOG="$HOME/.pm2/logs/campus-events-out.log"
if [ -f "$PM2_LOG" ]; then
  if tail -n 200 "$PM2_LOG" | grep -q "\[migrate\] 增量迁移完成"; then
    echo "[OK] migrate.js completed on latest startup (see pm2 log)."
  else
    echo "[INFO] Migration line not found in the last 200 log lines;"
    echo "       after restart check: grep migrate ~/.pm2/logs/campus-events-out.log"
  fi
else
  echo "[INFO] pm2 log not found; after restart verify '[migrate] 增量迁移完成'."
fi

echo "===== result ====="
if [ "$WARN" -eq 1 ]; then
  echo "Check finished with WARNINGS — resolve them before deploying."
  exit 1
fi
echo "All checks passed."
