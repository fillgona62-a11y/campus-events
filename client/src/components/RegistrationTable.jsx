/**
 * 报名名单表格：学号/姓名/手机号/备注/状态/核销状态/报名时间 + 审核操作 + 候补提升/移出 + CSV 导出按钮。
 * 移动端横向滚动；审核按钮仅在该活动开启报名审核且记录为待审核时展示；
 * 候补行展示顺位，发布者可“提升”（转正）或“移出”候补（F4/F5）。
 */
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import DownloadIcon from '@mui/icons-material/Download';
import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/format';
import { CHECKED_IN_MAP } from '../utils/constants';

export default function RegistrationTable({
  rows = [],
  requireApproval = false,
  onReview,
  onExport,
  exporting = false,
  onPromote,
  onRemove,
}) {
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          disabled={exporting}
        >
          {exporting ? '导出中…' : '导出 CSV'}
        </Button>
      </div>
      <TableContainer className="overflow-x-auto rounded-lg bg-white">
        <Table size="small" sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              <TableCell>学号</TableCell>
              <TableCell>姓名</TableCell>
              <TableCell>手机号</TableCell>
              <TableCell>备注</TableCell>
              <TableCell>状态</TableCell>
              <TableCell>核销状态</TableCell>
              <TableCell>报名时间</TableCell>
              {(requireApproval || onPromote) && <TableCell align="right">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>{row.student_id}</TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.phone || <span className="text-gray-400">未填写</span>}</TableCell>
                <TableCell>{row.remark || '-'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <StatusBadge type="reg" status={row.status} />
                    {row.status === 'waitlisted' && row.waitlist_position && (
                      <Chip size="small" color="info" variant="outlined" label={`第 ${row.waitlist_position} 位`} />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={CHECKED_IN_MAP[row.checked_in]?.color || 'default'}
                    label={CHECKED_IN_MAP[row.checked_in]?.label || '未核销'}
                  />
                </TableCell>
                <TableCell>{formatDateTime(row.created_at)}</TableCell>
                {(requireApproval || onPromote) && (
                  <TableCell align="right">
                    {row.status === 'pending' && requireApproval ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => onReview(row.id, 'approve')}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => onReview(row.id, 'reject')}
                        >
                          拒绝
                        </Button>
                      </div>
                    ) : row.status === 'waitlisted' && onPromote ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => onPromote(row.id)}
                        >
                          提升
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => onRemove(row.id)}
                        >
                          移出
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">已处理</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
