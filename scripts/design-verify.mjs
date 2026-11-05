// 디자인 의심 항목 확인: 개인정보 표 가로 스크롤 여부, 포커스 링 유무, 루트 허브 폭, 콘텐츠 컬럼 폭
import { chromium } from 'playwright';
import { goto, nodes, enableSemantics } from './qa-lib.mjs';
import fs from 'node:fs';
const OUT = 'reports/design-verify'; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const w of [1440, 768]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 1200 }, locale: 'ko-KR' }); const page = await ctx.newPage();
  await goto(page, '/privacy');
  // 표 영역에서 가로 휠 → 변화 여부
  const y = w === 1440 ? 700 : 820;
  await page.screenshot({ path: `${OUT}/privacy_${w}_before.png`, clip: { x: 0, y: 400, width: w, height: 500 } });
  await page.mouse.move(w / 2, y); await page.mouse.wheel(400, 0); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/privacy_${w}_hscroll.png`, clip: { x: 0, y: 400, width: w, height: 500 } });
  // shift+wheel
  await page.keyboard.down('Shift'); await page.mouse.wheel(0, 400); await page.keyboard.up('Shift'); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/privacy_${w}_shiftscroll.png`, clip: { x: 0, y: 400, width: w, height: 500 } });
  // 드래그
  await page.mouse.move(w - 100, y); await page.mouse.down(); await page.mouse.move(w - 500, y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/privacy_${w}_drag.png`, clip: { x: 0, y: 400, width: w, height: 500 } });
  // 시맨틱 노드 중 가로 스크롤 가능 항목
  await enableSemantics(page).catch(() => {});
  const sc = await page.evaluate(() => [...document.querySelectorAll('flt-semantics[style*="overflow"], flt-semantics-scroll-overflow, [aria-roledescription]')].length);
  console.log(w, 'scroll nodes', sc);
  await ctx.close();
}
// 포커스 링: /home 에서 Tab 5회 후 활성 요소 bbox 캡처
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' }); const page = await ctx.newPage();
  await goto(page, '/home'); await enableSemantics(page).catch(() => {});
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(300); const a = await page.evaluate(() => { const e = document.activeElement; const r = e?.getBoundingClientRect(); return e ? { tag: e.tagName, label: e.getAttribute('aria-label') || e.textContent?.slice(0, 30), x: r.x, y: r.y, w: r.width, h: r.height } : null; }); console.log('tab', i + 1, JSON.stringify(a)); if (a && a.w > 0) await page.screenshot({ path: `${OUT}/focus_tab${i + 1}.png`, clip: { x: Math.max(0, a.x - 20), y: Math.max(0, a.y - 20), width: Math.min(1440, a.w + 40), height: a.h + 40 } }); }
  await ctx.close();
}
// 콘텐츠 컬럼 폭 측정: 1440에서 각 페이지의 본문 최대 폭(시맨틱 노드 bbox)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: 'ko-KR' }); const page = await ctx.newPage();
  for (const r of ['/', '/home', '/about', '/faq', '/bulletins', '/worship/time', '/worship/sermons', '/somoim', '/offering', '/search', '/stories', '/heritage/wishes', '/privacy']) {
    await goto(page, r); const ns = (await nodes(page)).filter(n => n.y > 80 && n.y < 1100 && n.w > 10);
    const minX = Math.min(...ns.map(n => n.x)), maxX = Math.max(...ns.map(n => n.x + n.w));
    console.log(r.padEnd(18), 'content x', Math.round(minX), '~', Math.round(maxX), 'width', Math.round(maxX - minX));
  }
  await ctx.close();
}
await browser.close();
