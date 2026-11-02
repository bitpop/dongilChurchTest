// 특정 페이지의 구조(링크/폼/버튼/텍스트)를 빠르게 덤프 — 수동 검수 보조
// 사용법: node scripts/inspect.mjs <url> [--shot out.png]
import { chromium } from 'playwright';
const url = process.argv[2] || process.env.BASE_URL || 'https://dongilchurch.com/';
const shotIdx = process.argv.indexOf('--shot');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
page.on('console', m => m.type() === 'error' && console.log('[console.error]', m.text()));
page.on('pageerror', e => console.log('[pageerror]', String(e)));
const r = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
console.log('status', r?.status(), 'title', await page.title(), 'final', page.url());
const info = await page.evaluate(() => ({
  nav: [...document.querySelectorAll('nav a, header a, .gnb a, #gnb a, .menu a')].map(a => `${a.textContent.trim()} -> ${a.href}`).filter((v, i, s) => s.indexOf(v) === i),
  links: [...document.querySelectorAll('a[href]')].map(a => `${a.textContent.trim().slice(0, 40)} -> ${a.href}`).filter((v, i, s) => s.indexOf(v) === i).slice(0, 200),
  forms: [...document.querySelectorAll('form')].map(f => ({ action: f.action, method: f.method, fields: [...f.querySelectorAll('input,select,textarea,button')].map(i => `${i.tagName}:${i.type}:${i.name || i.id}`) })),
  buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).filter(Boolean).slice(0, 50),
  text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1500),
}));
console.log(JSON.stringify(info, null, 2));
if (shotIdx > 0) await page.screenshot({ path: process.argv[shotIdx + 1], fullPage: true });
await browser.close();
