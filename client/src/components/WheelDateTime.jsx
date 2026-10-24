/**
 * WheelDateTime.jsx — 日期 + 鼓轮时间选择器（替代 MUI 桌面版 DateTimePicker）。
 *
 * 为什么自研：MUI v7 桌面版把时/分/秒三列硬塞进固定宽度，秒列被挤出可视区，
 * 分钟列是细滚动条而非滚轮，无法通过配置修好。这里用 CSS scroll-snap 实现
 * 真正的鼓轮：吸附定位、居中高亮、上下渐隐、点击项直达。
 *
 * 用法：
 *   <WheelDateTime label="开始时间 *" value={form.start_time} onChange={(v) => update('start_time', v)} />
 * value / onChange 均为 dayjs 对象或 null，与原来 DateTimePicker 的用法一致。
 */
import { useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';

const ITEM_H = 40; // 每行高度（px），鼓轮定位依赖它
const VISIBLE = 5; // 可视行数（奇数，中间一行是选中项）

/** 单列鼓轮：options 为显示值数组，value 为当前选中值 */
function Wheel({ options, value, onChange, label }) {
  const ref = useRef(null);
  const timer = useRef(null);

  // 打开/值变化时滚到选中项
  useEffect(() => {
    const idx = Math.max(0, options.indexOf(value));
    if (ref.current) ref.current.scrollTop = idx * ITEM_H;
    // 仅在挂载时执行一次，避免滚动过程中被 value 回写打断
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.min(Math.max(idx, 0), options.length - 1);
      const next = options[clamped];
      if (next !== value) onChange(next);
    }, 90);
  };

  const jumpTo = (idx) => {
    if (ref.current) {
      ref.current.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    }
    onChange(options[idx]);
  };

  return (
    <div className="flex-1 text-center">
      <div className="mb-1 text-xs text-gray-400">{label}</div>
      <div className="relative overflow-hidden rounded-lg bg-gray-50" style={{ height: ITEM_H * VISIBLE }}>
        {/* 居中选中高亮条 */}
        <div
          className="pointer-events-none absolute inset-x-1 rounded-md bg-blue-100"
          style={{ top: ITEM_H * 2, height: ITEM_H }}
        />
        {/* 上下渐隐遮罩，形成鼓轮纵深感 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-gray-50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-gray-50 to-transparent" />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="h-full overflow-y-auto"
          style={{
            scrollSnapType: 'y mandatory',
            scrollbarWidth: 'none',
            paddingTop: ITEM_H * 2,
            paddingBottom: ITEM_H * 2,
          }}
        >
          {options.map((opt, idx) => (
            <div
              key={opt}
              onClick={() => jumpTo(idx)}
              className="relative z-0 cursor-pointer select-none text-base leading-none transition-colors"
              style={{
                height: ITEM_H,
                lineHeight: `${ITEM_H}px`,
                scrollSnapAlign: 'center',
                color: opt === value ? '#1565c0' : '#9ca3af',
                fontWeight: opt === value ? 700 : 400,
                fontSize: opt === value ? 20 : 16,
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WheelDateTime({ label, value, onChange, required }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null); // 弹窗内的草稿值（dayjs）

  const openDialog = () => {
    // 空值默认取当前时间（秒清零），避免弹窗里没有可选项
    setDraft((value ? dayjs(value) : dayjs()).second(0));
    setOpen(true);
  };
  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const seconds = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const setPart = (part, num) => {
    setDraft((d) => (d ? d[part](Number(num)) : d));
  };

  return (
    <>
      <TextField
        fullWidth
        required={required}
        label={label}
        value={value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : ''}
        onClick={openDialog}
        placeholder="点击选择日期时间"
        InputProps={{ readOnly: true }}
        sx={{ cursor: 'pointer' }}
      />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ pb: 0 }}>{label}</DialogTitle>
        <DialogContent>
          {draft && (
            <>
              <div className="flex justify-center">
                <DateCalendar
                  value={draft}
                  onChange={(d) => setDraft(d)}
                  showDaysOutsideCurrentMonth
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Wheel label="时" options={hours} value={draft.format('HH')} onChange={(v) => setPart('hour', v)} />
                <Wheel label="分" options={minutes} value={draft.format('mm')} onChange={(v) => setPart('minute', v)} />
                <Wheel label="秒" options={seconds} value={draft.format('ss')} onChange={(v) => setPart('second', v)} />
              </div>
              <div className="mt-3 rounded-lg bg-blue-50 py-2 text-center font-mono text-sm font-semibold text-blue-700">
                {draft.format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={confirm}>确定</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
