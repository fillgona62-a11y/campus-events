/**
 * 路由表与守卫装配。
 * 前台：MainLayout（顶栏 + 移动端底部 Tab）；后台：AdminLayout（需管理员）。
 * 路由级代码分割：页面组件一律 React.lazy 按需加载，减小首屏 bundle。
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import ForumLayout from '../layouts/ForumLayout';
import ProtectedRoute from '../components/ProtectedRoute';

// 页面组件懒加载（每个页面独立 chunk，仅访问时下载）
const Home = lazy(() => import('../pages/Home'));
const EventDetail = lazy(() => import('../pages/EventDetail'));
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'));
const PublishEvent = lazy(() => import('../pages/PublishEvent'));
const MyEvents = lazy(() => import('../pages/MyEvents'));
const EventRegistrations = lazy(() => import('../pages/EventRegistrations'));
const MyRegistrations = lazy(() => import('../pages/MyRegistrations'));
const Notifications = lazy(() => import('../pages/Notifications'));
const Profile = lazy(() => import('../pages/Profile'));
const Calendar = lazy(() => import('../pages/Calendar'));
const Privacy = lazy(() => import('../pages/Privacy'));
const Terms = lazy(() => import('../pages/Terms'));
const ForumHome = lazy(() => import('../pages/forum/ForumHome'));
const ForumPostDetail = lazy(() => import('../pages/forum/ForumPostDetail'));
const ForumPublish = lazy(() => import('../pages/forum/ForumPublish'));
const MyForum = lazy(() => import('../pages/forum/MyForum'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const EventReview = lazy(() => import('../pages/admin/EventReview'));
const EventManage = lazy(() => import('../pages/admin/EventManage'));
const UserManage = lazy(() => import('../pages/admin/UserManage'));
const AuditLogs = lazy(() => import('../pages/admin/AuditLogs'));

/** 懒加载页面统一挂 Suspense：切换路由时展示轻量占位，避免白屏 */
function lazyElement(node) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-ink-mute">
      加载中…
    </div>
  );
}

const router = createBrowserRouter([
  { path: '/login', element: lazyElement(<Login />) },
  { path: '/register', element: lazyElement(<Register />) },
  { path: '/forgot-password', element: lazyElement(<ForgotPassword />) },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: lazyElement(<Home />) },
      { path: 'events/:id', element: lazyElement(<EventDetail />) },
      { path: 'calendar', element: lazyElement(<Calendar />) },
      { path: 'privacy', element: lazyElement(<Privacy />) },
      { path: 'terms', element: lazyElement(<Terms />) },
      {
        // 校园论坛：分区布局（读公开）；发帖/编辑/我的需登录
        path: 'forum',
        element: <ForumLayout />,
        children: [
          { index: true, element: lazyElement(<ForumHome />) },
          { path: 'post/:id', element: lazyElement(<ForumPostDetail />) },
          {
            element: <ProtectedRoute />,
            children: [
              { path: 'new', element: lazyElement(<ForumPublish />) },
              { path: 'post/:id/edit', element: lazyElement(<ForumPublish />) },
              { path: 'me', element: lazyElement(<MyForum />) },
            ],
          },
        ],
      },
      {
        // 需登录的页面
        element: <ProtectedRoute />,
        children: [
          { path: 'publish', element: lazyElement(<PublishEvent />) },
          { path: 'events/:id/edit', element: lazyElement(<PublishEvent />) },
          { path: 'my/events', element: lazyElement(<MyEvents />) },
          { path: 'my/events/:id/registrations', element: lazyElement(<EventRegistrations />) },
          { path: 'my/registrations', element: lazyElement(<MyRegistrations />) },
          { path: 'notifications', element: lazyElement(<Notifications />) },
          { path: 'profile', element: lazyElement(<Profile />) },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute admin />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: lazyElement(<Dashboard />) },
          { path: 'review', element: lazyElement(<EventReview />) },
          { path: 'events', element: lazyElement(<EventManage />) },
          { path: 'users', element: lazyElement(<UserManage />) },
          { path: 'audit-logs', element: lazyElement(<AuditLogs />) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
