// 보관 소그룹 직접 URL 진입 404 재확인: 기존 보관 그룹(/manage/groups/1) + 새로 개설→보관한 그룹을 주소창 직접 입력으로 진입
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/archived-group' });
const clickLast = (re) => clickLastLib(page, re);
const direct = async (id) => { const b = logs.length; await goto(page, `/manage/groups/${id}`, 3000); const bad = logs.slice(b).filter(l => /4\d\d|5\d\d|pageerror/.test(l)); console.log(`/manage/groups/${id} 직접 진입 → 화면: ${(await text(page, 200)).slice(50, 150)} | 오류: ${bad.length ? bad.join(' ; ') : '없음'}`); };
try {
  step('login'); await login(page);
  step('기존 보관 그룹 #1'); await direct(1); await shot('group1');
  step('새 소그룹 개설 → 보관 → 직접 진입'); await goto(page, '/manage/groups'); await click(page, /^소그룹 개설$/, { role: 'button', wait: 3000 }); await typeInto(page, 0, `${TAG} 보관테스트 소그룹`); await clickLast(/^(개설|등록|저장)$/); const id = page.url().match(/groups\/(\d+)/)?.[1]; console.log('created', id);
  if (id) { await direct(id); await click(page, /^보관$/, { role: 'button', wait: 1500 }); await clickLast(/^(보관|확인)$/); await page.waitForTimeout(2000); await direct(id); await shot('archived_direct'); }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 500))); }
finally { console.log('\nLOGS:\n' + logs.filter(l => /POST|PUT|DELETE|4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
