/**
 * MyForum.jsx — 我的论坛：Tabs 切换 我的帖子 / 我的评论 / 我的收藏 / 我的点赞。
 * 列表简洁展示，点击跳转对应帖子详情；评论项带所属帖子标题。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import { myPosts, myComments, myFavorites, myLikes } from '../../api/forumApi';
import EmptyState from '../../components/EmptyState';
import { clashColorAt } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { formatDateTime } from '../../utils/format';
import { ErrorState, PAGINATION_SX, SkeletonList } from '../clashUi';

const PAGE_SIZE = 10;

const TAB_DEFS = [
  { key: 'posts', label: '我的帖子', loader: myPosts, emptyText: '还没有发布过帖子' },
  { key: 'comments', label: '我的评论', loader: myComments, emptyText: '还没有发表过评论' },
  { key: 'favorites', label: '我的收藏', loader: myFavorites, emptyText: '还没有收藏帖子' },
  { key: 'likes', label: '我的点赞', loader: myLikes, emptyText: '还没有点赞过帖子' },
];

/** HTML → 纯文本（评论摘要展示用） */
function toPlainText(html, max = 80) {
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

/** 帖子形状列表项（帖子/收藏/点赞共用） */
function PostRow({ item, onOpen }) {
  const topics = item.topics ? String(item.topics).split(',').filter(Boolean) : [];
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(item.id)}
      className="clash-card cursor-pointer p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        {topics.slice(0, 3).map((t, i) => (
          <span
            key={t}
            className="rounded-md border border-ink/10 px-1.5 py-0.5 text-[11px] font-semibold on-clash"
            style={{ backgroundColor: clashColorAt(i) }}
          >
            {t}
          </span>
        ))}
        <div className="flex-1" />
        <span className="text-[11px] text-ink-faint">{formatDateTime(item.created_at)}</span>
      </div>
      <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-ink">{item.title}</h3>
      <p className="mt-1 text-xs text-ink-mute">
        {item.author_name || '匿名同学'}
        {item.author_student_id ? ` · ${item.author_student_id}` : ''}
      </p>
      <p className="mt-1 text-[11px] text-ink-faint">
        评论 {item.comment_count || 0} · 点赞 {item.like_count || 0} · 浏览 {item.view_count || 0}
      </p>
    </div>
  );
}

export default function MyForum() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const current = TAB_DEFS[tab];

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    current
      .loader({ page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const list = data.list || [];
  const totalPages = Math.max(1, Math.ceil((data.total || 0) / PAGE_SIZE));
  const openPost = (pid) => navigate(`/forum/post/${pid}`);

  return (
    <div>
      <Tabs
        value={tab}
        onChange={(e, v) => {
          setTab(v);
          setPage(1);
        }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          borderBottom: '2px solid var(--ink-line)',
          '& .MuiTabs-indicator': { backgroundColor: CLASH.violet, height: 3 },
          '& .MuiTab-root': { fontWeight: 800, minHeight: 48 },
        }}
      >
        {TAB_DEFS.map((t) => (
          <Tab key={t.key} label={t.label} />
        ))}
      </Tabs>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : list.length === 0 ? (
        <EmptyState title={current.emptyText} text="去论坛首页看看大家在聊什么">
          <Button variant="outlined" onClick={() => navigate('/forum')}>
            去论坛首页
          </Button>
        </EmptyState>
      ) : (
        <div>
          <div className="space-y-3">
            {current.key === 'comments'
              ? list.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPost(c.post_id)}
                    onKeyDown={(e) => e.key === 'Enter' && openPost(c.post_id)}
                    className="clash-card cursor-pointer p-3"
                  >
                    <p className="line-clamp-2 text-sm text-ink-soft">{toPlainText(c.content)}</p>
                    <p className="mt-1 text-xs text-ink-mute">
                      评论帖子：
                      <span className="font-bold text-clash-violet">{c.post_title || '（帖子已删除）'}</span>
                    </p>
                    <p className="mt-1 text-[11px] text-ink-faint">{formatDateTime(c.created_at)}</p>
                  </div>
                ))
              : list.map((item) => <PostRow key={item.id} item={item} onOpen={openPost} />)}
          </div>

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
