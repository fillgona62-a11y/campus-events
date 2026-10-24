/**
 * 管理后台 - 操作日志（F6）：列表 + 操作类型/时间筛选 + 分页，只读（无编辑/删除入口）。
 *
 * 视觉：后台克制风格 —— 撞色描边卡片包表格，薄荷绿表头，操作类型用撞色描边徽标。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { listAuditLogs } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { ClashStar } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { formatDateTime } from '../../utils/format';
import { AUDIT_ACTION_MAP } from '../../utils/constants';
import { PAGINATION_SX, CLASH_HEAD_SX, SkeletonList, ErrorState } from '../clashUi';

const PAGE_SIZE = 10;

/** 详情 JSON 转简要文案（detail 禁存敏感信息，仅作展示） */
function formatDetail(detail) {
  if (!detail) return '-';
  try {
    const obj = typeof detail === 'string' ? JSON.parse(detail) : detail;
    if (obj.reason) return `理由：${obj.reason}`;
    if (obj.from && obj.to) return `${obj.from} → ${obj.to}`;
    if (obj.temp_password_generated) return '已生成临时密码';
    return JSON.stringify(obj);
  } catch {
    return String(detail);
  }
}

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listAuditLogs({
      action: action || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '操作日志加载失败');
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [action, startDate, endDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={20} style={{ color: CLASH.haze }} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">操作日志</h1>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>操作类型</InputLabel>
          <Select
            label="操作类型"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
          >
            <MenuItem value="">全部</MenuItem>
            {Object.entries(AUDIT_ACTION_MAP).map(([value, conf]) => (
              <MenuItem key={value} value={value}>
                {conf.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          type="date"
          label="开始日期"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          type="date"
          label="结束日期"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          InputLabelProps={{ shrink: true }}
        />
        <Button
          variant="outlined"
          onClick={() => { setAction(''); setStartDate(''); setEndDate(''); setPage(1); }}
        >
          重置
        </Button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无操作日志" />
      ) : (
        <TableContainer className="clash-card overflow-x-auto">
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={CLASH_HEAD_SX}>操作人</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>操作类型</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>对象</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>明细</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.list.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {row.admin.name}
                    <span className="ml-1 text-xs font-normal text-ink-faint">
                      （{row.admin.student_id}）
                    </span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={AUDIT_ACTION_MAP[row.action]?.label || row.action}
                      sx={{ borderColor: CLASH.ink, backgroundColor: CLASH.mint, color: CLASH.ink, fontWeight: 800, borderWidth: 2 }}
                    />
                  </TableCell>
                  <TableCell>
                    {row.target_type === 'event' ? '活动' : '用户'} #{row.target_id}
                  </TableCell>
                  <TableCell>{formatDetail(row.detail)}</TableCell>
                  <TableCell>{formatDateTime(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
