// 검수 중 생성된 테스트 데이터 정리만 수행: 사역 글 #1172([QA테스트] 사역) 삭제, FAQ 카테고리 '[QA테스트] 분류' 제거
import { launch, goto, click, text, nodes, login, logout, step, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/cleanup2' });
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  step('사역 글 #1172 삭제'); await goto(page, '/manage/posts/ministry/1172'); const t = await text(page, 500); console.log(t.slice(0, 250));
  if (/\[QA테스트\] 사역/.test(t) && !/삭제됨/.test(t)) { await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await clickLast(/^(삭제|확인)$/); console.log((await text(page, 300)).slice(0, 200)); } else console.log('대상 아님 또는 이미 삭제됨');
  await goto(page, '/ministry'); console.log(/QA테스트/.test(await text(page, 3000)) ? 'STILL VISIBLE' : 'ministry test post gone');
  step('FAQ 카테고리 [QA테스트] 분류 제거'); await goto(page, '/faq'); const chips = (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label); console.log('chips before:', chips.join(', '));
  if (chips[chips.length - 1] === '[QA테스트] 분류') {
    await goto(page, '/manage/posts'); await click(page, /^FAQ$/, { role: 'button', wait: 2000 }); await click(page, /^카테고리 관리$/, { role: 'button', wait: 2000 });
    const dels = (await nodes(page)).filter(n => n.role === 'button' && /^삭제$/.test(n.label)); console.log('rows', dels.length, '(expect', chips.length - 1, ')');
    if (dels.length === chips.length - 1) { const d = dels[dels.length - 1]; await page.mouse.click(d.x + d.w / 2, d.y + d.h / 2); await page.waitForTimeout(1000); await shot('category_dialog'); await clickLast(/^저장$/); console.log((await text(page, 300)).slice(0, 200)); }
    else console.log('행 수가 칩 수와 달라 중단');
    await goto(page, '/faq'); console.log('chips after:', (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label).join(', '));
  } else console.log('QA 분류가 마지막이 아니거나 없음 — 생략');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
