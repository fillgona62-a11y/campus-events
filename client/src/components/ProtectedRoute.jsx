/**
 * 路由守卫：admin=true 时需管理员；否则只需登录。未满足则跳转登录页/首页。
 */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { isAdmin } from '../utils/role';

export default function ProtectedRoute({ admin = false }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (admin && !isAdmin(user?.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
