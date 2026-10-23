/**
 * 校园活动报名系统 — 图形验证码合并测试（captcha merge）
 *
 * 验证内容：线上 captcha 三处强制点合并进 v2 后的行为与线上一致——
 *   注册 / 登录 / 发邮箱验证码 均要求图形验证码；一次性消费；错误统一 40010。
 * 运行前提：服务器 SMTP_DEV_ECHO=1（验证码答案经 /debug/echo 回显，不发真邮件）。
 * 运行方式：先启动后端（:3000），再执行 `node tests/captcha-merge.test.js`
 * 幂等性：每次运行使用时间戳前缀生成全新学号/邮箱，可重复执行。
 */

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

/** 统一请求助手：返回 {status, body} */
async function api(method, path, { token, body } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* 非 JSON */
  }
  return { status: res.status, body: json, text };
}

/** 取一组图形验证码 {captcha_id, captcha_code}（DEV_ECHO 模式经 /debug/echo 取回答案） */
async function fetchCaptcha() {
  const cap = await api('GET', '/auth/captcha');
  assertEq(cap.body.code, 0, '获取图形验证码 code');
  assert(cap.body.data && cap.body.data.id, '应返回验证码 id');
  assert(/<svg/i.test(cap.body.data.svg || ''), '应返回 SVG 图形');
  const echo = await api('GET', `/debug/echo?captcha_id=${cap.body.data.id}`);
  const answer = echo.body.data && echo.body.data.captchaText;
  assert(answer, 'DEV_ECHO 模式下应能取到验证码答案');
  return { captcha_id: cap.body.data.id, captcha_code: answer };
}

/** 完整注册流程（图形验证码 + 邮箱验证码），返回 {token, user} */
async function registerUser(suffix, name) {
  const student_id = `cap_${RUN}_${suffix}`;
  const email = `cap_${RUN}_${suffix}@example.com`;
  const cap = await fetchCaptcha();
  const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register', ...cap } });
  assertEq(sent.body.code, 0, `发送注册验证码 ${suffix} code`);
  assert(sent.body.data && sent.body.data.dev_code, `未收到 dev_code（请确保 SMTP_DEV_ECHO=1）：${suffix}`);
  const cap2 = await fetchCaptcha();
  const r = await api('POST', '/auth/register', {
    body: {
      student_id,
      name,
      password: 'qa123456',
      phone: '13800000000',
      email,
      email_code: sent.body.data.dev_code,
      ...cap2,
    },
  });
  assertEq(r.status, 200, `注册 ${suffix} HTTP 状态`);
  assertEq(r.body.code, 0, `注册 ${suffix} code`);
  return r.body.data;
}

async function main() {
  console.log(`captcha 合并测试目标：${BASE}，运行前缀：cap_${RUN}_*`);
  console.log('提示：要求服务器 SMTP_DEV_ECHO=1\n');

  // ---------- 1. 注册接口 ----------
  suite('图形验证码·注册');

  await test('GET /auth/captcha 返回 id + SVG 图形', async () => {
    const r = await api('GET', '/auth/captcha');
    assertEq(r.body.code, 0, 'code');
    assert(r.body.data.id, '有 id');
    assert(/<svg/i.test(r.body.data.svg), 'svg 内容');
  });

  await test('注册不带图形验证码字段 → 40001（zod 必填拦截）', async () => {
    const email = `cap_${RUN}_nocap@example.com`;
    const sent = await api('POST', '/auth/email-code/send', {
      body: { email, purpose: 'register', ...(await fetchCaptcha()) },
    });
    assertEq(sent.body.code, 0, '发码 code');
    const r = await api('POST', '/auth/register', {
      body: {
        student_id: `cap_${RUN}_nocap`,
        name: '无验证码用户',
        password: 'qa123456',
        email,
        email_code: sent.body.data.dev_code,
      },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40001, '错误码');
  });

  await test('注册带错误图形验证码 → 40010', async () => {
    const email = `cap_${RUN}_wrong@example.com`;
    const sent = await api('POST', '/auth/email-code/send', {
      body: { email, purpose: 'register', ...(await fetchCaptcha()) },
    });
    assertEq(sent.body.code, 0, '发码 code');
    const cap = await fetchCaptcha();
    const r = await api('POST', '/auth/register', {
      body: {
        student_id: `cap_${RUN}_wrong`,
        name: '错验证码用户',
        password: 'qa123456',
        email,
        email_code: sent.body.data.dev_code,
        captcha_id: cap.captcha_id,
        captcha_code: 'WRONG1',
      },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40010, '错误码');
  });

  await test('正确图形验证码 + 正确邮箱码 → 注册成功', async () => {
    const u = await registerUser('ok', '验证码齐全');
    assert(u.token, '拿到 token');
    assertEq(u.user.email_verified, 1, '邮箱已验证');
  });

  await test('图形验证码一次性：复用已消费的验证码 → 40010', async () => {
    const cap = await fetchCaptcha();
    const email = `cap_${RUN}_reuse@example.com`;
    const sent = await api('POST', '/auth/email-code/send', { body: { email, purpose: 'register', ...cap } });
    assertEq(sent.body.code, 0, '发码 code（消耗第一组验证码）');
    // 用同一组（已被发码接口消费的）验证码去注册，应被拒
    const r = await api('POST', '/auth/register', {
      body: {
        student_id: `cap_${RUN}_reuse`,
        name: '复用验证码',
        password: 'qa123456',
        email: `cap_${RUN}_reuse2@example.com`,
        email_code: sent.body.data.dev_code,
        ...cap,
      },
    });
    assertEq(r.body.code, 40010, '复用已消费验证码应被拒');
  });

  // ---------- 2. 登录接口 ----------
  suite('图形验证码·登录');

  await test('登录不带图形验证码字段 → 40001（zod 必填拦截）', async () => {
    const u = await registerUser('login1', '登录测试一');
    const r = await api('POST', '/auth/login', { body: { student_id: u.user.student_id, password: 'qa123456' } });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40001, '错误码');
  });

  await test('登录带错误图形验证码 → 40010', async () => {
    const u = await registerUser('login2', '登录测试二');
    const cap = await fetchCaptcha();
    const r = await api('POST', '/auth/login', {
      body: { student_id: u.user.student_id, password: 'qa123456', captcha_id: cap.captcha_id, captcha_code: 'WRONG1' },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40010, '错误码');
  });

  await test('正确图形验证码 + 正确密码 → 登录成功', async () => {
    const u = await registerUser('login3', '登录测试三');
    const cap = await fetchCaptcha();
    const r = await api('POST', '/auth/login', { body: { student_id: u.user.student_id, password: 'qa123456', ...cap } });
    assertEq(r.status, 200, 'HTTP 状态');
    assertEq(r.body.code, 0, 'code');
    assert(r.body.data.token, '拿到 token');
  });

  // ---------- 3. 发邮箱验证码接口 ----------
  suite('图形验证码·发邮箱验证码');

  await test('发邮箱验证码不带图形验证码字段 → 40001（zod 必填拦截）', async () => {
    const r = await api('POST', '/auth/email-code/send', {
      body: { email: `cap_${RUN}_send1@example.com`, purpose: 'register' },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40001, '错误码');
  });

  await test('发邮箱验证码带错误图形验证码 → 40010', async () => {
    const cap = await fetchCaptcha();
    const r = await api('POST', '/auth/email-code/send', {
      body: { email: `cap_${RUN}_send2@example.com`, purpose: 'register', captcha_id: cap.captcha_id, captcha_code: 'WRONG1' },
    });
    assertEq(r.status, 400, 'HTTP 状态');
    assertEq(r.body.code, 40010, '错误码');
  });

  await test('发邮箱验证码带正确图形验证码 → 成功并回显 dev_code', async () => {
    const cap = await fetchCaptcha();
    const r = await api('POST', '/auth/email-code/send', {
      body: { email: `cap_${RUN}_send3@example.com`, purpose: 'register', ...cap },
    });
    assertEq(r.body.code, 0, 'code');
    assert(r.body.data && r.body.data.dev_code, 'DEV_ECHO 模式应回显验证码');
  });
}

main().then(() => {
  const pass = results.filter((r) => r.pass).length;
  const fail = results.length - pass;
  console.log(`\n===== captcha 合并测试结果：${pass} 通过 / ${fail} 失败 =====`);
  process.exit(fail > 0 ? 1 : 0);
});
