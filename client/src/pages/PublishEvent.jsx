/**
 * 发布/编辑活动页（复用同一表单）。
 * 编辑模式通过路由参数 :id 加载已有活动；改动提交后需管理员重新审核。
 *
 * 视觉：表单分区（活动信息 / 时间地点 / 报名设置 / 封面），
 * 每区配撞色标题 + ClashStripe 分隔；时间选择器沿用自研鼓轮 WheelDateTime（不改其实现）。
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
import dayjs from 'dayjs';
import WheelDateTime from '../components/WheelDateTime';
import { createEvent, updateEvent, getEvent, listCategories, uploadCoverCompressed } from '../api/eventApi';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';

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

/** 分区标题：撞色小星 + 标题 + 分隔条 */
function FormSection({ title, accent, desc, children }) {
  return (
    <section className="clash-card p-4 md:p-6">
      <div className="mb-3 flex items-center gap-2">
        <ClashStar size={18} style={{ color: accent }} />
        <h2 className="text-base font-extrabold tracking-tight text-ink">{title}</h2>
      </div>
      <ClashStripe className="mb-4" />
      {desc && <p className="-mt-1 mb-3 text-xs text-ink-mute">{desc}</p>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

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
  // 字段级校验错误：明确指出哪个字段填错了
  const [fieldErrors, setFieldErrors] = useState({});

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setFieldError = (key, message) =>
    setFieldErrors((e) => ({ ...e, [key]: message || undefined }));

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
      // v4：超过 2MB 的图片前端自动压缩后上传，手机大图也能快速上传
      const data = await uploadCoverCompressed(file);
      update('cover_url', data.url);
      showToast('封面上传成功');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  /**
   * 字段级校验：返回 { 字段名: 错误文案 }，为空表示通过。
   * 同时把错误写到对应输入框下方，让用户一眼看出哪里错了。
   */
  const validate = () => {
    const errors = {};
    if (!form.title.trim()) errors.title = '请填写活动标题';
    if (!form.category_id) errors.category_id = '请选择活动分类';
    if (!form.location.trim()) errors.location = '请填写活动地点';
    if (!form.start_time) errors.start_time = '请选择开始时间';
    if (!form.end_time) errors.end_time = '请选择结束时间';
    if (!form.signup_deadline) errors.signup_deadline = '请选择报名截止时间';
    if (form.start_time && form.end_time && form.end_time.isBefore(form.start_time)) {
      errors.end_time = '结束时间必须晚于开始时间';
    }
    if (form.signup_deadline && form.start_time && form.signup_deadline.isAfter(form.start_time)) {
      errors.signup_deadline = '报名截止时间不能晚于活动开始时间';
    }
    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 0) {
      errors.capacity = '人数上限必须为不小于 0 的整数';
    }
    setFieldErrors(errors);
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      showToast('表单还有未填完或填错的字段，请检查标红处', 'error');
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
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={22} style={{ color: CLASH.magenta }} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          {isEdit ? '编辑活动' : '发布活动'}
        </h1>
      </div>

      {isEdit && (
        <Alert severity="info" className="mb-4">
          修改提交后活动将重新进入待审核状态，审核通过后才会对公众更新。
        </Alert>
      )}

      <div className="space-y-4">
        {/* ── 分区一：活动信息 ─────────────────────────────── */}
        <FormSection title="活动信息" accent={CLASH.lime} desc="告诉同学这是什么活动、属于哪个分类">
          <TextField
            fullWidth
            required
            label="活动标题"
            value={form.title}
            onChange={(e) => { update('title', e.target.value); setFieldError('title', ''); }}
            error={Boolean(fieldErrors.title)}
            helperText={fieldErrors.title || `${form.title.length}/80`}
            inputProps={{ maxLength: 80 }}
          />
          <TextField
            fullWidth
            required
            select
            label="活动分类"
            value={form.category_id}
            onChange={(e) => { update('category_id', e.target.value); setFieldError('category_id', ''); }}
            error={Boolean(fieldErrors.category_id)}
            helperText={fieldErrors.category_id || '分类决定活动在列表里的撞色标识'}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </TextField>
        </FormSection>

        {/* ── 分区二：时间地点 ─────────────────────────────── */}
        <FormSection title="时间地点" accent={CLASH.cyan} desc="用鼓轮选择时间，或点输入框展开日历">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <WheelDateTime
                label="开始时间 *"
                value={form.start_time}
                onChange={(v) => { update('start_time', v); setFieldError('start_time', ''); }}
              />
              {fieldErrors.start_time && (
                <p className="mt-1 text-xs font-bold text-clash-magenta">{fieldErrors.start_time}</p>
              )}
            </div>
            <div>
              <WheelDateTime
                label="结束时间 *"
                value={form.end_time}
                onChange={(v) => { update('end_time', v); setFieldError('end_time', ''); }}
              />
              {fieldErrors.end_time && (
                <p className="mt-1 text-xs font-bold text-clash-magenta">{fieldErrors.end_time}</p>
              )}
            </div>
          </div>
          <div>
            <WheelDateTime
              label="报名截止时间 *"
              value={form.signup_deadline}
              onChange={(v) => { update('signup_deadline', v); setFieldError('signup_deadline', ''); }}
            />
            {fieldErrors.signup_deadline && (
              <p className="mt-1 text-xs font-bold text-clash-magenta">{fieldErrors.signup_deadline}</p>
            )}
          </div>
          <TextField
            fullWidth
            required
            label="活动地点"
            value={form.location}
            onChange={(e) => { update('location', e.target.value); setFieldError('location', ''); }}
            error={Boolean(fieldErrors.location)}
            helperText={fieldErrors.location || '填写具体教学楼 / 场地，方便同学找过来'}
            inputProps={{ maxLength: 120 }}
          />
        </FormSection>

        {/* ── 分区三：报名设置 ─────────────────────────────── */}
        <FormSection title="报名设置" accent={CLASH.lemon} desc="名额与审核规则决定了报名者的体验">
          <TextField
            fullWidth
            required
            type="number"
            label="人数上限"
            value={form.capacity}
            onChange={(e) => { update('capacity', e.target.value); setFieldError('capacity', ''); }}
            error={Boolean(fieldErrors.capacity)}
            helperText={fieldErrors.capacity || '填 0 表示不限名额'}
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
        </FormSection>

        {/* ── 分区四：封面与简介 ───────────────────────────── */}
        <FormSection title="封面与简介" accent={CLASH.magenta} desc="封面可选，简介会展示在活动详情页">
          <div>
            <p className="mb-1.5 text-sm font-bold text-ink">封面图（选填，≤2MB，jpg/png/webp）</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outlined" component="label" disabled={uploading}>
                {uploading ? '上传中…' : '上传封面'}
                <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} />
              </Button>
              {form.cover_url && (
                <>
                  <img
                    src={form.cover_url}
                    alt="封面预览"
                    className="h-16 w-24 rounded-xl border-2 border-ink object-cover"
                  />
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
        </FormSection>

        {/* 提交区：整行大按钮 + 硬投影 */}
        <div className="rounded-2xl border-2 border-ink bg-paper-card p-4">
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
            sx={{ minHeight: 56 }}
          >
            {submitting ? '提交中…' : isEdit ? '保存修改并重新送审' : '提交审核'}
          </Button>
          <p className="mt-2 text-center text-xs text-ink-mute">
            提交后活动将进入待审核状态，管理员通过后才会对全校可见。
          </p>
        </div>
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
