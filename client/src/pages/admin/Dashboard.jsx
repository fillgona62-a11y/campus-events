/**
 * 管理后台 - 数据概览：用户数 / 活动数 / 报名数 + 全站近 30 天报名趋势图。
 *
 * 活动口径（已上架 approved 为前提，均不含 下架/待审/拒绝/取消/已结束）：
 *   活动总数 = 现存活动（已上架且未结束）
 *   正在报名 = 报名未截止（signup_deadline >= now）
 *   正在进行 = 当前落在 [start_time, end_time]
 *
 * 视觉：后台保持克制 —— 撞色描边卡片 + 数字撞色块点缀，表格/图表用薄荷绿表头，不用大面积高饱和色。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import { overview, overviewTrend, analytics } from '../../api/adminApi';
import TrendChart from '../../components/TrendChart';
import { ClashStar } from '../../components/ClashDecor';
import { CLASH, CATEGORY_COLORS } from '../../theme';
import { clashColorAt } from '../../components/ClashDecor';
import { ErrorState } from '../clashUi';

const CARDS = [
  { key: 'total_users', label: '注册用户', color: CLASH.lime },
  { key: 'total_events', label: '活动总数', color: CLASH.cyan },
  { key: 'open_events', label: '正在报名', color: CLASH.lemon },
  { key: 'ongoing_events', label: '正在进行', color: CLASH.mint },
  { key: 'pending_events', label: '待审核活动', color: CLASH.magenta },
  { key: 'total_registrations', label: '报名总数', color: CLASH.haze },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState({ days: [], total: 0 });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    overview()
      .then((d) => setStats(d))
      .catch((err) => setError(err.message || '数据加载失败'))
      .finally(() => setLoading(false));
    overviewTrend({ days: 30 })
      .then((d) => setTrend(d))
      .catch(() => {});
    // 数据大屏聚合：分类分布 + 用户增长 + 论坛活跃
    analytics({ days: 30 })
      .then((d) => setAnalyticsData(d))
      .catch(() => {});
  }, [retryCount]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (error) {
    return <ErrorState text={error} onRetry={() => setRetryCount((c) => c + 1)} />;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={20} style={{ color: CLASH.violet }} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">数据概览</h1>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {CARDS.map((card) => (
          <div key={card.key} className="clash-card relative overflow-hidden p-5 text-center">
            {/* 顶部撞色条：克制的点缀 */}
            <span
              className="absolute left-0 right-0 top-0 h-1.5"
              style={{ backgroundColor: card.color }}
              aria-hidden="true"
            />
            <p className="text-3xl font-extrabold text-ink">{stats[card.key]}</p>
            <p className="mt-1 text-sm font-bold text-ink-mute">{card.label}</p>
          </div>
        ))}
      </div>

      {stats.pending_events > 0 && (
        <div className="clash-card mt-4 border-l-4 p-4" style={{ borderLeftColor: CLASH.lemon }}>
          <p className="text-sm font-bold text-ink">
            当前有 {stats.pending_events} 个活动等待审核
          </p>
          <Button
            component={Link}
            to="/admin/review"
            variant="contained"
            size="small"
            sx={{ mt: 1.5 }}
          >
            前往审核
          </Button>
        </div>
      )}

      <div className="mt-4">
        <TrendChart days={trend.days} title={`全站报名趋势（近 ${trend.days.length} 天）`} />
      </div>

      {/* ── 数据大屏：分类分布 + 用户增长 + 论坛活跃 ────────── */}
      {analyticsData && (
        <div className="mt-4 space-y-4">
          {/* 用户增长趋势 */}
          <TrendChart
            days={analyticsData.user_trend}
            title={`新增用户趋势（近 ${analyticsData.user_trend.length} 天）`}
          />

          {/* 分类报名分布（横向条形图） */}
          {analyticsData.category_distribution.length > 0 && (
            <div className="rounded-2xl border-2 border-ink bg-paper-card p-5 shadow-block-ink">
              <div className="mb-4 flex items-center gap-2">
                <ClashStar size={16} style={{ color: CLASH.magenta }} />
                <h2 className="text-base font-extrabold text-ink">分类报名分布</h2>
              </div>
              <div className="space-y-2">
                {(() => {
                  const max = Math.max(...analyticsData.category_distribution.map((c) => c.count), 1);
                  return analyticsData.category_distribution.map((c, i) => (
                    <div key={c.category_name} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-right text-xs font-bold text-ink-soft">
                        {c.category_name}
                      </span>
                      <div className="flex-1 overflow-hidden rounded-lg" style={{ backgroundColor: 'rgba(var(--ink-rgb),0.08)' }}>
                        <div
                          className="flex h-6 items-center justify-end rounded-lg border-2 border-ink px-2 text-[11px] font-extrabold text-ink"
                          style={{
                            width: `${Math.max(8, (c.count / max) * 100)}%`,
                            backgroundColor: clashColorAt(i, CATEGORY_COLORS),
                            minWidth: '2rem',
                          }}
                        >
                          {c.count}
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}

          {/* 论坛活跃度 */}
          {analyticsData.forum && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '论坛帖子', value: analyticsData.forum.posts, color: CLASH.lime },
                { label: '评论数', value: analyticsData.forum.comments, color: CLASH.cyan },
                { label: '获赞总数', value: analyticsData.forum.likes, color: CLASH.magenta },
              ].map((f) => (
                <div key={f.label} className="clash-card relative overflow-hidden p-4 text-center">
                  <span className="absolute left-0 right-0 top-0 h-1.5" style={{ backgroundColor: f.color }} aria-hidden="true" />
                  <p className="text-2xl font-extrabold text-ink">{f.value}</p>
                  <p className="mt-1 text-xs font-bold text-ink-mute">{f.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
