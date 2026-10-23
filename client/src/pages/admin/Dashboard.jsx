/**
 * 管理后台 - 数据概览：用户数 / 活动数 / 待审核活动 / 报名总数 + 全站近 30 天报名趋势图（F8）。
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { overview, overviewTrend } from '../../api/adminApi';
import TrendChart from '../../components/TrendChart';

const CARDS = [
  { key: 'total_users', label: '注册用户', color: 'text-blue-600' },
  { key: 'total_events', label: '活动总数', color: 'text-green-600' },
  { key: 'pending_events', label: '待审核活动', color: 'text-orange-500' },
  { key: 'total_registrations', label: '报名总数', color: 'text-purple-600' },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [trend, setTrend] = useState({ days: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    overview()
      .then((d) => setStats(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    overviewTrend({ days: 30 })
      .then((d) => setTrend(d))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <CircularProgress />
      </div>
    );
  }
  if (error) {
    return <p className="py-16 text-center text-red-500">{error}</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">数据概览</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDS.map((card) => (
          <div key={card.key} className="rounded-xl bg-white p-5 text-center shadow-sm">
            <p className={`text-3xl font-bold ${card.color}`}>{stats[card.key]}</p>
            <p className="mt-1 text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {stats.pending_events > 0 && (
        <div className="mt-4 rounded-xl bg-orange-50 p-4">
          <p className="text-sm text-orange-700">
            当前有 {stats.pending_events} 个活动等待审核
          </p>
          <Button
            component={Link}
            to="/admin/review"
            variant="contained"
            color="warning"
            size="small"
            sx={{ mt: 1.5 }}
          >
            前往审核
          </Button>
        </div>
      )}

      <div className="mt-4">
        <TrendChart days={trend.days} title={`全站报名趋势（近 ${trend.days.length} 天）`} />
      </div>
    </div>
  );
}
