/**
 * ShareDialog.jsx — 活动分享弹窗（撞色风格）
 *
 * 视觉要点：
 *   1. 海报/二维码预览区是撞色卡：白底 + 2px 墨边 + 硬投影，内部用纯色光斑做层次
 *   2. 三个下载按钮撞色区分：下载海报=宝蓝、下载二维码=樱珞紫、复制链接=霁澜青
 *   3. 按钮统一 hover 浮起 / 按压下沉反馈；未就绪时灰底并写明原因
 *   4. 复制成功/失败给出明确可执行的 toast 文案
 *
 * props 签名与调用方式不变：open / onClose / event
 */
import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LinkIcon from '@mui/icons-material/Link';
import { eventUrl, qrDataUrl, generatePoster, downloadDataUrl } from '../utils/poster';
import { CLASH } from '../theme';
import { readableText } from '../utils/clash';
import { ClashStar } from './ClashDecor';

/** 撞色实心按钮样式（统一 hover 浮起 + 按压下沉） */
function clashSolidButton(bg) {
  const fg = readableText(bg);
  return {
    minHeight: 44,
    fontWeight: 800,
    borderRadius: '14px',
    border: '2px solid var(--ink-line)',
    backgroundColor: bg,
    color: fg,
    boxShadow: '4px 4px 0 0 var(--ink-line)',
    transition:
      'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1)',
    '&:hover': {
      backgroundColor: bg,
      boxShadow: '6px 6px 0 0 var(--ink-line)',
      transform: 'translate(-2px, -2px)',
    },
    '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
    '&.Mui-disabled': {
      backgroundColor: '#D7D7E2',
      color: '#6B6B7B',
      boxShadow: 'none',
      border: '2px solid var(--ink-line)',
    },
  };
}

export default function ShareDialog({ open, onClose, event }) {
  const [poster, setPoster] = useState('');
  const [qr, setQr] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') =>
    setToast({ open: true, message, severity });

  // 弹窗打开时生成海报与二维码
  useEffect(() => {
    if (!open || !event) return;
    let alive = true;
    setLoading(true);
    setPoster('');
    setQr('');
    (async () => {
      try {
        const url = eventUrl(event.id);
        const qrData = await qrDataUrl(url);
        const posterData = await generatePoster(event, qrData);
        if (alive) {
          setQr(qrData);
          setPoster(posterData);
        }
      } catch (err) {
        if (alive) showToast('海报生成失败，请关闭后重试或检查网络', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, event]);

  const handleDownloadPoster = () => {
    if (poster) downloadDataUrl(poster, `活动海报-${event.title}.png`);
  };
  const handleDownloadQr = () => {
    if (qr) downloadDataUrl(qr, `活动二维码-${event.title}.png`);
  };
  const handleCopyLink = async () => {
    const url = eventUrl(event.id);
    try {
      await navigator.clipboard.writeText(url);
      showToast('活动链接已复制到剪贴板，快去分享给同学吧');
    } catch {
      showToast(`复制失败，请手动复制此链接：${url}`, 'error');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="flex items-center gap-2">
            分享活动
            <ClashStar size={16} style={{ color: CLASH.magenta }} />
          </span>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="关闭分享弹窗"
            sx={{
              border: '2px solid var(--ink-line)',
              borderRadius: '10px',
              transition: 'transform .16s cubic-bezier(.22,1,.36,1)',
              '&:hover': { backgroundColor: '#F0F0F5', transform: 'translate(-1px, -1px)' },
              '&:active': { transform: 'translate(1px, 1px)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center' }}>
          {loading ? (
            <div className="py-6">
              {/* 骨架屏：模拟海报比例，比纯转圈更有加载预期 */}
              <div className="skeleton mx-auto h-64 w-44 rounded-2xl border border-ink/10" />
              <p className="mt-4 text-sm font-semibold text-ink-mute">正在生成海报…</p>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-paper-card p-4 shadow-sm">
              {/* 纯色光斑装饰（不使用渐变） */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-clash-lime opacity-50"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-8 -right-6 h-28 w-28 rounded-full bg-clash-cyan opacity-45"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-10 h-10 w-10 rotate-12 rounded-md bg-clash-magenta opacity-40"
              />

              <div className="relative flex flex-col items-center gap-3">
                {poster ? (
                  <img
                    src={poster}
                    alt="活动海报预览"
                    className="w-full max-w-[240px] rounded-xl border border-ink/10 object-contain"
                  />
                ) : (
                  <p className="py-8 text-sm text-ink-mute">海报预览暂不可用</p>
                )}

                {/* 二维码预览 */}
                {qr && (
                  <div className="flex flex-col items-center gap-1.5 rounded-xl border border-ink/10 bg-paper-card px-3 py-2 shadow-sm">
                    <img src={qr} alt="活动二维码预览" className="h-28 w-28" />
                    <span className="text-[11px] font-bold text-ink-mute">扫码报名</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>

        <DialogActions sx={{ flexDirection: 'column', gap: 1.5, px: 3, pb: 2.5 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!poster}
            onClick={handleDownloadPoster}
            sx={clashSolidButton(CLASH.royal)}
          >
            {poster ? '下载海报' : '海报生成中…'}
          </Button>
          <div className="flex w-full gap-2">
            <Button
              fullWidth
              variant="contained"
              startIcon={<QrCode2Icon />}
              disabled={!qr}
              onClick={handleDownloadQr}
              sx={clashSolidButton(CLASH.magenta)}
            >
              下载二维码
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={handleCopyLink}
              sx={clashSolidButton(CLASH.cyan)}
            >
              复制链接
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled" sx={{ fontWeight: 700 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
