// 테스트로 등록한 교회 일정(id 1) 취소 → 공개 달력에서 사라지는지 확인
import { launch, goto, click, text, nodes, login, logout, step } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/events' });
const clickLast = async (re) => { const list = (await nodes(page)).filter(n => n.role === 'button' && re.test(n.label)); const n = list[list.length - 1]; if (!n) throw new Error('no ' + re); await page.mouse.click(n.x + n.w / 2, n.y + n.h / 2); await page.waitForTimeout(3000); };
try {
  step('login'); await login(page);
  await goto(page, '/manage/events/1/edit');
  await click(page, /^일정 취소$/, { role: 'button', wait: 1500 }); console.log('dialog:', await text(page, 300));
  await clickLast(/^일정 취소$/); console.log('after:', page.url(), await text(page, 400)); await shot('cancelled');
  await goto(page, '/manage/events'); await click(page, /^취소됨$/, { role: 'checkbox', wait: 2500 }); console.log('취소됨 필터:', await text(page, 400)); await shot('cancelled_filter');
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label) && n.role === 'button'); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('cancelled item ->', page.url(), (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ')); await shot('cancelled_detail'); }
  await goto(page, '/events'); console.log('public:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
