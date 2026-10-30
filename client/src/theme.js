/**
 * 全局设计令牌 + MUI 主题（水墨国风，支持亮/暗双模式）
 *
 * 东方色板：
 *   赭石 #9C6B3F · 山青 #6D7F6D · 朱砂 #B3432F · 竹青 #5F7D5A
 *   藤黄 #A8823F · 黛蓝 #3F5068 · 描金 #B99A63 · 浓墨 #2B2A28
 *   宣纸 #F5F1E8
 *
 * 风格要点：
 *   1. 低饱和、沉稳的东方色调，克制留白
 *   2. 柔和阴影替代硬边投影，细描边
 *   3. 小圆角（水墨的收敛）
 *   4. 标题用衬线（宋体），正文保持清晰无衬线
 *
 * 暗色模式：中性色（墨/纸）通过 CSS 变量随 <html class="dark"> 翻转；
 * 东方色板明度随模式微调。makeTheme(mode) 只把 MUI 的 palette / 组件覆盖
 * 指向同一套变量，保证双模式一致。
 */
import { createTheme } from '@mui/material/styles';

/** 东方色板（JS 侧使用请从此处取，避免散落硬编码） */
export const CLASH = {
  lime: '#6D7F6D',     // 原荧光绿 → 山青
  magenta: '#B3432F',  // 原霓虹粉 → 朱砂
  violet: '#3F5068',   // 原绀星紫 → 黛蓝
  cyan: '#5F7D5A',     // 原荧光青 → 竹青
  haze: '#A39D92',     // 原雾霭蓝 → 浅墨
  mint: '#A8823F',     // 原薄荷绿 → 藤黄
  lemon: '#B99A63',    // 原柔柠黄 → 描金
  royal: '#9C6B3F',    // 原宝蓝 → 赭石
  ink: '#2B2A28',      // 浓墨
  paper: '#F5F1E8',    // 宣纸
};

/** 分类色轮：给不同分类循环上色，列表页一眼可辨 */
export const CATEGORY_COLORS = [
  '#9C6B3F', // 赭石
  '#6D7F6D', // 山青
  '#3F5068', // 黛蓝
  '#5F7D5A', // 竹青
  '#A8823F', // 藤黄
  '#B99A63', // 描金
  '#B3432F', // 朱砂
  '#7A756C', // 灰墨
];

/** 深色底上可用的文字色（用于浅色块上的固定深字） */
export const INK_TEXT = '#2B2A28';

/**
 * 生成主题。mode: 'light' | 'dark'
 * 两套模式共用同一份组件级覆盖，只是 palette 与少量颜色变量取值不同；
 * 真正随模式翻转的是 CSS 变量（见 index.css），这里只把 MUI 指向变量。
 */
export function makeTheme(mode = 'light') {
  const isDark = mode === 'dark';
  // 调色板必须用真实色值（按模式取）：MUI 会在运行时对 palette 颜色做对比度/透明度/
  // 强调色运算，CSS 变量（var(--x)）无法被解析成 RGB，放进 palette 会触发
  // Minified MUI error #9。组件 sx / styleOverrides 里的 var() 是纯 CSS 直通
  // （emission 不解析），不受影响，可继续用；这里只把 palette 换成真实色值。
  const C = isDark
    ? {
        paper: '#1A1917',
        paperCard: '#242220',
        ink: '#E8E2D5',
        inkMute: '#9C958A',
        divider: 'rgba(232,226,213,0.14)',
      }
    : {
        paper: '#F5F1E8',
        paperCard: '#FBF9F4',
        ink: '#2B2A28',
        inkMute: '#7A756C',
        divider: 'rgba(43,42,40,0.10)',
      };

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: '#9C6B3F', dark: '#7A5230', contrastText: '#FFFFFF' },
      secondary: { main: '#B3432F', contrastText: '#FFFFFF' },
      success: { main: '#5F7D5A', contrastText: '#FFFFFF' },
      warning: { main: '#A8823F', contrastText: INK_TEXT },
      error: { main: '#B3432F', contrastText: '#FFFFFF' },
      info: { main: '#3F5068', contrastText: '#FFFFFF' },
      background: {
        default: C.paper,
        paper: C.paperCard,
      },
      text: {
        primary: C.ink,
        secondary: C.inkMute,
      },
      divider: C.divider,
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily:
        '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 600, letterSpacing: '0.02em', fontFamily: '"Songti SC", "STSong", "SimSun", serif' },
      h2: { fontWeight: 600, letterSpacing: '0.02em', fontFamily: '"Songti SC", "STSong", "SimSun", serif' },
      h3: { fontWeight: 600, fontFamily: '"Songti SC", "STSong", "SimSun", serif' },
      h4: { fontWeight: 600, fontFamily: '"Songti SC", "STSong", "SimSun", serif' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
      body1: { lineHeight: 1.75 },
      body2: { lineHeight: 1.7 },
    },
    components: {
      /** 按钮：柔和阴影 + 克制的悬停反馈（替代硬边投影） */
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            minHeight: 42,
            paddingLeft: 18,
            paddingRight: 18,
            transition:
              'transform .16s ease, box-shadow .16s ease, background-color .16s ease',
          },
          containedPrimary: {
            boxShadow: '0 1px 4px rgba(156,107,63,0.30)',
            '&:hover': {
              boxShadow: '0 3px 10px rgba(156,107,63,0.36)',
              transform: 'translateY(-1px)',
            },
            '&:active': { boxShadow: '0 1px 2px rgba(156,107,63,0.30)', transform: 'translateY(0)' },
          },
          containedSecondary: {
            boxShadow: '0 1px 4px rgba(179,67,47,0.28)',
            '&:hover': {
              boxShadow: '0 3px 10px rgba(179,67,47,0.34)',
              transform: 'translateY(-1px)',
            },
            '&:active': { boxShadow: '0 1px 2px rgba(179,67,47,0.28)', transform: 'translateY(0)' },
          },
          outlined: {
            borderWidth: 1,
            borderColor: 'rgba(var(--ink-rgb), 0.28)',
            '&:hover': {
              borderWidth: 1,
              borderColor: 'rgba(var(--ink-rgb), 0.45)',
              backgroundColor: 'rgba(var(--ink-rgb), 0.03)',
            },
          },
          text: {
            '&:hover': { backgroundColor: 'rgba(var(--ink-rgb), 0.05)' },
          },
          sizeLarge: { minHeight: 48, fontSize: '1rem' },
        },
      },
      /** 卡片：细描边 + 柔和阴影 */
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid rgba(var(--ink-rgb), 0.10)',
            boxShadow: '0 2px 10px rgba(43,42,40,0.06)',
            backgroundImage: 'none',
            transition: 'transform .2s ease, box-shadow .2s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 12 },
        },
      },
      /** 输入框：细描边，聚焦时赭石描边 */
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: 'var(--paper-card)',
            '& .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: 'rgba(var(--ink-rgb), 0.22)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(var(--ink-rgb), 0.40)' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 1,
              borderColor: '#9C6B3F',
              boxShadow: '0 0 0 3px rgba(156,107,63,0.12)',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            borderRadius: 8,
            borderWidth: 1,
          },
          filled: { borderColor: 'rgba(var(--ink-rgb), 0.12)' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: '1px solid rgba(var(--ink-rgb), 0.10)',
            boxShadow: '0 12px 40px rgba(43,42,40,0.20)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 600, fontSize: '1.15rem' } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 8, borderRadius: 999, backgroundColor: 'rgba(var(--ink-rgb), 0.08)' },
          bar: { borderRadius: 999 },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: 'var(--appbar-bg)',
            backdropFilter: 'blur(10px)',
            color: 'var(--ink-line)',
            borderBottom: '1px solid rgba(var(--ink-rgb), 0.08)',
          },
        },
      },
      MuiToolbar: {
        styleOverrides: { root: { minHeight: 60 } },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { backgroundColor: 'var(--paper-card)' },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 72,
            minHeight: 60,
            borderRadius: 8,
            margin: '6px 8px',
            '&.Mui-selected': {
              backgroundColor: 'rgba(156,107,63,0.12)',
              color: '#9C6B3F',
            },
          },
          label: { fontWeight: 600 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            textTransform: 'none',
            minHeight: 46,
            '&.Mui-selected': { color: '#9C6B3F' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 46 },
          indicator: { backgroundColor: '#9C6B3F', height: 2 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600, backgroundColor: 'rgba(var(--ink-rgb), 0.04)' },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 10, fontWeight: 500 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform .16s ease, background-color .16s ease',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 10,
            border: '1px solid rgba(var(--ink-rgb), 0.10)',
            boxShadow: '0 8px 28px rgba(43,42,40,0.16)',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 8, fontSize: '0.78rem', fontWeight: 500 },
        },
      },
    },
  });
}

export default makeTheme('light');
