// Flutter 웹 앱 페이지: 렌더링 대기 → 스크린샷 → 시맨틱(접근성) 트리 덤프
import { chromium } from 'playwright';
import fs from 'node:fs';
const url = process.argv[2] || 'https://dongilchurch.com/';
const out = process.argv[3] || 'reports/manual/snap';
const mobile = process.argv.includes('--mobile');
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, locale: 'ko-KR', deviceScaleFactor: 1 });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => ['error', 'warning'].includes(m.type()) && logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
page.on('pageerror', e => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
page.on('response', r => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url().slice(0, 200)}`); });
page.on('requestfailed', r => logs.push(`[reqfail] ${r.url().slice(0, 200)} ${r.failure()?.errorText}`));
const t0 = Date.now();
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForSelector('flt-glass-pane, flutter-view, flt-scene-host', { timeout: 60000 }).catch(() => logs.push('[warn] flutter view not found'));
await page.waitForTimeout(3000);
console.log('render ms', Date.now() - t0, 'url', page.url(), 'title', await page.title());
// 시맨틱 트리 활성화 (Flutter는 보조기기 감지 전까지 DOM 시맨틱을 만들지 않음)
const ph = page.locator('flt-semantics-placeholder');
if (await ph.count()) { await ph.first().click({ force: true }).catch(() => {}); await page.waitForTimeout(1500); }
const info = await page.evaluate(() => {
  const renderer = document.querySelector('flt-glass-pane') ? 'html/canvaskit' : 'unknown';
  const canvases = document.querySelectorAll('canvas').length;
  const sem = [...document.querySelectorAll('flt-semantics, [role]')].map(e => {
    const r = e.getBoundingClientRect();
    return { role: e.getAttribute('role'), label: e.getAttribute('aria-label') || e.textContent.trim().slice(0, 60), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(s => s.label && s.w > 0);
  const apiCalls = performance.getEntriesByType('resource').map(r => r.name).filter(n => /api|json|\.php/i.test(n) && !/main\.dart|flutter|canvaskit|fonts|\.png|\.jpg/i.test(n)).slice(0, 60);
  return { renderer, canvases, semCount: sem.length, sem: sem.slice(0, 200), apiCalls, bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 800) };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: `${out}${mobile ? '_mobile' : ''}.png`, fullPage: true });
await page.screenshot({ path: `${out}${mobile ? '_mobile' : ''}_fold.png`, fullPage: false });
console.log('LOGS:\n' + logs.join('\n'));
await browser.close();
