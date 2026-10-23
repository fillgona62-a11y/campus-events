/**
 * axios 实例：baseURL='/api/v1'，请求拦截注入 JWT，
 * 响应拦截统一解包 {code,message,data}：code≠0 抛错（message 供 Snackbar 展示），
 * HTTP 401 清除登录态并跳转登录页。
 */
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
});

// 请求拦截：注入 JWT
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截：统一解包与错误处理
client.interceptors.response.use(
  (response) => {
    const body = response.data;
    // CSV 等二进制/文本下载直接返回原始 body
    if (body instanceof Blob) return body;
    if (body && typeof body.code !== 'undefined') {
      if (body.code === 0) return body.data;
      return Promise.reject(new Error(body.message || '请求失败'));
    }
    return body;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || '网络错误，请稍后重试';
    if (status === 401) {
      // token 失效：清除登录态并跳转登录页
      useAuthStore.getState().logout();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(new Error(message));
  }
);

export default client;
