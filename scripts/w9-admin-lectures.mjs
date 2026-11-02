// 관리자: 강의 등록 → /lectures 확인 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/lectures' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = async (re) => { const list = (await nodes(page)).filter(n => n.role === 'button' && re.test(n.label)); const n = list[list.length - 1]; if (!n) throw new Error('no ' + re); await page.mouse.click(n.x + n.w / 2, n.y + n.h / 2); await page.waitForTimeout(3000); };
try {
  step('login'); await login(page);
  await goto(page, '/manage/lectures'); await click(page, /^새 강의$/, { role: 'button', wait: 3000 });
  console.log('url', page.url()); console.log(await text(page, 1000)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value))); console.log(await btns()); await shot('form');
  const ins = await inputs(page);
  await typeInto(page, 0, `${TAG} 강의 ${Date.now()}`);
  for (let i = 1; i < ins.length; i++) { if (ins[i].type === 'textarea') { await typeInto(page, i, '자동 검수용 강의입니다. 곧 삭제됩니다.'); } }
  await shot('filled');
  step('저장'); await clickLast(/^(등록|저장|개설|만들기|생성)$/); await page.waitForTimeout(1500); console.log('url', page.url()); console.log(await text(page, 1000)); console.log(await btns()); await shot('saved');
  step('/lectures 확인'); await goto(page, '/lectures'); console.log(await text(page, 500)); await shot('public');
  step('삭제'); await goto(page, '/manage/lectures'); console.log(await text(page, 500)); console.log(await btns());
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url()); console.log(await text(page, 600)); console.log(await btns()); await shot('admin_detail'); }
  if ((await nodes(page)).some(n => /^(삭제|보관)$/.test(n.label) && n.role === 'button')) { await click(page, /^(삭제|보관)$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인|보관)$/).catch(() => {}); console.log(await text(page, 400)); await shot('deleted'); }
  await goto(page, '/lectures'); console.log('/lectures after:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
