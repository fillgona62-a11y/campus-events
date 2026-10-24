/**
 * 首页：撞色 Hero 区 + 搜索 + 分类筛选 + 活动卡片流 + 分页。
 *
 * 视觉：Hero 为纯撞色大色块（无渐变）+ 四角星装饰 + 硬边投影；
 * 列表区用骨架屏占位，分页选中项换成撞色荧光绿。
 */
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { listEvents, listCategories } from '../api/eventApi';
import EventCard from '../components/EventCard';
import CategoryNav from '../components/CategoryNav';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import { ClashBlob, ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // 失败重试计数：出错时自增以触发重新拉取
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    listCategories()
      .then((d) => setCategories(d.list))
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
      {/* ── 撞色 Hero：纯色块平铺 + 四角星装饰 ───────────────────── */}
      <section
        className="relative mb-5 overflow-hidden border-2 border-ink px-5 py-8 shadow-block-ink md:px-10 md:py-12"
        style={{ backgroundColor: CLASH.lime }}
      >
        <ClashBlob color={CLASH.magenta} top={-80} right={-40} size={220} opacity={0.28} />
        <ClashBlob color={CLASH.cyan} bottom={-90} left={-50} size={200} opacity={0.3} />
        <ClashStar
          size={30}
          className="absolute right-10 top-10 animate-float"
          style={{ color: CLASH.ink }}
        />
        <ClashStar size={18} className="absolute bottom-16 right-32" style={{ color: CLASH.ink }} />

        <div className="relative max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper-card px-3 py-1 text-xs font-extrabold">
            <ClashStar size={12} style={{ color: CLASH.magenta }} />
            校园活动 · 报名中心
          </p>
          <h1 className="text-3xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            发现校园里的<span className="text-clash-royal">每一种可能</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-semibold text-ink-soft md:text-base">
            讲座、比赛、社团招新、志愿服务——一键报名，名额实时可见，有人取消还会自动递补。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForwardIcon />}
              onClick={() => document.getElementById('event-list')?.scrollIntoView({ behavior: 'smooth' })}
              sx={{ backgroundColor: CLASH.royal, '&:hover': { backgroundColor: '#011B6B' } }}
            >
              去逛活动
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<AddCircleOutlineIcon />}
              onClick={handlePublish}
              sx={{ backgroundColor: 'var(--paper-card)' }}
            >
              发布活动
            </Button>
          </div>
        </div>
      </section>

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

      <ClashStripe className="my-3" />

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
