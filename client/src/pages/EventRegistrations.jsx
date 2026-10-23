/**
 * 单活动报名名单管理：状态筛选 + 审核（通过/拒绝）+ 候补提升/移出 + 核销状态筛选
 * + 核销台入口 + CSV 导出（F4/F5）。
 * 注：报名趋势图在 T04 由 TrendChart 嵌入（见 registrationsTrend 数据源）。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
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
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  useEffect(() => {
    getEvent(id)
      .then((d) => setEvent(d.event))
      .catch((err) => showToast(err.message, 'error'));
  }, [id]);

  // 单活动报名趋势（F8，默认近 30 天）
  useEffect(() => {
    registrationsTrend(id, { days: 30 })
      .then((d) => setTrend(d))
      .catch(() => {});
  }, [id]);

  const load = useCallback(() => {
    setLoading(true);
    listRegistrations(id, {
      status: status || undefined,
      checked_in: checkedIn || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
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
        <h1 className="text-lg font-bold">报名名单{event ? ` · ${event.title}` : ''}</h1>
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
        <span className="text-sm text-gray-500">核销状态：</span>
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
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无报名记录" />
      ) : (
        <RegistrationTable
          rows={data.list}
          requireApproval={event?.require_approval === 1}
          onReview={handleReview}
          onExport={handleExport}
          exporting={exporting}
          onPromote={handlePromote}
          onRemove={handleRemove}
        />
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
