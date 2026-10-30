/**
 * EventCard.jsx — 活动卡片（清爽现代校园风）
 *
 * 视觉要点：
 *   1. 干净白卡 + 柔和阴影 + 轻微悬浮，无硬描边/硬投影
 *   2. 封面优先展示真实图片；无图时用低饱和分类色渐变占位
 *   3. 分类用淡色文字徽标，名额状态用细线胶囊，克制不抢眼
 *   4. 标题一行截断，信息层级清晰（标题 > 时间/地点）
 *   5. 整卡可点且键盘可达
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import PlaceIcon from '@mui/icons-material/Place';
import PushPinIcon from '@mui/icons-material/PushPin';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNavigate } from 'react-router-dom';
import { formatTimeRange, remainingText, isFull, isSignupClosed } from '../utils/format';
import { CATEGORY_COLORS } from '../theme';
import { clashColorAt } from './ClashDecor';

/** 名额状态徽标：细线胶囊，文字区分 */
function quotaBadge(event, full, closed) {
  if (closed) return { label: '报名已截止', color: '#9a9aab' };
  if (full) return { label: '名额已满', color: '#b3432f' };
  const remaining = event.capacity > 0 ? event.capacity - event.approved_count : Infinity;
  const tight = Number.isFinite(remaining) && remaining <= 3;
  return { label: remainingText(event), color: tight ? '#a8823f' : '#5f7d5a' };
}

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const [coverFailed, setCoverFailed] = useState(false);

  const full = isFull(event);
  const closed = isSignupClosed(event);
  const disabled = full || closed;

  const accent = clashColorAt(event.category_id, CATEGORY_COLORS);
  const quota = quotaBadge(event, full, closed);

  const goDetail = () => navigate(`/events/${event.id}`);

  return (
    <article
      className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border border-ink/10 bg-paper-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
      role="button"
      tabIndex={0}
      aria-label={`查看活动：${event.title || ''}`}
      onClick={goDetail}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goDetail();
        }
      }}
    >
      {/* 封面：真实图优先，无图用分类色渐变 + 分类名 */}
      <div className="relative h-36 w-full overflow-hidden" style={{ background: `linear-gradient(135deg, ${accent}26 0%, ${accent}0d 60%, #f5f1e8 100%)` }}>
        {event.cover_url && !coverFailed ? (
          <img
            src={event.cover_url}
            alt={event.title}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1" style={{ color: accent }}>
            <span className="text-xl font-semibold opacity-50">{event.category_name || '活动'}</span>
          </div>
        )}
        {/* 置顶标记：左上角淡色胶囊 */}
        {event.is_pinned && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            <PushPinIcon sx={{ fontSize: 13 }} />
            置顶
          </span>
        )}
      </div>

      {/* 内容 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {event.category_name && (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              {event.category_name}
            </span>
          )}
          <span
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={{ borderColor: `${quota.color}55`, color: quota.color }}
          >
            {quota.label}
          </span>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">{event.title}</h3>

        <div className="mt-auto space-y-1.5 pt-1">
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <ScheduleIcon sx={{ fontSize: 14, flexShrink: 0 }} />
            <span className="line-clamp-1">{formatTimeRange(event.start_time, event.end_time)}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-ink-mute">
            <PlaceIcon sx={{ fontSize: 14, flexShrink: 0 }} />
            <span className="line-clamp-1">{event.location}</span>
          </p>
        </div>

        <div className="mt-2 pt-1">
          <Button
            fullWidth
            variant="outlined"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              goDetail();
            }}
            disabled={disabled}
            sx={{
              minHeight: 34,
              fontWeight: 500,
              borderRadius: '8px',
              textTransform: 'none',
              color: 'var(--ink-soft)',
              borderColor: 'rgba(var(--ink-rgb), 0.18)',
              ...(disabled
                ? { color: '#b0aca3', borderColor: 'rgba(var(--ink-rgb), 0.10)' }
                : {}),
            }}
          >
            {closed ? '报名已截止' : full ? '名额已满' : '查看详情'}
          </Button>
        </div>
      </div>
    </article>
  );
}
