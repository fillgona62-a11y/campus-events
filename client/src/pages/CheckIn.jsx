/**
 * 组织者核销台（F4）：核销口令生成/展示 + 学号+口令核销 + 已核销/未核销统计。
 * 路由：/my/events/:id/checkin（仅活动发布者或管理员可达，服务端二次校验权限）。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
  getEvent,
  getCheckinCode,
  generateCheckinCode,
  checkin,
  checkinStats,
} from '../api/eventApi';
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
      <div className="flex justify-center py-16">
        <CircularProgress />
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
        <span className="text-sm text-gray-500">核销台 · {event.title}</span>
      </div>

      {message.text && (
        <Alert severity={message.severity} className="mb-3" onClose={() => setMessage({ text: '', severity: 'info' })}>
          {message.text}
        </Alert>
      )}

      <p className="mb-3 text-xs text-gray-500">
        活动时间：{formatTimeRange(event.start_time, event.end_time)}（活动开始后可生成口令与核销）
      </p>

      {/* 口令卡片 */}
      <div className="mb-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">核销口令</h2>
        {checkinCode ? (
          <p className="text-center text-4xl font-bold tracking-[0.5em] text-primary">{checkinCode}</p>
        ) : (
          <p className="text-sm text-gray-500">尚未生成核销口令。活动开始后生成，一活动一口令。</p>
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
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{stats.approved_count}</p>
            <p className="mt-1 text-xs text-gray-500">报名成功</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-primary">{stats.checked_in_count}</p>
            <p className="mt-1 text-xs text-gray-500">已核销</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-sm">
            <p className="text-2xl font-bold text-orange-500">{stats.unchecked_count}</p>
            <p className="mt-1 text-xs text-gray-500">未核销</p>
          </div>
        </div>
      )}

      {/* 核销表单 */}
      <form onSubmit={handleCheckin} className="space-y-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">现场核销</h2>
        <TextField
          fullWidth
          required
          label="学生学号"
          value={form.student_id}
          onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}
          helperText="学生到场口头报学号，由组织者录入"
        />
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
    </div>
  );
}
