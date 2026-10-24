/**
 * BottomNav.jsx — 移动端底部固定 Tab 栏（撞色风格）
 *
 * 视觉要点：
 *   1. 选中态由 theme.js 负责（荧光绿底 + 墨边 + 硬投影），这里额外做：
 *      · 选中图标带弹跳动画（animate-pop-in），切换 Tab 时用 key 重新触发
 *      · 选中文字加粗，未选中文字与图标弱化（降透明度）
 *   2. 适配全面屏底部安全区（env(safe-area-inset-bottom)），避免被 Home 条遮挡
 *   3. 顶部加一条撞色分隔线，与页面上方内容区衔接
 */
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import ForumIcon from '@mui/icons-material/Forum';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import Paper from '@mui/material/Paper';
import { useLocation, useNavigate } from 'react-router-dom';
import { CLASH } from '../theme';

const TABS = [
  { label: '首页', value: '/', icon: <HomeIcon /> },
  { label: '论坛', value: '/forum', icon: <ForumIcon /> },
  { label: '我的报名', value: '/my/registrations', icon: <AssignmentIcon /> },
  { label: '我的', value: '/profile', icon: <PersonIcon /> },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const current =
    TABS.find((tab) =>
      tab.value === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.value)
    )?.value ?? '';

  return (
    <Paper
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      elevation={0}
      sx={{
        borderTop: '2px solid var(--ink-line)',
        borderRadius: 0,
        backgroundColor: 'var(--paper-card)',
        // 全面屏安全区：底部 Home 条之上再留 4px 呼吸位
        paddingBottom: 'max(env(safe-area-inset-bottom), 4px)',
      }}
    >
      <BottomNavigation
        value={current}
        onChange={(e, newValue) => navigate(newValue)}
        showLabels
        sx={{ backgroundColor: 'transparent' }}
      >
        {TABS.map((tab) => {
          const selected = current === tab.value;
          return (
            <BottomNavigationAction
              key={tab.value}
              label={tab.label}
              value={tab.value}
              // key 随选中态变化，触发图标重新挂载从而重放弹跳动画
              icon={
                <span
                  key={`${tab.value}-${selected ? 'on' : 'off'}`}
                  className={`inline-flex items-center justify-center ${
                    selected ? 'animate-pop-in' : ''
                  }`}
                >
                  {tab.icon}
                </span>
              }
              sx={{
                minHeight: 60,
                minWidth: 84,
                color: CLASH.ink,
                // 未选中：整体弱化；选中：加粗 + 墨边 + 硬投影
                opacity: selected ? 1 : 0.55,
                '& .MuiBottomNavigationAction-label': {
                  fontWeight: selected ? 800 : 500,
                  transition: 'font-weight .2s ease',
                },
                '&.Mui-selected': {
                  backgroundColor: CLASH.lime,
                  color: CLASH.ink,
                  border: '2px solid var(--ink-line)',
                  boxShadow: '3px 3px 0 0 var(--ink-line)',
                  opacity: 1,
                },
                '&.Mui-selected:hover': {
                  backgroundColor: CLASH.lime,
                  boxShadow: '4px 4px 0 0 var(--ink-line)',
                },
              }}
            />
          );
        })}
      </BottomNavigation>
    </Paper>
  );
}
