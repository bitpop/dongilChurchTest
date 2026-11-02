// 쓰기 검증 4: 소모임 등록 → 목록/상세 → 참가 신청 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/somoim' });
try {
  step('login'); await login(page);
  step('open /somoim/new'); await goto(page, '/somoim/new');
  console.log('inputs', JSON.stringify(await inputs(page))); console.log((await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | '));
  await typeInto(page, 0, `${TAG} 소모임 ${Date.now()}`); await typeInto(page, 1, '자동 검수용 소모임입니다. 곧 삭제됩니다.');
  const ins = await inputs(page); const place = ins.findIndex(i => i.type === 'text' && i.value === '' ); console.log('text inputs', ins.map(i => i.type + ':' + i.value).join(','));
  await typeInto(page, 2, '비전센터 2층').catch(e => console.log(e.message));
  await typeInto(page, 3, '5').catch(e => console.log(e.message));
  step('date picker'); await click(page, /^선택$/, { role: 'button', wait: 1500 }).catch(e => console.log(e.message)); console.log('picker:', await text(page, 300)); await shot('date_picker');
  // 날짜 선택 다이얼로그: '확인' 또는 'OK'
  await click(page, /^(확인|OK|선택)$/, { role: 'button', wait: 1500 }).catch(e => console.log('picker confirm?', e.message));
  await click(page, /^(확인|OK)$/, { role: 'button', wait: 1500 }).catch(() => {});
  console.log('after picker:', await text(page, 400)); await shot('filled');
  step('submit'); await click(page, /^등록하기$/, { role: 'button', wait: 4000 }); console.log('url', page.url()); console.log(await text(page, 800)); await shot('after_submit');
  console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | '));
  step('list'); await goto(page, '/somoim'); console.log(await text(page, 500)); await shot('list');
  await click(page, /QA테스트/, { wait: 3000 }).catch(e => console.log(e.message)); console.log('detail', page.url());
  if ((await nodes(page)).some(n => /참가 신청|신청하기/.test(n.label) && n.role === 'button')) { step('apply'); await click(page, /참가 신청|신청하기/, { role: 'button', wait: 2500 }); console.log(await text(page, 500)); await shot('applied'); await click(page, /^(확인|신청)$/, { role: 'button', wait: 2500 }).catch(() => {}); console.log(await text(page, 500)); }
  step('delete'); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 200)); await click(page, /^삭제$/, { role: 'button', wait: 4000 }); console.log('after', page.url(), await text(page, 300)); await shot('after_delete');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
