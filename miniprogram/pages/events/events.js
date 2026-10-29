const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    list: [],
    loading: true,
    error: '',
  },

  onShow() {
    if (!app.globalData.token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.loadEvents();
  },

  async loadEvents() {
    this.setData({ loading: true, error: '' });
    try {
      const data = await api.get('/my/registrations', { tab: 'upcoming', page: 1, page_size: 50 });
      // 只展示报名成功（approved）的活动
      const list = (data.list || []).filter((item) => item.status === 'approved');
      this.setData({ list });
    } catch (err) {
      this.setData({ error: err.message || '加载失败' });
    } finally {
      this.setData({ loading: false });
    }
  },

  goCheckin(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '/pages/checkin/checkin?eventId=' + item.event_id + '&title=' + encodeURIComponent(item.title),
    });
  },

  logout() {
    app.globalData.token = '';
    app.globalData.user = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('user');
    wx.redirectTo({ url: '/pages/login/login' });
  },
});
