# ============================================================
# campus-events v2.1 - one-click deploy (PowerShell)
#
# Usage: in VS Code terminal, inside campus-events folder:
#          .\deploy.ps1
#
# Target: AWS EC2 (ap-northeast-2), Amazon Linux 2023
#         ~/campus-events-online   (nginx:80 -> node:3000, pm2: campus-events)
#
# What it uploads (NOTHING ELSE):
#   - server/src      -> server/src        (backend code)
#   - server/scripts  -> server/scripts    (ops scripts: backup / pre-check / jwt)
#   - client/dist     -> webroot           (frontend build)
#   - package.json    (generated, file: deps stripped)
#
# What it NEVER touches (safe by design):
#   - .env            (admin password, SMTP, JWT secret stay on server)
#   - server/data     (live SQLite database)
#   - server/uploads  (live user images)
#   - tar extraction MERGES: overwrites same-name files only, deletes nothing
#
# NOTE: keep this file ASCII-only. PowerShell 5.1 reads .ps1 as GBK
#       and Chinese characters get corrupted.
# ============================================================
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# ---------- config ----------
$ServerIp  = "52.78.4.248"
$User      = "ec2-user"
$Key       = "$env:USERPROFILE\.ssh\seoul.pem"
$RemoteDir = "~/campus-events-online"
$TarName   = "deploy-package.tar.gz"
$StageDir  = "deploy-stage"
# ----------------------------

if (-not (Test-Path $Key)) {
    throw "SSH key not found: $Key`nCopy seoul.pem to C:\Users\Aiden\.ssh\ first."
}

function Remote($cmd) {
    & ssh -i $Key -o StrictHostKeyChecking=no "$User@$ServerIp" $cmd
    if ($LASTEXITCODE -ne 0) { throw "Remote command failed: $cmd" }
}

Write-Host "==> [1/8] Building frontend (about 30s)" -ForegroundColor Cyan
Push-Location client
try { & npm run build } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
if (-not (Test-Path "client\dist\index.html")) { throw "client\dist\index.html missing after build" }

Write-Host "==> [2/8] Generating deploy package.json" -ForegroundColor Cyan
& node make-deploy-package.js
if ($LASTEXITCODE -ne 0) { throw "package.json generation failed" }

Write-Host "==> [3/8] Packing locally (code only, no .env / data / uploads)" -ForegroundColor Cyan
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
New-Item -ItemType Directory -Path "$StageDir\server\src"     | Out-Null
New-Item -ItemType Directory -Path "$StageDir\server\scripts" | Out-Null
New-Item -ItemType Directory -Path "$StageDir\webroot"        | Out-Null
Copy-Item -Recurse -Path "server\src\*"     -Destination "$StageDir\server\src"
Copy-Item -Recurse -Path "server\scripts\*" -Destination "$StageDir\server\scripts"
Copy-Item -Recurse -Path "client\dist\*"    -Destination "$StageDir\webroot"
Copy-Item -Path "deploy-package.json"       -Destination "$StageDir\package.json"
if (Test-Path $TarName) { Remove-Item -Force $TarName }
& tar -czf $TarName -C $StageDir .
if ($LASTEXITCODE -ne 0) { throw "Pack failed" }
$size = [math]::Round((Get-Item $TarName).Length / 1KB, 1)
Write-Host "    packed: $size KB" -ForegroundColor DarkGray

Write-Host "==> [4/8] Uploading to $ServerIp" -ForegroundColor Cyan
& scp -i $Key -o StrictHostKeyChecking=no $TarName "$User@${ServerIp}:~/$TarName"
if ($LASTEXITCODE -ne 0) { throw "Upload failed (network or key issue)" }

Write-Host "==> [5/8] Remote backup (checkpoint WAL, then archive data + .env)" -ForegroundColor Cyan
Remote "cd $RemoteDir && mkdir -p ~/backups && node -e `"const D=require('better-sqlite3');const d=new D('server/data/data.db');d.pragma('wal_checkpoint(TRUNCATE)');d.close();`" && tar czf ~/backups/pre-v21-`$(date +%Y%m%d-%H%M%S).tar.gz server/data server/uploads .env && ls -1t ~/backups | head -3"

Write-Host "==> [6/8] Remote extract + npm install" -ForegroundColor Cyan
Remote "cd $RemoteDir && tar xzf ~/$TarName && rm -f ~/$TarName && npm install --omit=dev --no-audit --no-fund"

Write-Host "==> [7/8] Restarting pm2 process 'campus-events'" -ForegroundColor Cyan
Remote "cd $RemoteDir && (pm2 restart campus-events || pm2 start server/src/index.js --name campus-events) && pm2 save"

Write-Host "==> [8/8] Health check" -ForegroundColor Cyan
Start-Sleep -Seconds 4
Remote "curl -s -o /dev/null -w 'nginx  :80    HTTP %{http_code}\n' -m 5 http://127.0.0.1; curl -s -o /dev/null -w 'app   :3000   HTTP %{http_code}\n' -m 5 http://127.0.0.1:3000; curl -s -m 5 http://127.0.0.1/api/v1/auth/captcha | head -c 120; echo ''; pm2 logs campus-events --lines 12 --nostream"

Remove-Item -Recurse -Force $StageDir -ErrorAction SilentlyContinue
Remove-Item -Force $TarName -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " DEPLOY DONE - open http://$ServerIp" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
