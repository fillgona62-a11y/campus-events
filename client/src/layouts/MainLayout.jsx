/**
 * 前台主布局：顶栏（撞色 Logo + 导航 + 用户菜单/通知角标）+ 内容区 + 移动端底部 Tab。
 *
 * 视觉：
 *   1. 顶栏用 theme 已设好的纸色毛玻璃（AppBar 默认样式）
 *   2. Logo 左侧加撞色方块 + 四角星图标，文字用 clash-text-gradient
 *   3. 桌面导航项 hover 有撞色反馈；未登录「登录」描边、「注册」实心荧光绿
 *   4. 页脚加撞色细条 ClashStripe，法务链接 hover 有颜色变化
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
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import ThemeToggle from '../components/ThemeToggle';
import { CLASH } from '../theme';

/** 桌面导航项：撞色 hover 反馈 */
const navSx = {
  color: CLASH.ink,
  fontWeight: 700,
  borderRadius: 12,
  '&:hover': {
    backgroundColor: 'rgba(178,252,6,0.35)',
    color: CLASH.ink,
  },
};

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
      {/* 顶栏：纸色毛玻璃（AppBar 默认样式已在 theme 中配置） */}
      <AppBar position="sticky" color="default">
        <Toolbar className="mx-auto w-full max-w-[1200px] gap-2 px-3">
          {/* Logo：撞色方块 + 四角星 */}
          <Link to="/" className="mr-2 flex items-center gap-2 no-underline">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink shadow-block-ink-sm"
              style={{ backgroundColor: CLASH.lime }}
              aria-hidden="true"
            >
              <ClashStar size={18} style={{ color: CLASH.ink }} />
            </span>
            <span className="clash-text-gradient text-lg font-extrabold tracking-tight">校园活动</span>
          </Link>

          <div className="hidden gap-1 md:flex">
            <Button color="inherit" component={Link} to="/" sx={navSx}>
              首页
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
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: CLASH.lime,
                    color: CLASH.ink,
                    fontSize: 14,
                    fontWeight: 800,
                    border: '2px solid var(--ink-line)',
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
                {user?.role === 'admin' && (
                  <MenuItem onClick={() => { setAnchorEl(null); navigate('/admin'); }}>
                    管理后台
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>退出登录</MenuItem>
              </Menu>
            </>
          ) : (
            <div className="flex gap-1.5">
              {/* 登录：描边（次要）；注册：实心荧光绿（主行动） */}
              <Button
                variant="outlined"
                component={Link}
                to="/login"
                sx={{ borderColor: CLASH.ink, color: CLASH.ink, fontWeight: 700 }}
              >
                登录
              </Button>
              <Button
                variant="contained"
                component={Link}
                to="/register"
                sx={{
                  backgroundColor: CLASH.lime,
                  color: CLASH.ink,
                  fontWeight: 800,
                  boxShadow: '3px 3px 0 0 var(--ink-line)',
                  '&:hover': { backgroundColor: CLASH.lime, transform: 'translate(-1px,-1px)', boxShadow: '4px 4px 0 0 var(--ink-line)' },
                  '&:active': { transform: 'translate(2px,2px)', boxShadow: '1px 1px 0 0 var(--ink-line)' },
                }}
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

      {/* 页脚：撞色细条 + 法务入口（F9） */}
      <footer className="bg-paper-card pb-28 pt-0 md:pb-4">
        <ClashStripe />
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-3 py-4 text-xs text-ink-mute">
          <span className="font-bold text-ink-soft">校园活动报名系统</span>
          <Link
            to="/privacy"
            className="no-underline transition-colors hover:text-clash-violet"
          >
            隐私政策
          </Link>
          <Link
            to="/terms"
            className="no-underline transition-colors hover:text-clash-violet"
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
