/**
 * 组织者核销台（F4）：核销口令生成/展示 + 学号+口令核销 + 已核销/未核销统计。
 * 路由：/my/events/:id/checkin（仅活动发布者或管理员可达，服务端二次校验权限）。
 *
 * 视觉：撞色卡片化，口令用撞色块突出，统计用三色块卡片。
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { checkinQrText } from '../components/CheckinQrDialog';
import {
  getEvent,
  getCheckinCode,
  generateCheckinCode,
  checkin,
  checkinStats,
} from '../api/eventApi';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatTimeRange } from '../utils/format';

export default function CheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [checkinCode, setCheckinCode] = useState(null);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ student_id: '', code: '' });
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  // 扫码核销（v4）：打开摄像头扫码，解析学号自动填入
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const scanningRef = useRef(false);

  const showMessage = (text, severity = 'info') => setMessage({ text, severity });

  const loadEvent = useCallback(() => {
    getEvent(id)
      .then((d) => setEvent(d.event))
      .catch((err) => showMessage(err.message, 'error'));
  }, [id]);

  const loadCode = useCallback(() => {
    getCheckinCode(id)
      .then((d) => setCheckinCode(d.checkin_code))
      .catch((err) => showMessage(err.message, 'error'));
  }, [id]);

  const loadStats = useCallback(() => {
    checkinStats(id)
      .then((d) => setStats(d))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    loadEvent();
    loadCode();
    loadStats();
  }, [loadEvent, loadCode, loadStats]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const d = await generateCheckinCode(id);
      setCheckinCode(d.checkin_code);
      showMessage('核销口令已生成，旧口令（如有）立即失效', 'success');
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  // 停止摄像头
  const stopScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    scanningRef.current = false;
  };

  const openScan = async () => {
    setScanError('');
    setScanOpen(true);
    // 优先用原生 BarcodeDetector
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch {
        detectorRef.current = null;
      }
    }
    if (!detectorRef.current) {
      setScanError('当前浏览器不支持原生扫码，请使用 Chrome/Edge 最新版，或手动输入学号核销');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      scanningRef.current = true;
      scanLoop();
    } catch {
      setScanError('无法访问摄像头，请检查权限或手动输入学号核销');
    }
  };

  // 持续扫描二维码
  const scanLoop = async () => {
    if (!scanningRef.current) return;
    if (videoRef.current && detectorRef.current && videoRef.current.readyState >= 2) {
      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        if (codes && codes.length > 0) {
          const text = codes[0].rawValue;
          const m = text.match(/^campus-checkin:(\d+):([A-Za-z0-9_]+)$/);
          if (m && Number(m[1]) === Number(id)) {
            setForm((f) => ({ ...f, student_id: m[2] }));
            showMessage(`已识别学号 ${m[2]}，请确认口令后核销`, 'success');
            stopScan();
            setScanOpen(false);
            return;
          }
        }
      } catch {
        /* 单帧识别失败继续 */
      }
    }
    requestAnimationFrame(scanLoop);
  };

  // 弹窗关闭时停止摄像头
  const handleScanClose = () => {
    stopScan();
    setScanOpen(false);
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!form.student_id.trim() || !form.code.trim()) {
      showMessage('请输入学号和核销口令', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const d = await checkin(id, { student_id: form.student_id.trim(), code: form.code.trim() });
      showMessage(`核销成功：${d.name}（${d.student_id}）`, 'success');
      setForm((f) => ({ ...f, student_id: '', code: '' }));
      loadStats();
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!event) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <div className="skeleton h-10 w-full rounded-2xl" />
        <div className="skeleton h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-2 flex items-center gap-1">
        <IconButton
          onClick={() => navigate(`/my/events/${id}/registrations`)}
          aria-label="返回"
          sx={{ minWidth: 44, minHeight: 44 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <span className="text-sm font-bold text-ink-mute">核销台 · {event.title}</span>
      </div>

      {message.text && (
        <Alert severity={message.severity} className="mb-3" onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <p className="mb-3 text-xs font-semibold text-ink-mute">
        活动时间：{formatTimeRange(event.start_time, event.end_time)}（活动开始后可生成口令与核销）
      </p>

      {/* 口令卡片 */}
      <section className="clash-card mb-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.lime }} />
          <h2 className="text-base font-extrabold text-ink">核销口令</h2>
        </div>
        <ClashStripe className="mb-3" />
        {checkinCode ? (
          <p
            className="rounded-2xl border-2 border-ink py-4 text-center text-4xl font-extrabold tracking-[0.5em] text-ink"
            style={{ backgroundColor: CLASH.lime }}
          >
            {checkinCode}
          </p>
        ) : (
          <p className="text-sm text-ink-soft">尚未生成核销口令。活动开始后生成，一活动一口令。</p>
        )}
        <Button
          fullWidth
          variant="contained"
          className="mt-3"
          onClick={handleGenerate}
          disabled={generating}
          sx={{ minHeight: 48 }}
        >
          {generating ? '生成中…' : checkinCode ? '重新生成口令' : '生成核销口令'}
        </Button>
      </section>

      {/* 统计卡片 */}
      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="clash-card p-3">
            <p className="text-2xl font-extrabold text-ink">{stats.approved_count}</p>
            <p className="mt-1 text-xs font-bold text-ink-mute">报名成功</p>
          </div>
          <div className="clash-card p-3">
            <p className="text-2xl font-extrabold text-ink">{stats.checked_in_count}</p>
            <p className="mt-1 text-xs font-bold text-ink-mute">已核销</p>
          </div>
          <div className="clash-card p-3">
            <p className="text-2xl font-extrabold text-ink">{stats.unchecked_count}</p>
            <p className="mt-1 text-xs font-bold text-ink-mute">未核销</p>
          </div>
        </div>
      )}

      {/* 核销表单 */}
      <form onSubmit={handleCheckin} className="clash-card space-y-4 p-4">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.cyan }} />
          <h2 className="text-base font-extrabold text-ink">现场核销</h2>
        </div>
        <ClashStripe />
        <TextField
          fullWidth
          required
          label="学生学号"
          value={form.student_id}
          onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
          helperText="学生到场口头报学号，或点击下方扫码核销"
        />
        <Button
          fullWidth
          variant="outlined"
          startIcon={<QrCodeScannerIcon />}
          onClick={openScan}
          sx={{ minHeight: 44 }}
        >
          扫码核销（识别学生签到码）
        </Button>
        <TextField
          fullWidth
          required
          label="核销口令"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          inputProps={{ maxLength: 6, inputMode: 'numeric' }}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          sx={{ minHeight: 48 }}
        >
          {submitting ? '核销中…' : '确认核销'}
        </Button>
      </form>

      {/* 扫码核销弹窗（v4） */}
      <Dialog open={scanOpen} onClose={handleScanClose} fullWidth maxWidth="sm">
        <DialogTitle>扫码核销</DialogTitle>
        <DialogContent>
          {scanError ? (
            <Alert severity="warning">{scanError}</Alert>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl border-2 border-ink"
              style={{ maxHeight: 360, backgroundColor: '#000' }}
            />
          )}
          <p className="mt-2 text-xs font-semibold text-ink-mute">
            将学生的签到二维码对准摄像头，识别成功后自动填入学号。
          </p>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleScanClose}>关闭</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
