/**
 * 用户协议（F9）：模板内容，需用户过目定稿。
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
    title: '一、服务说明',
    body: [
      '校园活动报名系统（以下简称“本平台”）为全校师生提供活动发布、报名等信息化服务。',
      '使用本平台即表示您已阅读并同意本协议全部条款。',
    ],
  },
  {
    title: '二、账号与安全',
    body: [
      '账号为学号制，请使用本人真实学号注册，并对账号下的一切行为负责。',
      '请妥善保管密码。连续 5 次输错密码账号将被临时锁定 15 分钟，以防止暴力破解。',
      '发现账号异常请立即通过“忘记密码”或联系管理员处理。',
    ],
  },
  {
    title: '三、用户行为规范',
    body: [
      '禁止发布违反法律法规、校规校纪或侵犯他人权益的活动内容。',
      '禁止恶意报名、占位、刷量；禁止盗用他人账号。',
      '活动名额有限，报名成功后请按时参加；如需退出请在报名截止前取消，以便候补同学递补。',
    ],
  },
  {
    title: '四、活动与名额规则',
    body: [
      '活动经管理员审核通过后对全员可见；组织者可在活动开始前编辑或取消活动。',
      '直接报名活动名额满员后自动进入候补名单，有人取消时按候补顺序自动递补。',
      '需审核的活动由发布者审核，名额在审核通过时占用。',
    ],
  },
  {
    title: '五、知识产权',
    body: [
      '本平台界面、代码与设计归开发团队所有；用户发布的活动内容版权归发布者所有。',
    ],
  },
  {
    title: '六、服务变更与中断',
    body: [
      '平台可能因维护、升级或不可抗力暂时中断服务，我们将尽力提前通知并尽快恢复。',
    ],
  },
  {
    title: '七、其他',
    body: [
      '本协议与《隐私政策》共同构成平台与用户之间的完整约定。',
      '如有问题或建议，请联系系统管理员。',
    ],
  },
];

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl pb-8">
      <div className="clash-card p-5 md:p-8">
        <div className="mb-1 flex items-center gap-2">
          <ClashStar size={20} style={{ color: CLASH.violet }} />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            <span className="clash-text-gradient">用户协议</span>
          </h1>
        </div>
        <p className="mb-6 mt-2 text-xs font-bold text-ink-faint">生效日期：2025-01-01（模板稿，待定稿后更新）</p>
        <ClashStripe className="mb-6" />
        <div className="space-y-5 text-sm leading-relaxed text-ink-soft">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-1.5 flex items-center gap-1.5 font-extrabold text-ink">
                <ClashStar size={12} style={{ color: CLASH.magenta }} />
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
