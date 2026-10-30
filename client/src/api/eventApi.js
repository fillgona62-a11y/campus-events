/**
 * 活动 API：分类、列表、详情、发布/编辑/取消、我发布的、名单与导出、报名、封面上传。
 */
import client from './client';

/** 分类列表 → {list} */
export function listCategories() {
  return client.get('/categories');
}

/** 公开活动列表：{keyword?, category_id?, start_from?, start_to?, page, page_size} */
export function listEvents(params) {
  return client.get('/events', { params });
}

/** 热门活动：{limit?} → {list} */
export function listHotEvents(params) {
  return client.get('/events/hot', { params });
}

/** 活动评价列表→ {summary:{count,avg}, list} */
export function listReviews(id) {
  return client.get(`/events/${id}/reviews`);
}

/** 我的评价→ {review|null} */
export function myReview(id) {
  return client.get(`/events/${id}/my-review`);
}

/** 提交评价：{rating, content?} */
export function submitReview(id, data) {
  return client.post(`/events/${id}/review`, data);
}

/** 活动详情 → {event, my_registration} */
export function getEvent(id) {
  return client.get(`/events/${id}`);
}

/** 发布活动 */
export function createEvent(data) {
  return client.post('/events', data);
}

/** 编辑活动（全量） */
export function updateEvent(id, data) {
  return client.put(`/events/${id}`, data);
}

/** 取消活动 */
export function cancelEvent(id) {
  return client.post(`/events/${id}/cancel`);
}

/** 我发布的活动 */
export function myEvents(params) {
  return client.get('/my/events', { params });
}

/** 活动报名名单：{status?, checked_in?: 0|1, page, page_size} */
export function listRegistrations(id, params) {
  return client.get(`/events/${id}/registrations`, { params });
}

/** 单活动报名趋势：{days?} → {days:[{date,count}], total} */
export function registrationsTrend(id, params) {
  return client.get(`/events/${id}/registrations/trend`, { params });
}

/** 导出报名名单 CSV（触发浏览器下载；JWT 由请求拦截器自动注入） */
export async function exportRegistrations(id) {
  const response = await client.get(`/events/${id}/registrations/export`, {
    responseType: 'blob',
  });
  const blob = response instanceof Blob ? response : new Blob([response]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `event_${id}_registrations.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** 报名活动：{remark?} */
export function registerEvent(id, remark) {
  return client.post(`/events/${id}/register`, { remark });
}

/** 上传封面图（multipart）→ {url} */
export function uploadCover(file) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/**
 * 压缩图片后上传封面（前端 Canvas 压缩，手机大图也能快速上传）。
 * 超过 2MB 的图片先等比压缩到最长边 1600px、质量 0.8，仍超限再降质量。
 * @param {File} file 原始图片文件
 * @returns {Promise<{url:string}>}
 */
export async function uploadCoverCompressed(file) {
  const MAX_MB = 2;
  const needCompress = file.size > MAX_MB * 1024 * 1024;
  if (!needCompress) return uploadCover(file);

  const compressed = await compressImage(file, 1600, 0.8);
  // 压缩后仍超限则进一步降尺寸
  if (compressed.size > MAX_MB * 1024 * 1024) {
    const smaller = await compressImage(file, 1024, 0.7);
    return uploadCover(smaller);
  }
  return uploadCover(compressed);
}

/** 用 Canvas 等比压缩图片，返回新 File */
function compressImage(file, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error('图片压缩失败'));
          const ext = (file.type === 'image/png' && file.size < 5 * 1024 * 1024) ? 'png' : 'jpeg';
          resolve(new File([blob], file.name.replace(/\.\w+$/, `.${ext === 'png' ? 'png' : 'jpg'}`), { type: `image/${ext}` }));
        },
        `image/${file.type === 'image/png' ? 'png' : 'jpeg'}`,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片读取失败'));
    };
    img.src = url;
  });
}

// ===== 签到核销=====

/** 定位签到（组织者/管理员代签）：{student_id, lat, lng} → {student_id, name, checked_in_at, distance_m} */
export function checkin(eventId, data) {
  return client.post(`/events/${eventId}/checkin`, data);
}

/** 学生自助定位签到（本人 token）：{lat, lng} → {student_id, name, checked_in_at, distance_m} */
export function selfCheckin(eventId, data) {
  return client.post(`/events/${eventId}/self-checkin`, data);
}

/** 核销统计 → {approved_count, checked_in_count, unchecked_count} */
export function checkinStats(eventId) {
  return client.get(`/events/${eventId}/checkin/stats`);
}

/** 获取浏览器定位（Promise 封装 navigator.geolocation） */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('当前浏览器不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error('定位失败，请检查定位权限后重试')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}
