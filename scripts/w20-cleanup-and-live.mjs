// 정리: 사역 글 #1172 삭제, FAQ 카테고리 마지막 행([QA테스트] 분류) 삭제, LIVE 예배 시간표 추가→저장→삭제→저장 재검증
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/cleanup2' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  try {
    step('사역 글 #1172 삭제'); await goto(page, '/manage/posts/ministry/1172'); const t = await text(page, 500); console.log(t.slice(0, 300));
    if (/QA테스트/.test(t) && !/삭제됨/.test(t)) { await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await clickLast(/^(삭제|확인)$/); console.log((await text(page, 300)).slice(0, 200)); }
    await goto(page, '/ministry'); console.log(/QA테스트/.test(await text(page, 3000)) ? 'STILL VISIBLE' : 'ministry test post gone');
  } catch (e) { console.log('MINISTRY ERROR', e.message); }
  try {
    step('FAQ 카테고리 정리'); await goto(page, '/faq'); const chips = (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label); console.log('chips before:', chips.join(', '));
    if (chips.includes('[QA테스트] 분류') && chips[chips.length - 1] === '[QA테스트] 분류') {
      await goto(page, '/manage/posts'); await click(page, /^FAQ$/, { role: 'button', wait: 2000 }); await click(page, /^카테고리 관리$/, { role: 'button', wait: 2000 });
      const dels = (await nodes(page)).filter(n => n.role === 'button' && /^삭제$/.test(n.label)); console.log('rows', dels.length);
      const d = dels[dels.length - 1]; await page.mouse.click(d.x + d.w / 2, d.y + d.h / 2); await page.waitForTimeout(1000); console.log('rows after:', (await nodes(page)).filter(n => n.role === 'button' && /^삭제$/.test(n.label)).length); await shot('category_dialog');
      await clickLast(/^저장$/); console.log((await text(page, 300)).slice(0, 200));
      await goto(page, '/faq'); console.log('chips after:', (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label).join(', '));
    } else console.log('QA 분류가 마지막이 아니거나 없음 — 생략');
  } catch (e) { console.log('CATEGORY ERROR', e.message); }
  try {
    step('LIVE 시간표 추가·저장'); await goto(page, '/manage/sermons'); await click(page, /^일정 추가$/, { role: 'button', wait: 1500 });
    await typeInto(page, 2, '11:00', { clear: true }); await typeInto(page, 3, `${TAG} 예배`, { clear: true });
    await click(page, /^요일$/, { role: 'button', wait: 1000 }); console.log('요일 menu:', (await nodes(page)).filter(n => /^(일|월|화|수|목|금|토)(요일)?$/.test(n.label)).map(n => n.label).join(',')); await click(page, /^(일|일요일)$/, { wait: 800 }).catch(() => page.keyboard.press('Escape'));
    await clickLast(/^LIVE 저장$/); console.log((await text(page, 400)).slice(0, 300)); await shot('live_saved');
    await goto(page, '/worship/sermons'); console.log('public top:', (await text(page, 400)).slice(0, 250)); await shot('public_live');
    step('LIVE 시간표 삭제·저장'); await goto(page, '/manage/sermons'); const ns = await nodes(page); const sched = ns.find(n => n.role === 'button' && /^삭제$/.test(n.label) && n.y < (ns.find(x => /^LIVE 저장$/.test(x.label))?.y ?? 9999)); console.log('schedule delete btn', !!sched);
    if (sched) { await page.mouse.click(sched.x + sched.w / 2, sched.y + sched.h / 2); await page.waitForTimeout(800); await clickLast(/^LIVE 저장$/); console.log((await text(page, 400)).slice(0, 300)); await shot('live_restored'); }
  } catch (e) { console.log('LIVE ERROR', e.message); }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
