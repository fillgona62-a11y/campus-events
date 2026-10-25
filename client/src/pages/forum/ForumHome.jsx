/**
 * ForumHome.jsx — 论坛信息流：排序切换（最新/最热）+ 搜索 + 话题筛选 + 帖子卡片 + 分页。
 *
 * 四态：SkeletonList（加载）/ ErrorState（错误可重试）/ EmptyState（空）/ 列表。
 * 「发帖」入口在论坛分区布局 ForumLayout 顶部，本页不重复放置。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import TextField from '@mui/material/TextField';
import Avatar from '@mui/material/Avatar';
import SearchIcon from '@mui/icons-material/Search';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { listPosts } from '../../api/forumApi';
import EmptyState from '../../components/EmptyState';
import { clashColorAt } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { formatDateTime } from '../../utils/format';
import { ErrorState, PAGINATION_SX, SkeletonList } from '../clashUi';

const PAGE_SIZE = 10;
const PRESET_TOPICS = ['学习', '趣事', '互助', '闲置', '提问'];
const SORTS = [
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '最热' },
];

/** 帖子正文 HTML → 纯文本摘要（去标签 + 实体解码 + 截断） */
function toSummary(html, max = 110) {
  const text = String(html || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** 话题小标签（撞色块 + on-clash 强制深字） */
function TopicChip({ topic, index }) {
  return (
    <span
      className="rounded-md border-2 border-ink px-1.5 py-0.5 text-[11px] font-extrabold on-clash"
      style={{ backgroundColor: clashColorAt(index) }}
    >
      {topic}
    </span>
  );
}

/** 姓名首字头像（后端无头像字段，照 MainLayout 用法） */
function PostAvatar({ name, bg = CLASH.cyan, size = 32 }) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: bg,
        color: CLASH.ink,
        fontSize: size <= 26 ? 12 : 14,
        fontWeight: 800,
        border: '2px solid var(--ink-line)',
      }}
    >
      {name?.slice(0, 1) || '友'}
    </Avatar>
  );
}

export default function ForumHome() {
  const navigate = useNavigate();

  const [sort, setSort] = useState('latest');
  const [topic, setTopic] = useState('');
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listPosts({
      page,
      page_size: PAGE_SIZE,
      sort,
      topic: topic || undefined,
      keyword: keyword || undefined,
    })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || '帖子加载失败'))
      .finally(() => setLoading(false));
  }, [page, sort, topic, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  // 任何筛选变化都回到第一页
  const applySearch = () => {
    setKeyword(keywordDraft.trim());
    setPage(1);
  };
  const toggleTopic = (t) => {
    setTopic((prev) => (prev === t ? '' : t));
    setPage(1);
  };
  const clearKeyword = () => {
    setKeywordDraft('');
    setKeyword('');
    setPage(1);
  };

  const list = data.list || [];
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));

  return (
    <div>
      {/* ── 筛选区：排序 / 搜索 / 话题 ─────────────────────────── */}
      <div className="clash-card mb-4 space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* 排序切换：最新 / 最热 */}
          <div className="flex overflow-hidden rounded-xl border-2 border-ink">
            {SORTS.map((s) => {
              const active = sort === s.value;
              return (
                <Button
                  key={s.value}
                  onClick={() => {
                    setSort(s.value);
                    setPage(1);
                  }}
                  className={active ? 'on-clash' : undefined}
                  sx={{
                    minHeight: 44,
                    px: 2.5,
                    borderRadius: 0,
                    fontWeight: 800,
                    color: active ? CLASH.ink : 'var(--ink-line)',
                    backgroundColor: active ? CLASH.lime : 'transparent',
                    '&:hover': {
                      backgroundColor: active ? CLASH.lime : 'rgba(178,252,6,0.25)',
                    },
                  }}
                >
                  {s.label}
                </Button>
              );
            })}
          </div>

          {/* 搜索：标题 / 内容关键字 */}
          <div className="flex flex-1 items-center gap-2" style={{ minWidth: 230 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="搜索标题 / 内容"
              value={keywordDraft}
              onChange={(e) => setKeywordDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearch();
              }}
            />
            <IconButton
              onClick={applySearch}
              aria-label="搜索"
              sx={{ minWidth: 44, minHeight: 44, color: 'var(--ink-line)' }}
            >
              <SearchIcon />
            </IconButton>
          </div>
        </div>

        {keyword && (
          <div className="flex items-center gap-2 text-xs font-bold text-ink-mute">
            <span>搜索“{keyword}”的结果</span>
            <Button size="small" onClick={clearKeyword} sx={{ minHeight: 32, fontWeight: 800 }}>
              清除
            </Button>
          </div>
        )}

        {/* 话题筛选 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-ink-mute">话题</span>
          <Button
            size="small"
            onClick={() => toggleTopic('')}
            className={!topic ? 'on-clash' : undefined}
            sx={{
              minHeight: 34,
              borderRadius: 10,
              fontWeight: 800,
              color: !topic ? CLASH.ink : 'var(--ink-line)',
              border: '2px solid var(--ink-line)',
              backgroundColor: !topic ? CLASH.cyan : 'transparent',
            }}
          >
            全部
          </Button>
          {PRESET_TOPICS.map((t) => {
            const active = topic === t;
            return (
              <Button
                key={t}
                size="small"
                onClick={() => toggleTopic(t)}
                className={active ? 'on-clash' : undefined}
                sx={{
                  minHeight: 34,
                  borderRadius: 10,
                  fontWeight: 800,
                  color: active ? CLASH.ink : 'var(--ink-line)',
                  border: '2px solid var(--ink-line)',
                  backgroundColor: active ? CLASH.lime : 'transparent',
                  '&:hover': { backgroundColor: active ? CLASH.lime : 'rgba(178,252,6,0.22)' },
                }}
              >
                {t}
              </Button>
            );
          })}
        </div>
      </div>

      {/* ── 列表四态 ───────────────────────────────────────────── */}
      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : list.length === 0 ? (
        <EmptyState
          title={topic ? `话题「${topic}」下还没有帖子` : keyword ? '没有找到相关帖子' : '论坛还没有帖子'}
          text={keyword ? '换个关键词试试' : '点击右上角「发帖」，分享你的校园生活'}
        >
          <Button variant="outlined" onClick={load}>
            刷新看看
          </Button>
        </EmptyState>
      ) : (
        <div>
          {list.map((p) => {
            const topics = p.topics ? String(p.topics).split(',').filter(Boolean) : [];
            const summary = toSummary(p.content);
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/forum/post/${p.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/forum/post/${p.id}`)}
                className="clash-card mb-3 cursor-pointer p-4"
              >
                {/* 作者行：首字头像 + 姓名 + 学号 + 时间 */}
                <div className="flex items-center gap-2">
                  <PostAvatar name={p.author_name} />
                  <span className="text-sm font-bold text-ink">{p.author_name || '匿名同学'}</span>
                  {p.author_student_id && (
                    <span className="text-xs text-ink-mute">{p.author_student_id}</span>
                  )}
                  <div className="flex-1" />
                  <span className="text-xs text-ink-faint">{formatDateTime(p.created_at)}</span>
                </div>

                {/* 标题 + 正文摘要 */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-extrabold text-ink">{p.title}</h3>
                  {/* 置顶徽标：所有人可见 */}
                  {p.is_pinned && (
                    <span className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-clash-magenta px-1.5 py-0.5 text-[11px] font-extrabold on-clash">
                      置顶
                    </span>
                  )}
                </div>
                {summary && <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{summary}</p>}

                {/* 话题 + 统计 */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {topics.map((t, i) => (
                    <TopicChip key={t} topic={t} index={i} />
                  ))}
                  <div className="flex-1" />
                  <span className="flex items-center gap-1 text-xs font-bold text-ink-mute">
                    <ChatBubbleOutlineIcon sx={{ fontSize: 15 }} />
                    {p.comment_count || 0}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: p.liked ? CLASH.magenta : 'var(--ink-mute)' }}
                  >
                    {p.liked ? (
                      <FavoriteIcon sx={{ fontSize: 15 }} />
                    ) : (
                      <FavoriteBorderIcon sx={{ fontSize: 15 }} />
                    )}
                    {p.like_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-ink-mute">
                    <VisibilityIcon sx={{ fontSize: 15 }} />
                    {p.view_count || 0}
                  </span>
                </div>
              </div>
            );
          })}

          {data.total > PAGE_SIZE && (
            <div className="mt-4 flex justify-center">
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, p) => setPage(p)}
                color="primary"
                sx={PAGINATION_SX}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
