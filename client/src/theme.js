/**
 * 全局设计令牌 + MUI 主题（撞色 / Clash 风格）
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

/** 深色底上可用的文字色 */
export const INK_TEXT = '#12121A';

const theme = createTheme({
  palette: {
    primary: { main: CLASH.royal, dark: '#011B6B', contrastText: '#FFFFFF' },
    secondary: { main: CLASH.magenta, contrastText: '#FFFFFF' },
    success: { main: '#12A150', contrastText: '#FFFFFF' },
    warning: { main: '#F5A524', contrastText: INK_TEXT },
    error: { main: '#E5384E', contrastText: '#FFFFFF' },
    info: { main: CLASH.violet, contrastText: '#FFFFFF' },
    background: { default: CLASH.paper, paper: '#FFFFFF' },
    text: { primary: INK_TEXT, secondary: '#6B6B7B' },
    divider: 'rgba(18,18,26,0.12)',
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
    /** 按钮：硬边投影 + 物理按压反馈 */
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
          boxShadow: '4px 4px 0 0 #12121A',
          '&:hover': {
            boxShadow: '6px 6px 0 0 #12121A',
            transform: 'translate(-2px, -2px)',
          },
          '&:active': { boxShadow: '1px 1px 0 0 #12121A', transform: 'translate(2px, 2px)' },
        },
        containedSecondary: {
          boxShadow: '4px 4px 0 0 #12121A',
          '&:hover': {
            boxShadow: '6px 6px 0 0 #12121A',
            transform: 'translate(-2px, -2px)',
          },
          '&:active': { boxShadow: '1px 1px 0 0 #12121A', transform: 'translate(2px, 2px)' },
        },
        outlined: {
          borderWidth: 2,
          borderColor: '#12121A',
          '&:hover': {
            borderWidth: 2,
            borderColor: '#12121A',
            backgroundColor: 'rgba(18,18,26,0.04)',
            boxShadow: '3px 3px 0 0 #12121A',
            transform: 'translate(-1px, -1px)',
          },
          '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(18,18,26,0.06)' },
        },
        sizeLarge: { minHeight: 52, fontSize: '1rem' },
      },
    },
    /** 卡片：撞色描边 + 硬边投影 */
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          border: '2px solid #12121A',
          boxShadow: '4px 4px 0 0 #12121A',
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
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderWidth: 2, borderColor: '#12121A' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#12121A' },
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
        filled: { borderColor: '#12121A' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: '2px solid #12121A',
          boxShadow: '8px 8px 0 0 rgba(18,18,26,0.35)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 800, fontSize: '1.15rem' } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { height: 10, borderRadius: 999, backgroundColor: 'rgba(18,18,26,0.10)' },
        bar: { borderRadius: 999 },
      },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'default' },
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(251,250,247,0.88)',
          backdropFilter: 'saturate(180%) blur(12px)',
          color: INK_TEXT,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: { root: { minHeight: 60 } },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: { backgroundColor: '#FFFFFF' },
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
            boxShadow: '3px 3px 0 0 #12121A',
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
          '&.Mui-selected': { color: INK_TEXT },
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
        head: { fontWeight: 800, backgroundColor: 'rgba(18,18,26,0.04)' },
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
          border: '2px solid #12121A',
          boxShadow: '6px 6px 0 0 rgba(18,18,26,0.3)',
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

export default theme;
