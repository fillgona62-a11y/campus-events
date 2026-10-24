import React from 'react';
import ReactDOM from 'react-dom/client';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import { ThemeModeProvider } from './theme/ThemeModeProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
        <App />
      </LocalizationProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);

// PWA（F10）：生产环境注册 service worker（开发期不注册，避免缓存干扰热更新）
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW 注册失败不影响正常使用（如浏览器不支持或非安全上下文）
    });
  });
}
