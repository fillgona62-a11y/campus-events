App({
  globalData: {
    // 后端 API 基地址（复用网页后端，数据互通）
    // 上线前改为你的服务器 HTTPS 地址，如 https://your-domain.com/api/v1
    baseUrl: 'http://52.78.4.248/api/v1',
    token: '',
    user: null,
  },

  onLaunch() {
    // 读取本地缓存的登录态
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) {
      this.globalData.token = token;
      this.globalData.user = user || null;
    }
  },
});
