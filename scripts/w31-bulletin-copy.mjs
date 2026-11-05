// 주보 '지난주 복사' 클릭 → 확인창 유무 → 복사본 상태(게시/비공개) → 공개 목록 노출 여부 → 복사본 삭제
import { launch, goto, click, text, nodes, login, logout, step, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/bulletin-copy' });
const btns = async () => (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
const listTitles = async () => (await nodes(page)).filter(n => n.role === 'button' && /주보\(/.test(n.label)).map(n => n.label.slice(0, 70));
let copyId = null;
try {
  step('login'); await login(page);
  await goto(page, '/manage/posts'); const before = await listTitles(); console.log('before:', before.slice(0, 3));
  step('지난주 복사 클릭'); await click(page, /^지난주 복사$/, { role: 'button', wait: 2000 }); const dlg = await text(page, 500); console.log('직후 화면:', dlg.slice(0, 300)); console.log(await btns()); await shot('after_click');
  const hasDialog = (await nodes(page)).some(n => n.role === 'alertdialog'); console.log('확인창?', hasDialog);
  if (hasDialog) { await clickLast(/^(복사|확인|만들기)$/); await page.waitForTimeout(3000); }
  await page.waitForTimeout(3000); await goto(page, '/manage/posts'); const after = await listTitles(); console.log('after:', after.slice(0, 3));
  const newRow = (await nodes(page)).find(n => n.role === 'button' && /주보\(/.test(n.label) && !before.includes(n.label.slice(0, 70))); console.log('새 행:', newRow?.label);
  if (newRow) { await page.mouse.click(newRow.x + newRow.w / 2, newRow.y + newRow.h / 2); await page.waitForTimeout(2500); copyId = page.url().match(/bulletins\/(\d+)/)?.[1]; const t = await text(page, 400); console.log('복사본 상세:', copyId, t.slice(0, 250)); console.log('상태 뱃지:', t.match(/(게시 중|숨김|비공개|임시|초안)/)?.[0]); await shot('copy_detail'); }
  await goto(page, '/bulletins'); console.log('공개 목록:', (await text(page, 400)).slice(40, 250));
  if (copyId) { step('복사본 삭제'); await goto(page, `/manage/posts/bulletins/${copyId}`); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await clickLast(/^(삭제|확인)$/); console.log((await text(page, 300)).slice(0, 200)); await goto(page, '/bulletins'); console.log('공개 목록(삭제 후):', (await text(page, 400)).slice(40, 250)); }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 600))); }
finally { console.log('\nLOGS:\n' + logs.filter(l => /POST|PUT|DELETE|4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
