// 주보 '지난주 복사' 정밀 확인: 확인창 → [복사] → 이동 화면(편집기) 상태 뱃지·제목·날짜·버튼 → 공개 목록 미노출 → 관리자 목록의 숨김/전체 필터에서 복사본 확인 → [삭제]
import { launch, goto, click, text, nodes, inputs, login, logout, step, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/bulletin-copy' });
const btns = async () => (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
let copyId = null;
try {
  step('login'); await login(page);
  await goto(page, '/manage/posts');
  step('지난주 복사 → 확인창 [복사]'); await click(page, /^지난주 복사$/, { role: 'button', wait: 2000 }); console.log('확인창:', (await text(page, 400)).slice(0, 220)); await shot('confirm');
  const copyBtn = (await nodes(page)).filter(n => n.role === 'button' && n.label === '복사').pop(); console.log('복사 버튼', !!copyBtn); await page.mouse.click(copyBtn.x + copyBtn.w / 2, copyBtn.y + copyBtn.h / 2); await page.waitForTimeout(5000);
  console.log('이동 url:', page.url()); const t = await text(page, 800); console.log('화면:', t.slice(0, 500)); console.log('입력값:', JSON.stringify((await inputs(page)).slice(0, 3).map(i => i.value.slice(0, 50)))); console.log('buttons:', await btns()); await shot('editor');
  copyId = page.url().match(/bulletins\/(\d+)/)?.[1];
  step('공개 목록'); await goto(page, '/bulletins'); console.log((await text(page, 400)).slice(60, 300));
  step('관리자 목록 필터'); await goto(page, '/manage/posts'); for (const f of ['숨김', '전체']) { await click(page, new RegExp('^' + f + '$'), { role: 'checkbox', wait: 2500 }); const rows = (await nodes(page)).filter(n => n.role === 'button' && /\(복사\)/.test(n.label)).map(n => n.label.slice(0, 90)); console.log(f, '필터 (복사) 행:', rows); if (!copyId && rows.length) { const r = (await nodes(page)).find(n => n.role === 'button' && /\(복사\)/.test(n.label)); await page.mouse.click(r.x + r.w / 2, r.y + r.h / 2); await page.waitForTimeout(2500); copyId = page.url().match(/bulletins\/(\d+)/)?.[1]; console.log('copy detail', page.url(), (await text(page, 300)).slice(0, 200)); break; } }
  if (copyId) { step('복사본 삭제'); await goto(page, `/manage/posts/bulletins/${copyId}`); console.log((await text(page, 300)).slice(0, 200)); console.log('buttons:', await btns()); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog', (await text(page, 300)).slice(0, 150)); await clickLast(/^(삭제|확인)$/); console.log('after:', (await text(page, 300)).slice(0, 200)); await shot('deleted'); await goto(page, '/manage/posts'); await click(page, /^전체$/, { role: 'checkbox', wait: 2500 }); console.log('전체 필터 (복사) 행:', (await nodes(page)).filter(n => n.role === 'button' && /\(복사\)/.test(n.label) && !/삭제됨/.test(n.label)).length); }
  else console.log('복사본을 찾지 못함');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 600))); }
finally { console.log('\nLOGS:\n' + logs.filter(l => /POST|PUT|DELETE|4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
