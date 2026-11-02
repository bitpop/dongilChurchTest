// 쓰기 검증 2: 중보기도 글(익명) 작성 → 상세 → 댓글 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/prayer' });
try {
  step('login'); await login(page);
  step('open /prayer/new'); await goto(page, '/prayer/new');
  console.log('inputs', JSON.stringify(await inputs(page))); console.log((await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | '));
  await typeInto(page, 0, `${TAG} 기도제목 ${Date.now()}`);
  await typeInto(page, 1, '자동 검수용 기도제목입니다. 곧 삭제됩니다.');
  step('check anonymous'); await click(page, /익명으로 올리기/, { role: 'checkbox' }); console.log('checked?', (await nodes(page)).find(n => /익명으로 올리기/.test(n.label))?.checked); await shot('filled');
  step('submit'); await click(page, /^올리기$/, { role: 'button', wait: 4000 }); console.log('url', page.url()); console.log(await text(page, 700)); await shot('after_submit');
  console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | '));
  step('list'); await goto(page, '/prayer'); console.log(await text(page, 500)); await shot('list');
  await click(page, /QA테스트/, { wait: 3000 }); console.log('detail', page.url());
  const ins = await inputs(page); if (ins.length) { step('comment'); await typeInto(page, ins.length - 1, `${TAG} 함께 기도합니다`); await click(page, /^등록$/, { role: 'button', wait: 3000 }); console.log(await text(page, 700)); await shot('comment'); }
  if ((await nodes(page)).some(n => /기도할게요|기도합니다|함께 기도/.test(n.label) && n.role === 'button')) { step('pray button'); await click(page, /기도할게요|기도합니다|함께 기도/, { role: 'button' }); console.log(await text(page, 500)); }
  step('delete'); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog:', await text(page, 200)); await click(page, /^삭제$/, { role: 'button', wait: 4000 }); console.log('after', page.url(), await text(page, 300)); await shot('after_delete');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 500)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
