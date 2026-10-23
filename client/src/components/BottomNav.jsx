/**
 * 移动端底部固定 Tab 栏：首页 / 我的报名 / 我的。适配全面屏安全区。
 */
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeIcon from '@mui/icons-material/Home';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PersonIcon from '@mui/icons-material/Person';
import Paper from '@mui/material/Paper';
import { useLocation, useNavigate } from 'react-router-dom';

const TABS = [
  { label: '首页', value: '/', icon: <HomeIcon /> },
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
      elevation={8}
      sx={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <BottomNavigation
        value={current}
        onChange={(e, newValue) => navigate(newValue)}
        showLabels
      >
        {TABS.map((tab) => (
          <BottomNavigationAction
            key={tab.value}
            label={tab.label}
            value={tab.value}
            icon={tab.icon}
            sx={{ minHeight: 56 }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
