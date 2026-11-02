// 관리자: 강의 등록(영상 1개 포함) → /lectures 교인 화면 확인(진도/탭) → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/lectures' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = async (re) => { const list = (await nodes(page)).filter(n => n.role === 'button' && re.test(n.label)); const n = list[list.length - 1]; if (!n) throw new Error('no ' + re); await page.mouse.click(n.x + n.w / 2, n.y + n.h / 2); await page.waitForTimeout(3000); };
try {
  step('login'); await login(page);
  await goto(page, '/manage/lectures'); await click(page, /^새 강의$/, { role: 'button', wait: 3000 });
  await typeInto(page, 0, `${TAG} 강의 ${Date.now()}`); await typeInto(page, 1, '검수용 강사'); await typeInto(page, 2, '<p>자동 검수용 강의입니다. 곧 삭제됩니다.</p>');
  step('영상 추가'); const before = (await inputs(page)).length; await click(page, /^영상 추가$/, { role: 'button', wait: 2000 }); const after = await inputs(page); console.log('inputs before/after', before, after.length, JSON.stringify(after.map(i => i.type + ':' + i.value)));
  console.log(await text(page, 1200)); await shot('video_row');
  // 새로 생긴 입력: 유튜브 링크, 제목?, 분, 초 순으로 추정 → 값 채움
  const newIdx = []; for (let i = before; i < after.length; i++) newIdx.push(i);
  const vals = ['https://www.youtube.com/watch?v=_4EbWE7Xxjk', '검수용 영상', '1', '30'];
  for (let k = 0; k < newIdx.length && k < vals.length; k++) await typeInto(page, newIdx[k], vals[k], { clear: true });
  console.log('values', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value))); await shot('filled');
  step('저장'); await clickLast(/^등록$/); await page.waitForTimeout(1500); console.log('url', page.url()); console.log(await text(page, 600)); await shot('saved');
  if (page.url().endsWith('/new')) { console.log('still on form, errors:', (await text(page, 2000)).match(/.{0,40}(주세요|오류|필수).{0,20}/g)); }
  step('/lectures 확인'); await goto(page, '/lectures'); console.log(await text(page, 500)); await shot('public_list');
  if ((await nodes(page)).some(n => /QA테스트/.test(n.label))) { await click(page, /QA테스트/, { wait: 3500 }); console.log('detail', page.url()); console.log(await text(page, 800)); console.log(await btns()); await shot('detail');
    for (const t of ['강사소개', '커리큘럼', '수강안내']) { await click(page, new RegExp(`^${t}$`), { wait: 1500 }).catch(() => {}); } await shot('tabs'); }
  step('삭제'); await goto(page, '/manage/lectures'); console.log(await text(page, 400)); console.log(await btns());
  const row = (await nodes(page)).find(n => /QA테스트/.test(n.label)); if (row) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url()); console.log(await btns()); await shot('admin_detail'); }
  if ((await nodes(page)).some(n => /^(삭제|보관)$/.test(n.label) && n.role === 'button')) { await click(page, /^(삭제|보관)$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인|보관)$/).catch(() => {}); console.log(await text(page, 400)); await shot('deleted'); }
  else { const dels = (await nodes(page)).filter(n => n.role === 'button' && /삭제|보관/.test(n.label)); console.log('delete-ish buttons:', dels.map(d => d.label)); if (dels.length) { const d = dels[dels.length - 1]; await page.mouse.click(d.x + d.w / 2, d.y + d.h / 2); await page.waitForTimeout(1500); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인|보관)$/).catch(() => {}); console.log(await text(page, 400)); } }
  await goto(page, '/lectures'); console.log('/lectures after:', await text(page, 300));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
