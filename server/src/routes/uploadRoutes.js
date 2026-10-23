/**
 * 封面上传路由：multipart 单文件 file，≤2MB，仅 jpg/png/webp。
 * 存储于 server/uploads/，返回站内路径 /uploads/xxx。
 * 双层校验（S5）：multer fileFilter 管 MIME 白名单（第一层），
 * 落盘后 fileSignature 魔数校验（第二层），不符即删文件返回 400。
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
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
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.uploadDir),
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || '.bin';
    cb(null, `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!config.upload.allowedMime.includes(file.mimetype)) {
      return cb(new ApiError(ERR.PARAM_INVALID, '仅支持 jpg / png / webp 格式图片', 400));
    }
    cb(null, true);
  },
});

/** POST /upload 上传封面图 */
router.post('/upload', requireAuth, upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) throw new ApiError(ERR.PARAM_INVALID, '请选择要上传的图片', 400);
    // 第二层校验：落盘后读文件头魔数，不符（如 .txt 改名 .jpg）删除文件并拒绝
    const ext = path.extname(req.file.filename).toLowerCase();
    if (!verifyFileSignature(req.file.path, ext)) {
      fs.unlinkSync(req.file.path);
      throw new ApiError(ERR.PARAM_INVALID, '文件内容与图片格式不符，已拒绝上传', 400);
    }
    ok(res, { url: `/uploads/${req.file.filename}` }, '上传成功');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
