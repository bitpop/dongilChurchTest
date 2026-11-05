// 디자인 검수용 캡처: 라우트 × 폭(1440/1024/768/390) 전체 화면(긴 뷰포트) + 데스크톱 GNB hover 상태 + 다크 모드 선호 시 화면
import { launch, goto, enableSemantics } from './qa-lib.mjs';
import { chromium } from 'playwright';
import fs from 'node:fs';
const routes = (process.argv[2] ? process.argv[2].split(',') : fs.readFileSync('docs/routes.txt', 'utf8').split('\n')).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const OUT = process.env.OUT || 'reports/design'; fs.mkdirSync(OUT, { recursive: true });
const widths = (process.env.WIDTHS || '1440,1024,768,390').split(',').map(Number);
const STATE = process.env.STATE;
const browser = await chromium.launch();
const name = (r) => r.replace(/[^a-zA-Z0-9가-힣]+/g, '_').replace(/^_|_$/g, '') || 'root';
for (const w of widths) {
  const h = w >= 1024 ? 2400 : 2600;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ko-KR', deviceScaleFactor: 1, isMobile: w < 500, hasTouch: w < 500, ...(STATE ? { storageState: STATE } : {}) });
  const page = await ctx.newPage();
  if (process.env.ADMIN_ID) { const { login } = await import('./qa-lib.mjs'); await login(page); }
  for (const r of routes) {
    try { await goto(page, r, 3500); await page.screenshot({ path: `${OUT}/${name(r)}_${w}.png` }); console.log(`${w} ${r}`); }
    catch (e) { console.log(`${w} ${r} ERR ${e.message.slice(0, 80)}`); }
  }
  await ctx.close();
}
await browser.close();
