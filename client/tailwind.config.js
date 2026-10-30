/** @type {import('tailwindcss').Config} */
// 移动优先断点：sm 640 / md 768 / lg 1024 / xl 1280（Tailwind 默认）
// 视觉基调：水墨国风——低饱和东方色 + 柔和阴影 + 克制留白
// 暗色模式：darkMode:'class' + 中性色（ink/paper）改为 CSS 变量，随 .dark 翻转
export default {
  // 暗色模式以 html.dark 类驱动（由 ThemeModeProvider 控制，默认跟随系统）
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── 东方色板（水墨风，明度随模式微调）────────────
        clash: {
          lime: '#6D7F6D',    // 山青
          magenta: '#B3432F', // 朱砂
          violet: '#3F5068',  // 黛蓝
          cyan: '#5F7D5A',    // 竹青
          haze: '#A39D92',    // 浅墨
          mint: '#A8823F',    // 藤黄
          lemon: '#B99A63',   // 描金
          royal: '#9C6B3F',   // 赭石
        },
        // ── 中性色（主题化：亮色=#2B2A28 墨 / 暗色=奶白，靠 CSS 变量翻转）──
        // ink.DEFAULT 既作文字色也作描边色：两种模式下二者取值相同
        ink: {
          DEFAULT: 'var(--ink-line)',
          soft: 'var(--ink-soft)',
          mute: 'var(--ink-mute)',
          faint: 'var(--ink-faint)',
        },
        paper: {
          DEFAULT: 'var(--paper)',
          card: 'var(--paper-card)',
        },
        // 兼容旧代码里的 primary 用法
        primary: {
          DEFAULT: '#9C6B3F',
          dark: '#7A5230',
          lime: '#6D7F6D',
        },
      },
      fontFamily: {
        sans: [
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        serif: [
          '"Songti SC"',
          '"STSong"',
          '"SimSun"',
          'serif',
        ],
      },
      borderRadius: {
        '4xl': '20px',
        '5xl': '24px',
      },
      boxShadow: {
        // 柔和悬浮（卡片静置）
        pop: '0 10px 24px -14px rgba(43,42,40,.22)',
        'pop-lg': '0 24px 50px -22px rgba(43,42,40,.32)',
        // 柔和投影（水墨风格）：细、淡，替代硬边投影
        'block-ink': '0 2px 8px rgba(43,42,40,0.08)',
        'block-ink-lg': '0 6px 18px rgba(43,42,40,0.12)',
        'block-ink-sm': '0 1px 4px rgba(43,42,40,0.06)',
        // 东方色柔和投影
        'block-lime': '0 2px 8px rgba(109,127,109,0.24)',
        'block-magenta': '0 2px 8px rgba(179,67,47,0.22)',
        'block-violet': '0 2px 8px rgba(63,80,104,0.22)',
        'block-cyan': '0 2px 8px rgba(95,125,90,0.24)',
        'block-lemon': '0 2px 8px rgba(185,154,99,0.24)',
        'block-royal': '0 2px 8px rgba(156,107,63,0.24)',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(0deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pop-in': 'pop-in .28s ease both',
        float: 'float 5s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'slide-up': 'slide-up .32s ease both',
      },
      transitionTimingFunction: {
        clash: 'cubic-bezier(.4,0,.2,1)',
      },
    },
  },
  // 与 MUI 共存：关闭 preflight 对 MUI 组件样式的干扰过大部分，保留基础重置
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
