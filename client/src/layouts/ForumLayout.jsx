/**
 * ForumLayout.jsx — 论坛分区二级布局：论坛内导航（首页/我的 + 发帖按钮）+ <Outlet/>。
 *
 * 全局 chrome（顶栏 AppBar / 底部 Tab / 页脚）由外层 MainLayout 提供，这里不重复渲染。
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import { useAuthStore } from '../store/authStore';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';

const TABS = [
  { label: '首页', value: '/forum' },
  { label: '我的', value: '/forum/me' },
];

/** Tab 激活判定：/forum 精确匹配（避免 /forum/new 也点亮「首页」） */
function isActive(pathname, value) {
  if (value === '/forum') return pathname === '/forum';
  return pathname.startsWith(value);
}

export default function ForumLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);

  // 未登录点发帖 → 登录页并记录来源，登录后跳回 /forum/new
  const handlePublish = () => {
    if (!token) {
      navigate('/login', { state: { from: '/forum/new' } });
      return;
    }
    navigate('/forum/new');
  };

  return (
    <div>
      <div className="clash-card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <ClashStar size={20} style={{ color: CLASH.magenta }} />
          <h1 className="text-lg font-extrabold tracking-tight text-ink">校园论坛</h1>
          <div className="flex-1" />
          <Button
            variant="contained"
            onClick={handlePublish}
            sx={{
              backgroundColor: CLASH.lime,
              color: CLASH.ink,
              fontWeight: 800,
              boxShadow: '3px 3px 0 0 var(--ink-line)',
              '&:hover': {
                backgroundColor: CLASH.lime,
                transform: 'translate(-1px,-1px)',
                boxShadow: '4px 4px 0 0 var(--ink-line)',
              },
              '&:active': {
                transform: 'translate(2px,2px)',
                boxShadow: '1px 1px 0 0 var(--ink-line)',
              },
            }}
          >
            发帖
          </Button>
        </div>
        <ClashStripe className="my-3" />
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const active = isActive(location.pathname, tab.value);
            return (
              <Button
                key={tab.value}
                component={Link}
                to={tab.value}
                className={active ? 'on-clash' : undefined}
                sx={{
                  minHeight: 44,
                  px: 3,
                  borderRadius: 12,
                  fontWeight: 800,
                  color: active ? CLASH.ink : 'var(--ink-line)',
                  border: '2px solid var(--ink-line)',
                  backgroundColor: active ? CLASH.lime : 'transparent',
                  boxShadow: active ? '3px 3px 0 0 var(--ink-line)' : 'none',
                  '&:hover': {
                    backgroundColor: active ? CLASH.lime : 'rgba(178,252,6,0.22)',
                  },
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>
      <Outlet />
    </div>
  );
}
