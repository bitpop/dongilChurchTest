// 관리자: 소그룹 개설 → /groups 확인 → 그룹 채팅/게시판 → 보관
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/groups' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
try {
  step('login'); await login(page);
  await goto(page, '/manage/groups'); await click(page, /^소그룹 개설$/, { role: 'button', wait: 3000 });
  console.log('url', page.url()); console.log(await text(page, 800)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type))); console.log(await btns()); await shot('form');
  const ins = await inputs(page);
  await typeInto(page, 0, `${TAG} 소그룹 ${Date.now()}`);
  for (let i = 1; i < ins.length; i++) if (ins[i].type === 'textarea') { await typeInto(page, i, '자동 검수용 소그룹입니다. 곧 보관됩니다.'); break; }
  await shot('filled');
  step('저장'); await clickLast(/^(개설|등록|저장|개설하기)$/); await page.waitForTimeout(1500); console.log('url', page.url()); console.log(await text(page, 800)); console.log(await btns()); await shot('saved');
  step('멤버 추가 화면'); if ((await nodes(page)).some(n => /멤버 추가|멤버 관리/.test(n.label) && n.role === 'button')) { await click(page, /멤버 추가|멤버 관리/, { role: 'button', wait: 2500 }); console.log(await text(page, 600)); console.log(await btns()); await shot('members'); }
  step('/groups 확인'); await goto(page, '/groups'); console.log(await text(page, 500)); await shot('my_groups');
  if ((await nodes(page)).some(n => /QA테스트/.test(n.label))) { await click(page, /QA테스트/, { wait: 3000 }); console.log('group url', page.url()); console.log(await text(page, 600)); console.log(await btns()); await shot('group_detail'); }
  step('보관'); await goto(page, '/manage/groups'); console.log(await text(page, 500)); console.log(await btns());
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url()); console.log(await text(page, 500)); console.log(await btns()); await shot('admin_group'); }
  if ((await nodes(page)).some(n => /보관|삭제/.test(n.label) && n.role === 'button')) { await click(page, /^(보관|보관하기|삭제)$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(보관|확인|삭제)$/).catch(() => {}); console.log(await text(page, 400)); await shot('archived'); }
  await goto(page, '/manage/groups'); await click(page, /^보관$/, { role: 'checkbox', wait: 2500 }).catch(() => {}); console.log('보관 필터:', await text(page, 400));
  await goto(page, '/groups'); console.log('/groups after:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
