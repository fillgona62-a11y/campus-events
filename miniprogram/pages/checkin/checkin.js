const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    eventId: '',
    title: '',
    event: null,
    scanning: false,
    scannedBeacon: '',
    status: 'idle', // idle / scanning / located / success
    statusText: '准备签到',
    loading: false,
  },

  onLoad(options) {
    const eventId = options.eventId || '';
    const title = decodeURIComponent(options.title || '');
    this.setData({ eventId, title });
    this.loadEvent();
  },

  // 加载活动详情（拿信标 UUID、坐标）
  async loadEvent() {
    try {
      const data = await api.get('/events/' + this.data.eventId);
      this.setData({ event: data.event });
    } catch (err) {
      wx.showToast({ title: err.message || '加载活动失败', icon: 'none' });
    }
  },

  // 开始签到：先扫描蓝牙信标，再定位
  async startCheckin() {
    if (this.data.scanning) return;
    const event = this.data.event;
    if (!event) {
      wx.showToast({ title: '活动信息未加载', icon: 'none' });
      return;
    }
    if (!event.beacon_uuid) {
      // 活动未配置信标，仍可定位签到（降级）
      this.doLocateCheckin('');
      return;
    }

    this.setData({ scanning: true, status: 'scanning', statusText: '正在扫描蓝牙信标…', scannedBeacon: '' });
    this.startBeaconDiscovery(event.beacon_uuid);
  },

  // 启动 iBeacon 扫描
  startBeaconDiscovery(uuid) {
    wx.startBeaconDiscovery({
      uuids: [uuid],
      success: () => {
        this.listenBeaconUpdate(uuid);
      },
      fail: (err) => {
        wx.showToast({ title: '蓝牙扫描失败：' + (err.errMsg || ''), icon: 'none' });
        this.setData({ scanning: false, status: 'idle', statusText: '准备签到' });
      },
    });
  },

  // 监听信标信号
  listenBeaconUpdate(uuid) {
    wx.onBeaconUpdate((res) => {
      const beacons = res.beacons || [];
      const matched = beacons.find((b) => {
        const buuid = (b.uuid || '').toUpperCase();
        return buuid === uuid.toUpperCase();
      });
      if (matched) {
        // 扫到信标，停止扫描，进入定位
        wx.stopBeaconDiscovery({
          complete: () => {
            this.setData({
              scanning: false,
              scannedBeacon: matched.uuid,
              status: 'located',
              statusText: '已检测到签到信标，正在定位…',
            });
            this.doLocateCheckin(matched.uuid);
          },
        });
      }
    });
  },

  // 定位并提交签到
  doLocateCheckin(beaconUuid) {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (loc) => {
        this.submitCheckin(loc.latitude, loc.longitude, beaconUuid);
      },
      fail: () => {
        this.setData({ scanning: false, status: 'idle', statusText: '定位失败，请检查定位权限' });
        wx.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
      },
    });
  },

  // 提交签到
  async submitCheckin(lat, lng, beaconUuid) {
    this.setData({ loading: true, statusText: '正在提交签到…' });
    try {
      const data = await api.post('/events/' + this.data.eventId + '/self-checkin', {
        lat: lat,
        lng: lng,
        beacon_uuid: beaconUuid || null,
      });
      this.setData({
        status: 'success',
        statusText: '签到成功！距活动地点约 ' + data.distance_m + ' 米',
        loading: false,
      });
      wx.showToast({ title: '签到成功', icon: 'success' });
    } catch (err) {
      this.setData({ loading: false, status: 'idle', statusText: '准备签到' });
      wx.showToast({ title: err.message || '签到失败', icon: 'none' });
    }
  },

  onUnload() {
    wx.stopBeaconDiscovery({
      complete: () => {},
    });
  },
});
