import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/somoim' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
try {
  step('login'); await login(page);
  await goto(page, '/manage/groups'); await click(page, /^소모임$/, { role: 'checkbox', wait: 3000 });
  step('명단'); await click(page, /^명단$/, { role: 'button', wait: 3000 }); console.log('url', page.url()); console.log(await text(page, 800)); console.log(await btns()); await shot('roster');
  step('수정 화면 재확인'); await goto(page, '/somoim/1165/edit'); console.log(await text(page, 500)); console.log(await btns()); await shot('edit_after_close');
} catch (e) { console.log('ERROR', e.message); await shot('error'); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
