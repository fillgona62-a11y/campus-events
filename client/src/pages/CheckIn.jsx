/**
 * 组织者签到台：输入学生学号 + 使用当前位置定位核销。
 * 路由：/my/events/:id/checkin（仅活动发布者或管理员可达，服务端二次校验权限）。
 *
 * 组织者代签时，输入学号后获取当前位置，若在活动地点 200 米内即核销成功。
 * 学生本人也可在「我的报名」自助定位签到，无需组织者参与。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import {
  getEvent,
  checkin,
  checkinStats,
  getCurrentPosition,
} from '../api/eventApi';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatTimeRange } from '../utils/format';

export default function CheckIn() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState({ text: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const showMessage = (text, severity = 'info') => setMessage({ text, severity });

  const loadEvent = useCallback(() => {
    getEvent(id)
      .then((d) => setEvent(d.event))
      .catch((err) => showMessage(err.message, 'error'));
  }, [id]);

  const loadStats = useCallback(() => {
    checkinStats(id)
      .then((d) => setStats(d))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    loadEvent();
    loadStats();
  }, [loadEvent, loadStats]);

  // 定位签到：先获取当前位置，再提交学号+坐标核销
  const handleCheckin = async (e) => {
    e.preventDefault();
    if (!studentId.trim()) {
      showMessage('请输入学生学号', 'error');
      return;
    }
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      const d = await checkin(id, { student_id: studentId.trim(), ...pos });
      showMessage(`签到成功：${d.name}（${d.student_id}），距活动地点约 ${d.distance_m} 米`, 'success');
      setStudentId('');
      loadStats();
    } catch (err) {
      showMessage(err.message, 'error');
    } finally {
      setLocating(false);
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
        <span className="text-sm font-bold text-ink-mute">签到台 · {event.title}</span>
      </div>

      {message.text && (
        <Alert severity={message.severity} className="mb-3" onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <p className="mb-3 text-xs font-semibold text-ink-mute">
        活动时间：{formatTimeRange(event.start_time, event.end_time)}（活动进行中可定位签到）
      </p>

      {/* 签到地点提示 */}
      <section className="clash-card mb-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.lime }} />
          <h2 className="text-base font-extrabold text-ink">签到地点</h2>
        </div>
        <ClashStripe className="mb-3" />
        {event.lat != null && event.lng != null ? (
          <p className="text-sm font-bold text-ink-soft">
            {event.location}（已设定位签到点，半径 {Math.round((event.checkin_radius || 0.2) * 1000)} 米内可签到）
          </p>
        ) : (
          <p className="text-sm font-bold text-clash-magenta">该活动未设置签到地点坐标，无法定位签到</p>
        )}
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
            <p className="mt-1 text-xs font-bold text-ink-mute">已签到</p>
          </div>
          <div className="clash-card p-3">
            <p className="text-2xl font-extrabold text-ink">{stats.unchecked_count}</p>
            <p className="mt-1 text-xs font-bold text-ink-mute">未签到</p>
          </div>
        </div>
      )}

      {/* 定位签到表单（组织者代签） */}
      <form onSubmit={handleCheckin} className="clash-card space-y-4 p-4">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.cyan }} />
          <h2 className="text-base font-extrabold text-ink">现场定位签到</h2>
        </div>
        <ClashStripe />
        <TextField
          fullWidth
          required
          label="学生学号"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          helperText="学生到场报学号，组织者用当前位置定位核销"
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          startIcon={<MyLocationIcon />}
          disabled={locating || event.lat == null}
          sx={{ minHeight: 48 }}
        >
          {locating ? '定位签到中…' : '定位并签到'}
        </Button>
        <p className="text-xs text-ink-mute">
          签到将获取组织者当前位置，须在活动地点 {Math.round((event.checkin_radius || 0.2) * 1000)} 米范围内。
        </p>
      </form>
    </div>
  );
}
