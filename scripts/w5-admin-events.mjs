// 관리자: 교회 일정 등록(날짜 포함) → 공개 달력 확인 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/events' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
try {
  step('login'); await login(page);
  await goto(page, '/manage/events'); await click(page, /^새 일정$/, { role: 'button', wait: 2500 });
  await typeInto(page, 0, `${TAG} 일정 ${Date.now()}`);
  await typeInto(page, 1, '2026-11-20'); await typeInto(page, 2, '19:30'); await typeInto(page, 3, '2026-11-20'); await typeInto(page, 4, '21:00');
  await typeInto(page, 5, '비전센터 2층'); await typeInto(page, 6, '자동 검수용 일정입니다. 곧 삭제됩니다.');
  console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.value))); await shot('filled');
  step('save'); await click(page, /^등록$/, { role: 'button', wait: 4000 }); console.log('url', page.url()); console.log(await text(page, 700)); await shot('after_save');
  step('public /events 11월'); await goto(page, '/events'); console.log(await text(page, 500)); await shot('public_events');
  await click(page, /^20$/, { role: 'button', wait: 2000 }).catch(() => {}); console.log('day 20:', await text(page, 600)); await shot('public_day20');
  await click(page, /^목록$/, { role: 'button', wait: 2000 }).catch(() => {}); console.log('목록:', await text(page, 600));
  step('home 이번 주 일정?'); await goto(page, '/home'); console.log(/QA테스트|이번 주/.test(await text(page, 3000)) ? 'home mentions' : 'home no mention');
  step('admin delete'); await goto(page, '/manage/events'); console.log(await text(page, 600)); console.log(await btns()); await shot('admin_list');
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url(), await text(page, 500)); console.log(await btns()); await shot('admin_detail'); }
  if ((await nodes(page)).some(n => /삭제|취소/.test(n.label) && n.role === 'button')) { await click(page, /^(삭제|일정 취소|취소)$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await shot('delete_dialog'); await click(page, /^(삭제|확인|취소하기)$/, { role: 'button', wait: 4000 }).catch(() => {}); console.log(await text(page, 500)); await shot('after_delete'); }
  await goto(page, '/events'); console.log('public after:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
