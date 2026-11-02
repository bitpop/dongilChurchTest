// 콘텐츠 편집 저장(안내 문구에 주석 추가 → 공개 반영 확인 → 원문 복원), 내 정보 이름 변경 → 복원, 소셜 로그인 버튼 리다이렉트 확인
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/content-name-social' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
const MARK = '<!-- qa-test -->';
try {
  step('소셜 로그인 리다이렉트'); await goto(page, '/login');
  for (const p of ['카카오', '네이버', '구글']) { const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null), click(page, new RegExp(`${p}로 시작하기$`), { role: 'button', wait: 3000 })]); const u = pop ? pop.url() : page.url(); console.log(p, '->', u.slice(0, 120)); if (pop) await pop.close(); await goto(page, '/login'); }
  step('login'); await login(page);
  step('콘텐츠 편집: 안내 문구'); await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 });
  const ins = await inputs(page); console.log('inputs', ins.map(i => i.type + ':' + i.value.length).join(','));
  const ta = ins.findIndex(i => i.type === 'textarea'); const orig = ins[ta].value; console.log('orig length', orig.length, 'head', orig.slice(0, 80));
  const hdr = (await text(page, 600)).match(/새가족 안내 문구v(\d+)/)?.[1]; console.log('version before', hdr);
  await page.mouse.click(ins[ta].x, ins[ta].y); await page.keyboard.press('Control+End'); await page.keyboard.type(MARK); await page.waitForTimeout(300);
  await clickLast(/^저장 · 바로 반영$/); await page.waitForTimeout(2000); console.log('after save:', (await text(page, 700)).match(/새가족 안내 문구v\d+[^제]{0,60}/)?.[0], (await text(page, 2000)).match(/.{0,20}(저장했어요|반영).{0,20}/)?.[0]); await shot('content_saved');
  const after = (await inputs(page))[ta]?.value; console.log('contains mark after save?', after?.includes(MARK));
  await goto(page, '/newcomer'); console.log('public newcomer still renders:', (await text(page, 200)).slice(0, 120));
  step('원문 복원'); await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 }); const ins2 = await inputs(page); const cur = ins2[ta].value; console.log('current contains mark?', cur.includes(MARK));
  await page.mouse.click(ins2[ta].x, ins2[ta].y); await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); await page.keyboard.insertText(orig); await page.waitForTimeout(500);
  console.log('restored equals orig?', (await inputs(page))[ta].value === orig);
  await clickLast(/^저장 · 바로 반영$/); await page.waitForTimeout(2000); console.log('after restore:', (await text(page, 700)).match(/새가족 안내 문구v\d+/)?.[0]); await shot('content_restored');
  await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 }); const fin = (await inputs(page))[ta].value; console.log('final equals orig?', fin === orig, 'final contains mark?', fin.includes(MARK));
  step('이름 변경 → 복원'); await goto(page, '/me'); await click(page, /^이름 변경$/, { role: 'button', wait: 1500 }); const nameIn = (await inputs(page))[0]; const origName = nameIn.value; console.log('orig name', origName);
  await typeInto(page, 0, origName + ' QA', { clear: true }); await clickLast(/^저장$/); console.log('after rename:', (await text(page, 300)).slice(0, 200)); await shot('renamed');
  await goto(page, '/home'); console.log('header shows:', (await nodes(page)).filter(n => /QA\b/.test(n.label)).map(n => n.label).slice(0, 3));
  await goto(page, '/me'); await click(page, /^이름 변경$/, { role: 'button', wait: 1500 }); await typeInto(page, 0, origName, { clear: true }); await clickLast(/^저장$/); console.log('after restore:', (await text(page, 300)).slice(0, 200)); await shot('name_restored');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
