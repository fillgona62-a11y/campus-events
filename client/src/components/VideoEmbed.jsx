/**
 * VideoEmbed.jsx — 论坛视频渲染组件
 *
 * props: {type: 'upload' | 'embed', url: string}
 *   upload → <video> 站内上传视频
 *   embed  → 解析 B站 / YouTube 链接为对应 iframe 播放器（白名单解析，不渲染用户 HTML）
 *   解析失败 → 退回一个可访问的外链
 */
import { useMemo } from 'react';

/** 从 URL 解析 B站 bvid；失败返回空串 */
function parseBvid(url) {
  const m = String(url || '').match(/bilibili\.com\/video\/(BV[\w]+)/i);
  return m ? m[1] : '';
}

/** 从 URL 解析 YouTube videoId；失败返回空串 */
function parseYouTubeId(url) {
  const m = String(url || '').match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i
  );
  return m ? m[1] : '';
}

/** 固定 16:9 宽高比的 iframe 容器（墨边 + 圆角） */
function EmbedFrame({ src, title }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border-2 border-ink bg-black"
      style={{ paddingBottom: '56.25%' }}
    >
      <iframe
        src={src}
        title={title}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}

export default function VideoEmbed({ type, url }) {
  const parsed = useMemo(() => {
    if (!url) return { kind: 'none' };
    if (type === 'upload') return { kind: 'upload' };
    if (type === 'embed') {
      const bvid = parseBvid(url);
      if (bvid) {
        return { kind: 'embed', src: `//player.bilibili.com/player.html?bvid=${bvid}&autoplay=0` };
      }
      const yid = parseYouTubeId(url);
      if (yid) {
        return { kind: 'embed', src: `//www.youtube.com/embed/${yid}` };
      }
    }
    return { kind: 'none' };
  }, [type, url]);

  if (parsed.kind === 'upload') {
    return (
      <video
        src={url}
        controls
        preload="metadata"
        style={{ width: '100%', borderRadius: 12, border: '2px solid var(--ink-line)' }}
      />
    );
  }

  if (parsed.kind === 'embed') {
    return <EmbedFrame src={parsed.src} title="视频播放器" />;
  }

  // 解析失败：退回外链（保持可访问）
  return (
    <a
      href={url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-paper-card px-3 py-2 text-sm font-bold text-ink no-underline"
    >
      打开视频链接 ↗
    </a>
  );
}
