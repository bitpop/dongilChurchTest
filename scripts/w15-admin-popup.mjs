// 관리자: 팝업 등록(글 형식) → 홈에서 노출 확인 → 보관/삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/popup' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  await goto(page, '/manage/banners'); await click(page, /^팝업$/, { role: 'checkbox', wait: 2000 });
  await click(page, /^새 팝업$/, { role: 'button', wait: 2500 }); console.log(page.url()); console.log(await text(page, 900)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value))); console.log(await btns()); await shot('form');
  await click(page, /^글$/, { role: 'checkbox', wait: 1000 }); const ins = await inputs(page); console.log('글 inputs', JSON.stringify(ins.map(i => i.type))); console.log((await text(page, 600)));
  await typeInto(page, 0, `${TAG} 팝업 ${Date.now()}`);
  if (ins.length > 1 && ins[1].type === 'textarea') await typeInto(page, 1, '자동 검수용 팝업입니다. 곧 삭제됩니다.');
  const n = ins.length; // 순서: 제목, 본문, 링크, 시작 날짜, 시작 시각, 종료 날짜, 종료 시각, 순서
  await typeInto(page, n - 5, '2026-11-02', { clear: true }); await typeInto(page, n - 4, '00:00', { clear: true }); await typeInto(page, n - 3, '2026-11-03', { clear: true }); await typeInto(page, n - 2, '23:59', { clear: true }); await typeInto(page, n - 1, '1', { clear: true });
  console.log('values', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value.slice(0, 30)))); await shot('filled');
  step('저장'); await clickLast(/^(등록|저장|게시)$/); console.log(page.url()); console.log(await text(page, 700)); console.log(await btns()); await shot('saved');
  if (/주세요|입력|선택/.test((await text(page, 2000)).replace(/[\s\S]*?(등록|저장)/, ''))) console.log('VALIDATION?', (await text(page, 2000)).match(/.{0,30}(주세요|필수).{0,20}/g));
  step('홈에서 팝업 확인'); await goto(page, '/home', 4000); console.log((await text(page, 600)).slice(0, 400)); console.log(await btns()); await shot('home_popup');
  if ((await nodes(page)).some(n => /오늘 하루 보지 않기/.test(n.label))) { console.log('popup visible with 오늘 하루 보지 않기'); await click(page, /^(닫기|확인)$/, { role: 'button', wait: 1500 }).catch(() => {}); }
  step('보관'); await goto(page, '/manage/banners'); await click(page, /^팝업$/, { role: 'checkbox', wait: 2000 }); console.log(await text(page, 600)); console.log(await btns()); await shot('list');
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row && row.role === 'button') { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2000); console.log('row ->', page.url(), await btns()); }
  if ((await nodes(page)).some(n => n.role === 'button' && /^보관$/.test(n.label))) { await clickLast(/^보관$/); console.log('dialog', await text(page, 300)); await clickLast(/^(보관|확인)$/).catch(() => {}); console.log(await text(page, 500)); await shot('archived'); }
  await click(page, /^보관$/, { role: 'checkbox', wait: 2000 }).catch(() => {}); console.log('보관 필터:', await text(page, 500)); console.log(await btns());
  if ((await nodes(page)).some(n => n.role === 'button' && /완전 삭제|삭제/.test(n.label))) { await clickLast(/완전 삭제|^삭제$/); console.log('dialog', await text(page, 300)); await clickLast(/^(완전 삭제|삭제|확인)$/).catch(() => {}); console.log(await text(page, 500)); await shot('deleted'); }
  await goto(page, '/home', 4000); console.log('home after:', (await nodes(page)).some(n => /QA테스트/.test(n.label)) ? 'POPUP STILL VISIBLE' : 'popup gone');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
