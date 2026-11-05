// 디자인 상태 캡처: GNB hover/active, 버튼 hover, 포커스 링, 다크 모드 선호, 전체 메뉴 오버레이(데스크톱/모바일), 모달(이미지 뷰어·주소 복사 폴백), 폰트 로드 확인
import { chromium } from 'playwright';
import { goto, click, nodes, enableSemantics, text } from './qa-lib.mjs';
import fs from 'node:fs';
const OUT = 'reports/design-states'; fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const shot = (p, n, clip) => p.screenshot({ path: `${OUT}/${n}.png`, ...(clip ? { clip } : {}) });
// 1) 데스크톱 hover/focus/overlay
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' }); const page = await ctx.newPage();
  await goto(page, '/home');
  const fonts = await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v, i, a) => a.indexOf(v) === i)); console.log('loaded fonts:', fonts);
  const gnb = (await nodes(page)).find(n => n.label === '예배 메뉴'); await page.mouse.move(gnb.x + gnb.w / 2, gnb.y + gnb.h / 2); await page.waitForTimeout(800); await shot(page, 'gnb_hover', { x: 0, y: 0, width: 1440, height: 120 });
  const btn = (await nodes(page)).find(n => n.label === '전체 보기'); if (btn) { await page.mouse.move(btn.x + btn.w / 2, btn.y + btn.h / 2); await page.waitForTimeout(500); await shot(page, 'link_hover', { x: btn.x - 200, y: btn.y - 20, width: 300, height: 60 }); }
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(400); await shot(page, 'focus_ring', { x: 0, y: 0, width: 1440, height: 700 });
  await click(page, /검색·전체 메뉴/, { role: 'button', wait: 1500 }); await shot(page, 'overlay_menu_desktop'); await page.keyboard.press('Escape');
  await goto(page, '/gallery/1030'); await click(page, /사진 1 확대/, { role: 'button', wait: 2000 }); await shot(page, 'image_viewer_desktop'); await page.keyboard.press('Escape');
  await goto(page, '/worship/sermons/674'); await click(page, /^주소 복사$/, { role: 'button', wait: 1500 }); await shot(page, 'copy_fallback_dialog_desktop'); await page.keyboard.press('Escape');
  await goto(page, '/login'); const inputs = await page.$$('input'); await inputs[0].click(); await page.keyboard.type('010'); await page.waitForTimeout(400); await shot(page, 'input_focus_desktop', { x: 360, y: 150, width: 720, height: 500 });
  await goto(page, '/newcomer'); await click(page, /^등록 신청하기$/, { role: 'button', wait: 2000 }); await shot(page, 'form_errors_desktop');
  await goto(page, '/'); await page.setViewportSize({ width: 1440, height: 900 }); await shot(page, 'hub_desktop_fold');
  await ctx.close();
}
// 2) 다크 모드 선호
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 }, locale: 'ko-KR', colorScheme: 'dark' }); const page = await ctx.newPage();
  await goto(page, '/home'); await shot(page, 'dark_pref_home'); await ctx.close();
}
// 3) 모바일 오버레이/뷰어/폴백/폼 오류
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await goto(page, '/home'); await click(page, /^전체 메뉴$/, { role: 'button', wait: 1500 }); await shot(page, 'overlay_menu_mobile'); await page.keyboard.press('Escape');
  await goto(page, '/gallery/1030'); await click(page, /사진 1 확대/, { role: 'button', wait: 2000 }); await shot(page, 'image_viewer_mobile'); await page.keyboard.press('Escape');
  await goto(page, '/bulletins/1161'); await click(page, /이미지 1 확대/, { role: 'button', wait: 2000 }); await shot(page, 'bulletin_viewer_mobile'); await page.keyboard.press('Escape');
  await goto(page, '/worship/sermons/674'); await click(page, /^주소 복사$/, { role: 'button', wait: 1500 }); await shot(page, 'copy_fallback_dialog_mobile'); await page.keyboard.press('Escape');
  await goto(page, '/newcomer'); await click(page, /^등록 신청하기$/, { role: 'button', wait: 2000 }); await shot(page, 'form_errors_mobile');
  await goto(page, '/login'); const inputs = await page.$$('input'); await inputs[0].click(); await page.keyboard.type('0101234'); await click(page, /^로그인$/, { role: 'button', wait: 2000 }); await shot(page, 'login_error_mobile');
  await goto(page, '/worship/sermons'); await page.mouse.move(195, 500); await page.mouse.wheel(0, 2500); await page.waitForTimeout(1000); await shot(page, 'sermons_scrolled_mobile');
  await goto(page, '/events'); await click(page, /^목록$/, { role: 'button', wait: 1500 }); await shot(page, 'events_list_mobile');
  await ctx.close();
}
// 4) 가로 모드 모바일(844x390) 홈·설교
{
  const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, locale: 'ko-KR', isMobile: true, hasTouch: true }); const page = await ctx.newPage();
  await goto(page, '/home'); await shot(page, 'landscape_home'); await goto(page, '/worship/sermons'); await shot(page, 'landscape_sermons'); await ctx.close();
}
await browser.close();
