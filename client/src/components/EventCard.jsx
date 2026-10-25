/**
 * EventCard.jsx — 活动卡片（撞色风格）
 *
 * 视觉要点：
 *   1. 封面占位是「纯撞色块 + 巨大首字」，不是渐变；颜色由分类在色轮中的位置决定
 *   2. 卡片本体用 .clash-card（2px 墨线 + 硬边投影 + 悬停浮起 + 按压下沉）
 *   3. 分类标签与名额状态都是「撞色实心 + 2px 墨边」的小徽标，而不是红绿文字
 *   4. 「立即报名」是明确的主 CTA（宝蓝实心 + 硬投影），禁用时变灰并写清原因
 *   5. 整卡可点且键盘可达（Tab 聚焦 + Enter / Space 触发）
 *
 * @param {{event: object}} props
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import PlaceIcon from '@mui/icons-material/Place';
import PushPinIcon from '@mui/icons-material/PushPin';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNavigate } from 'react-router-dom';
import { formatTimeRange, remainingText, isFull, isSignupClosed } from '../utils/format';
import { CLASH, CATEGORY_COLORS } from '../theme';
import { clashColorAt, ClashStar } from './ClashDecor';
import { readableText } from '../utils/clash';

/** 名额状态徽标配置：bg 为撞色实心，fg 依据亮度自动取墨色/白色 */
function quotaBadge(event, full, closed) {
  if (closed) return { bg: CLASH.haze, label: '报名已截止' };
  if (full) return { bg: CLASH.magenta, label: '名额已满' };
  // 名额即将耗尽时换成柔柠黄预警，避免一眼看过去全是同色
  const remaining = event.capacity > 0 ? event.capacity - event.approved_count : Infinity;
  const tight = Number.isFinite(remaining) && remaining <= 3;
  return {
    bg: tight ? CLASH.lemon : CLASH.mint,
    label: remainingText(event),
  };
}

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const [coverFailed, setCoverFailed] = useState(false);

  const full = isFull(event);
  const closed = isSignupClosed(event);
  const disabled = full || closed;

  // 封面撞色：与 CategoryNav 用同一个色轮取色规则，同一分类全局同色
  const accent = clashColorAt(event.category_id, CATEGORY_COLORS);
  const onAccent = readableText(accent);
  const quota = quotaBadge(event, full, closed);
  const firstChar = event.title?.slice(0, 1) || '活';

  const goDetail = () => navigate(`/events/${event.id}`);

  return (
    <article
      className="clash-card flex cursor-pointer flex-col overflow-hidden"
      role="button"
      tabIndex={0}
      aria-label={`查看活动：${event.title || ''}`}
      onClick={goDetail}
      onKeyDown={(e) => {
        // 事件来自内部按钮时不再重复触发（避免一次按键触发两次跳转）
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goDetail();
        }
      }}
    >
      {/* ── 封面：纯撞色块 + 巨大首字 ───────────────────── */}
      <div
        className="relative h-40 w-full overflow-hidden border-b-2 border-ink"
        style={{ backgroundColor: accent }}
      >
        {event.cover_url && !coverFailed ? (
          <img
            src={event.cover_url}
            alt={event.title}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: onAccent }}>
            <span className="select-none text-6xl font-black leading-none">{firstChar}</span>
          </div>
        )}
        {/* 置顶徽标：封面左上角（柔柠黄实心 + 2px 墨边 + on-clash 强制墨字，任何撞色封面上都可读） */}
        {event.is_pinned && (
          <span className="on-clash absolute left-3 top-3 inline-flex items-center gap-1 rounded-lg border-2 border-ink bg-clash-lemon px-2 py-0.5 text-xs font-extrabold">
            <PushPinIcon sx={{ fontSize: 14 }} />
            置顶
          </span>
        )}
        {/* 四角星装饰 */}
        <ClashStar size={26} className="absolute right-3 top-3" style={{ color: onAccent, opacity: 0.32 }} />
        <ClashStar size={14} className="absolute bottom-3 left-3" style={{ color: onAccent, opacity: 0.24 }} />
      </div>

      {/* ── 内容 ───────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {event.category_name && (
            <span
              className="inline-flex items-center rounded-lg border-2 border-ink px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: accent, color: onAccent }}
            >
              {event.category_name}
            </span>
          )}
          <span
            className="inline-flex items-center rounded-lg border-2 border-ink px-2 py-0.5 text-xs font-bold"
            style={{ backgroundColor: quota.bg, color: readableText(quota.bg) }}
          >
            {quota.label}
          </span>
        </div>

        <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-ink">{event.title}</h3>

        <p className="flex items-start gap-1 text-xs text-ink-mute">
          <ScheduleIcon sx={{ fontSize: 14, mt: '2px', flexShrink: 0 }} />
          <span className="line-clamp-1">{formatTimeRange(event.start_time, event.end_time)}</span>
        </p>
        <p className="flex items-start gap-1 text-xs text-ink-mute">
          <PlaceIcon sx={{ fontSize: 14, mt: '2px', flexShrink: 0 }} />
          <span className="line-clamp-1">{event.location}</span>
        </p>

        {/* ── 主 CTA ───────────────────────────────────── */}
        <div className="mt-auto pt-2">
          <Button
            fullWidth
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              goDetail();
            }}
            disabled={disabled}
            sx={{
              minHeight: 44,
              fontWeight: 800,
              borderRadius: '14px',
              border: '2px solid var(--ink-line)',
              ...(disabled
                ? {
                    backgroundColor: '#D7D7E2',
                    color: '#6B6B7B',
                    boxShadow: 'none',
                    '&:hover': { backgroundColor: '#D7D7E2', boxShadow: 'none' },
                    // 覆盖 MUI 自带的 .Mui-disabled 禁用底色，保证灰度统一
                    '&.Mui-disabled': {
                      backgroundColor: '#D7D7E2',
                      color: '#6B6B7B',
                      boxShadow: 'none',
                    },
                  }
                : {
                    backgroundColor: CLASH.royal,
                    color: '#FFFFFF',
                    boxShadow: '4px 4px 0 0 var(--ink-line)',
                    '&:hover': {
                      backgroundColor: CLASH.royal,
                      boxShadow: '6px 6px 0 0 var(--ink-line)',
                      transform: 'translate(-2px, -2px)',
                    },
                    '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
                  }),
            }}
          >
            {closed ? '报名已截止' : full ? '名额已满' : '立即报名'}
          </Button>
        </div>
      </div>
    </article>
  );
}
