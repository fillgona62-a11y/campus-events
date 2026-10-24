/**
 * 全局设计令牌 + MUI 主题（撞色 / Clash 风格，支持亮/暗双模式）
 *
 * 色板取自参考图「撞色.jpg」：
 *   荧光绿 #B2FC06 · 樱珞紫 #ED35F9 · 绀星紫 #8A3BEC · 霁澜青 #81FCFF
 *   雾霭蓝 #8DA6D2 · 薄荷绿 #A4E2C6 · 柔柠黄 #F9D77C · 宝蓝 #012696
 *
 * 风格要点：
 *   1. 高饱和大色块平铺，而非渐变
 *   2. 2px 墨线描边 + 硬边投影（block shadow）
 *   3. 四角星（clash-star）点缀
 *   4. 按压有「物理下沉」反馈，悬停有「浮起」反馈
 *
 * 暗色模式：中性色（墨/纸）通过 CSS 变量（var(--ink-line) / var(--paper) 等）
 * 随 <html class="dark"> 翻转；撞色八色板明度不变。makeTheme(mode) 在这里只把
 * MUI 的 palette / 组件覆盖也指向同一套变量，保证双模式一致。
 */
import { createTheme } from '@mui/material/styles';

/** 撞色八色板（JS 侧使用请从此处取，避免散落硬编码） */
export const CLASH = {
  lime: '#B2FC06',
  magenta: '#ED35F9',
  violet: '#8A3BEC',
  cyan: '#81FCFF',
  haze: '#8DA6D2',
  mint: '#A4E2C6',
  lemon: '#F9D77C',
  royal: '#012696',
  ink: '#12121A',
  paper: '#FBFAF7',
};

/** 分类色轮：给不同分类循环上色，列表页一眼可辨 */
export const CATEGORY_COLORS = [
  CLASH.lime,
  CLASH.magenta,
  CLASH.violet,
  CLASH.cyan,
  CLASH.lemon,
  CLASH.mint,
  CLASH.haze,
  CLASH.royal,
];

/** 深色底上可用的文字色（用于浅色撞色块上的固定深字） */
export const INK_TEXT = '#12121A';

/**
 * 生成主题。mode: 'light' | 'dark'
 * 两套模式共用同一份组件级覆盖，只是 palette 与少量颜色变量取值不同；
 * 真正随模式翻转的是 CSS 变量（见 index.css），这里只把 MUI 指向变量。
 */
export function makeTheme(mode = 'light') {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary: { main: CLASH.royal, dark: '#011B6B', contrastText: '#FFFFFF' },
      secondary: { main: CLASH.magenta, contrastText: '#FFFFFF' },
      success: { main: '#12A150', contrastText: '#FFFFFF' },
      warning: { main: '#F5A524', contrastText: INK_TEXT },
      error: { main: '#E5384E', contrastText: '#FFFFFF' },
      info: { main: CLASH.violet, contrastText: '#FFFFFF' },
      // 背景/文字/分割线全部指向 CSS 变量，随 .dark 翻转
      background: {
        default: 'var(--paper)',
        paper: 'var(--paper-card)',
      },
      text: {
        primary: 'var(--ink-line)',
        secondary: 'var(--ink-mute)',
      },
      divider: 'rgba(var(--ink-rgb), 0.16)',
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily:
        '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif',
      h1: { fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontWeight: 800 },
      h4: { fontWeight: 800 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { fontWeight: 700, textTransform: 'none' },
      body1: { lineHeight: 1.7 },
      body2: { lineHeight: 1.65 },
    },
    components: {
      /** 按钮：硬边投影 + 物理按压反馈（墨线/投影随模式翻转） */
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 14,
            minHeight: 44,
            paddingLeft: 20,
            paddingRight: 20,
            transition:
              'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1), background-color .16s ease',
            '&:active': { transform: 'translate(2px, 2px)' },
          },
          containedPrimary: {
            boxShadow: '4px 4px 0 0 var(--ink-line)',
            '&:hover': {
              boxShadow: '6px 6px 0 0 var(--ink-line)',
              transform: 'translate(-2px, -2px)',
            },
            '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
          },
          containedSecondary: {
            boxShadow: '4px 4px 0 0 var(--ink-line)',
            '&:hover': {
              boxShadow: '6px 6px 0 0 var(--ink-line)',
              transform: 'translate(-2px, -2px)',
            },
            '&:active': { boxShadow: '1px 1px 0 0 var(--ink-line)', transform: 'translate(2px, 2px)' },
          },
          outlined: {
            borderWidth: 2,
            borderColor: 'var(--ink-line)',
            '&:hover': {
              borderWidth: 2,
              borderColor: 'var(--ink-line)',
              backgroundColor: 'rgba(var(--ink-rgb), 0.04)',
              boxShadow: '3px 3px 0 0 var(--ink-line)',
              transform: 'translate(-1px, -1px)',
            },
            '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
          },
          text: {
            '&:hover': { backgroundColor: 'rgba(var(--ink-rgb), 0.06)' },
          },
          sizeLarge: { minHeight: 52, fontSize: '1rem' },
        },
      },
      /** 卡片：撞色描边 + 硬边投影 */
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            border: '2px solid var(--ink-line)',
            boxShadow: '4px 4px 0 0 var(--ink-line)',
            backgroundImage: 'none',
            transition:
              'transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s cubic-bezier(.22,1,.36,1)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 18 },
        },
      },
      /** 输入框：2px 描边，聚焦时撞色描边 */
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            backgroundColor: 'var(--paper-card)',
            '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: 'var(--ink-line)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ink-line)' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: CLASH.violet,
              boxShadow: '0 0 0 4px rgba(138,59,236,0.16)',
            },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            borderRadius: 10,
            borderWidth: 2,
          },
          filled: { borderColor: 'var(--ink-line)' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            border: '2px solid var(--ink-line)',
            boxShadow: '8px 8px 0 0 var(--ink-line)',
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 800, fontSize: '1.15rem' } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 10, borderRadius: 999, backgroundColor: 'rgba(var(--ink-rgb), 0.10)' },
          bar: { borderRadius: 999 },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'default' },
        styleOverrides: {
          root: {
            backgroundColor: 'var(--appbar-bg)',
            backdropFilter: 'saturate(180%) blur(12px)',
            color: 'var(--ink-line)',
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
            borderRadius: 14,
            margin: '6px 8px',
            '&.Mui-selected': {
              backgroundColor: CLASH.lime,
              color: INK_TEXT,
              boxShadow: '3px 3px 0 0 var(--ink-line)',
            },
          },
          label: { fontWeight: 700 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontWeight: 700,
            textTransform: 'none',
            minHeight: 48,
            '&.Mui-selected': { color: 'var(--ink-line)' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 48 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 800, backgroundColor: 'rgba(var(--ink-rgb), 0.14)' },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: { borderRadius: 16 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 16, fontWeight: 600 },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            transition: 'transform .16s cubic-bezier(.22,1,.36,1), background-color .16s ease',
            '&:active': { transform: 'scale(0.92)' },
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 16,
            border: '2px solid var(--ink-line)',
            boxShadow: '6px 6px 0 0 var(--ink-line)',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 10, fontSize: '0.78rem', fontWeight: 600 },
        },
      },
    },
  });
}

export default makeTheme('light');
