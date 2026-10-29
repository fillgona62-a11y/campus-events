const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    studentId: '',
    password: '',
    loading: false,
  },

  onInputStudentId(e) {
    this.setData({ studentId: e.detail.value });
  },

  onInputPassword(e) {
    this.setData({ password: e.detail.value });
  },

  async handleLogin() {
    const { studentId, password } = this.data;
    if (!studentId.trim() || !password) {
      wx.showToast({ title: '请输入学号和密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const data = await api.post('/auth/login-miniapp', {
        student_id: studentId.trim(),
        password: password,
      });
      app.globalData.token = data.token;
      app.globalData.user = data.user;
      wx.setStorageSync('token', data.token);
      wx.setStorageSync('user', data.user);
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/events/events' });
      }, 600);
    } catch (err) {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },
});
