// 公共 API 请求封装
const app = getApp();

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = app.globalData.token;
    const header = { 'Content-Type': 'application/json' };
    if (token) {
      header.Authorization = 'Bearer ' + token;
    }
    wx.request({
      url: app.globalData.baseUrl + path,
      method: method,
      data: data || {},
      header: header,
      success(res) {
        const body = res.data || {};
        if (body.code === 0) {
          resolve(body.data);
        } else {
          reject(new Error(body.message || '请求失败'));
        }
      },
      fail() {
        reject(new Error('网络错误，请检查网络连接'));
      },
    });
  });
}

module.exports = {
  get: (path, data) => request('GET', path, data),
  post: (path, data) => request('POST', path, data),
  put: (path, data) => request('PUT', path, data),
};
