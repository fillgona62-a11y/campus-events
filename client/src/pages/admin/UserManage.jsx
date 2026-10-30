/**
 * 管理后台 - 用户管理：关键字搜索 + 禁用/启用（禁用后该用户 JWT 立即失效）+ 重置密码。
 *
 * 视觉：后台克制风格 —— 撞色描边卡片包表格，薄荷绿表头，状态徽标清晰。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { listUsers, setUserStatus, resetUserPassword } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { ClashStar } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { formatDateTime } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { PAGINATION_SX, CLASH_HEAD_SX, SkeletonList, ErrorState } from '../clashUi';

const PAGE_SIZE = 10;

export default function UserManage() {
  const currentUser = useAuthStore((s) => s.user);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  // 重置密码：一次性临时密码弹窗（刷新不重现）
  const [tempPassword, setTempPassword] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listUsers({ keyword: keyword || undefined, page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '用户列表加载失败');
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [keyword, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (user) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    try {
      await setUserStatus(user.id, nextStatus);
      showToast(nextStatus === 'disabled' ? `已禁用 ${user.name}` : `已启用 ${user.name}`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetPassword = async (user) => {
    setResetTarget(user);
    setResetting(true);
    try {
      const d = await resetUserPassword(user.id);
      setTempPassword(d.temp_password);
    } catch (err) {
      showToast(err.message, 'error');
      setResetTarget(null);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={20} style={{ color: CLASH.magenta }} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">用户管理</h1>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <TextField
          size="small"
          label="搜索学号/姓名"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setKeyword(searchInput.trim()); setPage(1); }
          }}
        />
        <Button variant="contained" onClick={() => { setKeyword(searchInput.trim()); setPage(1); }}>
          搜索
        </Button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="没有符合条件的用户" />
      ) : (
        <TableContainer className="clash-card overflow-x-auto">
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={CLASH_HEAD_SX}>学号</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>姓名</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>手机号</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>角色</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>状态</TableCell>
                <TableCell sx={CLASH_HEAD_SX}>注册时间</TableCell>
                <TableCell sx={CLASH_HEAD_SX} align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.list.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{user.student_id}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={user.role === 'admin' ? '管理员' : '用户'}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={user.status === 'active' ? '正常' : '已禁用'}
                      color={user.status === 'active' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>{formatDateTime(user.created_at)}</TableCell>
                  <TableCell align="right">
                    <div className="flex justify-end gap-1">
                      {user.id !== currentUser?.id && user.role !== 'admin' && (
                        <>
                          {/* 禁用用户：危险操作用警示色 */}
                          <Button
                            size="small"
                            color={user.status === 'active' ? 'error' : 'success'}
                            variant={user.status === 'active' ? 'contained' : 'outlined'}
                            onClick={() => handleToggle(user)}
                          >
                            {user.status === 'active' ? '禁用' : '启用'}
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleResetPassword(user)}>
                            重置密码
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
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

      {/* 重置密码：一次性临时密码弹窗（关闭后不重现，需及时告知用户） */}
      <Dialog
        open={Boolean(resetTarget)}
        onClose={() => { setResetTarget(null); setTempPassword(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>重置密码 · {resetTarget?.name}</DialogTitle>
        <DialogContent>
          {tempPassword ? (
            <>
              <p className="mb-2 text-sm text-ink-soft">
                已为用户「{resetTarget?.name}（{resetTarget?.student_id}）」生成临时密码：
              </p>
              <p
                className="rounded-xl border-2 border-ink p-3 text-center text-xl font-extrabold tracking-widest text-ink"
                style={{ backgroundColor: CLASH.lemon }}
              >
                {tempPassword}
              </p>
              <p className="mt-3 text-xs font-bold text-clash-magenta">
                该临时密码仅此一次展示，关闭后无法再次查看，请立即复制并告知用户；用户登录后请尽快修改密码。
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-soft">{resetting ? '正在重置…' : '重置失败'}</p>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => { setResetTarget(null); setTempPassword(null); }}
            disabled={resetting}
          >
            我已保存临时密码
          </Button>
        </DialogActions>
      </Dialog>

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
