// 관리자: 설교 등록(유튜브 링크) → 공개 목록 확인 → 삭제, 시리즈 추가 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/sermons' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  step('설교 등록 화면'); await goto(page, '/manage/sermons'); await click(page, /^설교 등록$/, { role: 'button', wait: 3000 });
  console.log('url', page.url()); console.log(await text(page, 800)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type))); console.log(await btns()); await shot('form');
  const ins = await inputs(page);
  // 입력 순서 추정: 제목, 유튜브 링크, 설교자, 본문, 날짜 ... → 화면 텍스트로 확인 후 채움
  await typeInto(page, 0, `${TAG} 설교 ${Date.now()}`);
  await typeInto(page, 1, 'https://www.youtube.com/watch?v=_4EbWE7Xxjk'); await typeInto(page, 2, '검수용 설교자'); await typeInto(page, 3, '요 3:16');
  await typeInto(page, 4, '2026-11-02', { clear: true }); const n7 = (await inputs(page)).length; console.log('input count', n7, JSON.stringify((await inputs(page)).map(i => i.type))); if (n7 > 5) await typeInto(page, 5, n7 > 6 ? '주일예배' : '자동 검수용 설교입니다. 곧 삭제됩니다.'); if (n7 > 6) await typeInto(page, 6, '자동 검수용 설교입니다. 곧 삭제됩니다.'); console.log('buttons:', (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | '));
  console.log('values', JSON.stringify((await inputs(page)).map(i => i.value))); await shot('filled');
  step('저장'); await clickLast(/^(등록|저장|게시)$/); await page.waitForTimeout(1500); console.log('url', page.url()); console.log(await text(page, 800)); await shot('saved');
  step('공개 목록'); await goto(page, '/worship/sermons'); console.log(/QA테스트/.test(await text(page, 2000)) ? 'VISIBLE in public' : 'NOT visible'); await shot('public');
  step('삭제'); await goto(page, '/manage/sermons'); const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); console.log('row', row?.label);
  const delBtns = (await nodes(page)).filter(n => n.role === 'button' && /^삭제$/.test(n.label)); console.log('delete buttons', delBtns.length);
  // QA테스트 행과 같은 y 좌표의 삭제 버튼
  const del = row ? delBtns.find(b => Math.abs(b.y - row.y) < 40) : null;
  if (del) { await page.mouse.click(del.x + del.w / 2, del.y + del.h / 2); await page.waitForTimeout(1500); console.log('dialog', await text(page, 300)); await shot('delete_dialog'); await clickLast(/^(삭제|확인)$/); console.log(await text(page, 400)); await shot('deleted'); }
  else console.log('delete button for row not found');
  await goto(page, '/worship/sermons'); console.log(/QA테스트/.test(await text(page, 2000)) ? 'STILL VISIBLE' : 'gone from public');
  step('시리즈 탭'); await goto(page, '/manage/sermons'); await click(page, /^시리즈$/, { role: 'checkbox', wait: 2500 }); console.log(await text(page, 500)); console.log(await btns()); await shot('series');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
