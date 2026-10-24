/**
 * 上传路由：图片（/upload，≤2MB jpg/png/webp）与视频（/upload/video，≤50MB mp4/webm/mov）。
 * 存储于 config.uploadDir，返回站内路径 /uploads/xxx。
 * 双层校验（S5）：multer fileFilter 管 MIME 白名单（第一层），
 * 落盘后 fileSignature 魔数校验（第二层），不符即删文件返回 400。
 * 两个上传口均挂 actionLimiter（防滥用刷文件）。
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { actionLimiter } = require('../middleware/rateLimit');
const { ApiError, ok } = require('../utils/response');
const { ERR } = require('../utils/constants');
const { verifyFileSignature } = require('../utils/fileSignature');

const router = express.Router();

// 确保上传目录存在
fs.mkdirSync(config.uploadDir, { recursive: true });

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || '.bin';
    cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedMime.includes(file.mimetype)) {
      return cb(new ApiError(ERR.PARAM_INVALID, '仅支持 jpg / png / webp 格式图片', 400));
    }
    cb(null, true);
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: config.upload.video.maxSize, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!config.upload.video.allowedMime.includes(file.mimetype)) {
      return cb(new ApiError(ERR.PARAM_INVALID, '仅支持 mp4 / webm / mov 格式视频', 400));
    }
    cb(null, true);
  },
});

/** 包一层 multer 中间件：把「文件过大」等 MulterError 转成友好中文提示 */
function runUpload(mw, req, res, next) {
  mw(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const mb = Math.round((err.limit ? err.limit : config.upload.video.maxSize) / 1048576);
        return next(new ApiError(ERR.PARAM_INVALID, `文件超过大小上限（${mb}MB）`, 400));
      }
      return next(err);
    }
    next();
  });
}

/** 落盘后魔数二审，不符即删并 400 */
function verifyOrUnlink(req, badMsg) {
  const ext = path.extname(req.file.filename).toLowerCase();
  if (!verifyFileSignature(req.file.path, ext)) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(ERR.PARAM_INVALID, badMsg, 400);
  }
}

/** POST /upload 上传图片（封面/正文插图） */
router.post('/upload', requireAuth, actionLimiter, (req, res, next) =>
  runUpload(imageUpload.single('file'), req, res, () => {
    try {
      if (!req.file) throw new ApiError(ERR.PARAM_INVALID, '请选择要上传的图片', 400);
      verifyOrUnlink(req, '文件内容与图片格式不符，已拒绝上传');
      ok(res, { url: `/uploads/${req.file.filename}` }, '上传成功');
    } catch (err) {
      next(err);
    }
  })
);

/** POST /upload/video 上传视频（论坛小视频） */
router.post('/upload/video', requireAuth, actionLimiter, (req, res, next) =>
  runUpload(videoUpload.single('file'), req, res, () => {
    try {
      if (!req.file) throw new ApiError(ERR.PARAM_INVALID, '请选择要上传的视频', 400);
      verifyOrUnlink(req, '文件内容与视频格式不符，已拒绝上传');
      ok(res, { url: `/uploads/${req.file.filename}` }, '上传成功');
    } catch (err) {
      next(err);
    }
  })
);

module.exports = router;
