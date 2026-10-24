/**
 * 路由表与守卫装配。
 * 前台：MainLayout（顶栏 + 移动端底部 Tab）；后台：AdminLayout（需管理员）。
 */
import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';
import Home from '../pages/Home';
import EventDetail from '../pages/EventDetail';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import PublishEvent from '../pages/PublishEvent';
import MyEvents from '../pages/MyEvents';
import EventRegistrations from '../pages/EventRegistrations';
import CheckIn from '../pages/CheckIn';
import MyRegistrations from '../pages/MyRegistrations';
import Notifications from '../pages/Notifications';
import Profile from '../pages/Profile';
import Calendar from '../pages/Calendar';
import Privacy from '../pages/Privacy';
import Terms from '../pages/Terms';
import ForumLayout from '../layouts/ForumLayout';
import ForumHome from '../pages/forum/ForumHome';
import ForumPostDetail from '../pages/forum/ForumPostDetail';
import ForumPublish from '../pages/forum/ForumPublish';
import MyForum from '../pages/forum/MyForum';
import Dashboard from '../pages/admin/Dashboard';
import EventReview from '../pages/admin/EventReview';
import EventManage from '../pages/admin/EventManage';
import UserManage from '../pages/admin/UserManage';
import AuditLogs from '../pages/admin/AuditLogs';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'events/:id', element: <EventDetail /> },
      { path: 'calendar', element: <Calendar /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      {
        // 校园论坛：分区布局（读公开）；发帖/编辑/我的需登录
        path: 'forum',
        element: <ForumLayout />,
        children: [
          { index: true, element: <ForumHome /> },
          { path: 'post/:id', element: <ForumPostDetail /> },
          {
            element: <ProtectedRoute />,
            children: [
              { path: 'new', element: <ForumPublish /> },
              { path: 'post/:id/edit', element: <ForumPublish /> },
              { path: 'me', element: <MyForum /> },
            ],
          },
        ],
      },
      {
        // 需登录的页面
        element: <ProtectedRoute />,
        children: [
          { path: 'publish', element: <PublishEvent /> },
          { path: 'events/:id/edit', element: <PublishEvent /> },
          { path: 'my/events', element: <MyEvents /> },
          { path: 'my/events/:id/registrations', element: <EventRegistrations /> },
          { path: 'my/events/:id/checkin', element: <CheckIn /> },
          { path: 'my/registrations', element: <MyRegistrations /> },
          { path: 'notifications', element: <Notifications /> },
          { path: 'profile', element: <Profile /> },
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
          { index: true, element: <Dashboard /> },
          { path: 'review', element: <EventReview /> },
          { path: 'events', element: <EventManage /> },
          { path: 'users', element: <UserManage /> },
          { path: 'audit-logs', element: <AuditLogs /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export default router;
