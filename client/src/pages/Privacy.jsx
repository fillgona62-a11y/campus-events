/**
 * 隐私政策（F9）：模板内容，需用户过目定稿。
 * 未登录可从 MainLayout footer 进入。
 *
 * 视觉：撞色卡片 + 撞色标题，小节标题前带四角星。
 */
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';

const SECTIONS = [
  {
    title: '一、我们收集哪些信息',
    body: [
      '账号信息：学号、姓名、手机号（选填）、绑定邮箱。学号作为登录账号，邮箱用于接收验证码与找回密码。',
      '使用信息：报名记录、报名备注、发布的活动内容。',
      '技术信息：为保障服务安全与防滥用，服务端会记录接口访问日志（含 IP 与时间），用于限流、风控与故障排查。',
    ],
  },
  {
    title: '二、信息用途',
    body: [
      '提供活动发布、报名、审核、候补递补等核心功能。',
      '通过邮件发送注册验证码、找回密码验证码；通过站内信发送报名结果、密码变动等安全提醒。',
      '管理员操作留痕（操作人、时间、对象），用于管理与追溯，不记录密码、验证码等敏感信息。',
    ],
  },
  {
    title: '三、验证码与通知邮件',
    body: [
      '验证码 6 位数字、5 分钟有效，仅用于注册、找回密码、绑定邮箱，请勿泄露给他人。',
      '通知邮件由系统自动发送，不会以任何理由索要您的密码。',
    ],
  },
  {
    title: '四、Cookie 与本地存储',
    body: [
      '本站不使用广告类 Cookie。登录态保存于浏览器本地存储（JWT），退出登录或清除浏览器数据后即失效。',
    ],
  },
  {
    title: '五、信息共享与披露',
    body: [
      '报名名单中的学号、姓名、手机号、备注仅对对应活动的发布者与平台管理员可见，用于活动组织。',
      '除法律法规要求或您的明确授权外，我们不会向任何第三方提供您的个人信息。',
    ],
  },
  {
    title: '六、数据安全',
    body: [
      '全站强制 HTTPS 传输加密；密码使用 bcrypt 加盐哈希存储，管理员也无法查看明文密码。',
      '数据库每日自动备份，备份文件仅存放于服务器本地与您指定的异地位置。',
    ],
  },
  {
    title: '七、免责条款',
    body: [
      '校园活动由学生或组织自行发布，内容不代表平台立场；请线下参加活动时注意人身与财物安全。',
      '因不可抗力、网络故障或第三方服务（SMTP 邮件通道）异常可能导致验证码延迟，请您稍后重试或联系管理员。',
    ],
  },
  {
    title: '八、联系我们',
    body: ['如对本隐私政策有任何疑问，或需要处理个人信息相关请求，请联系系统管理员（管理员邮箱以学校公示为准）。'],
  },
];

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl pb-8">
      <div className="clash-card p-5 md:p-8">
        <div className="mb-1 flex items-center gap-2">
          <ClashStar size={20} style={{ color: CLASH.magenta }} />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            <span className="clash-text-gradient">隐私政策</span>
          </h1>
        </div>
        <p className="mb-6 mt-2 text-xs font-bold text-ink-faint">生效日期：2025-01-01（模板稿，待定稿后更新）</p>
        <ClashStripe className="mb-6" />
        <div className="space-y-5 text-sm leading-relaxed text-ink-soft">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-1.5 flex items-center gap-1.5 font-extrabold text-ink">
                <ClashStar size={12} style={{ color: CLASH.violet }} />
                {s.title}
              </h2>
              {s.body.map((line, i) => (
                <p key={i} className="mb-1">
                  {line}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
      <div className="mt-4 text-center">
        <Button variant="outlined" onClick={() => navigate('/')}>
          回首页
        </Button>
      </div>
    </div>
  );
}
