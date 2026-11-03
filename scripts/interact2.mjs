// 인터랙션 시나리오 검수: 각 단계 후 스크린샷 + 시맨틱 텍스트 + URL 기록
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'reports/interact2'; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const sem = (page) => page.evaluate(() => document.querySelector('flt-semantics-host')?.textContent.replace(/\s+/g, ' ').slice(0, 700) || '');
const enable = async (page) => { await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await page.waitForTimeout(800); };
async function run(name, viewport, steps) {
  const ctx = await browser.newContext({ viewport, locale: 'ko-KR', isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => m.type() === 'error' && !/GL Driver/.test(m.text()) && logs.push('[console] ' + m.text().slice(0, 200)));
  page.on('pageerror', e => logs.push('[pageerror] ' + String(e).slice(0, 200)));
  page.on('response', r => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url().slice(0, 150)}`); });
  console.log(`\n##### ${name}`);
  let i = 0;
  for (const [label, fn] of steps) {
    try { await fn(page); } catch (e) { console.log(`  !! ${label}: ${String(e).slice(0, 200)}`); }
    await page.waitForTimeout(1500);
    await enable(page);
    const shot = `${OUT}/${name}_${String(++i).padStart(2, '0')}_${label.replace(/[^a-zA-Z0-9가-힣]+/g, '_')}.png`;
    await page.screenshot({ path: shot });
    console.log(`  [${i}] ${label} -> ${page.url()}\n      ${await sem(page)}`);
  }
  if (logs.length) console.log('  LOGS: ' + logs.join(' || '));
  await ctx.close();
}
const go = (u) => async (p) => { await p.goto('https://dongilchurch.com' + u, { waitUntil: 'networkidle', timeout: 90000 }); await p.waitForTimeout(3500); };
const click = (x, y) => async (p) => { await p.mouse.click(x, y); };
const hover = (x, y) => async (p) => { await p.mouse.move(x, y); await p.waitForTimeout(800); };
const type = (t) => async (p) => { await p.keyboard.type(t, { delay: 30 }); };
const key = (k) => async (p) => { await p.keyboard.press(k); };

await run('desktop_home', { width: 1440, height: 1000 }, [
  ['open home', go('/home')],
  ['hover gnb 예배', hover(387, 47)],
  ['click gnb 예배', click(387, 47)],
  ['click gnb 교회소개', click(840, 47)],
  ['click gnb 행정', click(938, 47)],
  ['click gnb 성경말씀', click(1035, 47)],
  ['click search icon', click(1257, 47)],
  ['type query', type('예배')],
  ['enter', key('Enter')],
  ['click logo', click(130, 47)],
]);
await run('desktop_hub', { width: 1440, height: 1000 }, [
  ['open hub', go('/')],
  ['banner next', click(990, 226)],
  ['banner next again', click(990, 226)],
  ['banner pause', click(957, 144)],
  ['click 홈페이지 바로가기', click(720, 605)],
  ['back', async (p) => { await p.goBack(); await p.waitForTimeout(2500); }],
  ['click 소그룹(잠금)', click(796, 432)],
]);
await run('desktop_sermons', { width: 1440, height: 1200 }, [
  ['open sermons', go('/worship/sermons')],
  ['filter 주일', click(238, 308)],
  ['filter 수요', click(317, 308)],
  ['series dropdown', click(470, 308)],
  ['esc', key('Escape')],
  ['click search box', click(700, 364)],
  ['type 믿음', type('믿음')],
  ['enter', key('Enter')],
  ['open first sermon', click(400, 470)],
]);
await run('desktop_notfound', { width: 1440, height: 1000 }, [
  ['open unknown route', go('/this-route-does-not-exist')],
  ['open unknown sermon', go('/worship/sermons/999999')],
]);
await run('mobile_home', { width: 390, height: 844 }, [
  ['open hub', go('/')],
  ['hamburger', click(22, 27)],
  ['close(esc)', key('Escape')],
  ['tab 예배', click(117, 810)],
  ['tab 강의', click(195, 810)],
  ['tab 소그룹', click(272, 810)],
  ['tab 전체', click(350, 810)],
  ['tab 홈', click(39, 810)],
]);
await run('mobile_sermons', { width: 390, height: 844 }, [
  ['open sermons', go('/worship/sermons')],
  ['scroll', async (p) => { await p.mouse.move(195, 500); await p.mouse.wheel(0, 600); }],
  ['open search page', go('/search')],
  ['open location', go('/about/location')],
]);
await browser.close();
