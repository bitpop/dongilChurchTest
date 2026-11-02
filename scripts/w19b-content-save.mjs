// 콘텐츠 편집 저장 검증(정밀): 새가족 안내 문구 블록의 textarea 끝에 HTML 주석을 추가해 '해당 블록의' 저장 버튼으로 저장 → 버전 증가 확인 → 같은 길이만큼 Backspace 로 제거 후 저장 → 버전 확인
import { launch, goto, click, text, nodes, inputs, login, logout, step } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/content-name-social' });
const MARK = '<!-- qa-test -->';
const ver = async () => (await text(page, 800)).match(/새가족 안내 문구v(\d+)/)?.[1];
try {
  step('login'); await login(page);
  await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 });
  const ta = (await inputs(page)).find(i => i.type === 'textarea'); console.log('textarea at y', ta?.y, 'version', await ver());
  const saveBtn = async () => { const bs = (await nodes(page)).filter(n => n.role === 'button' && /저장 · 바로 반영/.test(n.label) && n.y > ta.y).sort((a, b) => a.y - b.y); return bs[0]; };
  let b = await saveBtn(); console.log('save button y', b?.y, '(textarea y', ta.y, ')');
  if (!b) throw new Error('no save button below textarea');
  step('주석 추가 후 저장'); await page.mouse.click(ta.x, ta.y); await page.keyboard.press('Control+End'); await page.keyboard.type(MARK); await page.waitForTimeout(500);
  b = await saveBtn(); await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2); await page.waitForTimeout(3000);
  console.log('after save version', await ver(), (await text(page, 3000)).match(/.{0,20}(저장했어요|반영했어요).{0,10}/)?.[0]); await shot('content_saved2');
  await goto(page, '/newcomer'); const pub = await text(page, 300); console.log('public renders:', pub.slice(0, 100), '| mark visible?', /qa-test/.test(pub));
  step('주석 제거 후 저장'); await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 });
  const ta2 = (await inputs(page)).find(i => i.type === 'textarea'); await page.mouse.click(ta2.x, ta2.y); await page.keyboard.press('Control+End'); for (let i = 0; i < MARK.length; i++) await page.keyboard.press('Backspace'); await page.waitForTimeout(500);
  const b2 = (await nodes(page)).filter(n => n.role === 'button' && /저장 · 바로 반영/.test(n.label) && n.y > ta2.y).sort((a, c) => a.y - c.y)[0]; await page.mouse.click(b2.x + b2.w / 2, b2.y + b2.h / 2); await page.waitForTimeout(3000);
  console.log('after restore version', await ver()); await shot('content_restored2');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 600)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
