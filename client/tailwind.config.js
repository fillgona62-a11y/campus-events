/** @type {import('tailwindcss').Config} */
// 移动优先断点：sm 640 / md 768 / lg 1024 / xl 1280（Tailwind 默认）
// 视觉基调：撞色（Clash）——高饱和大色块 + 硬边投影 + 四角星装饰
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── 撞色八色板（取自参考图）──────────────────────────────
        clash: {
          lime: '#B2FC06', // 荧光绿
          magenta: '#ED35F9', // 樱珞紫
          violet: '#8A3BEC', // 绀星紫
          cyan: '#81FCFF', // 霁澜青
          haze: '#8DA6D2', // 雾霭蓝
          mint: '#A4E2C6', // 薄荷绿
          lemon: '#F9D77C', // 柔柠黄
          royal: '#012696', // 宝蓝色
        },
        // ── 中性色 ────────────────────────────────────────────
        ink: {
          DEFAULT: '#12121A',
          soft: '#3A3A46',
          mute: '#6B6B7B',
          faint: '#9A9AAB',
        },
        paper: {
          DEFAULT: '#FBFAF7',
          card: '#FFFFFF',
        },
        // 兼容旧代码里的 primary 用法
        primary: {
          DEFAULT: '#012696',
          dark: '#012696',
          lime: '#B2FC06',
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
      },
      borderRadius: {
        '4xl': '28px',
        '5xl': '36px',
      },
      boxShadow: {
        // 柔和悬浮（卡片静置）
        pop: '0 12px 30px -14px rgba(18,18,26,.28)',
        'pop-lg': '0 28px 60px -22px rgba(18,18,26,.40)',
        // 硬边投影（撞色风格：按钮 / 卡片悬浮）
        'block-ink': '4px 4px 0 0 #12121A',
        'block-ink-lg': '6px 6px 0 0 #12121A',
        'block-ink-sm': '2px 2px 0 0 #12121A',
        'block-lime': '4px 4px 0 0 #B2FC06',
        'block-magenta': '4px 4px 0 0 #ED35F9',
        'block-violet': '4px 4px 0 0 #8A3BEC',
        'block-cyan': '4px 4px 0 0 #81FCFF',
        'block-lemon': '4px 4px 0 0 #F9D77C',
        'block-royal': '4px 4px 0 0 #012696',
      },
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(6deg)' },
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
        'pop-in': 'pop-in .28s cubic-bezier(.22,1,.36,1) both',
        float: 'float 5s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        'slide-up': 'slide-up .32s cubic-bezier(.22,1,.36,1) both',
      },
      transitionTimingFunction: {
        clash: 'cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  // 与 MUI 共存：关闭 preflight 对 MUI 组件样式的干扰过大部分，保留基础重置
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
