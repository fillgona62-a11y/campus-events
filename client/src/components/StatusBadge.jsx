/**
 * 状态徽标：活动/报名状态统一展示。
 */
import Chip from '@mui/material/Chip';
import { EVENT_STATUS_MAP, REG_STATUS_MAP } from '../utils/constants';

/**
 * @param {{type: 'event'|'reg', status: string, size?: 'small'|'medium'}} props
 */
export default function StatusBadge({ type, status, size = 'small' }) {
  const map = type === 'event' ? EVENT_STATUS_MAP : REG_STATUS_MAP;
  const conf = map[status] || { label: status || '未知', color: 'default' };
  return <Chip label={conf.label} color={conf.color} size={size} variant="outlined" />;
}
