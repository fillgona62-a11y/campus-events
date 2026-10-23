/**
 * 用户协议（F9）：模板内容，需用户过目定稿。
 * 未登录可从 MainLayout footer 进入。
 */
import Button from '@mui/material/Button';
import { useNavigate } from 'react-router-dom';

const SECTIONS = [
  {
    title: '一、服务说明',
    body: [
      '校园活动报名系统（以下简称“本平台”）为全校师生提供活动发布、报名、签到核销等信息化服务。',
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
      '禁止恶意报名、占位、刷量；禁止盗用他人账号或核销凭证。',
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
    title: '五、签到核销',
    body: [
      '活动现场请向组织者报本人学号配合核销；组织者通过核销口令确认到场。',
      '每人仅可核销一次，重复核销将被拒绝。',
    ],
  },
  {
    title: '六、知识产权',
    body: [
      '本平台界面、代码与设计归开发团队所有；用户发布的活动内容版权归发布者所有。',
    ],
  },
  {
    title: '七、服务变更与中断',
    body: [
      '平台可能因维护、升级或不可抗力暂时中断服务，我们将尽力提前通知并尽快恢复。',
    ],
  },
  {
    title: '八、其他',
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
      <div className="rounded-xl bg-white p-5 shadow-sm md:p-8">
        <h1 className="mb-1 text-2xl font-bold">用户协议</h1>
        <p className="mb-6 text-sm text-gray-400">生效日期：2025-01-01（模板稿，待定稿后更新）</p>
        <div className="space-y-5 text-sm leading-relaxed text-gray-700">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="mb-1 font-semibold text-gray-900">{s.title}</h2>
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
        <Button variant="text" onClick={() => navigate('/')}>
          回首页
        </Button>
      </div>
    </div>
  );
}
