/**
 * ForumPostDetail.jsx — 帖子详情：返回/标题、作者行（关注）、rich-text 正文、
 * 媒体区（VideoEmbed）、互动栏（点赞/收藏/浏览）、评论区（主评论 + 回复 + 删除）、删帖入口。
 *
 * 登录态：未登录时互动入口跳 /login（带来源）；关注按钮对本人/未登录不展示。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SendIcon from '@mui/icons-material/Send';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CheckIcon from '@mui/icons-material/Check';
import {
  getPost,
  addComment,
  deleteComment,
  deletePost,
  likePost,
  favoritePost,
  followUser,
  pinPost,
} from '../../api/forumApi';
import VideoEmbed from '../../components/VideoEmbed';
import { ClashStar, ClashStripe, clashColorAt } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { isAdmin } from '../../utils/role';
import { formatDateTime } from '../../utils/format';
import { ErrorState } from '../clashUi';

/** 加载态骨架屏 */
function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-10 w-28 rounded" />
      <div className="space-y-3 rounded-2xl border-2 border-ink bg-paper-card p-4">
        <div className="skeleton h-6 w-2/3 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-24 w-full rounded-xl" />
        <div className="skeleton h-16 w-full rounded-xl" />
      </div>
    </div>
  );
}

/** 评论头像（小号） */
function CommentAvatar({ name }) {
  return (
    <Avatar
      sx={{
        width: 26,
        height: 26,
        bgcolor: CLASH.mint,
        color: CLASH.ink,
        fontSize: 12,
        fontWeight: 800,
        border: '2px solid var(--ink-line)',
      }}
    >
      {name?.slice(0, 1) || '友'}
    </Avatar>
  );
}

export default function ForumPostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null); // {id, name} 当前回复对象
  const [submitting, setSubmitting] = useState(false);
  const [acting, setActing] = useState(''); // 进行中的异步动作 key，防重复点击
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    getPost(id)
      .then((d) => {
        setDetail(d);
        setReplyTo(null);
      })
      .catch((err) => setLoadError(err.message || '帖子加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const requireLogin = () => navigate('/login', { state: { from: `/forum/post/${id}` } });

  // ── 互动：点赞 / 收藏 / 关注（服务端返回最新布尔态，本地同步计数）──
  const handleLike = async () => {
    if (!token) return requireLogin();
    if (acting) return;
    setActing('like');
    try {
      const d = await likePost(id);
      setDetail((prev) => ({
        ...prev,
        liked: d.liked,
        post: {
          ...prev.post,
          like_count: Math.max((prev.post.like_count || 0) + (d.liked ? 1 : -1), 0),
        },
      }));
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  const handleFavorite = async () => {
    if (!token) return requireLogin();
    if (acting) return;
    setActing('fav');
    try {
      const d = await favoritePost(id);
      setDetail((prev) => ({
        ...prev,
        favorited: d.favorited,
        post: {
          ...prev.post,
          favorite_count: Math.max((prev.post.favorite_count || 0) + (d.favorited ? 1 : -1), 0),
        },
      }));
      showToast(d.favorited ? '已收藏' : '已取消收藏');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  const handleFollow = async () => {
    if (!token) return requireLogin();
    if (acting) return;
    setActing('follow');
    try {
      const d = await followUser(detail.post.author_id);
      setDetail((prev) => ({ ...prev, following: d.following }));
      showToast(d.following ? '已关注' : '已取消关注');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  // ── 置顶 / 取消置顶（管理员）──
  const handlePin = async () => {
    if (acting) return;
    setActing('pin');
    try {
      const d = await pinPost(id);
      // 整块替换本地 post：is_pinned 为 0/1 整数，按真值判断
      setDetail((prev) => ({ ...prev, post: d.post }));
      showToast(d.post.is_pinned ? '已置顶' : '已取消置顶');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  // ── 评论 ──
  const handleSubmitComment = async () => {
    if (!token) return requireLogin();
    const content = commentDraft.trim();
    if (!content) {
      showToast('评论内容不能为空', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await addComment(id, { content, parent_id: replyTo ? replyTo.id : 0 });
      setCommentDraft('');
      setReplyTo(null);
      showToast('评论成功');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (cid) => {
    if (acting) return;
    setActing(`comment-${cid}`);
    try {
      await deleteComment(cid);
      showToast('评论已删除');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActing('');
    }
  };

  // ── 删帖 ──
  const handleDeletePost = async () => {
    setActing('delete-post');
    try {
      await deletePost(id);
      setDeleteOpen(false);
      showToast('帖子已删除');
      navigate('/forum');
    } catch (err) {
      showToast(err.message, 'error');
      setActing('');
    }
  };

  // 评论按 parent_id 分组（后端 parent_id=0 为主评论）
  const commentTree = useMemo(() => {
    const map = new Map();
    (detail?.comments || []).forEach((c) => {
      const key = c.parent_id || 0;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    });
    return map;
  }, [detail]);

  if (loading) return <DetailSkeleton />;

  if (loadError || !detail) {
    return (
      <div className="space-y-3">
        <ErrorState text={loadError || '帖子不存在或已删除'} onRetry={load} />
        <div className="flex justify-center">
          <Button variant="outlined" component={Link} to="/forum">
            返回论坛
          </Button>
        </div>
      </div>
    );
  }

  const { post, liked, favorited, following } = detail;
  const isSelf = Boolean(token && user && user.id === post.author_id);
  const canManagePost = isSelf || Boolean(token && user?.role === 'admin');
  const admin = isAdmin(user?.role);
  const topics = post.topics ? String(post.topics).split(',').filter(Boolean) : [];
  const videos = post.media && Array.isArray(post.media.videos) ? post.media.videos : [];
  const roots = commentTree.get(0) || [];

  // 递归渲染评论（回复缩进；超过两级缩进不再加深，避免移动端过窄）
  const renderComment = (comment, depth) => {
    const children = commentTree.get(comment.id) || [];
    const canDelete = Boolean(token && user && (user.id === comment.user_id || user.role === 'admin'));
    return (
      <div
        key={comment.id}
        className={depth === 0 ? '' : 'mt-2'}
        style={depth > 0 ? { marginLeft: 12, borderLeft: '2px solid var(--ink-line)', paddingLeft: 10 } : undefined}
      >
        <div className="rounded-xl border-2 border-ink bg-paper-card p-3">
          <div className="flex items-center gap-2">
            <CommentAvatar name={comment.user_name} />
            <span className="text-xs font-extrabold text-ink">{comment.user_name || '匿名同学'}</span>
            {comment.user_student_id && (
              <span className="text-[11px] text-ink-mute">{comment.user_student_id}</span>
            )}
            <div className="flex-1" />
            <span className="text-[11px] text-ink-faint">{formatDateTime(comment.created_at)}</span>
          </div>
          <div className="mt-1.5 text-sm text-ink-soft">
            {comment.parent_user_name && (
              <span className="font-bold text-clash-violet">回复 @{comment.parent_user_name}：</span>
            )}
            {/* 评论内容服务端已净化，同帖子正文的信任级别 */}
            <div className="inline" dangerouslySetInnerHTML={{ __html: comment.content }} />
          </div>
          <div className="mt-1 flex items-center gap-1">
            <Button
              size="small"
              onClick={() => {
                if (!token) return requireLogin();
                setReplyTo({ id: comment.id, name: comment.user_name || '匿名同学' });
              }}
              sx={{ minHeight: 34, fontWeight: 700, color: 'var(--ink-line)' }}
            >
              回复
            </Button>
            {canDelete && (
              <IconButton
                size="small"
                aria-label="删除评论"
                disabled={acting === `comment-${comment.id}`}
                onClick={() => handleDeleteComment(comment.id)}
                sx={{ color: CLASH.magenta, minWidth: 36, minHeight: 36 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </div>
        </div>
        {children.map((child) => renderComment(child, Math.min(depth + 1, 2)))}
      </div>
    );
  };

  return (
    <div className="pb-4">
      {/* 顶部：返回 + 作者/管理员操作 */}
      <div className="mb-2 flex items-center gap-1">
        <IconButton onClick={() => navigate(-1)} aria-label="返回" sx={{ minWidth: 44, minHeight: 44 }}>
          <ArrowBackIcon />
        </IconButton>
        <span className="flex-1 text-sm text-ink-mute">帖子详情</span>
        {isSelf && (
          <Button
            component={Link}
            to={`/forum/post/${id}/edit`}
            startIcon={<EditIcon />}
            sx={{ minHeight: 44, fontWeight: 700, color: 'var(--ink-line)' }}
          >
            编辑
          </Button>
        )}
        {canManagePost && (
          <Button
            onClick={() => setDeleteOpen(true)}
            startIcon={<DeleteIcon />}
            sx={{ minHeight: 44, fontWeight: 700, color: CLASH.magenta }}
          >
            删除
          </Button>
        )}
      </div>

      {/* ── 作者行 ─────────────────────────────────────────────── */}
      <div className="clash-card flex flex-wrap items-center gap-3 p-4">
        <Avatar
          sx={{
            width: 44,
            height: 44,
            bgcolor: CLASH.cyan,
            color: CLASH.ink,
            fontSize: 18,
            fontWeight: 800,
            border: '2px solid var(--ink-line)',
          }}
        >
          {post.author_name?.slice(0, 1) || '友'}
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-ink">{post.author_name || '匿名同学'}</p>
          <p className="text-xs text-ink-mute">
            {post.author_student_id ? `${post.author_student_id} · ` : ''}
            {formatDateTime(post.created_at)}
          </p>
        </div>
        <div className="flex-1" />
        {/* 置顶按钮：仅管理员（大/小管理员）可见 */}
        {admin && (
          <Button
            onClick={handlePin}
            disabled={Boolean(acting)}
            variant="outlined"
            size="small"
            startIcon={<PushPinOutlinedIcon />}
            sx={{
              minHeight: 44,
              fontWeight: 800,
              borderRadius: 12,
              color: 'var(--ink-line)',
              border: '2px solid var(--ink-line)',
            }}
          >
            {post.is_pinned ? '取消置顶' : '置顶'}
          </Button>
        )}
        {/* 关注按钮：未登录/本人不展示 */}
        {token && !isSelf && (
          <Button
            onClick={handleFollow}
            disabled={Boolean(acting)}
            className={following ? 'on-clash' : undefined}
            startIcon={following ? <CheckIcon /> : <PersonAddIcon />}
            sx={{
              minHeight: 44,
              fontWeight: 800,
              borderRadius: 12,
              color: following ? CLASH.ink : 'var(--ink-line)',
              border: '2px solid var(--ink-line)',
              backgroundColor: following ? CLASH.lime : 'transparent',
              boxShadow: following ? '3px 3px 0 0 var(--ink-line)' : 'none',
            }}
          >
            {following ? '已关注' : '关注'}
          </Button>
        )}
      </div>

      {/* ── 标题 + 正文 ────────────────────────────────────────── */}
      <div className="clash-card mt-4 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {/* 置顶徽标：所有人可见 */}
          {post.is_pinned && (
            <span className="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-clash-magenta px-1.5 py-0.5 text-[11px] font-extrabold on-clash">
              <PushPinOutlinedIcon sx={{ fontSize: 13 }} />
              置顶
            </span>
          )}
          {topics.map((t, i) => (
            <Chip
              key={t}
              label={`# ${t}`}
              size="small"
              className="on-clash"
              sx={{
                borderWidth: 2,
                borderColor: 'var(--ink-line)',
                backgroundColor: clashColorAt(i),
                color: CLASH.ink,
                fontWeight: 800,
              }}
            />
          ))}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">{post.title}</h1>
        <ClashStripe className="my-3" />
        {/* 服务端已白名单净化，可安全渲染 */}
        <div
          className="rich-text text-sm text-ink-soft"
          dangerouslySetInnerHTML={{ __html: post.content || '<p>（暂无正文）</p>' }}
        />
      </div>

      {/* ── 媒体区 ─────────────────────────────────────────────── */}
      {videos.length > 0 && (
        <div className="clash-card mt-4 space-y-3 p-4">
          <div className="flex items-center gap-2">
            <ClashStar size={16} style={{ color: CLASH.violet }} />
            <h2 className="text-base font-extrabold text-ink">视频</h2>
          </div>
          {videos.map((v, i) => (
            <VideoEmbed key={`${v.type}-${i}`} type={v.type} url={v.url} />
          ))}
        </div>
      )}

      {/* ── 互动栏 ─────────────────────────────────────────────── */}
      <div className="clash-card mt-4 flex flex-wrap items-center gap-2 p-3">
        <Button
          onClick={handleLike}
          disabled={Boolean(acting)}
          className={liked ? 'on-clash' : undefined}
          startIcon={liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          sx={{
            minHeight: 44,
            fontWeight: 800,
            borderRadius: 12,
            color: liked ? CLASH.ink : 'var(--ink-line)',
            border: '2px solid var(--ink-line)',
            backgroundColor: liked ? CLASH.magenta : 'transparent',
          }}
        >
          {post.like_count || 0}
        </Button>
        <Button
          onClick={handleFavorite}
          disabled={Boolean(acting)}
          className={favorited ? 'on-clash' : undefined}
          startIcon={favorited ? <BookmarkIcon /> : <BookmarkBorderIcon />}
          sx={{
            minHeight: 44,
            fontWeight: 800,
            borderRadius: 12,
            color: favorited ? CLASH.ink : 'var(--ink-line)',
            border: '2px solid var(--ink-line)',
            backgroundColor: favorited ? CLASH.cyan : 'transparent',
          }}
        >
          {post.favorite_count || 0}
        </Button>
        <span className="flex items-center gap-1 px-2 text-xs font-bold text-ink-mute">
          <VisibilityIcon sx={{ fontSize: 16 }} />
          {post.view_count || 0} 次浏览
        </span>
      </div>

      {/* ── 评论区 ─────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: CLASH.violet }} />
          <h2 className="text-base font-extrabold text-ink">评论（{post.comment_count || 0}）</h2>
        </div>

        {/* 评论输入：未登录引导登录 */}
        {!token ? (
          <div className="clash-card flex flex-col items-center gap-2 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className="text-sm font-bold text-ink-soft">登录后才能评论、点赞和关注</p>
            <Button variant="contained" component={Link} to="/login" state={{ from: `/forum/post/${id}` }}>
              去登录
            </Button>
          </div>
        ) : (
          <div className="clash-card p-3">
            {replyTo && (
              <div className="mb-2">
                <Chip
                  size="small"
                  label={`回复 @${replyTo.name}`}
                  onDelete={() => setReplyTo(null)}
                  sx={{ fontWeight: 800, borderWidth: 2, borderColor: 'var(--ink-line)' }}
                />
              </div>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={replyTo ? `回复 @${replyTo.name}…` : '友善评论，理性发言…'}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              inputProps={{ maxLength: 1000 }}
              helperText={`${commentDraft.length}/1000`}
            />
            <div className="mt-2 flex justify-end">
              <Button
                variant="contained"
                onClick={handleSubmitComment}
                disabled={submitting || !commentDraft.trim()}
                startIcon={<SendIcon />}
                sx={{ minHeight: 44 }}
              >
                {submitting ? '发布中…' : '发布评论'}
              </Button>
            </div>
          </div>
        )}

        {/* 评论列表 */}
        <div className="mt-3 space-y-2">
          {roots.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-mute">还没有评论，来抢沙发~</p>
          ) : (
            roots.map((c) => renderComment(c, 0))
          )}
        </div>
      </div>

      {/* 删帖确认弹窗 */}
      <Dialog
        open={deleteOpen}
        onClose={() => !acting && setDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>删除帖子</DialogTitle>
        <DialogContent>
          <p className="text-sm text-ink-soft">确定要删除「{post.title}」吗？删除后不可恢复。</p>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDeleteOpen(false)} disabled={Boolean(acting)}>
            再想想
          </Button>
          <Button variant="contained" color="error" onClick={handleDeletePost} disabled={Boolean(acting)}>
            {acting === 'delete-post' ? '删除中…' : '确认删除'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
