/**
 * 种子数据：分类、管理员账号体系、演示内容。
 * 幂等：账号仅在不存在时创建；演示内容仅在「论坛无帖 / 无演示活动」时灌入一次。
 * 服务启动时自动调用，也可通过 `npm run seed` 单独执行。
 *
 * 管理员体系：1 个「大管理员」(super_admin，即主管理员账号) + 3 个「小管理员」(admin)。
 * 演示活动/帖子作者均为大管理员，用于上线预览。
 */
const bcrypt = require('bcryptjs');
const db = require('./connection');
const config = require('../config');
const eventService = require('../services/eventService');
const eventModel = require('../models/eventModel');
const postModel = require('../models/postModel');

/** 预置分类（按 sort 排序展示） */
const CATEGORIES = ['讲座', '社团', '体育', '文艺', '志愿', '其他'];

/** 3 个小管理员（role=admin）。密码可通过 SUB_ADMIN_PASSWORD 环境变量配置，默认 admin123，建议上线后修改。 */
const SUB_ADMIN_PASSWORD = process.env.SUB_ADMIN_PASSWORD || 'admin123';
const SUB_ADMINS = [
  { student_id: 'admin01', name: '小管理员 · 一' },
  { student_id: 'admin02', name: '小管理员 · 二' },
  { student_id: 'admin03', name: '小管理员 · 三' },
];

/** n 天后的当天 h 点（本地时间 → ISO UTC） */
function atDay(dOffset, h, m = 0) {
  const t = new Date(Date.now() + dOffset * 86400000);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
}

/** 演示内容：帖子 + 活动（作者=大管理员），仅首次灌入 */
function seedDemoContent(adminId) {
  // —— 论坛帖子（仅论坛空时）——
  const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts').get().c;
  if (postCount === 0) {
    const posts = [
      {
        title: '论坛使用指南 & 社区规范（发帖前必读）',
        topics: '公告,指南',
        pin: true,
        content:
          '<p>欢迎来到校园论坛！这里是大家讨论学习、分享趣事、互助交流的地方。</p>' +
          '<p><b>发帖前请阅读：</b>1. 友善交流，禁止人身攻击与广告；2. 不得发布违法违规内容；3. 求助帖请写清问题与已尝试的办法。</p>' +
          '<p>发现违规内容可联系管理员处理，祝大家用得开心。</p>',
      },
      {
        title: '高数 / 线代 / 大物 期末复习资料整理分享',
        topics: '学习,资料',
        pin: false,
        content:
          '<p>临近期末，把自己整理的<b>高数、线性代数、大学物理</b>复习笔记和真题汇总了一下。</p>' +
          '<p>需要的同学回复留言，我整理成链接发出来～也欢迎大家在评论区补充自己的资料！</p>',
      },
      {
        title: '图书馆抢座攻略 & 安静楼层推荐',
        topics: '学习,攻略',
        pin: false,
        content:
          '<p>亲测有效的抢座技巧：1. 开馆前 10 分钟到门口排队；2. 优先选 5-6 楼，人少插座多；3. 午休后 13:30 前回来座位还在。</p>' +
          '<p>你们有什么自习圣地？评论区交换一下～</p>',
      },
      {
        title: '社团招新季：30+ 社团怎么选？进来看',
        topics: '社团,招新',
        pin: true,
        content:
          '<p>一年一度的<b>社团招新</b>开始啦！学术类、文艺类、体育类、公益类应有尽有。</p>' +
          '<p>给纠结的同学三个建议：选 1-2 个真正感兴趣的，别贪多；先问学长学姐真实体验；平衡好时间与学业。想了解哪个社团，评论区见！</p>',
      },
      {
        title: '失物招领 & 二手闲置 · 互助专楼',
        topics: '互助,闲置',
        pin: false,
        content:
          '<p>捡到 / 丢了东西？教材、电动车、宿舍神器想出手？都在这个楼里回帖吧。</p>' +
          '<p>请写清：物品、时间地点、联系方式。交易注意安全，谨防诈骗～</p>',
      },
    ];
    for (const p of posts) {
      const row = postModel.create({ author_id: adminId, title: p.title, content: p.content, media: null, topics: p.topics });
      if (p.pin) postModel.setPinned(row.id, true);
    }
    console.log(`[seed] 已灌入演示论坛帖子 ×${posts.length}`);
  }

  // —— 演示活动（无演示活动时；标题含"科技文化节"作标记）——
  const demoEvent = db.prepare("SELECT id FROM events WHERE title LIKE '%科技文化节%' LIMIT 1").get();
  if (!demoEvent) {
    const evs = [
      { title: '校园科技文化节开幕式暨名师讲座', category_id: 1, location: '学校大礼堂', cap: 300, d: 2, pin: true,
        description: '<p>一年一度的校园科技文化节盛大开幕！开幕式特邀知名教授带来前沿科技讲座，现场还有创新作品展与互动体验，欢迎全体同学参加。</p>' },
      { title: '高等数学期中冲刺答疑专场', category_id: 1, location: '教学楼 A101', cap: 80, d: 4, pin: false,
        description: '<p>期中临近，高数老师现场答疑，重点讲解极限、微分中值定理与积分技巧。带上课本和错题本，来就完了！</p>' },
      { title: '金秋校园公益行 · 志愿者招募', category_id: 5, location: '学生活动中心', cap: 50, d: 6, pin: true,
        description: '<p>招募校园公益志愿者，参与社区服务、敬老院慰问与环保宣传。累计志愿时长，表现优异者开具证明，欢迎热心同学报名。</p>' },
      { title: '新生杯篮球友谊赛', category_id: 3, location: '东体育场', cap: 200, d: 8, pin: false,
        description: '<p>以院系为单位的篮球友谊赛，赛制轻松、重在参与。欢迎同学们到场为球员加油，感受热血青春！</p>' },
      { title: '校园十佳歌手大赛决赛', category_id: 4, location: '学校体育馆', cap: 800, d: 12, pin: false,
        description: '<p>从海选一路杀到决赛的唱将们今晚巅峰对决！现场投票 + 专业评审，一起来见证校园之星的诞生。</p>' },
    ];
    for (const e of evs) {
      const created = eventService.create(adminId, {
        title: e.title,
        category_id: e.category_id,
        cover_url: null,
        location: e.location,
        start_time: atDay(e.d, 9),
        end_time: atDay(e.d, 11),
        signup_deadline: atDay(e.d - 1, 18),
        capacity: e.cap,
        require_approval: false,
        description: e.description,
      });
      eventService.review(adminId, created.id, 'approve'); // 直接审核通过，便于预览
      if (e.pin) eventModel.setPinned(created.id, true);
    }
    console.log(`[seed] 已灌入演示活动 ×${evs.length}`);
  }
}

function runSeed() {
  const now = new Date().toISOString();

  const seedTx = db.transaction(() => {
    // 1. 预置分类
    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name, sort) VALUES (?, ?)');
    CATEGORIES.forEach((name, index) => insertCategory.run(name, index + 1));

    // 2. 主管理员 → 「大管理员」(super_admin)：不存在则建，存在则升级
    const existAdmin = db.prepare('SELECT id, role FROM users WHERE student_id = ?').get(config.admin.studentId);
    if (!existAdmin) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      db.prepare(
        `INSERT INTO users (student_id, name, phone, password_hash, role, status, created_at)
         VALUES (?, ?, NULL, ?, 'super_admin', 'active', ?)`
      ).run(config.admin.studentId, config.admin.name, passwordHash, now);
      console.log(`[seed] 已创建系统大管理员账号：${config.admin.studentId}`);
    } else if (existAdmin.role !== 'super_admin') {
      db.prepare("UPDATE users SET role = 'super_admin' WHERE student_id = ?").run(config.admin.studentId);
      console.log(`[seed] 已将主管理员 ${config.admin.studentId} 升级为大管理员(super_admin)`);
    }

    // 3. 三个小管理员（role=admin，不存在才建）
    for (const sa of SUB_ADMINS) {
      const exist = db.prepare('SELECT id FROM users WHERE student_id = ?').get(sa.student_id);
      if (!exist) {
        const hash = bcrypt.hashSync(SUB_ADMIN_PASSWORD, 10);
        db.prepare(
          `INSERT INTO users (student_id, name, phone, password_hash, role, status, created_at)
           VALUES (?, ?, NULL, ?, 'admin', 'active', ?)`
        ).run(sa.student_id, sa.name, hash, now);
        console.log(`[seed] 已创建小管理员账号：${sa.student_id}`);
      }
    }
  });

  seedTx();

  // 4. 演示内容（论坛空/无演示活动时，作者=大管理员）
  const superAdmin = db.prepare('SELECT id FROM users WHERE student_id = ?').get(config.admin.studentId);
  if (superAdmin) {
    try {
      seedDemoContent(superAdmin.id);
    } catch (err) {
      console.warn('[seed] 演示内容灌入跳过：', err.message);
    }
  }

  console.log('[seed] 种子数据初始化完成');
}

// 支持 node src/db/seed.js 单独执行
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
