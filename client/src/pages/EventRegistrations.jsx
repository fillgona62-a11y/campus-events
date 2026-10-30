/**
 * 单活动报名名单管理：状态筛选 + 审核（通过/拒绝）+ 候补提升/移出 + 核销状态筛选
 * + 核销台入口 + CSV 导出。
 * 注：报名趋势图在 T04 由 TrendChart 嵌入（见 registrationsTrend 数据源）。
 *
 * 视觉：撞色标题 + 撞色卡片包裹表格区域。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { getEvent, listRegistrations, exportRegistrations, registrationsTrend } from '../api/eventApi';
import { reviewRegistration, promoteWaitlist, removeWaitlist } from '../api/registrationApi';
import RegistrationTable from '../components/RegistrationTable';
import TrendChart from '../components/TrendChart';
import EmptyState from '../components/EmptyState';
import { ClashStar } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { PAGINATION_SX, SkeletonList, ErrorState } from './clashUi';

const PAGE_SIZE = 10;
const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '待审核', value: 'pending' },
  { label: '已成功', value: 'approved' },
  { label: '候补中', value: 'waitlisted' },
  { label: '已拒绝', value: 'rejected' },
  { label: '已取消', value: 'cancelled' },
];

export default function EventRegistrations() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState('');
  const [checkedIn, setCheckedIn] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [trend, setTrend] = useState({ days: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  useEffect(() => {
    getEvent(id)
      .then((d) => setEvent(d.event))
      .catch((err) => showToast(err.message, 'error'));
  }, [id]);

  // 单活动报名趋势（默认近 30 天）
  useEffect(() => {
    registrationsTrend(id, { days: 30 })
      .then((d) => setTrend(d))
      .catch(() => {});
  }, [id]);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listRegistrations(id, {
      status: status || undefined,
      checked_in: checkedIn || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '报名名单加载失败');
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [id, status, checkedIn, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReview = async (regId, action) => {
    try {
      await reviewRegistration(regId, action);
      showToast(action === 'approve' ? '已通过该报名' : '已拒绝该报名');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handlePromote = async (regId) => {
    try {
      await promoteWaitlist(regId);
      showToast('已提升为报名成功');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemove = async (regId) => {
    try {
      await removeWaitlist(regId);
      showToast('已移出候补名单');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportRegistrations(id);
      showToast('名单已导出');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-1">
        <IconButton onClick={() => navigate('/my/events')} aria-label="返回" sx={{ minWidth: 44, minHeight: 44 }}>
          <ArrowBackIcon />
        </IconButton>
        <ClashStar size={18} style={{ color: CLASH.violet }} />
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          报名名单{event ? ` · ${event.title}` : ''}
        </h1>
        <div className="flex-1" />
        <Button
          size="small"
          variant="outlined"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => navigate(`/my/events/${id}/checkin`)}
        >
          核销台
        </Button>
      </div>

      {event?.require_approval === 1 && (
        <Alert severity="info" className="mb-3">
          该活动开启了报名审核：「待审核」的报名需要您通过后才会占用名额并生效。
        </Alert>
      )}

      <Tabs
        value={status}
        onChange={(e, v) => { setStatus(v); setPage(1); }}
        variant="scrollable"
        scrollButtons="auto"
        className="mb-3"
      >
        {STATUS_TABS.map((tab) => (
          <Tab key={tab.value} label={tab.label} value={tab.value} />
        ))}
      </Tabs>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink-mute">核销状态：</span>
        <Tabs
          value={checkedIn}
          onChange={(e, v) => { setCheckedIn(v); setPage(1); }}
        >
          <Tab label="全部" value="" />
          <Tab label="已核销" value="1" />
          <Tab label="未核销" value="0" />
        </Tabs>
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无报名记录" />
      ) : (
        <div className="clash-card overflow-hidden p-2">
          <RegistrationTable
            rows={data.list}
            requireApproval={event?.require_approval === 1}
            onReview={handleReview}
            onExport={handleExport}
            exporting={exporting}
            onPromote={handlePromote}
            onRemove={handleRemove}
          />
        </div>
      )}

      <div className="mt-4">
        <TrendChart days={trend.days} title={`报名趋势（近 ${trend.days.length} 天）`} />
      </div>

      {data.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <Pagination
            count={Math.ceil(data.total / PAGE_SIZE)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
            sx={PAGINATION_SX}
          />
        </div>
      )}

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
