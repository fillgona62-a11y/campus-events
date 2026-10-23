/**
 * 管理后台 - 用户管理：关键字搜索 + 禁用/启用（禁用后该用户 JWT 立即失效）+ 重置密码（F1）。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
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
import { formatDateTime } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';

const PAGE_SIZE = 10;

export default function UserManage() {
  const currentUser = useAuthStore((s) => s.user);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  // 重置密码：一次性临时密码弹窗（刷新不重现）
  const [tempPassword, setTempPassword] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [resetting, setResetting] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    listUsers({ keyword: keyword || undefined, page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
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
      <h1 className="mb-4 text-xl font-bold">用户管理</h1>

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
        <Button variant="outlined" onClick={() => { setKeyword(searchInput.trim()); setPage(1); }}>
          搜索
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="没有符合条件的用户" />
      ) : (
        <TableContainer className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <Table size="small" sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell>学号</TableCell>
                <TableCell>姓名</TableCell>
                <TableCell>手机号</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>注册时间</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.list.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.student_id}</TableCell>
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
                          <Button
                            size="small"
                            color={user.status === 'active' ? 'error' : 'success'}
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
              <p className="mb-2 text-sm text-gray-600">
                已为用户「{resetTarget?.name}（{resetTarget?.student_id}）」生成临时密码：
              </p>
              <p className="rounded-lg bg-gray-100 p-3 text-center text-xl font-bold tracking-widest text-primary">
                {tempPassword}
              </p>
              <p className="mt-3 text-xs text-red-500">
                该临时密码仅此一次展示，关闭后无法再次查看，请立即复制并告知用户；用户登录后请尽快修改密码。
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-600">{resetting ? '正在重置…' : '重置失败'}</p>
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
