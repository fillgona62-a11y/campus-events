/**
 * 首页：清爽 Hero + 搜索 + 分类筛选 + 活动卡片流 + 分页。
 *
 * 视觉：柔和渐变 Hero、干净白卡、克制配色，成熟清爽的校园风。
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { listEvents, listCategories, listHotEvents } from '../api/eventApi';
import EventCard from '../components/EventCard';
import CategoryNav from '../components/CategoryNav';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { useAuthStore } from '../store/authStore';
import { PAGINATION_SX, SkeletonCard, ErrorState } from './clashUi';

const PAGE_SIZE = 12;

export default function Home() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ list: [], total: 0 });
  const [hot, setHot] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 失败重试计数：出错时自增以触发重新拉取
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    listCategories()
      .then((d) => setCategories(d.list))
      .catch(() => {});
    // 热门活动：仅首页首屏拉取一次
    listHotEvents({ limit: 6 })
      .then((d) => setHot(d.list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    listEvents({
      keyword: keyword || undefined,
      category_id: categoryId || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || '活动列表加载失败'))
      .finally(() => setLoading(false));
  }, [keyword, categoryId, page, retryCount]);

  // 未登录时点击「发布活动」先引导登录，登录后再回到发布页
  const handlePublish = () => {
    if (!token) {
      navigate('/login', { state: { from: '/publish' } });
      return;
    }
    navigate('/publish');
  };

  return (
    <div>
      {/* ── Hero：清爽渐变横幅，无硬边/硬投影 ───────────────────── */}
      <section className="relative mb-6 overflow-hidden rounded-2xl px-6 py-10 md:px-12 md:py-16">
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(120deg, #f5f1e8 0%, #eef2ea 45%, #e8eef0 100%)',
          }}
          aria-hidden="true"
        />
        {/* 极淡的装饰光斑 */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full opacity-30 blur-3xl"
          style={{ backgroundColor: '#a8c0a0' }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: '#b99a63' }}
          aria-hidden="true"
        />

        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1 text-xs font-medium text-ink-soft backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#b3432f' }} />
            校园活动 · 报名中心
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink md:text-5xl">
            发现校园里的
            <br />
            <span style={{ color: '#9c6b3f' }}>每一种可能</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-mute md:text-base">
            讲座、比赛、社团招新、志愿服务，一键报名，名额实时可见，有人取消还会自动递补。
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ borderRadius: '10px', boxShadow: '0 4px 14px rgba(156,107,63,0.28)' }}
            >
              去逛活动
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handlePublish}
              sx={{ borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.6)' }}
            >
              发布活动
            </Button>
          </div>
        </div>
      </section>

      {/* ── 热门推荐 ────────────────────────────────────── */}
      {hot.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-ink">热门活动</h2>
            <span className="text-xs text-ink-mute">按报名热度</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {hot.map((event) => (
              <button
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="w-40 shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-paper-card text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className="flex h-20 items-center justify-center px-3"
                  style={{ background: 'linear-gradient(135deg, #f0ece2, #e8ece6)' }}
                >
                  <span className="line-clamp-2 text-center text-xs font-medium leading-tight text-ink-soft">
                    {event.title}
                  </span>
                </div>
                <div className="px-3 py-2.5">
                  <p className="truncate text-xs text-ink-mute">{event.location}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">已报名 {event.approved_count} 人</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── 筛选区 ──────────────────────────────────────────────── */}
      <div id="event-list" className="mb-1 flex items-center gap-2">
        <SearchBar onSearch={(v) => { setKeyword(v); setPage(1); }} />
        <Button
          variant="outlined"
          startIcon={<CalendarMonthIcon />}
          onClick={() => navigate('/calendar')}
          sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
        >
          日历
        </Button>
      </div>
      <CategoryNav
        categories={categories}
        value={categoryId}
        onChange={(id) => { setCategoryId(id); setPage(1); }}
      />

      {/* ── 列表区：加载 / 错误 / 空 / 正常 四态 ──────────────────── */}
      {loading ? (
        <SkeletonCard count={6} />
      ) : error ? (
        <ErrorState text={error} onRetry={() => setRetryCount((c) => c + 1)} />
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无进行中的活动">
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="contained" onClick={() => { setKeyword(''); setCategoryId(0); setPage(1); }}>
              清除筛选条件
            </Button>
            <Button variant="outlined" component={Link} to="/publish">
              我来发布活动
            </Button>
          </div>
        </EmptyState>
      ) : (
        <>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.list.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {data.total > PAGE_SIZE && (
            <div className="mt-6 flex justify-center">
              <Pagination
                count={Math.ceil(data.total / PAGE_SIZE)}
                page={page}
                onChange={(e, p) => setPage(p)}
                color="primary"
                sx={PAGINATION_SX}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
