/** @type {import('tailwindcss').Config} */
// 移动优先断点：sm 640 / md 768 / lg 1024 / xl 1280（Tailwind 默认）
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976d2',
          dark: '#1565c0',
        },
      },
    },
  },
  // 与 MUI 共存：关闭 preflight 对 MUI 组件样式的干扰过大部分，保留基础重置
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
