/**
 * ShareDialog.jsx — 活动分享弹窗：海报预览/下载、二维码下载、复制链接。
 * 纯前端实现，海报由 canvas 本地生成。
 */
import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LinkIcon from '@mui/icons-material/Link';
import { eventUrl, qrDataUrl, generatePoster, downloadDataUrl } from '../utils/poster';

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
        if (alive) showToast('生成海报失败：' + err.message, 'error');
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
      showToast('活动链接已复制');
    } catch {
      showToast('复制失败，请手动复制：' + url, 'error');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          分享活动
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {loading ? (
            <div className="py-10 text-center">
              <CircularProgress />
              <p className="mt-2 text-sm text-gray-500">正在生成海报…</p>
            </div>
          ) : poster ? (
            <img
              src={poster}
              alt="活动海报预览"
              className="mx-auto w-full max-w-[280px] rounded-lg shadow-md"
            />
          ) : null}
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', gap: 1, px: 3, pb: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<DownloadIcon />}
            disabled={!poster}
            onClick={handleDownloadPoster}
          >
            下载海报
          </Button>
          <div className="flex w-full gap-2">
            <Button
              fullWidth
              variant="outlined"
              startIcon={<QrCode2Icon />}
              disabled={!qr}
              onClick={handleDownloadQr}
            >
              下载二维码
            </Button>
            <Button fullWidth variant="outlined" startIcon={<LinkIcon />} onClick={handleCopyLink}>
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
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
