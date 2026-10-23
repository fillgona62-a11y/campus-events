/**
 * 分类导航条：横向滚动标签（全部 + 各分类）。
 */
import Chip from '@mui/material/Chip';

export default function CategoryNav({ categories = [], value = 0, onChange }) {
  const items = [{ id: 0, name: '全部' }, ...categories];
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto py-2">
      {items.map((cat) => (
        <Chip
          key={cat.id}
          label={cat.name}
          color={value === cat.id ? 'primary' : 'default'}
          variant={value === cat.id ? 'filled' : 'outlined'}
          onClick={() => onChange && onChange(cat.id)}
          sx={{ flexShrink: 0, minHeight: 36 }}
        />
      ))}
    </div>
  );
}
