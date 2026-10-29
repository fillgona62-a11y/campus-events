import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发环境将 /api 与 /uploads 代理到后端（默认 3000 端口）
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // 手动分包：把体积大、更新不频繁的第三方库拆成独立 chunk，
    // 与业务代码（随功能迭代频繁变化）分离，提升长缓存命中率与首屏加载。
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          vendor: ['axios', 'zustand', 'dayjs', 'qrcode'],
        },
      },
    },
  },
});
