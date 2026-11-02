// '지난주 복사' 로 생성된 11월 8일 주보(복사본) 삭제 — 제목에 '11월 8일' 이 포함된 항목만 대상으로 함
import { launch, goto, click, text, nodes, login, logout, step, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/bulletin-cleanup' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  await goto(page, '/manage/posts'); console.log(await text(page, 500)); await shot('list');
  const row = (await nodes(page)).find(n => n.role === 'button' && /게시 중 2026\. 11\. 2 18:29 .*조회 0/.test(n.label)); console.log('row:', row?.label);
  if (!row) throw new Error('복사본(2026. 11. 2 18:29 생성) 항목 없음');
  await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log(page.url()); console.log(await text(page, 500)); console.log(await btns()); await shot('detail');
  if (!/2026\. 11\. 8|11\. 8 \(주일\)|18:29/.test(await text(page, 600))) { console.log('상세 확인 실패 — 삭제 중단'); throw new Error('detail mismatch'); }
  await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인)$/); console.log('after:', await text(page, 400)); await shot('deleted');
  await goto(page, '/bulletins'); console.log('public:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
