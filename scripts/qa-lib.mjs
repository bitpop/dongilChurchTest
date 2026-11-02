// Flutter 웹 앱 조작 공용 헬퍼 (시맨틱 트리 기반)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const BASE = 'https://dongilchurch.com';
export const TAG = '[QA테스트]';

export async function launch({ mobile = false, out = 'reports/write' } = {}) {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1400 }, locale: 'ko-KR', isMobile: mobile, hasTouch: mobile });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', m => m.type() === 'error' && !/GL Driver|WebGL/.test(m.text()) && logs.push(`[console] ${m.text().slice(0, 200)}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${String(e).slice(0, 200)}`));
  page.on('response', async r => { if (r.url().includes('/api/') && !/contents\?keys|unread-count|\/api\/home|banners\?/.test(r.url())) { let body = ''; try { if (r.status() >= 400) body = (await r.text()).slice(0, 200); } catch {} logs.push(`[api ${r.status()}] ${r.request().method()} ${r.url().replace(BASE, '')} ${body}`); } });
  let n = 0;
  const shot = async (label) => { const p = path.join(out, `${String(++n).padStart(2, '0')}_${label.replace(/[^a-zA-Z0-9가-힣]+/g, '_')}.png`); await page.screenshot({ path: p }); return p; };
  return { browser, ctx, page, logs, shot, out };
}

export async function goto(page, route, wait = 3000) {
  await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(wait);
  await enableSemantics(page);
}
export async function enableSemantics(page) {
  await page.evaluate(() => document.querySelector('flt-semantics-placeholder')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))).catch(() => {});
  await page.waitForTimeout(800);
}
// 시맨틱 노드 목록 (role, label, bbox)
export async function nodes(page) {
  return page.evaluate(() => [...document.querySelectorAll('flt-semantics')].map(e => {
    const own = [...e.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName !== 'FLT-SEMANTICS' && !n.querySelector('flt-semantics'))).map(n => n.textContent).join(' ');
    const r = e.getBoundingClientRect();
    const input = e.querySelector(':scope > input, :scope > textarea');
    return { role: e.getAttribute('role') || (input ? 'input' : ''), label: (e.getAttribute('aria-label') || own || '').replace(/\s+/g, ' ').trim(), inputType: input?.type || (input?.tagName === 'TEXTAREA' ? 'textarea' : null), x: r.x, y: r.y, w: r.width, h: r.height, checked: e.getAttribute('aria-checked') };
  }).filter(n => n.w > 0 && n.h > 0));
}
export async function text(page, max = 1500) {
  return (await page.evaluate(() => document.querySelector('flt-semantics-host')?.textContent || '')).replace(/\s+/g, ' ').slice(0, max);
}
export async function find(page, re, { role } = {}) {
  const list = await nodes(page);
  const r = re instanceof RegExp ? re : new RegExp(re.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return list.find(n => r.test(n.label) && (!role || n.role === role));
}
export async function click(page, re, opts = {}) {
  await enableSemantics(page);
  const n = await find(page, re, opts);
  if (!n) throw new Error(`node not found: ${re}`);
  await page.mouse.click(n.x + n.w / 2, n.y + n.h / 2);
  await page.waitForTimeout(opts.wait ?? 1500);
  await enableSemantics(page);
  return n;
}
export async function inputs(page) {
  await enableSemantics(page);
  return page.evaluate(() => [...document.querySelectorAll('input, textarea')].map(i => { const r = i.getBoundingClientRect(); return { type: i.tagName === 'TEXTAREA' ? 'textarea' : i.type, x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height, value: i.value }; }).filter(i => i.w > 0));
}
export async function typeInto(page, idx, value, { clear = false } = {}) {
  const list = await inputs(page);
  const i = typeof idx === 'number' ? list[idx] : list.find(idx);
  if (!i) throw new Error(`input not found: ${idx} (have ${list.length})`);
  await page.mouse.click(i.x, i.y); await page.waitForTimeout(300);
  if (clear) { await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); }
  await page.keyboard.type(value, { delay: 15 });
  await page.waitForTimeout(300);
}
export async function login(page, id = process.env.ADMIN_ID, pw = process.env.ADMIN_PW) {
  await goto(page, '/login');
  await typeInto(page, i => i.type === 'tel', id);
  await typeInto(page, i => i.type === 'password', pw);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  await enableSemantics(page);
  const t = await text(page, 300);
  if (!/슈퍼관리자|로그아웃|알림/.test(t) && page.url().includes('/login')) throw new Error('login failed: ' + t);
  return page.url();
}
export async function logout(page) {
  await goto(page, '/me');
  await click(page, /^로그아웃$/, { role: 'button' }).catch(() => {});
  await page.waitForTimeout(2000);
  return page.url();
}
export function step(label, extra = '') { console.log(`\n### ${label} ${extra}`); }
