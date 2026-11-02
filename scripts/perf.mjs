// 초기 로딩 성능 측정 (콜드 캐시, 데스크톱/모바일 각 2회)
import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  for (let i = 1; i <= 2; i++) {
    const ctx = await browser.newContext({ viewport: vp, locale: 'ko-KR' });
    const page = await ctx.newPage();
    let bytes = 0, count = 0; const big = [];
    page.on('response', async r => { try { const h = r.headers(); const len = Number(h['content-length'] || 0); bytes += len; count++; if (len > 300000) big.push(`${(len / 1024 / 1024).toFixed(2)}MB ${r.url().replace('https://', '').slice(0, 90)}`); } catch {} });
    const t0 = Date.now();
    await page.goto('https://dongilchurch.com/home', { waitUntil: 'load', timeout: 90000 });
    const tLoad = Date.now() - t0;
    await page.waitForSelector('flt-glass-pane, flutter-view', { timeout: 60000 });
    const tFlutter = Date.now() - t0;
    await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
    const tIdle = Date.now() - t0;
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const res = performance.getEntriesByType('resource'); return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), resources: res.length, transfer: Math.round(res.reduce((a, r) => a + (r.transferSize || 0), 0) / 1024) }; });
    console.log(`${name} #${i}: load=${tLoad}ms flutterView=${tFlutter}ms networkidle=${tIdle}ms ttfb=${nav.ttfb}ms resources=${nav.resources} transfer≈${nav.transfer}KB`);
    if (i === 1) console.log('  big:', big.join(' | '));
    await ctx.close();
  }
}
await browser.close();
