// 새가족 접수 #1 상세(확인 후 열람) → 상태 변경(연락함/보류/등록됨) → 삭제 가능 여부, 명부 #15 상세 → 차단/해제 → 삭제 가능 여부
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/members' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  step('새가족 접수 #1 상세'); await goto(page, '/manage/members/newcomers/1'); await click(page, /^확인 후 열람$/, { role: 'button', wait: 2500 }); console.log((await text(page, 1200)).slice(0, 900)); console.log(await btns()); await shot('newcomer_detail');
  for (const st of ['연락함', '보류', '등록됨']) { const b = (await nodes(page)).find(n => (n.role === 'button' || n.role === 'checkbox') && new RegExp('^' + st).test(n.label)); if (b) { await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2); await page.waitForTimeout(1500); await clickLast(/^(확인|저장|변경)$/).catch(() => {}); console.log(st, '->', (await text(page, 500)).slice(0, 250)); } else console.log('no button', st); }
  console.log(await btns());
  const nd = (await nodes(page)).filter(n => n.role === 'button' && /삭제|파기/.test(n.label)); console.log('newcomer delete buttons', nd.map(d => d.label));
  if (nd.length) { await clickLast(/삭제|파기/); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|파기|확인)$/).catch(() => {}); console.log((await text(page, 400)).slice(0, 250)); await shot('newcomer_deleted'); }
  await goto(page, '/manage/members'); await click(page, /^새가족 접수$/, { role: 'checkbox', wait: 2500 }); await click(page, /^전체$/, { role: 'checkbox', wait: 2000 }); console.log('접수 목록(전체):', (await text(page, 500)).slice(80, 400));
  step('명부 #15 상세'); await goto(page, '/manage/members/15'); await click(page, /^확인 후 열람$/, { role: 'button', wait: 2500 }); console.log((await text(page, 1200)).slice(0, 900)); console.log(await btns()); await shot('member_detail');
  const md = (await nodes(page)).filter(n => n.role === 'button' && /삭제|제거|탈퇴 처리/.test(n.label)); console.log('member delete buttons', md.map(d => d.label));
  if (md.length) { await clickLast(/삭제|제거|탈퇴 처리/); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|제거|확인|탈퇴 처리)$/).catch(() => {}); console.log((await text(page, 400)).slice(0, 250)); await shot('member_deleted'); }
  await goto(page, '/manage/members'); await typeInto(page, 0, 'QA테스트'); await click(page, /^검색 실행$/, { role: 'button', wait: 2500 }); console.log('명부 검색:', (await text(page, 400)).slice(60, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
