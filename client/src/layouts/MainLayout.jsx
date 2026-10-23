/**
 * 前台主布局：顶栏（Logo + 导航 + 用户菜单/通知角标）+ 内容区 + 移动端底部 Tab。
 */
import { useEffect, useState } from 'react';
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
import { me } from '../api/authApi';
import BottomNav from '../components/BottomNav';

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, setUser, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState(null);

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

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar position="sticky" color="primary">
        <Toolbar className="mx-auto w-full max-w-[1200px] gap-2 px-3">
          <Link to="/" className="mr-2 text-lg font-bold text-white no-underline">
            校园活动
          </Link>
          <div className="hidden gap-1 md:flex">
            <Button color="inherit" component={Link} to="/">
              首页
            </Button>
            {token && (
              <>
                <Button color="inherit" component={Link} to="/publish">
                  发布活动
                </Button>
                <Button color="inherit" component={Link} to="/my/events">
                  我的活动
                </Button>
              </>
            )}
          </div>
          <div className="flex-1" />
          {token ? (
            <>
              <IconButton
                color="inherit"
                onClick={() => navigate('/notifications')}
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
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: 14 }}>
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
                {user?.role === 'admin' && (
                  <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin'); }}>
                    管理后台
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>退出登录</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex gap-1">
              <Button color="inherit" component={Link} to="/login">
                登录
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                component={Link}
                to="/register"
                size="small"
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

      {/* 页脚：法务入口（F9） */}
      <footer className="border-t bg-white py-4 pb-28 md:pb-4">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 text-xs text-gray-400">
          <span>校园活动报名系统</span>
          <Link to="/privacy" className="no-underline hover:text-gray-600">
            隐私政策
          </Link>
          <Link to="/terms" className="no-underline hover:text-gray-600">
            用户协议
          </Link>
        </div>
      </footer>

      {/* 移动端底部 Tab */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}
