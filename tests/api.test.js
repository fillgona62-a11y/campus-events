/**
 * 校园活动报名系统 — API 功能验证测试（QA：严过关）
 *
 * 运行方式：先启动后端（:3000），再执行 `node tests/api.test.js`
 * 说明：纯 Node 脚本 + 全局 fetch，无额外测试框架。
 * 幂等性：每次运行使用时间戳前缀生成全新学号/活动标题，可重复执行。
 * 依据：campus-events-architecture.md 第 4 节 API 契约与 4.6 错误码；
 *       campus-events-增量架构设计-v2.md 第 5 节接口设计。
 *
 * v2 注意：注册/找回密码依赖邮箱验证码。服务器需处于 SMTP_DEV_ECHO=1
 * （开发模式，不发真邮件，验证码在响应 dev_code 回显），否则验证码类用例会失败。
 */

const fs = require('fs');
const path = require('path');

const BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const RUN = Date.now().toString(36); // 本次运行唯一前缀

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

/** 统一请求助手：返回 {status, body}，body 为 JSON 或文本 */
async function api(method, path, { token, body, raw, captchaSkip } = {}) {
  // 注册/登录/发邮箱验证码接口要求图形验证码（与线上一致）：自动取码并注入
  // （DEV_ECHO 模式经 /debug/echo 取回答案；captchaSkip=true 用于负面用例）
  if (
    !captchaSkip &&
    method === 'POST' &&
    body !== undefined &&
    ['/auth/register', '/auth/login', '/auth/email-code/send'].includes(path)
  ) {
    const cap = await api('GET', '/auth/captcha');
    assertEq(cap.body.code, 0, `获取图形验证码失败：${path}`);
    const echo = await api('GET', `/debug/echo?captcha_id=${cap.body.data.id}`);
    assert(echo.body.data && echo.body.data.captchaText, 'DEV_ECHO 模式下应能取到验证码答案');
    body = { ...body, captcha_id: cap.body.data.id, captcha_code: echo.body.data.captchaText };
  }
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* CSV 等非 JSON */ }
  return { status: res.status, body: json, text };
}

/**
 * 注册并返回 {token, user}（v2：先发邮箱验证码，DEV_ECHO 模式从 dev_code 取码）。
 * 需服务器 SMTP_DEV_ECHO=1，否则验证码不可见、注册失败。
 */
async function registerUser(suffix, name) {
  const student_id = `qa_${RUN}_${suffix}`;
  const email = `qa_${RUN}_${suffix}@example.com`;
  const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
  assertEq(sent.body.code, 0, `发送注册验证码 ${suffix} code`);
  assert(
    sent.body.data && sent.body.data.dev_code,
    `未收到 dev_code（请确保服务器 SMTP_DEV_ECHO=1）：${suffix}`
  );
  const r = await api('POST', '/auth/register', {
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
    description: '<p>QA 测试活动</p>',
    ...overrides,
  };
}

async function main() {
  console.log(`API 测试目标：${BASE}，运行前缀：qa_${RUN}_*`);
  console.log('提示：验证码类用例要求服务器 SMTP_DEV_ECHO=1\n');

  // ---------- 1. 基础设施与种子数据 ----------
  suite('基础设施');
  await test('GET /categories 返回 6 个预置分类（seed 生效）', async () => {
    const r = await api('GET', '/categories');
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.list.length, 6, '分类数');
  });

  // ---------- 2. 认证闭环 ----------
  suite('认证闭环');
  let org1, org2, stu1, stu2, stu3, stu4, stu5, adminToken;

  await test('注册新用户返回 token 与 user（不含 password_hash）', async () => {
    org1 = await registerUser('org1', 'QA组织者一');
    assert(org1.token, '应返回 token');
    assert(org1.user.student_id.startsWith(`qa_${RUN}_`), '学号不符');
    assert(!('password_hash' in org1.user), 'user 不应含 password_hash');
    assertEq(org1.user.email_verified, 1, 'email_verified');
    org2 = await registerUser('org2', 'QA组织者二');
    stu1 = await registerUser('stu1', 'QA学生一');
    stu2 = await registerUser('stu2', 'QA学生二');
    stu3 = await registerUser('stu3', 'QA学生三');
    stu4 = await registerUser('stu4', 'QA学生四');
    stu5 = await registerUser('stu5', 'QA学生五');
  });

  await test('重复注册同学号被拒（40901 / HTTP 409）', async () => {
    // 学号查重先于邮箱/验证码校验；为新邮箱发一个有效码以排除干扰
    const email = `qa_${RUN}_dup@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assert(sent.body.data?.dev_code, '未收到 dev_code');
    const r = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_org1`, name: '重复', password: 'qa123456', email, email_code: sent.body.data.dev_code },
    });
    assertEq(r.status, 409, 'HTTP 状态');
    assertEq(r.body.code, 40901, '错误码');
  });

  await test('管理员 admin/admin123 登录成功（seed 账号）', async () => {
    const r = await api('POST', '/auth/login', { body: { student_id: 'admin', password: 'admin123' } });
    assertEq(r.status, 200, 'HTTP 状态');
    assertEq(r.body.code, 0, 'code');
    // v3 角色分级：主管理员升级为 super_admin（isAdminRole 对 admin/super_admin 均放行）
    assertEq(
      r.body.data.user.role === 'admin' || r.body.data.user.role === 'super_admin',
      true,
      '角色'
    );
    adminToken = r.body.data.token;
  });

  await test('未登录访问受保护接口返回 40101', async () => {
    const r = await api('GET', '/auth/me');
    assertEq(r.status, 401, 'HTTP 状态');
    assertEq(r.body.code, 40101, '错误码');
  });

  await test('GET /auth/me 携带合法 token 返回当前用户', async () => {
    const r = await api('GET', '/auth/me', { token: org1.token });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.user.name, 'QA组织者一', '姓名');
  });

  await test('PUT /users/me 完善资料（手机号）', async () => {
    const r = await api('PUT', '/users/me', { token: stu1.token, body: { phone: '13911112222' } });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.user.phone, '13911112222', '手机号');
  });

  // ---------- 2b. 邮箱验证码与账户体系（v2）----------
  suite('邮箱验证码');

  await test('验证码错误无法注册（40907）', async () => {
    const r = await api('POST', '/auth/register', {
      body: {
        student_id: `qa_${RUN}_badcode`,
        name: 'QA坏验证码',
        password: 'qa123456',
        email: `qa_${RUN}_badcode@example.com`,
        email_code: '000000',
      },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40907, '错误码');
  });

  await test('重复邮箱注册被拒（40906）', async () => {
    const email = `qa_${RUN}_dupemail@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register' } });
    assert(sent.body.data?.dev_code, '未收到 dev_code');
    const r = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_dupemail`, name: 'QA重复邮箱', password: 'qa123456', email, email_code: sent.body.data.dev_code },
    });
    assertEq(r.status, 200, '首次注册 HTTP 状态');
    // 同一邮箱再次注册：邮箱查重先于验证码
    const r2 = await api('POST', '/auth/register', {
      body: { student_id: `qa_${RUN}_dupemail2`, name: 'QA重复邮箱二', password: 'qa123456', email, email_code: '123456' },
    });
    assertEq(r2.status, 409, 'HTTP 状态');
    assertEq(r2.body.code, 40906, '错误码');
  });

  await test('绑定/更换邮箱成功（PUT /users/me/email，purpose=bind_email）', async () => {
    const email = `qa_${RUN}_bind@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { token: stu2.token, body: { email, purpose: 'bind_email' } });
    assertEq(sent.body.code, 0, '发送 bind 验证码 code');
    assert(sent.body.data?.dev_code, '未收到 dev_code');
    const r = await api('PUT', '/users/me/email', { token: stu2.token, body: { email, email_code: sent.body.data.dev_code } });
    assertEq(r.body.code, 0, '绑定 code');
    assertEq(r.body.data.user.email, email, '绑定后邮箱');
    assertEq(r.body.data.user.email_verified, 1, 'email_verified');
    const me = await api('GET', '/auth/me', { token: stu2.token });
    assertEq(me.body.data.user.email, email, 'me 接口应返回新邮箱');
  });

  // ---------- 2c. 自助改密（F1）----------
  suite('自助改密');
  let pwdUser;
  await test('注册专用改密账号', async () => {
    pwdUser = await registerUser('pwd1', 'QA改密用户');
  });

  await test('旧密码错误无法改密（40002）', async () => {
    const r = await api('POST', '/auth/password', {
      token: pwdUser.token,
      body: { old_password: 'wrong-old', new_password: 'newpass123' },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40002, '错误码');
  });

  await test('新密码少于 6 位被后端拒绝（40001）', async () => {
    const r = await api('POST', '/auth/password', {
      token: pwdUser.token,
      body: { old_password: 'qa123456', new_password: '123' },
    });
    assertEq(r.body.code, 40001, '错误码');
  });

  await test('自助改密成功并收到站内信；新密码可登录', async () => {
    const r = await api('POST', '/auth/password', {
      token: pwdUser.token,
      body: { old_password: 'qa123456', new_password: 'newpass123' },
    });
    assertEq(r.body.code, 0, '改密 code');
    const n = await api('GET', '/notifications?page_size=50', { token: pwdUser.token });
    assert(n.body.data.list.some((x) => x.type === 'password_changed'), '应收到改密站内信');
    // 新密码登录成功（登录限流 10 次/5 分钟/IP，旧密码失效检查见手动回归）
    const ok = await api('POST', '/auth/login', { body: { student_id: pwdUser.user.student_id, password: 'newpass123' } });
    assertEq(ok.body.code, 0, '新密码登录 code');
  });

  // ---------- 2d. 忘记密码（F2）----------
  suite('忘记密码');
  await test('学号与邮箱不匹配时不发码且中性提示（防枚举）', async () => {
    const r = await api('POST', '/auth/email-code/send', {
      body: { student_id: `qa_${RUN}_stu1`, email: `qa_${RUN}_notexist@example.com`, purpose: 'reset_password' },
    });
    assertEq(r.status, 200, 'HTTP 状态');
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data, null, '不应返回 dev_code 等数据');
    assert(/若信息匹配/.test(r.body.message || ''), '应为中性文案');
  });

  await test('匹配的学号+邮箱可重置密码，重置后可登录且验证码一次性', async () => {
    const sent = await api('POST', '/auth/email-code/send', {
      body: { student_id: stu1.user.student_id, email: stu1.user.email, purpose: 'reset_password' },
    });
    assertEq(sent.body.code, 0, '发送重置验证码 code');
    assert(sent.body.data?.dev_code, '未收到 dev_code');
    const r = await api('POST', '/auth/password/reset', {
      body: {
        student_id: stu1.user.student_id,
        email: stu1.user.email,
        email_code: sent.body.data.dev_code,
        new_password: 'resetpass1',
      },
    });
    assertEq(r.body.code, 0, '重置 code');
    // 新密码登录成功（登录限流 10 次/5 分钟/IP，旧密码失效检查见手动回归）
    const ok = await api('POST', '/auth/login', { body: { student_id: stu1.user.student_id, password: 'resetpass1' } });
    assertEq(ok.body.code, 0, '新密码登录 code');
    // 同一验证码不可二次使用
    const again = await api('POST', '/auth/password/reset', {
      body: {
        student_id: stu1.user.student_id,
        email: stu1.user.email,
        email_code: sent.body.data.dev_code,
        new_password: 'resetpass2',
      },
    });
    assertEq(again.body.code, 40907, '验证码应已作废');
  });

  // ---------- 3. 活动闭环（发布→审核→公开） ----------
  suite('活动闭环');
  let event1, event2, event3, eventPast, eventXss;

  await test('发布活动后 status=pending（不公开）', async () => {
    const r = await api('POST', '/events', { token: org1.token, body: eventPayload(`QA活动一_${RUN}`, { capacity: 2 }) });
    assertEq(r.body.code, 0, 'code');
    event1 = r.body.data.event;
    assertEq(event1.status, 'pending', '初始状态');
  });

  await test('pending 活动不出现在公开列表', async () => {
    const r = await api('GET', `/events?keyword=QA活动一_${RUN}&page_size=50`);
    assertEq(r.body.code, 0, 'code');
    assert(!r.body.data.list.some((e) => e.id === event1.id), 'pending 活动不应公开');
  });

  await test('pending 活动详情对公众不可见（40401）', async () => {
    const r = await api('GET', `/events/${event1.id}`, { token: stu1.token });
    assertEq(r.status, 404, 'HTTP 状态');
  });

  await test('管理员审核通过 → 出现在公开列表且详情可见', async () => {
    const rv = await api('PUT', `/admin/events/${event1.id}/review`, { token: adminToken, body: { action: 'approve' } });
    assertEq(rv.body.code, 0, '审核 code');
    assertEq(rv.body.data.event.status, 'approved', '审核后状态');
    const list = await api('GET', `/events?keyword=QA活动一_${RUN}`);
    assert(list.body.data.list.some((e) => e.id === event1.id), '审核后应出现在公开列表');
    const det = await api('GET', `/events/${event1.id}`);
    assertEq(det.body.data.event.id, event1.id, '详情可见');
    assertEq(det.body.data.waitlist_count, 0, '候补人数初始为 0');
  });

  await test('管理员拒绝活动需填理由并置 rejected', async () => {
    const cr = await api('POST', '/events', { token: org2.token, body: eventPayload(`QA被拒活动_${RUN}`) });
    const eid = cr.body.data.event.id;
    const noReason = await api('PUT', `/admin/events/${eid}/review`, { token: adminToken, body: { action: 'reject' } });
    assertEq(noReason.body.code, 40001, '缺理由应参数校验失败');
    const rj = await api('PUT', `/admin/events/${eid}/review`, { token: adminToken, body: { action: 'reject', reason: '内容不合规' } });
    assertEq(rj.body.code, 0, '拒绝 code');
    assertEq(rj.body.data.event.status, 'rejected', '状态');
    assertEq(rj.body.data.event.reject_reason, '内容不合规', '拒绝理由');
  });

  await test('富文本 XSS 过滤：<script> 被清除', async () => {
    const r = await api('POST', '/events', {
      token: org1.token,
      body: eventPayload(`QAXSS_${RUN}`, { description: '<p>正常</p><script>alert(1)</script>' }),
    });
    eventXss = r.body.data.event;
    assert(!eventXss.description.includes('<script>'), 'description 不应包含 <script>');
    assert(eventXss.description.includes('<p>正常</p>'), '合法标签应保留');
  });

  // ---------- 4. 报名闭环（直接报名） ----------
  suite('报名闭环');
  let reg1;

  await test('报名成功（approved）且 approved_count=1', async () => {
    const r = await api('POST', `/events/${event1.id}/register`, { token: stu1.token, body: { remark: '想去' } });
    assertEq(r.body.code, 0, 'code');
    reg1 = r.body.data.registration;
    assertEq(reg1.status, 'approved', '报名状态');
    assertEq(r.body.data.waitlisted, false, 'waitlisted 标记');
    const det = await api('GET', `/events/${event1.id}`, { token: stu1.token });
    assertEq(det.body.data.event.approved_count, 1, 'approved_count');
    assertEq(det.body.data.my_registration.status, 'approved', 'my_registration');
  });

  await test('重复报名被拒（40902）', async () => {
    const r = await api('POST', `/events/${event1.id}/register`, { token: stu1.token, body: {} });
    assertEq(r.status, 409, 'HTTP 状态');
    assertEq(r.body.code, 40902, '错误码');
  });

  await test('取消报名释放名额（approved_count 归零）', async () => {
    const r = await api('POST', `/registrations/${reg1.id}/cancel`, { token: stu1.token });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.promoted, false, '无候补时 promoted=false');
    const det = await api('GET', `/events/${event1.id}`);
    assertEq(det.body.data.event.approved_count, 0, 'approved_count 应释放');
  });

  await test('取消后名额释放可重新报名成功', async () => {
    const r = await api('POST', `/events/${event1.id}/register`, { token: stu1.token, body: {} });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.registration.status, 'approved', '重新报名状态');
    reg1 = r.body.data.registration;
  });

  await test('报名已截止的活动返回 40904', async () => {
    const now = Date.now();
    const cr = await api('POST', '/events', {
      token: org1.token,
      body: eventPayload(`QA已截止_${RUN}`, {
        start_time: new Date(now - 30 * 60e3).toISOString(),
        signup_deadline: new Date(now - 60 * 60e3).toISOString(),
        end_time: new Date(now + 2 * 3600e3).toISOString(),
      }),
    });
    eventPast = cr.body.data.event;
    await api('PUT', `/admin/events/${eventPast.id}/review`, { token: adminToken, body: { action: 'approve' } });
    const r = await api('POST', `/events/${eventPast.id}/register`, { token: stu1.token, body: {} });
    assertEq(r.status, 409, 'HTTP 状态');
    assertEq(r.body.code, 40904, '错误码');
  });

  // ---------- 5. 防超卖（并发报名 capacity=1，v2：满员转候补不报错） ----------
  suite('防超卖');
  await test('capacity=1 两人并发报名：恰一个成功、一个候补（不超卖）', async () => {
    const cr = await api('POST', '/events', { token: org1.token, body: eventPayload(`QA秒杀_${RUN}`, { capacity: 1 }) });
    event2 = cr.body.data.event;
    await api('PUT', `/admin/events/${event2.id}/review`, { token: adminToken, body: { action: 'approve' } });
    const [r1, r2] = await Promise.all([
      api('POST', `/events/${event2.id}/register`, { token: stu1.token, body: {} }),
      api('POST', `/events/${event2.id}/register`, { token: stu2.token, body: {} }),
    ]);
    const codes = [r1.body.code, r2.body.code].sort();
    assertEq(codes[0], 0, '两人均应成功（直接或候补）');
    assertEq(codes[1], 0, '两人均应成功（直接或候补）');
    const statuses = [r1.body.data.registration.status, r2.body.data.registration.status].sort();
    assertEq(statuses[0], 'approved', '应恰有一个 approved');
    assertEq(statuses[1], 'waitlisted', '另一个应候补（v2 满员转候补）');
    const det = await api('GET', `/events/${event2.id}`);
    assertEq(det.body.data.event.approved_count, 1, 'approved_count 不得超卖');
    assertEq(det.body.data.waitlist_count, 1, '候补 1 人');
  });

  // ---------- 6. 报名审核流（require_approval=1） ----------
  suite('报名审核流');
  let reg3, reg4;

  await test('需审核活动：学生报名后为 pending 且不占名额', async () => {
    const cr = await api('POST', '/events', {
      token: org1.token,
      body: eventPayload(`QA需审核_${RUN}`, { capacity: 1, require_approval: true }),
    });
    event3 = cr.body.data.event;
    await api('PUT', `/admin/events/${event3.id}/review`, { token: adminToken, body: { action: 'approve' } });
    const r = await api('POST', `/events/${event3.id}/register`, { token: stu3.token, body: {} });
    assertEq(r.body.code, 0, 'code');
    reg3 = r.body.data.registration;
    assertEq(reg3.status, 'pending', '报名状态');
    const det = await api('GET', `/events/${event3.id}`);
    assertEq(det.body.data.event.approved_count, 0, 'pending 不应占名额');
  });

  await test('非发布者审核报名被拒（40301）', async () => {
    const r = await api('PUT', `/registrations/${reg3.id}/review`, { token: org2.token, body: { action: 'approve' } });
    assertEq(r.status, 403, 'HTTP 状态');
    assertEq(r.body.code, 40301, '错误码');
  });

  await test('发布者 approve 后报名成功且占用名额', async () => {
    const r = await api('PUT', `/registrations/${reg3.id}/review`, { token: org1.token, body: { action: 'approve' } });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.registration.status, 'approved', '审核后状态');
    const det = await api('GET', `/events/${event3.id}`);
    assertEq(det.body.data.event.approved_count, 1, '名额应被占用');
    // 报名人应收到站内信
    const n = await api('GET', '/notifications?page_size=50', { token: stu3.token });
    assert(n.body.data.list.some((x) => x.type === 'registration_approved'), '应收到报名通过站内信');
  });

  await test('满员后再 approve 返回 40903 名额已满', async () => {
    const r = await api('POST', `/events/${event3.id}/register`, { token: stu4.token, body: {} });
    assertEq(r.body.code, 0, 'code');
    reg4 = r.body.data.registration;
    const rv = await api('PUT', `/registrations/${reg4.id}/review`, { token: org1.token, body: { action: 'approve' } });
    assertEq(rv.status, 409, 'HTTP 状态');
    assertEq(rv.body.code, 40903, '错误码');
  });

  await test('发布者 reject 后报名人可重新报名', async () => {
    const rv = await api('PUT', `/registrations/${reg4.id}/review`, { token: org1.token, body: { action: 'reject' } });
    assertEq(rv.body.code, 0, 'code');
    assertEq(rv.body.data.registration.status, 'rejected', '拒绝后状态');
    const re = await api('POST', `/events/${event3.id}/register`, { token: stu4.token, body: {} });
    assertEq(re.body.code, 0, '被拒后重新报名 code');
  });

  // ---------- 7. 候补名单（F5） ----------
  suite('候补名单');
  let wlEvent, wlRegApproved, wlRegWait;

  await test('满员后报名进入候补并返回顺位（waitlisted 第 1 位）', async () => {
    const cr = await api('POST', '/events', { token: org1.token, body: eventPayload(`QA候补_${RUN}`, { capacity: 1 }) });
    wlEvent = cr.body.data.event;
    await api('PUT', `/admin/events/${wlEvent.id}/review`, { token: adminToken, body: { action: 'approve' } });
    // stu1 占满名额
    const r1 = await api('POST', `/events/${wlEvent.id}/register`, { token: stu1.token, body: {} });
    assertEq(r1.body.code, 0, 'stu1 报名 code');
    wlRegApproved = r1.body.data.registration;
    // stu2 满员报名 → 候补第 1 位
    const r2 = await api('POST', `/events/${wlEvent.id}/register`, { token: stu2.token, body: {} });
    assertEq(r2.body.code, 0, 'stu2 候补报名 code');
    assertEq(r2.body.data.waitlisted, true, '应标记候补');
    assertEq(r2.body.data.waitlist_position, 1, '候补顺位');
    wlRegWait = r2.body.data.registration;
    assertEq(wlRegWait.status, 'waitlisted', '报名状态');
    // 详情候补人数
    const det = await api('GET', `/events/${wlEvent.id}`);
    assertEq(det.body.data.waitlist_count, 1, '候补人数');
    assertEq(det.body.data.event.approved_count, 1, '名额未被候补占用');
  });

  await test('取消 approved 报名后自动递补候补第 1 位并通知', async () => {
    const r = await api('POST', `/registrations/${wlRegApproved.id}/cancel`, { token: stu1.token });
    assertEq(r.body.code, 0, '取消 code');
    assertEq(r.body.data.promoted, true, '应发生递补');
    const det = await api('GET', `/events/${wlEvent.id}`);
    assertEq(det.body.data.event.approved_count, 1, '递补后名额计数');
    assertEq(det.body.data.waitlist_count, 0, '递补后候补清空');
    // 被递补者状态与站内信
    const n = await api('GET', '/notifications?page_size=50', { token: stu2.token });
    assert(n.body.data.list.some((x) => x.type === 'waitlist_promoted'), '被递补者应收到站内信');
    const reg = await api('GET', `/events/${wlEvent.id}/registrations?status=approved`, { token: org1.token });
    assert(reg.body.data.list.some((x) => x.student_id === stu2.user.student_id), 'stu2 应已转为 approved');
  });

  await test('候补者可主动取消候补（截止前），取消者不再被递补', async () => {
    // 当前 wlEvent：stu2 已由递补转为 approved（capacity=1 已满）
    // stu3、stu4 加入候补（第 1、2 位）
    const r3 = await api('POST', `/events/${wlEvent.id}/register`, { token: stu3.token, body: {} });
    assertEq(r3.body.data.waitlisted, true, 'stu3 应候补');
    assertEq(r3.body.data.waitlist_position, 1, 'stu3 候补第 1 位');
    const r4 = await api('POST', `/events/${wlEvent.id}/register`, { token: stu4.token, body: {} });
    assertEq(r4.body.data.waitlist_position, 2, 'stu4 候补第 2 位');
    // stu3（第 1 位）主动取消候补
    const c = await api('POST', `/registrations/${r3.body.data.registration.id}/cancel`, { token: stu3.token });
    assertEq(c.body.code, 0, '取消候补 code');
    assertEq(c.body.data.promoted, false, '取消候补不应触发递补');
    // stu2（approved）取消 → 递补第 1 位（此时为 stu4，而非已取消的 stu3）
    const c2 = await api('POST', `/registrations/${wlRegWait.id}/cancel`, { token: stu2.token });
    assertEq(c2.body.data.promoted, true, '应递补给 stu4');
    const list = await api('GET', `/events/${wlEvent.id}/registrations?status=approved`, { token: org1.token });
    const approvedIds = list.body.data.list.map((x) => x.student_id);
    assert(approvedIds.includes(stu4.user.student_id), 'stu4 应被递补');
    assert(!approvedIds.includes(stu3.user.student_id), '已取消候补的 stu3 不应被递补');
  });

  let promoteEvent;
  await test('组织者手动提升候补（扩容后）+ 移出候补 + 状态校验', async () => {
    // 构造：capacity=1，stu3 占名额，stu4 候补
    const cr = await api('POST', '/events', { token: org1.token, body: eventPayload(`QA提升_${RUN}`, { capacity: 1 }) });
    promoteEvent = cr.body.data.event;
    await api('PUT', `/admin/events/${promoteEvent.id}/review`, { token: adminToken, body: { action: 'approve' } });
    const r3 = await api('POST', `/events/${promoteEvent.id}/register`, { token: stu3.token, body: {} });
    assertEq(r3.body.data.registration.status, 'approved', 'stu3 直接成功');
    const r4 = await api('POST', `/events/${promoteEvent.id}/register`, { token: stu4.token, body: {} });
    assertEq(r4.body.data.waitlisted, true, 'stu4 应候补');
    assertEq(r4.body.data.waitlist_position, 1, 'stu4 候补第 1 位');
    const r5 = await api('POST', `/events/${promoteEvent.id}/register`, { token: stu5.token, body: {} });
    assertEq(r5.body.data.waitlist_position, 2, 'stu5 候补第 2 位');
    // 名额已满时提升被拒（40903）
    const full = await api('PUT', `/registrations/${r4.body.data.registration.id}/waitlist/promote`, { token: org1.token });
    assertEq(full.status, 409, 'HTTP 状态');
    assertEq(full.body.code, 40903, '错误码');
    // 组织者扩容：capacity 1→2（编辑后重新审核，报名记录保留）
    const edited = await api('PUT', `/events/${promoteEvent.id}`, {
      token: org1.token,
      body: eventPayload(`QA提升_${RUN}`, { capacity: 2 }),
    });
    assertEq(edited.body.code, 0, '编辑 code');
    assertEq(edited.body.data.event.status, 'pending', '编辑后重新待审核');
    await api('PUT', `/admin/events/${promoteEvent.id}/review`, { token: adminToken, body: { action: 'approve' } });
    // 手动提升 stu4 成功
    const p = await api('PUT', `/registrations/${r4.body.data.registration.id}/waitlist/promote`, { token: org1.token });
    assertEq(p.body.code, 0, '提升 code');
    assertEq(p.body.data.registration.status, 'approved', '提升后状态');
    const det = await api('GET', `/events/${promoteEvent.id}`);
    assertEq(det.body.data.event.approved_count, 2, '名额计数');
    assertEq(det.body.data.waitlist_count, 1, '剩余候补 1 人');
    const n = await api('GET', '/notifications?page_size=50', { token: stu4.token });
    assert(n.body.data.list.some((x) => x.type === 'waitlist_promoted'), '被提升者应收到站内信');
    // 非发布者不能操作候补（40301）
    const forbidden = await api('PUT', `/registrations/${r5.body.data.registration.id}/waitlist/promote`, { token: org2.token });
    assertEq(forbidden.status, 403, 'HTTP 状态');
    assertEq(forbidden.body.code, 40301, '错误码');
    // 移出 stu5 候补
    const rm = await api('POST', `/registrations/${r5.body.data.registration.id}/waitlist/remove`, { token: org1.token });
    assertEq(rm.body.code, 0, '移出 code');
    const det2 = await api('GET', `/events/${promoteEvent.id}`);
    assertEq(det2.body.data.waitlist_count, 0, '移出后候补清空');
    // 移出后再操作 → 40905（非候补状态）
    const rm2 = await api('POST', `/registrations/${r5.body.data.registration.id}/waitlist/remove`, { token: org1.token });
    assertEq(rm2.status, 409, 'HTTP 状态');
    assertEq(rm2.body.code, 40905, '错误码');
  });

  await test('候补名单页签与顺位列可查（status=waitlisted）', async () => {
    // wlEvent 当前：stu4 approved（capacity=1 已满）
    const r5 = await api('POST', `/events/${wlEvent.id}/register`, { token: stu5.token, body: {} });
    if (r5.body.code === 0 && r5.body.data.waitlisted) {
      const list = await api('GET', `/events/${wlEvent.id}/registrations?status=waitlisted`, { token: org1.token });
      assert(list.body.data.list.length >= 1, '候补名单应非空');
      assert(typeof list.body.data.list[0].waitlist_position === 'number', '应附顺位');
      // 清理
      await api('POST', `/registrations/${r5.body.data.registration.id}/cancel`, { token: stu5.token });
    }
  });

  // ---------- 8. 权限边界 ----------
  suite('权限边界');

  await test('普通用户访问管理员接口被拒（40301）', async () => {
    const r = await api('GET', '/admin/overview', { token: stu1.token });
    assertEq(r.status, 403, 'HTTP 状态');
    assertEq(r.body.code, 40301, '错误码');
  });

  await test('非发布者修改他人活动被拒（40301）', async () => {
    const r = await api('PUT', `/events/${event1.id}`, { token: org2.token, body: eventPayload('越权修改') });
    assertEq(r.status, 403, 'HTTP 状态');
    assertEq(r.body.code, 40301, '错误码');
  });

  await test('非发布者查看他人活动名单被拒（40301）', async () => {
    const r = await api('GET', `/events/${event1.id}/registrations`, { token: stu2.token });
    assertEq(r.status, 403, 'HTTP 状态');
  });

  await test('被禁用用户的 token 立即失效（40301）', async () => {
    const dis = await api('PUT', `/admin/users/${stu5.user.id}/status`, { token: adminToken, body: { status: 'disabled' } });
    assertEq(dis.body.code, 0, '禁用 code');
    const me = await api('GET', '/auth/me', { token: stu5.token });
    assertEq(me.status, 403, '禁用后 token HTTP 状态');
    assertEq(me.body.code, 40301, '禁用后 token 错误码');
    // 登录限流 10 次/5 分钟/IP，禁用后登录被拒（40301）由手动回归覆盖
    // 恢复，避免影响后续重跑（学号带时间戳不影响，但保持整洁）
    await api('PUT', `/admin/users/${stu5.user.id}/status`, { token: adminToken, body: { status: 'active' } });
  });

  // ---------- 10. 管理员重置密码与审计（F1/F6） ----------
  suite('管理员重置密码');
  let resetTarget;
  await test('注册专用被重置账号', async () => {
    resetTarget = await registerUser('reset1', 'QA被重置用户');
  });

  await test('管理员不能重置自己的密码（40301）', async () => {
    const adminMe = await api('GET', '/auth/me', { token: adminToken });
    const r = await api('PUT', `/admin/users/${adminMe.body.data.user.id}/password/reset`, { token: adminToken });
    assertEq(r.status, 403, 'HTTP 状态');
    assertEq(r.body.code, 40301, '错误码');
  });

  await test('管理员重置用户密码返回一次性临时密码，可用其登录', async () => {
    const r = await api('PUT', `/admin/users/${resetTarget.user.id}/password/reset`, { token: adminToken });
    assertEq(r.body.code, 0, '重置 code');
    assert(r.body.data.temp_password && r.body.data.temp_password.length >= 10, '应返回临时密码');
    // 临时密码可登录
    const login = await api('POST', '/auth/login', { body: { student_id: resetTarget.user.student_id, password: r.body.data.temp_password } });
    assertEq(login.body.code, 0, '临时密码登录 code');
    // 被重置用户收到站内信
    const n = await api('GET', '/notifications?page_size=50', { token: resetTarget.token });
    assert(n.body.data.list.some((x) => x.type === 'password_reset'), '应收到密码重置站内信');
  });

  suite('审计日志');
  await test('审计日志可查：含审核/禁用/重置密码记录，且只读', async () => {
    const r = await api('GET', '/admin/audit-logs?page_size=50', { token: adminToken });
    assertEq(r.body.code, 0, '查询 code');
    const actions = r.body.data.list.map((x) => x.action);
    assert(actions.includes('user_password_reset'), '应含 user_password_reset');
    assert(actions.includes('user_disable'), '应含 user_disable');
    assert(actions.includes('event_review_approve'), '应含 event_review_approve');
    // 出参结构：admin 嵌套 {id, student_id, name}
    const first = r.body.data.list[0];
    assert(first.admin && first.admin.id && first.admin.student_id && first.admin.name, 'admin 应为嵌套对象');
    // detail 不得泄露临时密码
    const resetLog = r.body.data.list.find((x) => x.action === 'user_password_reset');
    assert(resetLog.detail && resetLog.detail.temp_password_generated === true, 'detail 应为标记对象');
    assert(!JSON.stringify(resetLog.detail).includes(resetTarget.user.student_id), 'detail 不含敏感信息');
    // 按操作类型筛选
    const filtered = await api('GET', '/admin/audit-logs?action=user_password_reset', { token: adminToken });
    assert(filtered.body.data.list.every((x) => x.action === 'user_password_reset'), '筛选应生效');
    // 无写接口：日志页只读（无编辑/删除路由）
    const put = await api('PUT', '/admin/audit-logs/1', { token: adminToken, body: {} });
    assertEq(put.status, 404, '审计日志无写接口');
  });

  // ---------- 11. 报名趋势（F8） ----------
  suite('报名趋势');
  await test('单活动趋势接口返回连续日期序列', async () => {
    const r = await api('GET', `/events/${wlEvent.id}/registrations/trend?days=30`, { token: org1.token });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.days.length, 30, '天数');
    assert(typeof r.body.data.total === 'number', 'total');
    // 日期连续（UTC+8 归日期）
    const dates = r.body.data.days.map((d) => d.date);
    assertEq(dates.length, new Set(dates).size, '日期不应重复');
    const daysParam = await api('GET', `/events/${wlEvent.id}/registrations/trend?days=200`, { token: org1.token });
    assertEq(daysParam.body.data.days.length, 90, 'days 上限 90');
  });

  await test('全站趋势接口（管理员）返回近 30 天序列', async () => {
    const r = await api('GET', '/admin/overview/trend?days=30', { token: adminToken });
    assertEq(r.body.code, 0, 'code');
    assertEq(r.body.data.days.length, 30, '天数');
    assert(r.body.data.total > 0, '全站应有报名数据');
  });

  // ---------- 12. 上传魔数校验（S5） ----------
  suite('上传校验');
  const uploadsDir = path.resolve(__dirname, '..', 'server', 'uploads');

  await test('伪造 MIME 的文本文件（.jpg）被拒且不在 uploads 残留', async () => {
    let before = [];
    try { before = fs.readdirSync(uploadsDir); } catch { /* 目录可能不存在 */ }
    const form = new FormData();
    form.append('file', new Blob(['this is not an image, just text'], { type: 'image/jpeg' }), 'fake.jpg');
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org1.token}` },
      body: form,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    assertEq(res.status, 400, 'HTTP 状态');
    assertEq(json && json.code, 40001, '错误码');
    let after = [];
    try { after = fs.readdirSync(uploadsDir); } catch { /* ignore */ }
    assertEq(after.length, before.length, '被拒文件不得残留在 uploads/');
  });

  await test('真实 PNG（魔数匹配）上传成功', async () => {
    const pngPath = path.resolve(__dirname, '..', 'client', 'public', 'icons', 'icon-192.png');
    const buf = fs.readFileSync(pngPath);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'image/png' }), 'good.png');
    const res = await fetch(`${BASE}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${org1.token}` },
      body: form,
    });
    const text = await res.text();
    const json = JSON.parse(text);
    assertEq(json.code, 0, '上传 code');
    assert(json.data.url.startsWith('/uploads/'), '应返回站内路径');
  });

  // ---------- 13. CSV 导出 ----------
  suite('CSV 导出');
  await test('名单导出：BOM 头 + 固定列 + 正确文件名', async () => {
    const res = await api('GET', `/events/${event1.id}/registrations/export`, { token: org1.token, raw: true });
    assertEq(res.status, 200, 'HTTP 状态');
    // 注意：res.text() 的 UTF-8 解码会自动剥离 BOM，须用 arrayBuffer 验证原始字节 EF BB BF
    const buf = Buffer.from(await res.arrayBuffer());
    assert(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf, 'CSV 应以 BOM(EF BB BF) 开头');
    const text = buf.toString('utf8');
    const header = text.replace(/^﻿/, '').split('\r\n')[0].trim();
    assertEq(header, '"学号","姓名","手机号","备注","状态","报名时间"', 'CSV 列头');
    const cd = res.headers.get('content-disposition') || '';
    assert(cd.includes(`event_${event1.id}_registrations.csv`), '文件名不符');
    assert(text.includes('QA学生一'), 'CSV 应含已报名学生');
  });

  // ---------- 14. 活动取消与通知 ----------
  suite('活动取消');
  await test('发布者取消活动 → status=cancelled，报名成功用户收到站内信', async () => {
    const r = await api('POST', `/events/${event1.id}/cancel`, { token: org1.token });
    assertEq(r.body.code, 0, 'code');
    const det = await api('GET', `/events/${event1.id}`, { token: org1.token });
    assertEq(det.body.data.event.status, 'cancelled', '状态');
    const n = await api('GET', '/notifications?page_size=50', { token: stu1.token });
    assert(n.body.data.list.some((x) => x.type === 'event_cancelled'), '报名用户应收到取消通知');
  });

  await test('管理员下架活动 → 公开不可见', async () => {
    const off = await api('PUT', `/admin/events/${event3.id}/offline`, { token: adminToken });
    assertEq(off.body.code, 0, '下架 code');
    const det = await api('GET', `/events/${event3.id}`);
    assertEq(det.status, 404, '下架后公众详情 404');
  });

  // ---------- 15. 登录失败锁定（F12，放最后：消耗登录限流额度） ----------
  suite('登录锁定');
  await test('连续 5 次密码错误后账号锁定（423/40302），锁定期间不再校验密码', async () => {
    const victim = await registerUser('lock1', 'QA锁定用户');
    const sid = victim.user.student_id;
    // 前 4 次错误密码：40101 + 剩余次数提示
    for (let i = 0; i < 4; i++) {
      const r = await api('POST', '/auth/login', { body: { student_id: sid, password: 'wrong-pass' } });
      assertEq(r.body.code, 40101, `第 ${i + 1} 次错误应 40101`);
      assert(/还可尝试/.test(r.body.message || ''), '应提示剩余次数');
    }
    // 第 5 次错误：达到上限，触发锁定（423/40302）
    const trigger = await api('POST', '/auth/login', { body: { student_id: sid, password: 'wrong-pass' } });
    assertEq(trigger.status, 423, '触发锁定 HTTP 状态');
    assertEq(trigger.body.code, 40302, '错误码');
    assert(/密码错误次数过多/.test(trigger.body.message || ''), '应为锁定触发文案');
    // 第 6 次：锁定期间即使密码正确也直接返回锁定，不再校验密码
    const locked = await api('POST', '/auth/login', { body: { student_id: sid, password: 'qa123456' } });
    assertEq(locked.status, 423, '锁定期间 HTTP 状态');
    assertEq(locked.body.code, 40302, '错误码');
    assert(/已锁定/.test(locked.body.message || ''), '应为锁定文案');
  });

  // ---------- 汇总 ----------
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log('\n========== 测试汇总 ==========');
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
