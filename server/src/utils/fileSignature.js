/**
 * 文件头魔数校验（S5 第二层上传防线）：读取文件头部字节与扩展名/声明 MIME 交叉校验。
 * multer 的 fileFilter 管 MIME 白名单（第一层，MIME 头可伪造），
 * 本模块在落盘后读真实文件头魔数，不符即由调用方删除文件并返回 400。
 */
const fs = require('fs');

/** 支持图片格式的魔数签名（JPEG / PNG / WebP） */
const SIGNATURES = {
  '.jpg': (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  '.png': (buf) =>
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a,
  // RIFF????WEBP（前 4 字节 RIFF，第 8-11 字节 WEBP）
  '.webp': (buf) =>
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50,
};

/**
 * 校验已落盘文件的文件头魔数是否与其扩展名匹配。
 * @param {string} filePath 文件绝对路径
 * @param {string} ext 扩展名（含点，如 '.jpg'；须为 SIGNATURES 支持的三种之一）
 * @returns {boolean} 魔数匹配返回 true；扩展名不支持或读取失败返回 false
 */
function verifyFileSignature(filePath, ext) {
  const checker = SIGNATURES[ext.toLowerCase()];
  if (!checker) return false;
  try {
    const fd = fs.openSync(filePath, 'r');
    try {
      // 只需读前 12 字节即可覆盖三种签名的判断
      const buf = Buffer.alloc(12);
      const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
      return checker(buf.subarray(0, bytesRead));
    } finally {
      fs.closeSync(fd);
    }
  } catch (err) {
    return false;
  }
}

module.exports = { verifyFileSignature };
