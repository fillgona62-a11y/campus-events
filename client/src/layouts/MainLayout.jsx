/**
 * 前台主布局：顶栏（Logo + 导航 + 用户菜单/通知角标）+ 内容区 + 移动端底部 Tab。
 *
 * 视觉：顶栏纸色毛玻璃、简洁文字 Logo、清爽导航 hover、克制配色。
 */
import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Avatar from '@mui/material/Avatar';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuthStore } from '../store/authStore';
import { isAdmin } from '../utils/role';
import { me } from '../api/authApi';
import BottomNav from '../components/BottomNav';
import ThemeToggle from '../components/ThemeToggle';
import { CLASH } from '../theme';

/** 桌面导航项：清爽 hover 反馈 */
const navSx = {
  color: CLASH.ink,
  fontWeight: 500,
  borderRadius: 8,
  '&:hover': {
    backgroundColor: 'rgba(156,107,63,0.08)',
    color: '#9c6b3f',
  },
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, setUser, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);
  // 上次未读数
  const lastUnreadRef = useRef(null);

  // 活动详情页自带底部固定报名栏，隐藏全局底部 Tab 避免遮挡
  const hideBottomNav = /^\/events\/\d+$/.test(location.pathname);

  // 登录状态下进入前台时刷新用户信息（含未读通知数）
  useEffect(() => {
    if (token) {
      me()
        .then((data) => setUser(data.user))
        .catch(() => {});
    }
  }, [token, setUser]);

  // 桌面通知：登录后每 60 秒轮询未读数，有新增则弹系统通知
  useEffect(() => {
    if (!token) {
      lastUnreadRef.current = null;
      return;
    }
    // 首次记录基线，避免登录即弹历史未读
    if (lastUnreadRef.current === null) {
      lastUnreadRef.current = user?.unread_count ?? 0;
    }
    const timer = setInterval(() => {
      me()
        .then((data) => {
          const prev = lastUnreadRef.current ?? 0;
          const curr = data.user?.unread_count ?? 0;
          setUser(data.user);
          if (curr > prev && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('校园活动报名系统', {
              body: `你有 ${curr - prev} 条新通知，点击查看`,
            }).onclick = () => navigate('/notifications');
          }
          lastUnreadRef.current = curr;
        })
        .catch(() => {});
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [token, setUser, navigate, user?.unread_count]);

  // 请求通知权限（用户点击通知图标时触发，避免一进来就弹权限框）
  const handleNotificationClick = () => {
    navigate('/notifications');
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* 顶栏：纸色毛玻璃（AppBar 默认样式已在 theme 中配置） */}
      <AppBar position="sticky" color="default">
        <Toolbar className="mx-auto w-full max-w-[1200px] gap-2 px-3">
          {/* Logo：简洁文字标 */}
          <Link to="/" className="mr-2 flex items-center gap-2 no-underline">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: '#9c6b3f' }}
              aria-hidden="true"
            >
              <span className="text-base font-semibold">校</span>
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink">校园活动</span>
          </Link>

          <div className="hidden gap-1 md:flex">
            <Button color="inherit" component={Link} to="/" sx={navSx}>
              首页
            </Button>
            {/* 论坛入口：公开可见（放在登录态条件块之外） */}
            <Button color="inherit" component={Link} to="/forum" sx={navSx}>
              论坛
            </Button>
            {token && (
              <>
                <Button color="inherit" component={Link} to="/publish" sx={navSx}>
                  发布活动
                </Button>
                <Button color="inherit" component={Link} to="/my/events" sx={navSx}>
                  我的活动
                </Button>
              </>
            )}
          </div>
          <div className="flex-1" />
          <ThemeToggle />

          {token ? (
            <>
              <IconButton
                color="inherit"
                onClick={handleNotificationClick}
                aria-label="站内通知"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <Badge badgeContent={user?.unread_count || 0} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                aria-label="用户菜单"
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#9c6b3f',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.slice(0, 1) || '我'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/profile'); }}>
                  个人资料
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/my/registrations'); }}>
                  我的报名
                </MenuItem>
                <MenuItem onClick={() => { setAnchorEl(null); navigate('/my/events'); }}>
                  我的活动
                </MenuItem>
                {isAdmin(user?.role) && (
                  <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin'); }}>
                    管理后台
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>退出登录</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex gap-1.5">
              <Button
                variant="outlined"
                component={Link}
                to="/login"
                sx={{ color: 'var(--ink-line)', fontWeight: 500 }}
              >
                登录
              </Button>
              <Button
                variant="contained"
                component={Link}
                to="/register"
                sx={{ fontWeight: 600 }}
              >
                注册
              </Button>
            </div>
          )}
        </Toolbar>
      </AppBar>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-3 py-4 pb-24 md:pb-8">
        <Outlet />
      </main>

      {/* 页脚：简洁分隔 + 法务入口 */}
      <footer className="border-t border-ink/8 bg-paper-card pb-28 pt-0 md:pb-4">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 py-5 text-xs text-ink-mute">
          <span className="font-medium text-ink-soft">校园活动报名系统</span>
          <Link
            to="/privacy"
            className="no-underline transition-colors hover:text-ink"
          >
            隐私政策
          </Link>
          <Link
            to="/terms"
            className="no-underline transition-colors hover:text-ink"
          >
            用户协议
          </Link>
        </div>
      </footer>

      {/* 移动端底部 Tab */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
