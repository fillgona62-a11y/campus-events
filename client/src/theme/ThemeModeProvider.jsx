/**
 * 主题模式（亮/暗）Provider
 * - 状态：'light' | 'dark'，默认跟随系统 prefers-color-scheme，用户手动选择后写入 localStorage 优先
 * - 切换：给 <html> 加/去 'dark' 类（与 tailwind darkMode:'class' 及 index.css 的变量联动）
 * - 同时把当前模式对应的 MUI 主题通过 ThemeProvider 下发
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { makeTheme } from '../theme';

const STORAGE_KEY = 'campus-theme-mode';

function getInitialMode() {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* localStorage 不可用时忽略，退回系统偏好 */
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

const ThemeModeContext = createContext({
  mode: 'light',
  toggle: () => {},
  setMode: () => {},
});

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);

  // 同步 <html> 类 + 持久化
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* 忽略写入失败 */
    }
  }, [mode]);

  // 跟随系统：用户未手动选择时，系统偏好变化自动同步
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      let saved = null;
      try {
        saved = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (saved !== 'light' && saved !== 'dark') {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  const theme = useMemo(() => makeTheme(mode), [mode]);
  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')),
    }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export default ThemeModeProvider;
