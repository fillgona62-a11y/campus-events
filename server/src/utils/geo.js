/**
 * 地理距离计算（v5 定位签到）：Haversine 公式计算两点球面距离。
 * 单位：输入经纬度为角度，输出距离为公里。
 */

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * 计算两点间的大圆距离（Haversine）
 * @param {number} lat1 点1 纬度
 * @param {number} lng1 点1 经度
 * @param {number} lat2 点2 纬度
 * @param {number} lng2 点2 经度
 * @returns {number} 距离（公里）
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** 距离转为米（四舍五入取整），便于展示 */
function distanceMeters(lat1, lng1, lat2, lng2) {
  return Math.round(haversineKm(lat1, lng1, lat2, lng2) * 1000);
}

module.exports = { haversineKm, distanceMeters };
