/**
 * RegistrationTable.jsx — 报名名单表格（撞色风格）
 *
 * 视觉要点：
 *   1. 表格整体是撞色卡：2px 墨边 + 硬投影 + 圆角，表头墨色底
 *   2. 行 hover 高亮用荧光绿淡染，鼠标在哪行一目了然
 *   3. 审核/提升/移出等操作按钮全部带按压反馈（hover 浮起 + active 下沉）
 *   4. 状态徽标复用 StatusBadge（撞色实心 + 墨边），核销状态同样复用
 *   5. 名单为空时给撞色空态引导，而不是一张空表格
 *
 * props 签名与调用方式保持不变：
 *   rows / requireApproval / onReview / onExport / exporting / onPromote / onRemove
 * 可选扩展（不传则不渲染对应按钮，现有调用方行为完全不变）：
 *   onCheckIn   逐行核销，参数为 row
 *   onCancel    逐行取消报名，参数为 row
 *
 * @param {{rows?: Array, requireApproval?: boolean, onReview?: Function, onExport?: Function, exporting?: boolean, onPromote?: Function, onRemove?: Function, onCheckIn?: Function, onCancel?: Function}} props
 */
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import DownloadIcon from '@mui/icons-material/Download';
import StatusBadge from './StatusBadge';
import { formatDateTime } from '../utils/format';
import { CLASH } from '../theme';
import { readableText } from '../utils/clash';
import { ClashStar } from './ClashDecor';

/** 通用撞色实心按钮样式 */
function clashButton(bg, { textColor, shadow = '3px 3px 0 0 var(--ink-line)' } = {}) {
  const fg = textColor || readableText(bg);
  return {
    minHeight: 36,
    fontWeight: 800,
    fontSize: '0.8rem',
    borderRadius: '12px',
    border: '2px solid var(--ink-line)',
    backgroundColor: bg,
    color: fg,
    boxShadow: shadow,
    transition:
      'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1)',
    '&:hover': {
      backgroundColor: bg,
      boxShadow: '4px 4px 0 0 var(--ink-line)',
      transform: 'translate(-1px, -1px)',
    },
    '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
    '&.Mui-disabled': {
      backgroundColor: '#D7D7E2',
      color: '#6B6B7B',
      boxShadow: 'none',
      border: '2px solid var(--ink-line)',
    },
  };
}

export default function RegistrationTable({
  rows = [],
  requireApproval = false,
  onReview,
  onExport,
  exporting = false,
  onPromote,
  onRemove,
  onCheckIn,
  onCancel,
}) {
  const hasActions = Boolean(requireApproval || onPromote || onCheckIn || onCancel);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          disabled={exporting || !rows.length}
          sx={{
            minHeight: 40,
            fontWeight: 800,
            borderRadius: '12px',
            border: '2px solid var(--ink-line)',
            boxShadow: '3px 3px 0 0 var(--ink-line)',
            transition:
              'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1)',
            '&:hover': {
              backgroundColor: '#F5F5FA',
              boxShadow: '4px 4px 0 0 var(--ink-line)',
              transform: 'translate(-1px, -1px)',
            },
            '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
          }}
        >
          {exporting ? '导出中…' : '导出 CSV'}
        </Button>
      </div>

      <TableContainer className="overflow-x-auto rounded-2xl border-2 border-ink bg-paper-card shadow-block-ink">
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
              {hasActions && <TableCell align="right">操作</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasActions ? 8 : 7} sx={{ border: 0, py: 6 }}>
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <span className="flex h-14 w-14 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-clash-cyan shadow-block-ink-sm on-clash">
                      <ClashStar size={26} style={{ color: CLASH.ink }} />
                    </span>
                    <p className="text-sm font-bold text-ink">还没有报名记录</p>
                    <p className="text-xs text-ink-mute">活动发布后，同学的报名信息会出现在这里</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{
                    // 行 hover 荧光绿淡染
                    '&:hover': { backgroundColor: 'rgba(178,252,6,0.12)' },
                    '&:last-child td': { borderBottom: 0 },
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{row.student_id}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                  <TableCell>{row.phone || <span className="text-ink-faint">未填写</span>}</TableCell>
                  <TableCell>{row.remark || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge type="reg" status={row.status} />
                      {row.status === 'waitlisted' && row.waitlist_position && (
                        <span
                          className="inline-flex shrink-0 items-center rounded-lg border-2 border-ink px-1.5 py-0.5 text-xs font-bold"
                          style={{ backgroundColor: CLASH.cyan, color: readableText(CLASH.cyan) }}
                        >
                          第 {row.waitlist_position} 位
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="checked" status={row.checked_in} />
                  </TableCell>
                  <TableCell>{formatDateTime(row.created_at)}</TableCell>
                  {hasActions && (
                    <TableCell align="right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {/* 审核（待审核 + 该活动开启审核时） */}
                        {row.status === 'pending' && requireApproval && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onReview(row.id, 'approve')}
                              sx={clashButton(CLASH.lime)}
                            >
                              通过
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onReview(row.id, 'reject')}
                              sx={clashButton(CLASH.magenta)}
                            >
                              拒绝
                            </Button>
                          </>
                        )}

                        {/* 候补提升 / 移出 */}
                        {row.status === 'waitlisted' && onPromote && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onPromote(row.id)}
                              sx={clashButton(CLASH.cyan)}
                            >
                              提升
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => onRemove(row.id)}
                              sx={clashButton(CLASH.haze)}
                            >
                              移出
                            </Button>
                          </>
                        )}

                        {/* 逐行核销：仅对已报名成功且未核销的记录显示 */}
                        {onCheckIn && row.status === 'approved' && row.checked_in !== 1 && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => onCheckIn(row)}
                            sx={clashButton(CLASH.lime)}
                          >
                            核销
                          </Button>
                        )}

                        {/* 逐行取消报名：仅对未取消的记录显示 */}
                        {onCancel && row.status !== 'cancelled' && (
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => onCancel(row)}
                            sx={clashButton(CLASH.haze)}
                          >
                            取消
                          </Button>
                        )}

                        {/* 无任何可执行操作时的占位 */}
                        {!((row.status === 'pending' && requireApproval) ||
                          (row.status === 'waitlisted' && onPromote) ||
                          (onCheckIn && row.status === 'approved' && row.checked_in !== 1) ||
                          (onCancel && row.status !== 'cancelled')) && (
                          <span className="text-xs text-ink-faint">已处理</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
