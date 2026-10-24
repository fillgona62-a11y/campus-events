/**
 * 管理后台布局：桌面侧边栏 / 移动端抽屉导航 + 内容区。
 *
 * 视觉：后台保持克制 —— 侧边栏选中项撞色高亮 + 硬投影，标题栏加撞色点缀（色块 + 四角星）。
 */
import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RateReviewIcon from '@mui/icons-material/RateReview';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';

const NAV_ITEMS = [
  { label: '数据概览', path: '/admin', icon: <DashboardIcon /> },
  { label: '活动审核', path: '/admin/review', icon: <RateReviewIcon /> },
  { label: '活动管理', path: '/admin/events', icon: <EventNoteIcon /> },
  { label: '用户管理', path: '/admin/users', icon: <PeopleIcon /> },
  { label: '操作日志', path: '/admin/audit-logs', icon: <HistoryIcon /> },
];

const DRAWER_WIDTH = 220;

function NavList({ onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const go = (path) => {
    navigate(path);
    onNavigate && onNavigate();
  };
  return (
    <List>
      {NAV_ITEMS.map((item) => {
        const selected =
          item.path === '/admin'
            ? location.pathname === '/admin'
            : location.pathname.startsWith(item.path);
        return (
          <ListItemButton
            key={item.path}
            selected={selected}
            onClick={() => go(item.path)}
            sx={{
              mx: 1,
              my: 0.5,
              borderRadius: 12,
              minHeight: 44,
              fontWeight: 700,
              // 选中项：撞色高亮 + 硬投影（克制的单色块，不铺满整条）
              '&.Mui-selected': {
                backgroundColor: CLASH.lime,
                color: CLASH.ink,
                boxShadow: '3px 3px 0 0 #12121A',
                '&:hover': { backgroundColor: CLASH.lime },
              },
              '&.Mui-selected .MuiListItemIcon-root': { color: CLASH.ink },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        );
      })}
    </List>
  );
}

/** 侧边栏顶部品牌区：撞色方块 + 四角星 */
function Brand() {
  return (
    <div className="flex h-14 items-center justify-center gap-2 border-b-2 border-ink">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink"
        style={{ backgroundColor: CLASH.cyan }}
        aria-hidden="true"
      >
        <ClashStar size={15} style={{ color: CLASH.ink }} />
      </span>
      <span className="font-extrabold text-ink">管理后台</span>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* 桌面端固定侧边栏 */}
      <Drawer
        variant="permanent"
        className="hidden md:block"
        sx={{
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
        PaperProps={{ className: 'hidden md:block' }}
      >
        <Brand />
        <NavList />
      </Drawer>

      {/* 移动端抽屉 */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        className="md:hidden"
        sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
      >
        <Brand />
        <NavList onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className="min-w-0 flex-1">
        {/* 标题栏：撞色点缀（色块 + 四角星） */}
        <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: '2px solid #12121A' }}>
          <Toolbar className="gap-2">
            <IconButton
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="打开菜单"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <MenuIcon />
            </IconButton>
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-ink"
              style={{ backgroundColor: CLASH.lime }}
              aria-hidden="true"
            >
              <ClashStar size={13} style={{ color: CLASH.ink }} />
            </span>
            <span className="font-extrabold text-ink">校园活动 · 管理后台</span>
            <div className="flex-1" />
            <IconButton component={Link} to="/" aria-label="返回前台" sx={{ minWidth: 44, minHeight: 44 }}>
              <ArrowBackIcon />
            </IconButton>
          </Toolbar>
          <ClashStripe />
        </AppBar>
        <main className="mx-auto w-full max-w-[1200px] p-3 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
