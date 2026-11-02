// 쓰기 검증 1: 우리들의 이야기 글 작성 → 목록/상세 확인 → 수정 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/stories' });
try {
  step('login'); console.log(await login(page));
  step('open /stories/new'); await goto(page, '/stories/new');
  console.log('inputs', JSON.stringify(await inputs(page)));
  console.log(await text(page, 400)); await shot('new_form');
  const title = `${TAG} 이야기 ${Date.now()}`;
  await typeInto(page, 0, title);
  await typeInto(page, 1, '자동 검수용 테스트 글입니다. 곧 삭제됩니다.');
  await shot('filled');
  step('submit'); await click(page, /^올리기$/, { role: 'button', wait: 4000 });
  console.log('url', page.url()); console.log(await text(page, 600)); await shot('after_submit');
  step('list'); await goto(page, '/stories'); console.log(await text(page, 500)); await shot('list');
  const item = await click(page, new RegExp(TAG.replace(/[[\]]/g, '\\$&')), { wait: 3000 });
  console.log('detail url', page.url()); console.log(await text(page, 800)); await shot('detail');
  console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | '));
  // 좋아요 / 댓글
  if (await (async () => (await nodes(page)).some(n => /좋아요/.test(n.label)))()) { step('like'); await click(page, /좋아요/, { role: 'button' }); console.log(await text(page, 400)); await shot('liked'); }
  const ins = await inputs(page); console.log('detail inputs', JSON.stringify(ins));
  if (ins.length) { step('comment'); await typeInto(page, ins.length - 1, `${TAG} 댓글`); await click(page, /^(등록|댓글 등록|올리기|작성)$/, { role: 'button', wait: 3000 }).catch(e => console.log('comment btn?', e.message)); console.log(await text(page, 800)); await shot('comment'); }
  // 수정
  if (await (async () => (await nodes(page)).some(n => /^수정$/.test(n.label)))()) {
    step('edit'); await click(page, /^수정$/, { role: 'button', wait: 3000 }); console.log('edit url', page.url());
    await typeInto(page, 0, ' (수정됨)'); await click(page, /^(저장|수정 완료|올리기|수정)$/, { role: 'button', wait: 4000 }); console.log(await text(page, 400)); await shot('edited');
  }
  // 삭제
  step('delete'); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog:', await text(page, 300)); await shot('delete_dialog');
  await click(page, /^(삭제|확인|네)$/, { role: 'button', wait: 4000 }).catch(e => console.log('confirm?', e.message));
  console.log('after delete url', page.url()); console.log(await text(page, 400)); await shot('after_delete');
  step('verify list'); await goto(page, '/stories'); console.log(await text(page, 400));
} catch (e) { console.log('ERROR', e.message); await shot('error'); }
finally { console.log('\nLOGS:\n' + logs.join('\n')); await logout(page); await browser.close(); }
