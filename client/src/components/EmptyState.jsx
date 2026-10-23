/**
 * 空状态占位：图标 + 文案。
 */
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({ text = '暂无数据', children }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <InboxIcon sx={{ fontSize: 56 }} />
      <p className="mt-3 text-sm">{text}</p>
      {children}
    </div>
  );
}
