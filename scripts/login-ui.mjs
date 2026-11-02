// 로그인 화면 UI 검수 + 로그인 상태 저장(storageState)
import { chromium } from 'playwright';
import fs from 'node:fs';
const ID = process.env.ADMIN_ID, PW = process.env.ADMIN_PW;
const STATE = process.env.STATE || 'reports/state-admin.json';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ko-KR' });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => m.type() === 'error' && !/GL Driver/.test(m.text()) && logs.push('[console] ' + m.text().slice(0, 200)));
page.on('response', r => { if (r.url().includes('/api/')) logs.push(`[api ${r.status()}] ${r.request().method()} ${r.url().replace('https://dongilchurch.com', '')}`); });
await page.goto('https://dongilchurch.com/login', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await page.waitForTimeout(1500);
const text = await page.evaluate(() => document.querySelector('flt-semantics-host')?.textContent.replace(/\s+/g, ' '));
console.log('LOGIN PAGE TEXT:', text);
const inputs = await page.evaluate(() => [...document.querySelectorAll('flt-semantics input, flt-semantics textarea, input')].map(i => { const r = i.getBoundingClientRect(); return { type: i.type, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), ph: i.placeholder, label: i.closest('flt-semantics')?.getAttribute('aria-label') }; }));
console.log('INPUTS:', JSON.stringify(inputs));
await page.screenshot({ path: 'reports/manual/login_desktop.png' });

// 1) 잘못된 비밀번호로 실패 메시지 확인
async function fill(idx, val) { const i = inputs[idx]; await page.mouse.click(i.x + i.w / 2, i.y + i.h / 2); await page.waitForTimeout(300); await page.keyboard.press('Control+A'); await page.keyboard.type(val, { delay: 20 }); }
if (inputs.length >= 2) {
  await fill(0, ID); await fill(1, 'wrong-password-123'); await page.keyboard.press('Enter'); await page.waitForTimeout(3000);
  console.log('AFTER WRONG PW:', page.url(), (await page.evaluate(() => document.querySelector('flt-semantics-host')?.textContent.replace(/\s+/g, ' ')))?.slice(0, 600));
  await page.screenshot({ path: 'reports/manual/login_wrong_pw.png' });
  // 2) 정상 로그인
  await fill(1, PW); await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('AFTER LOGIN:', page.url(), (await page.evaluate(() => document.querySelector('flt-semantics-host')?.textContent.replace(/\s+/g, ' ')))?.slice(0, 600));
  await page.screenshot({ path: 'reports/manual/after_login.png' });
  const ls = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).map(k => [k, (localStorage.getItem(k) || '').slice(0, 40)])));
  console.log('LOCALSTORAGE KEYS:', JSON.stringify(ls));
  await ctx.storageState({ path: STATE });
  console.log('state saved', STATE);
}
console.log(logs.join('\n'));
await browser.close();
