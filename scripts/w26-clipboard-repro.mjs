// '주소 복사' 클릭 시 pageerror 재현: 클립보드 권한 허용/거부 두 환경에서 비교하고 화면 피드백(토스트) 기록
import { chromium } from 'playwright';
import { goto, click, text, enableSemantics } from './qa-lib.mjs';
const browser = await chromium.launch();
for (const mode of ['permission-denied(기본)', 'clipboard-write 허용']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: 'ko-KR', ...(mode.includes('허용') ? { permissions: ['clipboard-write', 'clipboard-read'] } : {}) });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
  for (const route of ['/worship/sermons/674', '/about/location', '/bulletins/1161', '/gallery/1030']) {
    await goto(page, route); const before = errs.length;
    const t0 = await text(page, 3000);
    await click(page, /^주소 복사$/, { role: 'button', wait: 1200 }).catch(e => console.log('no button', route));
    const t1 = await text(page, 3000);
    const toast = [...t1.matchAll(/.{0,25}(복사했어요|복사됐어요|복사되었|복사 실패|복사할 수 없).{0,15}/g)].map(m => m[0]).filter(s => !t0.includes(s));
    const clip = await page.evaluate(() => navigator.clipboard?.readText?.().catch(e => 'read-fail:' + e.name)).catch(() => 'n/a');
    console.log(`[${mode}] ${route}: pageerror ${errs.length - before}건, 토스트: ${JSON.stringify(toast)}, 클립보드: ${JSON.stringify(clip)}`);
    if (errs.length > before) console.log('   stack:', errs[errs.length - 1]);
  }
  await ctx.close();
}
await browser.close();
