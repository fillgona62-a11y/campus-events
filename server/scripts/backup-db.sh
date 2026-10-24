#!/usr/bin/env bash
# Daily SQLite backup for campus-events (WAL mode).
# Safe backup requires the `sqlite3 .backup` command (copying data.db directly
# loses data under WAL). Keeps the newest 14 archives locally and copies the
# latest one to a remote target via scp.
#
# Usage:  bash backup-db.sh
# Cron:   0 3 * * * $HOME/backup/backup-db.sh >> $HOME/backup/backup.log 2>&1
# Env:
#   DB_PATH        database file (default: $HOME/campus-events/server/data/data.db)
#   BACKUP_DIR     local backup directory (default: $HOME/backup)
#   KEEP_COPIES    number of local archives to keep (default: 14)
#   REMOTE_TARGET  scp target, e.g. user@host:~/backups (optional; skipped if unset)
#   SSH_KEY        ssh private key for scp (optional)
set -u

DB_PATH="${DB_PATH:-$HOME/campus-events/server/data/data.db}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backup}"
KEEP_COPIES="${KEEP_COPIES:-14}"
REMOTE_TARGET="${REMOTE_TARGET:-}"
SSH_KEY="${SSH_KEY:-}"

DATE="$(date +%Y%m%d)"
TARGET="$BACKUP_DIR/campus-events-$DATE.db"

fail() {
  echo "[backup] $(date '+%F %T') $1 failed"
  exit 1
}

[ -f "$DB_PATH" ] || fail "database not found at $DB_PATH"
mkdir -p "$BACKUP_DIR"

# Online safe backup for WAL mode
sqlite3 "$DB_PATH" ".backup '$TARGET'" || fail "sqlite3 .backup"

# Integrity check: the backup must be readable and consistent
INTEGRITY="$(sqlite3 "$TARGET" 'PRAGMA integrity_check;')"
[ "$INTEGRITY" = "ok" ] || fail "integrity check ($INTEGRITY)"
REG_COUNT="$(sqlite3 "$TARGET" 'SELECT COUNT(*) FROM registrations;')" || fail "verify query"
echo "[backup] $(date '+%F %T') created $TARGET (registrations=$REG_COUNT)"

# Uploads (活动封面图)：数据库备份不覆盖用户上传的图片，必须单独归档
UPLOAD_DIR="${UPLOAD_DIR:-$HOME/campus-events-online/server/uploads}"
UPLOAD_TARGET="$BACKUP_DIR/campus-events-$DATE-uploads.tar.gz"
if [ -d "$UPLOAD_DIR" ]; then
  tar czf "$UPLOAD_TARGET" -C "$(dirname "$UPLOAD_DIR")" "$(basename "$UPLOAD_DIR")" \
    && echo "[backup] $(date '+%F %T') created $UPLOAD_TARGET" \
    || echo "[backup] $(date '+%F %T') uploads archive FAILED"
fi

# 备份文件含用户数据，收紧权限
chmod 600 "$TARGET" 2>/dev/null
[ -f "$UPLOAD_TARGET" ] && chmod 600 "$UPLOAD_TARGET" 2>/dev/null

# Offsite transfer (optional). Failure is logged but does not fail the script.
if [ -n "$REMOTE_TARGET" ]; then
  SCP_OPT="-o ConnectTimeout=20"
  [ -n "$SSH_KEY" ] && SCP_OPT="$SCP_OPT -i $SSH_KEY"
  if scp $SCP_OPT "$TARGET" "$REMOTE_TARGET"; then
    echo "[backup] $(date '+%F %T') scp to $REMOTE_TARGET ok"
  else
    echo "[backup] $(date '+%F %T') scp to $REMOTE_TARGET failed (will retry next run)"
  fi
fi

# Retention: keep the newest KEEP_COPIES archives locally（数据库与上传包各留 KEEP_COPIES 份）
for PATTERN in 'campus-events-*.db' 'campus-events-*-uploads.tar.gz'; do
  find "$BACKUP_DIR" -name "$PATTERN" -type f | sort -r | tail -n +$((KEEP_COPIES + 1)) | while read -r f; do
    rm -f "$f"
  done
done
echo "[backup] $(date '+%F %T') retention done (keep $KEEP_COPIES)"
