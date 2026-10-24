/**
 * 发布/编辑活动页（复用同一表单）。
 * 编辑模式通过路由参数 :id 加载已有活动；改动提交后需管理员重新审核。
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import dayjs from 'dayjs';
import { createEvent, updateEvent, getEvent, listCategories, uploadCover } from '../api/eventApi';

const INITIAL_FORM = {
  title: '',
  category_id: '',
  location: '',
  start_time: null,
  end_time: null,
  signup_deadline: null,
  capacity: 50,
  require_approval: false,
  description: '',
  cover_url: '',
};

export default function PublishEvent() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    listCategories().then((d) => setCategories(d.list)).catch(() => {});
  }, []);

  // 编辑模式：加载活动并回填（换行 <br> 还原为换行符便于编辑）
  useEffect(() => {
    if (!isEdit) return;
    getEvent(id)
      .then((d) => {
        const e = d.event;
        setForm({
          title: e.title,
          category_id: e.category_id,
          location: e.location,
          start_time: dayjs(e.start_time),
          end_time: dayjs(e.end_time),
          signup_deadline: dayjs(e.signup_deadline),
          capacity: e.capacity,
          require_approval: e.require_approval === 1,
          description: (e.description || '').replace(/<br\s*\/?>/gi, '\n'),
          cover_url: e.cover_url || '',
        });
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadCover(file);
      update('cover_url', data.url);
      showToast('封面上传成功');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const validate = () => {
    if (!form.title.trim()) return '请填写活动标题';
    if (!form.category_id) return '请选择活动分类';
    if (!form.location.trim()) return '请填写活动地点';
    if (!form.start_time || !form.end_time || !form.signup_deadline) return '请完整选择时间与报名截止时间';
    if (form.end_time.isBefore(form.start_time)) return '结束时间必须晚于开始时间';
    if (form.signup_deadline.isAfter(form.start_time)) return '报名截止时间不能晚于活动开始时间';
    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0) return '人数上限必须为不小于 0 的整数';
    return null;
  };

  const handleSubmit = async () => {
    const errMsg = validate();
    if (errMsg) {
      showToast(errMsg, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        category_id: Number(form.category_id),
        location: form.location.trim(),
        start_time: form.start_time.toISOString(),
        end_time: form.end_time.toISOString(),
        signup_deadline: form.signup_deadline.toISOString(),
        capacity: Number(form.capacity),
        require_approval: form.require_approval,
        // 纯文本简介：换行转为 <br>（服务端仍会白名单过滤）
        description: form.description ? form.description.replace(/\n/g, '<br>') : '',
        cover_url: form.cover_url || null,
      };
      if (isEdit) {
        await updateEvent(id, payload);
      } else {
        await createEvent(payload);
      }
      showToast('提交成功，等待管理员审核');
      setTimeout(() => navigate('/my/events'), 800);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold">{isEdit ? '编辑活动' : '发布活动'}</h1>
      {isEdit && (
        <Alert severity="info" className="mb-4">
          修改提交后活动将重新进入待审核状态，审核通过后才会对公众更新。
        </Alert>
      )}

      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm md:p-6">
        <TextField
          fullWidth
          required
          label="活动标题"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          inputProps={{ maxLength: 80 }}
          helperText={`${form.title.length}/80`}
        />

        <TextField
          fullWidth
          required
          select
          label="活动分类"
          value={form.category_id}
          onChange={(e) => update('category_id', e.target.value)}
        >
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateTimePicker
            label="开始时间 *"
            value={form.start_time}
            onChange={(v) => update('start_time', v)}
            format="YYYY-MM-DD HH:mm:ss"
            ampm={false}
            views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DateTimePicker
            label="结束时间 *"
            value={form.end_time}
            onChange={(v) => update('end_time', v)}
            format="YYYY-MM-DD HH:mm:ss"
            ampm={false}
            views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </div>

        <DateTimePicker
          label="报名截止时间 *"
          value={form.signup_deadline}
          onChange={(v) => update('signup_deadline', v)}
          format="YYYY-MM-DD HH:mm:ss"
          ampm={false}
          views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
          slotProps={{ textField: { fullWidth: true } }}
        />

        <TextField
          fullWidth
          required
          label="活动地点"
          value={form.location}
          onChange={(e) => update('location', e.target.value)}
          inputProps={{ maxLength: 120 }}
        />

        <TextField
          fullWidth
          required
          type="number"
          label="人数上限"
          value={form.capacity}
          onChange={(e) => update('capacity', e.target.value)}
          helperText="填 0 表示不限名额"
          inputProps={{ min: 0 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={form.require_approval}
              onChange={(e) => update('require_approval', e.target.checked)}
            />
          }
          label="报名需审核（开启后由您在名单页逐个审核）"
        />

        <div>
          <p className="mb-1 text-sm text-gray-600">封面图（选填，≤2MB，jpg/png/webp）</p>
          <div className="flex items-center gap-3">
            <Button variant="outlined" component="label" disabled={uploading}>
              {uploading ? '上传中…' : '上传封面'}
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} />
            </Button>
            {form.cover_url && (
              <>
                <img src={form.cover_url} alt="封面预览" className="h-16 w-24 rounded object-cover" />
                <Button size="small" color="error" onClick={() => update('cover_url', '')}>
                  移除
                </Button>
              </>
            )}
          </div>
        </div>

        <TextField
          fullWidth
          multiline
          rows={6}
          label="活动简介"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          helperText="支持换行；内容将在服务端进行安全过滤"
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ minHeight: 48 }}
        >
          {submitting ? '提交中…' : '提交审核'}
        </Button>
      </div>

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
    </div>
  );
}
