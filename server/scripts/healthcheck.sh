#!/usr/bin/env bash
# healthcheck.sh — 探活 + 自动恢复 + 邮件告警
#
# 逻辑：
#   1. curl 本机 /
#   2. 200      -> 若此前处于故障态，发"已恢复"邮件并清除状态文件
#   3. 非 200   -> 先尝试 pm2 restart 自救，15 秒后复检
#                  复检通过 -> 只记录日志，不发邮件（自愈成功）
#                  复检仍失败 -> 发告警邮件（同一故障只发一次，靠状态文件去重）
#
# Cron（每 5 分钟）：
#   */5 * * * * APP_DIR=$HOME/campus-events-online $HOME/backup/healthcheck.sh >> $HOME/backup/healthcheck.log 2>&1
set -u

APP_DIR="${APP_DIR:-$HOME/campus-events-online}"
ALERT_TO="${ALERT_TO:-}"
STATE_FILE="${STATE_FILE:-$HOME/backup/.health-down}"
LOG_PREFIX="[health] $(date '+%F %T')"

check() {
  curl -s -o /dev/null -w '%{http_code}' -m 8 http://127.0.0.1/
}

send_alert() {
  ( cd "$APP_DIR" && node "$APP_DIR/server/scripts/alert-mail.js" "$1" "$2" ${ALERT_TO:+"$ALERT_TO"} ) 2>&1 | sed "s/^/$LOG_PREFIX /"
}

CODE="$(check)"
if [ "$CODE" = "200" ]; then
  if [ -f "$STATE_FILE" ]; then
    echo "$LOG_PREFIX 服务已恢复（HTTP 200）"
    send_alert "【已恢复】校园活动报名系统" "服务已恢复正常，HTTP 200。"
    rm -f "$STATE_FILE"
  fi
  exit 0
fi

echo "$LOG_PREFIX 检测到异常：HTTP $CODE，尝试 pm2 restart 自救"
( cd "$APP_DIR" && pm2 restart campus-events >/dev/null 2>&1 )
sleep 15

CODE2="$(check)"
if [ "$CODE2" = "200" ]; then
  echo "$LOG_PREFIX 自救成功（HTTP 200），不告警"
  exit 0
fi

if [ ! -f "$STATE_FILE" ]; then
  touch "$STATE_FILE"
  echo "$LOG_PREFIX 自救失败，发送告警邮件"
  send_alert "【故障】校园活动报名系统不可用" \
    "探活失败：nginx 返回 HTTP $CODE，pm2 restart 自救后仍为 HTTP $CODE2。\n请检查：pm2 list、pm2 logs campus-events、磁盘空间。"
else
  echo "$LOG_PREFIX 仍处于故障态（告警已发过，不再重复）"
fi
exit 1
