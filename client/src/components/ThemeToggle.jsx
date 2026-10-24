/**
 * 亮/暗模式切换按钮（撞色风格：2px 墨线描边 + 硬投影 + 物理按压反馈）
 * 亮色时显示「月亮」（点击切到暗色），暗色时显示「太阳」（点击切回亮色）。
 * 依赖 ThemeModeProvider 注入的 useThemeMode。
 */
import IconButton from '@mui/material/IconButton';
import { useThemeMode } from '../theme/ThemeModeProvider';

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';
  return (
    <IconButton
      onClick={toggle}
      aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
      title={isDark ? '亮色模式' : '暗色模式'}
      sx={{
        minWidth: 44,
        minHeight: 44,
        color: 'var(--ink-line)',
        border: '2px solid var(--ink-line)',
        borderRadius: 12,
        backgroundColor: 'var(--paper-card)',
        boxShadow: '2px 2px 0 0 var(--ink-line)',
        transition:
          'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1)',
        '&:hover': { transform: 'translate(-1px,-1px)', boxShadow: '3px 3px 0 0 var(--ink-line)' },
        '&:active': { transform: 'translate(2px,2px)', boxShadow: '0 0 0 0 var(--ink-line)' },
      }}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </IconButton>
  );
}
