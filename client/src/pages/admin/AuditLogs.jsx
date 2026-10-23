/**
 * 管理后台 - 操作日志（F6）：列表 + 操作类型/时间筛选 + 分页，只读（无编辑/删除入口）。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
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
import { formatDateTime } from '../../utils/format';
import { AUDIT_ACTION_MAP } from '../../utils/constants';

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
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    listAuditLogs({
      action: action || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [action, startDate, endDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">操作日志</h1>

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
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无操作日志" />
      ) : (
        <TableContainer className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell>操作人</TableCell>
                <TableCell>操作类型</TableCell>
                <TableCell>对象</TableCell>
                <TableCell>明细</TableCell>
                <TableCell>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.list.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {row.admin.name}
                    <span className="ml-1 text-xs text-gray-400">（{row.admin.student_id}）</span>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={AUDIT_ACTION_MAP[row.action]?.label || row.action}
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
