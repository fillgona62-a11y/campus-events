/**
 * 全局认证状态（zustand + persist）：token 与当前用户持久化到 localStorage。
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      /** 登录/注册成功后写入 */
      setAuth: (token, user) => set({ token, user }),
      /** 刷新用户信息（如资料更新、未读数变化） */
      setUser: (user) => set({ user }),
      /** 退出登录 */
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'campus-events-auth' }
  )
);

/** 是否已登录 */
export const selectIsLoggedIn = (state) => Boolean(state.token);
/** 是否管理员 */
export const selectIsAdmin = (state) => state.user?.role === 'admin';
