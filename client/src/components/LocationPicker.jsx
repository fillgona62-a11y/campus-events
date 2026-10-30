/**
 * LocationPicker.jsx — 活动地点坐标选择器。
 *
 * 优先使用高德地图 JS API 进行地图选点；当未配置 AMAP_KEY 时，
 * 退化为「手动输入经纬度 + 一键获取当前位置」的方式，保证功能始终可用。
 *
 * 使用前在高德开放平台申请 Web 端（JS API）Key，填入下方 AMAP_KEY 常量。
 */
import { useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import MyLocationIcon from '@mui/icons-material/MyLocation';

// TODO: 替换为你的高德地图 Web 端 JS API Key（https://lbs.amap.com 申请，免费）
const AMAP_KEY = '';

export default function LocationPicker({ lat, lng, onPick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [useMap, setUseMap] = useState(false);
  const [manualLat, setManualLat] = useState(lat != null ? String(lat) : '');
  const [manualLng, setManualLng] = useState(lng != null ? String(lng) : '');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // 加载高德地图脚本
  useEffect(() => {
    if (!AMAP_KEY) return;
    if (window.AMap) {
      initMap();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    script.async = true;
    script.onload = () => initMap();
    document.head.appendChild(script);
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initMap = () => {
    if (!window.AMap || !mapRef.current) return;
    const center = lat != null && lng != null ? [lng, lat] : [116.397, 39.909]; // 默认北京
    const map = new window.AMap.Map(mapRef.current, {
      zoom: 15,
      center,
    });
    mapInstanceRef.current = map;
    setUseMap(true);

    // 初始标记
    if (lat != null && lng != null) {
      markerRef.current = new window.AMap.Marker({ position: [lng, lat] });
      map.add(markerRef.current);
    }

    // 点击地图选点
    map.on('click', (e) => {
      const { lng: clng, lat: clat } = e.lnglat;
      if (markerRef.current) map.remove(markerRef.current);
      markerRef.current = new window.AMap.Marker({ position: [clng, clat] });
      map.add(markerRef.current);
      onPick(clat, clng);
      setManualLat(String(clat.toFixed(6)));
      setManualLng(String(clng.toFixed(6)));
    });
  };

  // 一键获取当前位置（浏览器定位）
  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocError('当前浏览器不支持定位');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onPick(latitude, longitude);
        setManualLat(String(latitude.toFixed(6)));
        setManualLng(String(longitude.toFixed(6)));
        // 地图模式则移动标记
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter([longitude, latitude]);
          if (markerRef.current) mapInstanceRef.current.remove(markerRef.current);
          markerRef.current = new window.AMap.Marker({ position: [longitude, latitude] });
          mapInstanceRef.current.add(markerRef.current);
        }
        setLocating(false);
      },
      (err) => {
        setLocError('定位失败，请检查定位权限后重试');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // 手动输入经纬度
  const handleManual = (field, value) => {
    const v = value;
    if (field === 'lat') {
      setManualLat(v);
      const n = parseFloat(v);
      if (!Number.isNaN(n) && n >= -90 && n <= 90) onPick(n, lng != null ? lng : parseFloat(manualLng));
    } else {
      setManualLng(v);
      const n = parseFloat(v);
      if (!Number.isNaN(n) && n >= -180 && n <= 180) onPick(lat != null ? lat : parseFloat(manualLat), n);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-ink-soft">签到地点坐标（用于定位签到）</span>
        <Button
          size="small"
          variant="outlined"
          startIcon={<MyLocationIcon />}
          onClick={handleLocate}
          disabled={locating}
        >
          {locating ? '定位中…' : '定位当前位置'}
        </Button>
      </div>

      {locError && <Alert severity="warning">{locError}</Alert>}

      {AMAP_KEY && (
        <div
          ref={mapRef}
          className="h-56 w-full overflow-hidden rounded-xl border border-ink/10"
          style={{ display: useMap ? 'block' : 'none' }}
        />
      )}

      {!AMAP_KEY && (
        <Alert severity="info">
          尚未配置高德地图 Key，可先手动输入经纬度，或点击「定位当前位置」自动获取。配置地图选点见代码中 AMAP_KEY。
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3">
        <TextField
          fullWidth
          label="纬度（lat）"
          value={manualLat}
          onChange={(e) => handleManual('lat', e.target.value)}
          placeholder="如 39.909187"
          inputProps={{ inputMode: 'decimal' }}
        />
        <TextField
          fullWidth
          label="经度（lng）"
          value={manualLng}
          onChange={(e) => handleManual('lng', e.target.value)}
          placeholder="如 116.397451"
          inputProps={{ inputMode: 'decimal' }}
        />
      </div>

      {(lat == null || lng == null) && (
        <p className="text-xs text-ink-mute">
          未设置坐标时，学生将无法使用定位签到（只能由组织者手动录入）。
        </p>
      )}
    </div>
  );
}
