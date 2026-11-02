// 쓰기 검증 3: 축하&감사 글 작성 → 목록/상세 → 좋아요 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/wishes' });
try {
  step('login'); await login(page);
  step('open /heritage/wishes/new'); await goto(page, '/heritage/wishes/new');
  console.log('inputs', JSON.stringify(await inputs(page)));
  await typeInto(page, 0, `${TAG} 축하글 ${Date.now()}`); await typeInto(page, 1, '자동 검수용 축하 글입니다. 곧 삭제됩니다.'); await shot('filled');
  step('submit'); await click(page, /^올리기$/, { role: 'button', wait: 4000 }); console.log('url', page.url()); console.log(await text(page, 700)); await shot('after_submit');
  console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | '));
  step('list'); await goto(page, '/heritage/wishes'); console.log(await text(page, 600)); await shot('list');
  await click(page, /QA테스트/, { wait: 3000 }); console.log('detail', page.url());
  if ((await nodes(page)).some(n => /좋아요/.test(n.label) && n.role === 'button')) { step('like'); await click(page, /좋아요/, { role: 'button' }); console.log(await text(page, 500)); }
  const ins = await inputs(page); if (ins.length) { step('comment'); await typeInto(page, ins.length - 1, `${TAG} 댓글`); await click(page, /^등록$/, { role: 'button', wait: 3000 }); console.log(await text(page, 700)); await shot('comment'); }
  step('delete'); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await click(page, /^삭제$/, { role: 'button', wait: 4000 }); console.log('after', page.url(), await text(page, 400)); await shot('after_delete');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 500)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
