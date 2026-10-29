/**
 * 报名名单 CSV 导出工具：UTF-8 with BOM（Excel 兼容），
 * 固定列：学号,姓名,手机号,备注,状态,报名时间。
 */

/** 报名状态中文文案（导出用） */
const REG_STATUS_TEXT = {
  pending: '待审核',
  approved: '已成功',
  rejected: '已拒绝',
  cancelled: '已取消',
  waitlisted: '候补中', // v2 新增
};

/** CSV 单元格转义：统一加双引号并转义内部引号，防逗号/换行破坏结构 */
function escapeCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * 将报名名单行构建为带 BOM 的 CSV 字符串
 * @param {Array<{student_id:string,name:string,phone:string|null,remark:string|null,status:string,created_at:string}>} rows
 * @returns {string}
 */
function buildRegistrationsCsv(rows) {
  const header = ['学号', '姓名', '手机号', '备注', '状态', '报名时间'];
  const lines = [header.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCell(row.student_id),
        escapeCell(row.name),
        escapeCell(row.phone || ''),
        escapeCell(row.remark || ''),
        escapeCell(REG_STATUS_TEXT[row.status] || row.status),
        escapeCell(row.created_at),
      ].join(',')
    );
  }
  // ﻿ 为 BOM（U+FEFF），保证 Excel 打开中文不乱码
  return '\uFEFF' + lines.join('\r\n');
}

module.exports = { buildRegistrationsCsv };
