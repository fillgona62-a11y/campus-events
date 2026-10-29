/**
 * CheckinQrDialog.jsx — 学生签到二维码弹窗（v4）
 * 已报名成功（approved）的活动：生成个人签到二维码，组织者扫码即可核销。
 * 二维码内容格式：campus-checkin:{eventId}:{studentId}
 */
import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { qrDataUrl } from '../utils/poster';
import { CLASH } from '../theme';

/** 生成签到二维码内容（与组织者扫码解析约定一致） */
export function checkinQrText(eventId, studentId) {
  return `campus-checkin:${eventId}:${studentId}`;
}

export default function CheckinQrDialog({ open, onClose, eventId, studentId, title }) {
  const [qr, setQr] = useState('');

  useEffect(() => {
    if (!open || !eventId || !studentId) return;
    let alive = true;
    qrDataUrl(checkinQrText(eventId, studentId), { width: 280 })
      .then((d) => { if (alive) setQr(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, eventId, studentId]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>签到二维码</span>
        <IconButton onClick={onClose} size="small" aria-label="关闭">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center' }}>
        {qr ? (
          <img src={qr} alt="签到二维码" className="mx-auto h-64 w-64 rounded-xl border-2 border-ink" />
        ) : (
          <div className="skeleton mx-auto h-64 w-64 rounded-xl" />
        )}
        <p className="mt-3 text-sm font-bold text-ink">{title}</p>
        <p className="mt-1 text-xs font-semibold text-ink-mute">
          学号 {studentId} · 到场出示此码，由组织者扫码核销
        </p>
        <p
          className="mt-3 rounded-lg border-2 border-ink px-3 py-2 text-xs font-bold text-ink"
          style={{ backgroundColor: CLASH.cyan }}
        >
          请勿截图转发他人，仅限本人使用
        </p>
      </DialogContent>
    </Dialog>
  );
}
