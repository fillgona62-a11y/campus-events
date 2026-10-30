/**
 * ForumPublish.jsx — 发帖 / 编辑共用页（路由 /forum/new 与 /forum/post/:id/edit）。
 *
 * 轻量富文本方案（不引重量级编辑器）：多行 TextField + 工具栏（加粗/斜体/插入图片）。
 *   · 加粗/斜体：包裹 textarea 选中文本为 <b>/<i>
 *   · 插入图片：走 uploadCover（POST /upload），成功后把 <img src="/uploads/.."> 追加到正文
 *   · 提交时 content 换行 → <br>（照 PublishEvent.jsx:156）；编辑回显时 <br> → 换行符
 * 视频上传交互下一期再做，本期 media.videos 固定传空数组。
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import ImageIcon from '@mui/icons-material/Image';
import VideocamIcon from '@mui/icons-material/Videocam';
import LinkIcon from '@mui/icons-material/Link';
import SendIcon from '@mui/icons-material/Send';
import { createPost, updatePost, getPost, uploadVideo } from '../../api/forumApi';
import { uploadCover } from '../../api/eventApi';
import VideoEmbed from '../../components/VideoEmbed';
import { ClashStar, ClashStripe } from '../../components/ClashDecor';
import { CLASH } from '../../theme';

const MAX_TOPICS = 5;

export default function ForumPublish() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicDraft, setTopicDraft] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videos, setVideos] = useState([]);
  const [videoUploading, setVideoUploading] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const inputRef = useRef(null);
  // 记录 textarea 选区，工具栏按钮点击时不丢失选区
  const selRef = useRef({ start: 0, end: 0 });
  const cacheSelection = (e) => {
    selRef.current = {
      start: e.target.selectionStart ?? 0,
      end: e.target.selectionEnd ?? 0,
    };
  };

  /** 用 <b>/<i> 等标签包裹选中文本（无选中则插入空标签并把光标置于中间） */
  const wrapSelection = (open, close) => {
    const { start, end } = selRef.current;
    const inner = content.slice(start, end);
    const next = `${content.slice(0, start)}${open}${inner}${close}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start + open.length, start + open.length + inner.length);
    });
  };

  // 编辑模式：加载帖子回显（<br> 还原为换行符，便于编辑）
  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getPost(id)
      .then((d) => {
        const p = d.post;
        setTitle(p.title || '');
        setContent((p.content || '').replace(/<br\s*\/?>/gi, '\n'));
        setTopics(
          p.topics
            ? String(p.topics)
                .split(',')
                .filter(Boolean)
                .slice(0, MAX_TOPICS)
            : []
        );
        setVideos(p.media && Array.isArray(p.media.videos) ? p.media.videos : []);
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  /** 插入图片：上传后把 <img> 追加到正文末尾（新行） */
  const handleInsertImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadCover(file);
      const tag = `<img src="${data.url}" alt="帖子图片">`;
      setContent((c) => (c ? `${c}\n${tag}` : tag));
      showToast('图片已插入正文');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const EMBED_RE = /bilibili\.com\/video\/|youtube\.com\/watch\?v=|youtu\.be\//i;

  /** 上传视频（≤50MB mp4/webm/mov） */
  const handleInsertVideo = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (videos.length >= 5) {
      showToast('最多添加 5 个视频', 'error');
      return;
    }
    setVideoUploading(true);
    try {
      const data = await uploadVideo(file);
      setVideos((v) => [...v, { type: 'upload', url: data.url }]);
      showToast('视频已添加');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setVideoUploading(false);
      e.target.value = '';
    }
  };

  /** 添加 B站/YouTube 链接（嵌入播放；后端亦会校验域名） */
  const handleAddEmbed = () => {
    const url = embedUrl.trim();
    if (!EMBED_RE.test(url)) {
      showToast('请填 B站(bilibili.com/video/…) 或 YouTube 链接', 'error');
      return;
    }
    if (videos.length >= 5) {
      showToast('最多添加 5 个视频', 'error');
      return;
    }
    setVideos((v) => [...v, { type: 'embed', url }]);
    setEmbedUrl('');
  };

  const removeVideo = (idx) => setVideos((v) => v.filter((_, i) => i !== idx));

  const addTopic = () => {
    const v = topicDraft.trim().replace(/[,，]/g, '');
    if (!v) return;
    if (topics.includes(v)) {
      showToast('话题重复了', 'error');
      return;
    }
    if (topics.length >= MAX_TOPICS) {
      showToast(`最多添加 ${MAX_TOPICS} 个话题`, 'error');
      return;
    }
    setTopics((t) => [...t, v]);
    setTopicDraft('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showToast('请填写标题', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('请填写正文', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        // 纯文本换行转 <br>（服务端仍会白名单过滤）
        content: content.replace(/\n/g, '<br>'),
        media: { videos },
        topics,
      };
      const data = isEdit ? await updatePost(id, payload) : await createPost(payload);
      showToast(isEdit ? '已保存' : '发布成功');
      setTimeout(() => navigate(`/forum/post/${data.post.id}`), 600);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="skeleton h-8 w-40 rounded" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={22} style={{ color: CLASH.magenta }} />
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {isEdit ? '编辑帖子' : '发布帖子'}
        </h1>
      </div>

      <div className="space-y-4">
        {/* 标题 */}
        <div className="clash-card p-4">
          <TextField
            fullWidth
            required
            label="标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helperText={`${title.length}/80`}
            inputProps={{ maxLength: 80 }}
          />
        </div>

        {/* 正文（轻量富文本） */}
        <div className="clash-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClashStar size={16} style={{ color: CLASH.violet }} />
            <h2 className="text-base font-semibold text-ink">正文</h2>
          </div>
          <ClashStripe className="mb-3" />

          {/* 工具栏：加粗 / 斜体 / 插入图片 */}
          <div className="mb-2 flex flex-wrap items-center gap-1">
            <IconButton
              aria-label="加粗"
              onClick={() => wrapSelection('<b>', '</b>')}
              sx={{ minWidth: 44, minHeight: 44, color: 'var(--ink-line)' }}
            >
              <FormatBoldIcon />
            </IconButton>
            <IconButton
              aria-label="斜体"
              onClick={() => wrapSelection('<i>', '</i>')}
              sx={{ minWidth: 44, minHeight: 44, color: 'var(--ink-line)' }}
            >
              <FormatItalicIcon />
            </IconButton>
            <Button
              variant="outlined"
              component="label"
              disabled={uploading}
              startIcon={<ImageIcon />}
              sx={{ minHeight: 44 }}
            >
              {uploading ? '上传中…' : '插入图片'}
              <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleInsertImage} />
            </Button>
          </div>

          <TextField
            fullWidth
            multiline
            rows={10}
            inputRef={inputRef}
            placeholder="分享你的校园生活…（支持换行、加粗/斜体、插入图片）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onSelect={cacheSelection}
            onKeyUp={cacheSelection}
            onClick={cacheSelection}
            inputProps={{ maxLength: 20000 }}
            helperText="内容将在服务端进行安全过滤；图片上传后以 <img> 形式插入正文"
          />
        </div>

        {/* 视频：上传小视频 或 贴 B站/YouTube 链接 */}
        <div className="clash-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClashStar size={16} style={{ color: CLASH.cyan }} />
            <h2 className="text-base font-semibold text-ink">视频</h2>
            <span className="text-xs text-ink-mute">上传 ≤50MB，或贴 B站/YouTube 链接，最多 5 个</span>
          </div>
          <ClashStripe className="mb-3" />
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              variant="outlined"
              component="label"
              disabled={videoUploading}
              startIcon={<VideocamIcon />}
              sx={{ minHeight: 44 }}
            >
              {videoUploading ? '上传中…' : '上传视频'}
              <input hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleInsertVideo} />
            </Button>
            <TextField
              size="small"
              label="或粘贴视频链接"
              placeholder="bilibili.com/video/BV… 或 youtu.be/…"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddEmbed();
                }
              }}
              sx={{ flex: 1, minWidth: 220 }}
            />
            <Button variant="outlined" startIcon={<LinkIcon />} onClick={handleAddEmbed} sx={{ minHeight: 44 }}>
              添加链接
            </Button>
          </div>
          {videos.length > 0 && (
            <div className="space-y-2">
              {videos.map((v, i) => (
                <div key={i} className="rounded-2xl border border-ink/10 bg-paper-card p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="rounded-md border border-ink/10 bg-clash-mint px-2 py-0.5 text-[11px] font-semibold text-ink on-clash">
                      {v.type === 'upload' ? '上传视频' : '链接嵌入'}
                    </span>
                    <Button size="small" color="error" variant="outlined" onClick={() => removeVideo(i)}>
                      移除
                    </Button>
                  </div>
                  <VideoEmbed type={v.type} url={v.url} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 话题标签 */}
        <div className="clash-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClashStar size={16} style={{ color: CLASH.cyan }} />
            <h2 className="text-base font-semibold text-ink">话题标签</h2>
            <span className="text-xs text-ink-mute">回车添加，最多 {MAX_TOPICS} 个</span>
          </div>
          <TextField
            fullWidth
            size="small"
            placeholder="输入话题后按回车，如：学习"
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
          />
          {topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((t) => (
                <Chip
                  key={t}
                  label={`# ${t}`}
                  onDelete={() => setTopics((list) => list.filter((x) => x !== t))}
                  sx={{
                    fontWeight: 800,
                    borderWidth: 2,
                    borderColor: 'var(--ink-line)',
                    backgroundColor: CLASH.lemon,
                    color: CLASH.ink,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 提交区 */}
        <div className="rounded-2xl border border-ink/10 bg-paper-card p-4">
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={<SendIcon />}
            sx={{ minHeight: 56 }}
          >
            {submitting ? '提交中…' : isEdit ? '保存修改' : '发布帖子'}
          </Button>
        </div>
      </div>

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
