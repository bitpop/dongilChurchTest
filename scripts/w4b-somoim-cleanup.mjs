// 소모임 참여/마감/삭제 경로 확인 및 정리
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/somoim' });
const btns = async () => (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ');
try {
  step('login'); await login(page);
  await goto(page, '/somoim/1165'); console.log(await text(page, 300));
  step('참여하기'); await click(page, /^참여하기$/, { role: 'button', wait: 2500 }); console.log('dialog/after:', await text(page, 500)); await shot('join_dialog');
  await click(page, /^(참여|신청|확인)$/, { role: 'button', wait: 3000 }).catch(e => console.log('confirm?', e.message)); console.log(await text(page, 600)); console.log('buttons:', await btns()); await shot('joined');
  if ((await nodes(page)).some(n => /참여 취소|취소하기/.test(n.label) && n.role === 'button')) { step('참여 취소'); await click(page, /참여 취소|취소하기/, { role: 'button', wait: 2000 }); await click(page, /^(확인|취소하기|참여 취소)$/, { role: 'button', wait: 3000 }).catch(() => {}); console.log(await text(page, 500)); }
  step('수정 화면'); await click(page, /^수정$/, { role: 'button', wait: 3000 }); console.log('url', page.url()); console.log('buttons:', await btns()); await shot('edit');
  if ((await nodes(page)).some(n => /^삭제$/.test(n.label) && n.role === 'button')) { step('삭제(수정화면)'); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 200)); await click(page, /^삭제$/, { role: 'button', wait: 4000 }); console.log('after', page.url(), await text(page, 300)); }
  else { await click(page, /^취소$/, { role: 'button', wait: 2000 }).catch(() => {}); }
  await goto(page, '/somoim/1165'); const t = await text(page, 300); console.log('detail now:', t);
  if (!/찾을 수 없|없는 페이지/.test(t)) {
    step('마감'); await click(page, /^마감$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await click(page, /^(마감|확인)$/, { role: 'button', wait: 3000 }).catch(() => {}); console.log(await text(page, 400)); console.log('buttons:', await btns()); await shot('closed');
    step('관리자 소모임 탭'); await goto(page, '/manage/groups'); await click(page, /^소모임$/, { role: 'checkbox', wait: 3000 }); console.log(await text(page, 800)); console.log('buttons:', await btns()); await shot('admin_somoim');
    const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row click ->', page.url(), await text(page, 500)); console.log('buttons:', await btns()); await shot('admin_somoim_detail'); }
    if ((await nodes(page)).some(n => /삭제/.test(n.label) && n.role === 'button')) { step('관리자 삭제'); await click(page, /삭제/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await click(page, /^(삭제|확인|완전 삭제)$/, { role: 'button', wait: 4000 }).catch(() => {}); console.log(await text(page, 400)); }
  }
  step('verify'); await goto(page, '/somoim'); await click(page, /^전체$/, { role: 'checkbox', wait: 2500 }).catch(() => {}); console.log(await text(page, 400));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
