// 관리자: 설교 시리즈 추가→삭제, FAQ 카테고리 추가→저장→삭제→저장, LIVE 예배 시간표 일정 추가→저장→삭제→저장
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/series-category-live' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  // ---- 시리즈
  step('시리즈 추가'); await goto(page, '/manage/sermons'); await click(page, /^시리즈$/, { role: 'checkbox', wait: 2000 }); await click(page, /^시리즈 추가$/, { role: 'button', wait: 1500 });
  const sIns = await inputs(page); console.log('series inputs', sIns.length);
  await typeInto(page, 0, `${TAG} 시리즈`); if (sIns.length > 1) await typeInto(page, 1, '자동 검수용 시리즈');
  await clickLast(/^저장$/); console.log(await text(page, 600)); console.log(await btns()); await shot('series_added');
  step('공개 설교 목록 시리즈 드롭다운'); await goto(page, '/worship/sermons'); { const ns = await nodes(page); const i = ns.findIndex(x => x.role === 'checkbox' && x.label === '수요'); const dd = ns.slice(i + 1).find(x => x.role === 'button'); console.log('dropdown button label:', JSON.stringify(dd?.label)); if (dd) { await page.mouse.click(dd.x + dd.w / 2, dd.y + dd.h / 2); await page.waitForTimeout(1500); await shot('public_series_dropdown'); console.log('menu:', (await nodes(page)).filter(x => /시리즈|QA테스트/.test(x.label)).map(x => x.label).join(' | ')); await page.keyboard.press('Escape'); } }
  step('시리즈 삭제'); await goto(page, '/manage/sermons'); await click(page, /^시리즈$/, { role: 'checkbox', wait: 2000 }); console.log(await btns());
  const sRow = (await nodes(page)).find(n => /QA테스트/.test(n.label)); const sDel = sRow ? (await nodes(page)).find(n => n.role === 'button' && /삭제/.test(n.label) && Math.abs(n.y - sRow.y) < 40) : null; console.log('series row', sRow?.label, 'delete btn', !!sDel);
  if (sDel) { await page.mouse.click(sDel.x + sDel.w / 2, sDel.y + sDel.h / 2); await page.waitForTimeout(1500); console.log('dialog', await text(page, 300)); if (/QA테스트/.test(await text(page, 300))) { await clickLast(/^(삭제|확인)$/); } else { await clickLast(/^취소$/).catch(() => {}); console.log('dialog did not name QA item — cancelled'); } console.log(await text(page, 400)); await shot('series_deleted'); }
  } catch (e) { console.log('SERIES ERROR', e.message); await shot('series_error'); }
  try {
  // ---- FAQ 카테고리
  step('FAQ 카테고리 추가'); await goto(page, '/manage/posts'); await click(page, /^FAQ$/, { role: 'button', wait: 2000 }); await click(page, /^카테고리 관리$/, { role: 'button', wait: 2000 });
  const before = (await inputs(page)).length; await click(page, /^추가$/, { role: 'button', wait: 1000 }); const after = await inputs(page); console.log('category inputs', before, '->', after.length);
  await typeInto(page, after.length - 2, 'qatest'); await typeInto(page, after.length - 1, `${TAG} 분류`);
  await clickLast(/^저장$/); console.log(await text(page, 400)); console.log(await btns()); await shot('category_saved');
  await goto(page, '/faq'); console.log('public chips:', (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label).join(', ')); await shot('faq_chips');
  step('FAQ 카테고리 삭제'); await goto(page, '/manage/posts'); await click(page, /^FAQ$/, { role: 'button', wait: 2000 }); await click(page, /^카테고리 관리$/, { role: 'button', wait: 2000 });
  const vals = (await inputs(page)).map(i => i.value); const idx = vals.findIndex(v => /QA테스트|qatest/.test(v)); console.log('category values', vals, 'idx', idx);
  const dels = (await nodes(page)).filter(n => n.role === 'button' && /^삭제$/.test(n.label)); const rowIdx = Math.floor(idx / 2); console.log('delete buttons', dels.length, 'rowIdx', rowIdx);
  if (idx >= 0 && dels[rowIdx]) { const d = dels[rowIdx]; await page.mouse.click(d.x + d.w / 2, d.y + d.h / 2); await page.waitForTimeout(1000); console.log('after del click:', (await inputs(page)).map(i => i.value)); await clickLast(/^저장$/); console.log(await text(page, 300)); await shot('category_deleted'); }
  await goto(page, '/faq'); console.log('public chips after:', (await nodes(page)).filter(n => n.role === 'checkbox').map(n => n.label).join(', '));
  } catch (e) { console.log('CATEGORY ERROR', e.message); await shot('category_error'); }
  try {
  // ---- LIVE 예배 시간표
  step('LIVE 일정 추가'); await goto(page, '/manage/sermons'); await click(page, /^일정 추가$/, { role: 'button', wait: 1500 }); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value))); console.log(await btns()); await shot('live_row');
  const lIns = await inputs(page); // LIVE 유튜브 링크, 채널 주소, 그 뒤 일정 행(요일?, 시각, 이름)
  for (let i = 2; i < lIns.length; i++) { if (!lIns[i].value) await typeInto(page, i, i === 2 ? '11:00' : `${TAG} 예배`); }
  console.log('values', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value)));
  await clickLast(/^LIVE 저장$/); console.log(await text(page, 500)); await shot('live_saved');
  await goto(page, '/worship/sermons'); console.log('public sermons top:', (await text(page, 500)).slice(0, 300)); await shot('public_live');
  step('LIVE 일정 삭제'); await goto(page, '/manage/sermons'); const qaIn = (await inputs(page)).find(i => /QA테스트/.test(i.value)); const ld = qaIn ? (await nodes(page)).find(n => n.role === 'button' && /^삭제$/.test(n.label) && Math.abs(n.y + n.h / 2 - qaIn.y) < 45) : null; console.log('schedule row input', !!qaIn, 'delete btn', !!ld);
  if (ld) { await page.mouse.click(ld.x + ld.w / 2, ld.y + ld.h / 2); await page.waitForTimeout(1000); console.log('rows after delete:', (await inputs(page)).map(i => i.value).filter(Boolean)); await clickLast(/^LIVE 저장$/); console.log(await text(page, 400)); await shot('live_restored'); }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
