/**
 * 首页：活动卡片流 + 搜索 + 分类筛选 + 分页。
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { listEvents, listCategories } from '../api/eventApi';
import EventCard from '../components/EventCard';
import CategoryNav from '../components/CategoryNav';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const PAGE_SIZE = 12;

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCategories()
      .then((d) => setCategories(d.list))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    listEvents({
      keyword: keyword || undefined,
      category_id: categoryId || undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((d) => setData(d))
      .catch(() => setData({ list: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [keyword, categoryId, page]);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <SearchBar onSearch={(v) => { setKeyword(v); setPage(1); }} />
        <Button
          variant="outlined"
          startIcon={<CalendarMonthIcon />}
          onClick={() => navigate('/calendar')}
          sx={{ minHeight: 44, whiteSpace: 'nowrap' }}
        >
          日历
        </Button>
      </div>
      <CategoryNav
        categories={categories}
        value={categoryId}
        onChange={(id) => { setCategoryId(id); setPage(1); }}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无进行中的活动" />
      ) : (
        <>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.list.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          {data.total > PAGE_SIZE && (
            <div className="mt-6 flex justify-center">
              <Pagination
                count={Math.ceil(data.total / PAGE_SIZE)}
                page={page}
                onChange={(e, p) => setPage(p)}
                color="primary"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
