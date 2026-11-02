// 설교·LIVE: 예배 시간표 일정 1건 추가(요일·시각·이름) → LIVE 저장 → 공개 설교 페이지 확인 → 해당 행 삭제 → LIVE 저장 (방송 중 배지는 건드리지 않음)
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/live' });
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  await goto(page, '/manage/sermons'); console.log('before:', (await text(page, 400)).slice(0, 300));
  if (!/시간표가 비어 있어요/.test(await text(page, 600))) { console.log('이미 시간표 행이 있어 중단'); throw new Error('schedule not empty'); }
  await click(page, /^일정 추가$/, { role: 'button', wait: 1500 });
  await typeInto(page, 2, '11:00', { clear: true }); await typeInto(page, 3, `${TAG} 예배`, { clear: true });
  await click(page, /^요일$/, { role: 'button', wait: 1000 }); console.log('요일 menu:', (await nodes(page)).filter(n => /^(일|월|화|수|목|금|토)(요일)?$/.test(n.label)).map(n => n.label).join(',')); await click(page, /^(일|일요일)$/, { wait: 800 }).catch(() => page.keyboard.press('Escape'));
  console.log('values', JSON.stringify((await inputs(page)).map(i => i.value))); await shot('filled');
  await clickLast(/^LIVE 저장$/); console.log('after save:', (await text(page, 400)).slice(0, 300)); await shot('saved');
  await goto(page, '/worship/sermons'); console.log('public top:', (await text(page, 400)).slice(0, 250)); await shot('public');
  step('행 삭제 후 저장'); await goto(page, '/manage/sermons'); const ns = await nodes(page); const liveY = ns.find(x => /^LIVE 저장$/.test(x.label))?.y ?? 9999; const del = ns.find(n => n.role === 'button' && /^삭제$/.test(n.label) && n.y < liveY); console.log('schedule delete btn', !!del);
  if (del) { await page.mouse.click(del.x + del.w / 2, del.y + del.h / 2); await page.waitForTimeout(800); await clickLast(/^LIVE 저장$/); console.log('after restore:', (await text(page, 400)).slice(0, 300)); await shot('restored'); }
  await goto(page, '/worship/sermons'); console.log('public after:', (await text(page, 300)).slice(0, 200));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
