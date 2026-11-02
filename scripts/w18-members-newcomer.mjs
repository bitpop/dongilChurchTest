// 멤버 개별 등록(명부) → 검색 → 차단/해제 → 삭제 가능 여부, 새가족 등록 실제 제출(비로그인) → 관리자 접수 처리(상태 변경) → 삭제 가능 여부
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/members' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
const PHONE = '01000000099';
try {
  // ---- 공개 새가족 등록 제출 (비로그인)
  step('새가족 등록 제출'); await goto(page, '/newcomer');
  const ins = await inputs(page); console.log('inputs', ins.map(i => i.type).join(','));
  await typeInto(page, 0, `${TAG} 새가족`);
  await click(page, /^남$/, { wait: 800 }).catch(e => console.log('성별?', e.message));
  await typeInto(page, 1, '1990-01-01'); await typeInto(page, 2, PHONE); await typeInto(page, 3, '충남 당진시 수청로 139-17'); await typeInto(page, 4, '검수용');
  await click(page, /개인정보 수집·이용에 동의합니다/, { role: 'checkbox', wait: 800 }).catch(e => console.log('동의?', e.message));
  await shot('newcomer_filled'); await clickLast(/^등록 신청하기$/); await page.waitForTimeout(2000); console.log('after submit:', page.url(), (await text(page, 600)).slice(0, 400)); await shot('newcomer_submitted');
  if (/주세요|필수/.test((await text(page, 3000)).slice(300))) console.log('VALIDATION:', (await text(page, 3000)).match(/.{0,30}(주세요|필수|올바).{0,20}/g));
  // ---- 관리자
  step('login'); await login(page);
  step('새가족 접수 탭'); await goto(page, '/manage/members'); await click(page, /^새가족 접수$/, { role: 'checkbox', wait: 2500 }); console.log(await text(page, 700)); console.log(await btns()); await shot('admin_newcomers');
  const app = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (app) { await page.mouse.click(app.x + app.w / 2, app.y + app.h / 2); await page.waitForTimeout(2500); console.log('app ->', page.url(), (await text(page, 800)).slice(0, 600)); console.log(await btns()); await shot('app_detail');
    for (const st of ['연락함', '보류']) { if ((await nodes(page)).some(n => n.role === 'button' && new RegExp('^' + st).test(n.label))) { await click(page, new RegExp('^' + st), { role: 'button', wait: 2000 }); await clickLast(/^(확인|저장|변경)$/).catch(() => {}); console.log(st, '->', (await text(page, 400)).slice(0, 200)); } }
    if ((await nodes(page)).some(n => n.role === 'button' && /삭제/.test(n.label))) { await clickLast(/삭제/); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인)$/).catch(() => {}); console.log((await text(page, 400)).slice(0, 200)); } else console.log('접수 삭제 버튼 없음');
  }
  step('멤버 개별 등록'); await goto(page, '/manage/members'); await click(page, /^개별 등록$/, { role: 'button', wait: 2000 });
  await typeInto(page, 0, `${TAG} 명부`); await typeInto(page, i => i.type === 'tel', PHONE); await typeInto(page, 2, '자동 검수용 명부 항목').catch(() => {});
  await clickLast(/^등록$/); console.log((await text(page, 500)).slice(0, 300)); await shot('member_added');
  await typeInto(page, 0, 'QA테스트', { clear: true }); await click(page, /^검색 실행$/, { role: 'button', wait: 2500 }); console.log(await text(page, 600)); console.log(await btns()); await shot('member_search');
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2000); console.log('row ->', page.url(), (await text(page, 600)).slice(0, 400)); console.log(await btns()); await shot('member_detail'); }
  if ((await nodes(page)).some(n => n.role === 'button' && /^차단$/.test(n.label))) { await clickLast(/^차단$/); console.log('dialog', await text(page, 300)); await clickLast(/^(차단|확인)$/).catch(() => {}); console.log('after 차단:', (await text(page, 400)).slice(0, 300)); await clickLast(/^차단 해제$/).catch(() => {}); await clickLast(/^(차단 해제|확인)$/).catch(() => {}); console.log('after 해제:', (await text(page, 400)).slice(0, 300)); }
  const delBtn = (await nodes(page)).filter(n => n.role === 'button' && /삭제|명부에서 제거|제거/.test(n.label)); console.log('member delete buttons:', delBtn.map(d => d.label));
  if (delBtn.length) { await clickLast(/삭제|제거/); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|제거|확인)$/).catch(() => {}); console.log((await text(page, 400)).slice(0, 300)); await shot('member_deleted'); }
  await typeInto(page, 0, 'QA테스트', { clear: true }).catch(() => {}); await click(page, /^검색 실행$/, { role: 'button', wait: 2500 }).catch(() => {}); console.log('search after:', (await text(page, 400)).slice(0, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
