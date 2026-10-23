/**
 * 活动卡片：封面、标题、分类、时间地点、剩余名额、立即报名入口。
 */
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { useNavigate } from 'react-router-dom';
import { formatTimeRange, remainingText, isFull, isSignupClosed } from '../utils/format';

export default function EventCard({ event }) {
  const navigate = useNavigate();
  const full = isFull(event);
  const closed = isSignupClosed(event);

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-lg"
      onClick={() => navigate(`/events/${event.id}`)}
    >
      {event.cover_url ? (
        <img
          src={event.cover_url}
          alt={event.title}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 text-4xl font-bold text-blue-400">
          {event.title?.slice(0, 1) || '活'}
        </div>
      )}
      <CardContent className="pb-2">
        <div className="mb-1 flex items-center gap-2">
          {event.category_name && (
            <Chip label={event.category_name} size="small" color="primary" variant="outlined" />
          )}
          <span className={`text-xs ${full ? 'text-red-500' : 'text-green-600'}`}>
            {closed ? '报名已截止' : full ? '名额已满' : remainingText(event)}
          </span>
        </div>
        <h3 className="mb-1 line-clamp-1 text-base font-semibold">{event.title}</h3>
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <ScheduleIcon sx={{ fontSize: 14 }} />
          {formatTimeRange(event.start_time, event.end_time)}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
          <PlaceIcon sx={{ fontSize: 14 }} />
          {event.location}
        </p>
      </CardContent>
      <CardActions className="px-4 pb-3 pt-0">
        <Button
          fullWidth
          variant="contained"
          size="small"
          disabled={full || closed}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/events/${event.id}`);
          }}
          sx={{ minHeight: 40 }}
        >
          {closed ? '已截止' : full ? '名额已满' : '立即报名'}
        </Button>
      </CardActions>
    </Card>
  );
}
