/**
 * 节日 / 休假日数据（日历标注用）。
 *
 * 组成：
 *   1) 公历固定节日——按「月-日」计算，任意年份通用（元旦/劳动/国庆/教师节…）。
 *   2) 逐年生变节日——农历节日 + 清明（节气），公历日期每年不同，此处预置 2026–2027
 *      （覆盖当前学年）；后续年份按 'YYYY-MM-DD' 往 VARIABLE_FESTIVALS 里补一条即可。
 *
 * 「休」= 周末（六/日）+ 下方标记 rest:true 的法定节假日当天。
 */

/** 公历固定节日：[月, 日, 名称, 是否放假] */
const SOLAR_FESTIVALS = [
  [1, 1, '元旦', true],
  [3, 8, '妇女节', false],
  [3, 12, '植树节', false],
  [5, 1, '劳动节', true],
  [5, 4, '青年节', false],
  [6, 1, '儿童节', false],
  [7, 1, '建党节', false],
  [8, 1, '建军节', false],
  [9, 10, '教师节', false],
  [10, 1, '国庆节', true],
  [12, 24, '平安夜', false],
  [12, 25, '圣诞节', false],
];

/** 逐年生变节日（预置 2026–2027）：'YYYY-MM-DD' -> [名称, 是否放假] */
const VARIABLE_FESTIVALS = {
  // 2026
  '2026-02-16': ['除夕', true],
  '2026-02-17': ['春节', true],
  '2026-03-03': ['元宵节', false],
  '2026-04-05': ['清明节', true],
  '2026-05-31': ['端午节', true],
  '2026-08-19': ['七夕节', false],
  '2026-09-27': ['中秋节', true],
  '2026-10-18': ['重阳节', false],
  // 2027
  '2027-02-05': ['除夕', true],
  '2027-02-06': ['春节', true],
  '2027-02-20': ['元宵节', false],
  '2027-04-04': ['清明节', true],
  '2027-06-19': ['端午节', true],
  '2027-08-08': ['七夕节', false],
  '2027-09-15': ['中秋节', true],
  '2027-10-07': ['重阳节', false],
};

/**
 * 取某日节日信息。
 * @param {import('dayjs').Dayjs} day dayjs 日期对象
 * @returns {{ name: string, rest: boolean } | null}
 */
export function getFestival(day) {
  const key = day.format('YYYY-MM-DD');
  const variable = VARIABLE_FESTIVALS[key];
  if (variable) return { name: variable[0], rest: variable[1] };
  const m = day.month() + 1;
  const d = day.date();
  const solar = SOLAR_FESTIVALS.find((f) => f[0] === m && f[1] === d);
  if (solar) return { name: solar[2], rest: solar[3] };
  return null;
}

/**
 * 是否休息日：周末或法定节假日当天。
 * @param {import('dayjs').Dayjs} day
 * @returns {boolean}
 */
export function isRestDay(day) {
  const weekday = day.day();
  if (weekday === 0 || weekday === 6) return true;
  const festival = getFestival(day);
  return Boolean(festival && festival.rest);
}
