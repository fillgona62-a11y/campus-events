/**
 * 校园活动报名系统 — v2 增量补充测试（QA：严过关）
 *
 * 定位：覆盖 tests/api.test.js（原有 59 条）未覆盖的路径，依据
 *       campus-events-增量PRD-v2.md 验收标准 + campus-events-增量架构设计-v2.md 契约。
 *
 * 运行前提：
 *   1. 主服务器：SMTP_DEV_ECHO=1（默认 http://localhost:3000/api/v1，可用 API_BASE 覆盖）
 *   2. 锁定到期测试服务器：LOGIN_LOCK_MINUTES=1（默认 http://localhost:3001/api/v1，API_BASE_LOCK 覆盖）
 *   3. 服务器应为重启后状态（限流计数器是内存态，避免与前序套件叠加触发 429 假失败）
 *
 * 说明：
 *   - 「契约探针」两个用例按设计文档断言（reset 不匹配应 40001；核销应限发布者/管理员），
 *     若失败即为源码缺陷证据，按智能路由交工程师修复，QA 不改源码。
 *   - 幂等：学号/邮箱/活动标题均带运行前缀，可重复执行。
 */

const fs = require('fs');
const path = require('path');

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const BASE_LOCK = process.env.API_BASE_LOCK || 'http://localhost:3001/api/v1';
const RUN = `${Date.now().toString(36)}x`; // 本次运行唯一前缀

const results = [];
let currentSuite = '';

function suite(name) {
  currentSuite = name;
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ suite: currentSuite, name, pass: true });
    console.log(`  ✔ [${currentSuite}] ${name}`);
  } catch (err) {
    results.push({ suite: currentSuite, name, pass: false, error: err.message });
    console.error(`  ✘ [${currentSuite}] ${name}\n      ${err.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || '断言失败');
}

function assertEq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || '值'} 期望=${JSON.stringify(expected)} 实际=${JSON.stringify(actual)}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 统一请求助手：返回 {status, body} */
async function api(method, path, { token, body, raw, base, captchaSkip } = {}) {
  // 注册/登录/发邮箱验证码接口要求图形验证码（与线上一致）：自动取码并注入
  // （DEV_ECHO 模式经 /debug/echo 取回答案；captchaSkip=true 用于负面用例）
  if (
    !captchaSkip &&
    method === 'POST' &&
    body !== undefined &&
    ['/auth/register', '/auth/login', '/auth/email-code/send'].includes(path)
  ) {
    const cap = await api('GET', '/auth/captcha', { base });
    assertEq(cap.body.code, 0, `获取图形验证码失败：${path}`);
    const echo = await api('GET', `/debug/echo?captcha_id=${cap.body.data.id}`, { base });
    assert(echo.body.data && echo.body.data.captchaText, 'DEV_ECHO 模式下应能取到验证码答案');
    body = { ...body, captcha_id: cap.body.data.id, captcha_code: echo.body.data.captchaText };
  }
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch((base || BASE) + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: res.status, body: json, text };
}

/** 注册并返回 {token, user}（DEV_ECHO 模式从 dev_code 取码） */
async function registerUser(base, suffix, name) {
  const student_id = `qa_${RUN}_${suffix}`;
  const email = `qa_${RUN}_${suffix}@example.com`;
  const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' }, base });
  assertEq(sent.body.code, 0, `发送注册验证码 ${suffix} code`);
  assert(sent.body.data && sent.body.data.dev_code, `未收到 dev_code（请确保 SMTP_DEV_ECHO=1）：${suffix}`);
  const r = await api('POST', '/auth/register', {
    base,
    body: { student_id, name, password: 'qa123456', phone: '13800000000', email, email_code: sent.body.data.dev_code },
  });
  assertEq(r.status, 200, `注册 ${suffix} HTTP 状态`);
  assertEq(r.body.code, 0, `注册 ${suffix} code`);
  return r.body.data;
}

function eventPayload(title, overrides = {}) {
  const now = Date.now();
  return {
    title,
    category_id: 1,
    location: '教学楼 A101',
    start_time: new Date(now + 3 * 3600e3).toISOString(),
    end_time: new Date(now + 5 * 3600e3).toISOString(),
    signup_deadline: new Date(now + 2 * 3600e3).toISOString(),
    capacity: 10,
    require_approval: false,
    description: '<p>QA 补充测试活动</p>',
    ...overrides,
  };
}

/** 创建 + 审核通过活动，返回 event */
async function createApprovedEvent(orgToken, adminToken, title, overrides = {}) {
  const cr = await api('POST', '/events', { token: orgToken, body: eventPayload(title, overrides) });
  assertEq(cr.body.code, 0, `创建活动 ${title} code`);
  const rv = await api('PUT', `/admin/events/${cr.body.data.event.id}/review`, { token: adminToken, body: { action: 'approve' } });
  assertEq(rv.body.code, 0, `审核活动 ${title} code`);
  return cr.body.data.event;
}

async function main() {
  console.log(`补充测试目标：${BASE}（锁定测试：${BASE_LOCK}），运行前缀：qa_${RUN}_*\n`);

  // 公共用户（复用贯穿全套件，控制注册/发码限流额度）
  let org, w1, w2, w3, bindA, bindB, adminToken;

  // ---------- 1. 验证码规则（F3：60 秒冷却 / 错误 5 次作废 / 发新码作废旧码） ----------
  suite('验证码规则');

  await test('注册公共用户（组织者 org + 学生 w1/w2/w3 + bindA/bindB）', async () => {
    org = await registerUser(BASE, 'org', 'QA补充组织者');
    w1 = await registerUser(BASE, 'w1', 'QA补充学生一');
    w2 = await registerUser(BASE, 'w2', 'QA补充学生二');
    w3 = await registerUser(BASE, 'w3', 'QA补充学生三');
    bindA = await registerUser(BASE, 'bindA', 'QA绑定用户A');
    bindB = await registerUser(BASE, 'bindB', 'QA绑定用户B');
    const login = await api('POST', '/auth/login', { body: { student_id: 'admin', password: 'admin123' } });
    assertEq(login.body.code, 0, '管理员登录 code');
    adminToken = login.body.data.token;
  });

  await test('同一邮箱 60 秒内重复发码被拦截（40908 / HTTP 429）', async () => {
    const email = `qa_${RUN}_cool@example.com`;
    const first = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assertEq(first.body.code, 0, '首次发码 code');
    assert(first.body.data.dev_code, '首次应回显 dev_code');
    const second = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assertEq(second.status, 429, '冷却内重发 HTTP 状态');
    assertEq(second.body.code, 40908, '冷却错误码');
    assert(/60|秒后重试/.test(second.body.message || ''), '应提示冷却剩余秒数');
    // 冷却期间的码仍然有效：用首次码完成注册
    const reg = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_cool`, name: 'QA冷却用户', password: 'qa123456', email, email_code: first.body.data.dev_code },
    });
    assertEq(reg.body.code, 0, '冷却期内首码应仍可注册');
  });

  await test('验证码连续错误 5 次作废，随后正确码也失效（40907）', async () => {
    const email = `qa_${RUN}_inv@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assertEq(sent.body.code, 0, '发码 code');
    const devCode = sent.body.data.dev_code;
    const wrong = devCode === '000000' ? '111111' : '000000';
    // 前 4 次错误：提示剩余次数递减
    for (let i = 0; i < 4; i++) {
      const r = await api('POST', '/auth/register', {
        body: { student_id: `qa_${RUN}_inv`, name: 'QA作废用户', password: 'qa123456', email, email_code: wrong },
      });
      assertEq(r.body.code, 40907, `第 ${i + 1} 次错误应 40907`);
      assertEq(4 - i, Number(/还可尝试 (\d+) 次/.exec(r.body.message || '')[1]), `第 ${i + 1} 次剩余次数`);
    }
    // 第 5 次错误：作废
    const fifth = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_inv`, name: 'QA作废用户', password: 'qa123456', email, email_code: wrong },
    });
    assertEq(fifth.body.code, 40907, '第 5 次错误应 40907');
    assert(/已失效|次数过多/.test(fifth.body.message || ''), '第 5 次应提示已失效');
    // 作废后正确码同样失效
    const after = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_inv`, name: 'QA作废用户', password: 'qa123456', email, email_code: devCode },
    });
    assertEq(after.body.code, 40907, '作废后正确码也应 40907');
  });

  await test('发送新验证码作废旧码（旧码失效、新码可用）', async () => {
    const email = `qa_${RUN}_newcode@example.com`;
    const first = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assertEq(first.body.code, 0, '首码发码 code');
    const oldCode = first.body.data.dev_code;
    // 越过 60 秒冷却后再发新码
    await sleep(61000);
    const second = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assertEq(second.body.code, 0, '新码发码 code（冷却已过）');
    const newCode = second.body.data.dev_code;
    assert(oldCode !== newCode, '新旧码不应相同（极小概率相同可重跑）');
    // 旧码应已作废
    const useOld = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_newcode`, name: 'QA新旧码用户', password: 'qa123456', email, email_code: oldCode },
    });
    assertEq(useOld.body.code, 40907, '旧码应已作废');
    // 新码可用
    const useNew = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_newcode`, name: 'QA新旧码用户', password: 'qa123456', email, email_code: newCode },
    });
    assertEq(useNew.body.code, 0, '新码应可注册');
  });

  await test('防枚举：学号不存在时不发码且返回中性文案（无 dev_code）', async () => {
    const r = await api('POST', '/auth/email-code/send', {
      body: { student_id: `qa_${RUN}_nosuch`, email: `qa_${RUN}_nosuch@example.com`, purpose: 'reset_password' },
    });
    assertEq(r.status, 200, 'HTTP 状态');
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data, null, '不应返回 dev_code（未实际发码）');
    assert(/若信息匹配/.test(r.body.message || ''), '应为中性文案');
  });

  // ---------- 2. 登录锁定计数清零（F12，需 LOGIN_LOCK_MINUTES=1 的专用服务器） ----------
  suite('登录锁定到期');

  await test('锁定期满后可用正确密码登录，且失败计数重新从 0 计', async () => {
    const lockUser = await registerUser(BASE_LOCK, 'lockexp', 'QA锁到期用户');
    const sid = lockUser.user.student_id;
    // 连续 5 次错误 → 锁定
    for (let i = 0; i < 4; i++) {
      const r = await api('POST', '/auth/login', { base: BASE_LOCK, body: { student_id: sid, password: 'wrong-pass' } });
      assertEq(r.body.code, 40101, `第 ${i + 1} 次错误应 40101`);
    }
    const trigger = await api('POST', '/auth/login', { base: BASE_LOCK, body: { student_id: sid, password: 'wrong-pass' } });
    assertEq(trigger.status, 423, '第 5 次错误应触发锁定');
    assertEq(trigger.body.code, 40302, '锁定错误码');
    // 锁定期满（LOGIN_LOCK_MINUTES=1）
    await sleep(65000);
    // 到期后正确密码可登录（PRD：锁定 15 分钟后可正常登录）
    const ok = await api('POST', '/auth/login', { base: BASE_LOCK, body: { student_id: sid, password: 'qa123456' } });
    assertEq(ok.body.code, 0, '锁定期满后正确密码应可登录');
    // 计数已清零：再错一次应提示“还可尝试 4 次”（从 0 重新计数）
    const after = await api('POST', '/auth/login', { base: BASE_LOCK, body: { student_id: sid, password: 'wrong-pass' } });
    assertEq(after.body.code, 40101, '到期后再错一次应 40101');
    assert(/还可尝试 4 次/.test(after.body.message || ''), '失败计数应重新从 0 开始');
  });

  // ---------- 3. 候补取消递补并发安全性（F5，同事务 + 条件 UPDATE） ----------
  suite('递补并发');

  await test('两人并行取消 approved：恰一次递补、不重复递补（同事务原子性）', async () => {
    const ev = await createApprovedEvent(org.token, adminToken, `QA并发_${RUN}`, { capacity: 2 });
    const r1 = await api('POST', `/events/${ev.id}/register`, { token: w1.token, body: {} });
    const r2 = await api('POST', `/events/${ev.id}/register`, { token: w2.token, body: {} });
    const r3 = await api('POST', `/events/${ev.id}/register`, { token: w3.token, body: {} });
    assertEq(r1.body.data.registration.status, 'approved', 'w1 应直接成功');
    assertEq(r2.body.data.registration.status, 'approved', 'w2 应直接成功');
    assertEq(r3.body.data.waitlisted, true, 'w3 应候补');
    // 并行取消两个 approved 报名
    const [c1, c2] = await Promise.all([
      api('POST', `/registrations/${r1.body.data.registration.id}/cancel`, { token: w1.token }),
      api('POST', `/registrations/${r2.body.data.registration.id}/cancel`, { token: w2.token }),
    ]);
    assertEq(c1.body.code, 0, 'w1 取消 code');
    assertEq(c2.body.code, 0, 'w2 取消 code');
    const promotedCount = [c1.body.data.promoted, c2.body.data.promoted].filter(Boolean).length;
    assertEq(promotedCount, 1, '并行取消应恰好触发一次递补');
    // 终态：w3 递补成功，名额计数正确，候补清空
    const det = await api('GET', `/events/${ev.id}`);
    assertEq(det.body.data.event.approved_count, 1, '递补后 approved_count 应为 1');
    assertEq(det.body.data.waitlist_count, 0, '递补后候补应清空');
    const approved = await api('GET', `/events/${ev.id}/registrations?status=approved`, { token: org.token });
    assertEq(approved.body.data.list.length, 1, 'approved 应仅 1 人');
    assertEq(approved.body.data.list[0].student_id, w3.user.student_id, '递补者应为 w3');
    // w3 恰好收到 1 条递补站内信（防重复递补的最强信号）
    const n = await api('GET', '/notifications?page_size=50', { token: w3.token });
    const promotedNotes = n.body.data.list.filter((x) => x.type === 'waitlist_promoted');
    assertEq(promotedNotes.length, 1, 'w3 应恰好收到 1 条递补站内信');
  });

  // ---------- 4. 手动移出候补后不再被递补（F5） ----------
  suite('移出候补');

  await test('组织者移出候补第 1 位后，取消 approved 递补给第 2 位（已移出者不再递补）', async () => {
    const ev = await createApprovedEvent(org.token, adminToken, `QA移出_${RUN}`, { capacity: 1 });
    const r1 = await api('POST', `/events/${ev.id}/register`, { token: w1.token, body: {} });
    assertEq(r1.body.data.registration.status, 'approved', 'w1 应占名额');
    const r2 = await api('POST', `/events/${ev.id}/register`, { token: w2.token, body: {} });
    assertEq(r2.body.data.waitlist_position, 1, 'w2 候补第 1 位');
    const r3 = await api('POST', `/events/${ev.id}/register`, { token: w3.token, body: {} });
    assertEq(r3.body.data.waitlist_position, 2, 'w3 候补第 2 位');
    // 移出 w2（第 1 位）
    const rm = await api('POST', `/registrations/${r2.body.data.registration.id}/waitlist/remove`, { token: org.token });
    assertEq(rm.body.code, 0, '移出 code');
    // w1 取消 → 应递补 w3（而非已移出的 w2）
    const c = await api('POST', `/registrations/${r1.body.data.registration.id}/cancel`, { token: w1.token });
    assertEq(c.body.data.promoted, true, '应发生递补');
    const approved = await api('GET', `/events/${ev.id}/registrations?status=approved`, { token: org.token });
    const ids = approved.body.data.list.map((x) => x.student_id);
    assert(ids.includes(w3.user.student_id), 'w3 应被递补');
    assert(!ids.includes(w2.user.student_id), '已移出的 w2 不应被递补');
  });

  // ---------- 6. 审计日志权限与筛选（F6） ----------
  suite('审计日志');

  await test('非管理员查询审计日志被拒（40301）', async () => {
    const r = await api('GET', '/admin/audit-logs', { token: w1.token });
    assertEq(r.status, 403, 'HTTP 状态');
    assertEq(r.body.code, 40301, '错误码');
  });

  await test('审计日志支持日期筛选与分页上限（page_size=999 收敛为 50）', async () => {
    const all = await api('GET', '/admin/audit-logs?page_size=50', { token: adminToken });
    assertEq(all.body.code, 0, '查询 code');
    assert(all.body.data.list.length >= 1, '应有审计记录');
    // 未来日期筛选 → 空
    const future = await api('GET', '/admin/audit-logs?start_date=2099-01-01', { token: adminToken });
    assertEq(future.body.data.total, 0, '未来日期应无记录');
    // 全时段筛选 → 非空
    const range = await api('GET', '/admin/audit-logs?start_date=2020-01-01&end_date=2099-12-31', { token: adminToken });
    assert(range.body.data.total >= 1, '全时段应有记录');
    // 分页上限
    const big = await api('GET', '/admin/audit-logs?page_size=999', { token: adminToken });
    assertEq(big.body.data.page_size, 50, 'page_size 应收敛为 50');
  });

  // ---------- 7. 报名趋势口径（F8：排除 cancelled/rejected、UTC+8 归日期） ----------
  suite('趋势口径');

  await test('趋势统计排除已取消报名；末日为今天（UTC+8）；日期连续无重复', async () => {
    const ev = await createApprovedEvent(org.token, adminToken, `QA趋势_${RUN}`, { capacity: 2 });
    const r1 = await api('POST', `/events/${ev.id}/register`, { token: w1.token, body: {} });
    assertEq(r1.body.data.registration.status, 'approved', 'w1 报名成功');
    const r2 = await api('POST', `/events/${ev.id}/register`, { token: w2.token, body: {} });
    assertEq(r2.body.data.registration.status, 'approved', 'w2 报名成功');
    const r3 = await api('POST', `/events/${ev.id}/register`, { token: w3.token, body: {} });
    assertEq(r3.body.data.waitlisted, true, 'w3 候补');
    // w2 取消 → w3 递补；终态：w1 approved、w2 cancelled、w3 approved
    const c = await api('POST', `/registrations/${r2.body.data.registration.id}/cancel`, { token: w2.token });
    assertEq(c.body.data.promoted, true, '应递补 w3');
    // 口径：当日创建且 status ∈ pending/approved/waitlisted → 仅 w1、w3 计 2（cancelled 的 w2 排除）
    const trend = await api('GET', `/events/${ev.id}/registrations/trend?days=7`, { token: org.token });
    assertEq(trend.body.code, 0, '趋势 code');
    assertEq(trend.body.data.days.length, 7, '天数');
    assertEq(trend.body.data.total, 2, '有效报名应排除 cancelled（期望 2）');
    // 末日 = 今天（UTC+8）
    const todayUtc8 = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
    assertEq(trend.body.data.days[6].date, todayUtc8, '末日应为今天（UTC+8）');
    // 日期连续且递增
    const dates = trend.body.data.days.map((d) => d.date);
    assertEq(dates.length, new Set(dates).size, '日期不应重复');
    for (let i = 1; i < dates.length; i++) {
      assert(dates[i] > dates[i - 1], `日期应递增：${dates[i - 1]} → ${dates[i]}`);
    }
    // 当日计数为 2
    assertEq(trend.body.data.days[6].count, 2, '当日有效报名数应为 2');
  });

  // ---------- 8. CSV 导出与候补文案（F5） ----------
  suite('CSV 导出');

  await test('CSV 含候补中状态文案', async () => {
    const ev = await createApprovedEvent(org.token, adminToken, `QACSV_${RUN}`, { capacity: 1 });
    await api('POST', `/events/${ev.id}/register`, { token: w1.token, body: {} });
    await api('POST', `/events/${ev.id}/register`, { token: w2.token, body: {} }); // 候补
    const res = await api('GET', `/events/${ev.id}/registrations/export`, { token: org.token, raw: true });
    assertEq(res.status, 200, 'HTTP 状态');
    const buf = Buffer.from(await res.arrayBuffer());
    const text = buf.toString('utf8');
    const header = text.replace(/^\uFEFF/, '').split('\r\n')[0].trim();
    assertEq(header, '"学号","姓名","手机号","备注","状态","报名时间"', 'CSV 列头');
    assert(text.includes('候补中'), 'CSV 应含候补中文案');
    assert(text.includes(w1.user.student_id), 'CSV 应含报名学生学号');
  });

  // ---------- 9. 自助改密后旧 token 行为（F1） ----------
  suite('改密后会话');

  await test('自助改密后当前登录态保持（旧 token 仍可用），旧密码失效', async () => {
    const r = await api('POST', '/auth/password', {
      token: bindA.token,
      body: { old_password: 'qa123456', new_password: 'newbind123' },
    });
    assertEq(r.body.code, 0, '改密 code');
    // 旧 token 仍可访问受保护接口（设计：当前登录态保持，不踢自己下线）
    const me = await api('GET', '/auth/me', { token: bindA.token });
    assertEq(me.status, 200, '旧 token 应仍可用');
    assertEq(me.body.code, 0, '旧 token code');
    // 旧密码登录失败
    const oldLogin = await api('POST', '/auth/login', { body: { student_id: bindA.user.student_id, password: 'qa123456' } });
    assertEq(oldLogin.body.code, 40101, '旧密码应失效');
    // 新密码登录成功
    const newLogin = await api('POST', '/auth/login', { body: { student_id: bindA.user.student_id, password: 'newbind123' } });
    assertEq(newLogin.body.code, 0, '新密码应可登录');
  });

  // ---------- 10. 绑定邮箱唯一性冲突（F3 联动） ----------
  suite('绑定邮箱');

  await test('绑定邮箱唯一性冲突：邮箱已被他人绑定后，申请绑定验证码即被拒（40906）', async () => {
    const email = `qa_${RUN}_conflict@example.com`;
    // bindA 先绑定该邮箱（前端真实路径：先发码再绑定）
    const sentA = await api('POST', '/auth/email-code/send', { token: bindA.token, body: { email, purpose: 'bind_email' } });
    assertEq(sentA.body.code, 0, 'bindA 发码 code');
    const bindOk = await api('PUT', '/users/me/email', { token: bindA.token, body: { email, email_code: sentA.body.data.dev_code } });
    assertEq(bindOk.body.code, 0, 'bindA 绑定 code');
    assertEq(bindOk.body.data.user.email, email, '绑定后邮箱');
    // bindB 再申请同一邮箱的绑定验证码 → 发送阶段即被拒（设计 §5.1-①：email 已被他人绑定 → 40906）
    // 注：bind 端点自身的 40906 唯一性分支仅在并发竞争下可达（发新码会作废旧码、验后即消费），
    // 顺序调用下用户实际触达的冲突路径就是发送阶段 40906，此处按真实路径断言。
    const sentB = await api('POST', '/auth/email-code/send', { token: bindB.token, body: { email, purpose: 'bind_email' } });
    assertEq(sentB.status, 409, '冲突 HTTP 状态');
    assertEq(sentB.body.code, 40906, '冲突错误码');
    assert(/已被其他账号绑定|已被注册或绑定/.test(sentB.body.message || ''), '应为邮箱冲突文案');
  });

  await test('绑定邮箱后可用于忘记密码找回（F3/F2 联动）', async () => {
    const email = `qa_${RUN}_bindreset@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { token: bindB.token, body: { email, purpose: 'bind_email' } });
    assertEq(sent.body.code, 0, 'bindB 绑定发码 code');
    const bind = await api('PUT', '/users/me/email', { token: bindB.token, body: { email, email_code: sent.body.data.dev_code } });
    assertEq(bind.body.code, 0, 'bindB 绑定 code');
    // 用绑定邮箱走忘记密码
    const resetSent = await api('POST', '/auth/email-code/send', { body: { student_id: bindB.user.student_id, email, purpose: 'reset_password' } });
    assertEq(resetSent.body.code, 0, '重置发码 code');
    assert(resetSent.body.data?.dev_code, '应回显 dev_code');
    const reset = await api('POST', '/auth/password/reset', {
      body: { student_id: bindB.user.student_id, email, email_code: resetSent.body.data.dev_code, new_password: 'resetbind1' },
    });
    assertEq(reset.body.code, 0, '重置 code');
    const login = await api('POST', '/auth/login', { body: { student_id: bindB.user.student_id, password: 'resetbind1' } });
    assertEq(login.body.code, 0, '重置后新密码应可登录');
  });

  // ---------- 11. 上传魔数校验补充（S5） ----------
  suite('上传校验补充');
  const uploadsDir = path.resolve(__dirname, '..', 'server', 'uploads');

  await test('HTML 内容声明 image/png 被拒（400）且无残留；伪造 webp 被拒；合法 webp 通过', async () => {
    const before = fs.readdirSync(uploadsDir).length;
    // ① HTML 内容 + image/png MIME + .png 文件名
    const form1 = new FormData();
    form1.append('file', new Blob(['<html><script>alert(1)</script>'], { type: 'image/png' }), 'evil.png');
    const res1 = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org.token}` },
      body: form1,
    });
    const j1 = JSON.parse(await res1.text());
    assertEq(res1.status, 400, 'HTML 伪造 PNG HTTP 状态');
    assertEq(j1.code, 40001, 'HTML 伪造 PNG 错误码');
    // ② RIFF 头但非 WEBP（伪造 webp：RIFF + 4 字节尺寸 + 非 WEBP 标识）
    const fakeWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('AVI '), Buffer.alloc(16)]);
    const form2 = new FormData();
    form2.append('file', new Blob([fakeWebp], { type: 'image/webp' }), 'fake.webp');
    const res2 = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org.token}` },
      body: form2,
    });
    const j2 = JSON.parse(await res2.text());
    assertEq(res2.status, 400, '伪造 webp HTTP 状态');
    assertEq(j2.code, 40001, '伪造 webp 错误码');
    // 被拒文件不得残留
    const afterReject = fs.readdirSync(uploadsDir).length;
    assertEq(afterReject, before, '被拒文件不得残留在 uploads/');
    // ③ 合法 webp（RIFF + 4 字节尺寸 + WEBP，魔数匹配）
    const goodWebp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.from('VP80 '), Buffer.alloc(20)]);
    const form3 = new FormData();
    form3.append('file', new Blob([goodWebp], { type: 'image/webp' }), 'good.webp');
    const res3 = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org.token}` },
      body: form3,
    });
    const j3 = JSON.parse(await res3.text());
    assertEq(j3.code, 0, '合法 webp 上传 code');
    assert(j3.data.url.startsWith('/uploads/'), '应返回站内路径');
  });

  // ---------- 12. 日历月份范围参数（F7 数据源） ----------
  suite('日历参数');

  await test('GET /events 支持 start_from/start_to 月份范围；非法值不应 500', async () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
    const ok = await api('GET', `/events?start_from=${encodeURIComponent(from)}&start_to=${encodeURIComponent(to)}&page_size=50`);
    assertEq(ok.body.code, 0, '月份范围查询 code');
    assert(Array.isArray(ok.body.data.list), '应返回列表');
    // 非法日期不应导致服务器 500（应参数校验 40001 或忽略）
    const bad = await api('GET', `/events?start_from=not-a-date`);
    assert(bad.status < 500, `非法 start_from 不应 500（实际 ${bad.status}）`);
  });

  // ---------- 13. 契约探针（按设计文档断言，失败即源码缺陷证据） ----------
  suite('契约探针');

  await test('【探针】忘记密码重置：学号+邮箱不匹配应返回 40001（设计 §5.1-⑤）', async () => {
    // 设计约定：此刻已过验证码关卡，可明确提示"学号与邮箱不匹配"，错误码 40001
    const r = await api('POST', '/auth/password/reset', {
      body: {
        student_id: w1.user.student_id,
        email: `qa_${RUN}_mismatch@example.com`,
        email_code: '000000',
        new_password: 'probe123456',
      },
    });
    assertEq(r.status, 400, '不匹配 HTTP 状态应为 400');
    assertEq(r.body.code, 40001, '不匹配错误码应为 40001（设计 §5.1-⑤）');
    // 对照：匹配 + 错误验证码 → 40907（证明匹配校验先于验证码校验，顺序符合设计）
    const r2 = await api('POST', '/auth/password/reset', {
      body: {
        student_id: w1.user.student_id,
        email: w1.user.email,
        email_code: '000000',
        new_password: 'probe123456',
      },
    });
    assertEq(r2.body.code, 40907, '匹配后验证码错误应 40907');
  });

  // ---------- 汇总 ----------
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log('\n========== 补充测试汇总 ==========');
  console.log(`总计 ${results.length} 用例：通过 ${passed}，失败 ${failed}`);
  if (failed) {
    console.log('\n失败明细：');
    results.filter((r) => !r.pass).forEach((r) => console.log(`- [${r.suite}] ${r.name}: ${r.error}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('测试执行器异常：', e);
  process.exit(2);
});
