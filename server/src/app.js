/**
 * Express 应用装配：安全中间件、API 路由、上传与前端静态托管、SPA fallback。
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const apiRoutes = require('./routes');
const { apiNotFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// 信任 Nginx 一层反向代理：使 express-rate-limit 按真实访客 IP 计数
// （不设置时所有请求的 req.ip 都是 127.0.0.1，限流会退化为全站共享额度）
app.set('trust proxy', 1);

// 安全响应头（crossOriginResourcePolicy 放开以允许前端跨端口引用 /uploads 图片）
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // SPA 单域部署，CSP 交由前置 Nginx 配置
  })
);
// CORS：默认仅同源放行；配置白名单（CORS_ORIGINS）后按来源动态放行。
// 生产为单进程托管前后端（同源），开发经 Vite proxy 转发（后端视角仍同源），
// 故一般无需跨域，默认关闭以避免任意站点读取接口。
const corsOptions = {
  origin(origin, callback) {
    // 同源请求（无 Origin 头，如服务端间调用/浏览器同源）直接放行
    if (!origin) return callback(null, true);
    if (
      config.corsOrigins.includes('*') ||
      config.corsOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
};
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// 上传文件静态托管（带缓存）
app.use(
  '/uploads',
  express.static(config.uploadDir, { maxAge: '7d', immutable: false })
);

// API 路由
app.use('/api/v1', apiRoutes);
app.use('/api', apiNotFound);

// 生产模式：托管前端构建产物 + SPA fallback
if (fs.existsSync(config.clientDist)) {
  app.use(
    express.static(config.clientDist, {
      // 默认不给 HTML 长缓存：入口文件必须每次回源校验，否则发版后
      // 用户浏览器会继续用旧的 index.html（它引用的还是旧 hash 资源名），
      // 表现为"网站没更新"。带 hash 的资源文件另设长缓存。
      maxAge: 0,
      setHeaders: (res, filePath) => {
        if (/\.(html)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        } else if (/\.(js|css|png|jpg|jpeg|webp|svg|woff2?)$/.test(filePath)) {
          // 带 hash 的静态资源长缓存（内容变则文件名变）
          res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    // SPA fallback 同样不能缓存，理由同上
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.sendFile(path.join(config.clientDist, 'index.html'));
  });
}

// 统一错误处理
app.use(errorHandler);

module.exports = app;
