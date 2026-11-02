// Flutter SPA 라우트 일괄 검수: 각 라우트를 데스크톱/모바일로 열어 스크린샷·시맨틱 텍스트·오류 수집
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const BASE = 'https://dongilchurch.com';
const routes = (process.argv[2] ? process.argv[2].split(',') : fs.readFileSync('docs/routes.txt', 'utf8').split('\n')).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
const OUT = process.env.OUT || 'reports/routes';
const STATE = process.env.STATE; // 로그인 상태 파일(storageState)
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const summary = [];

async function enableSemantics(page) {
  // Flutter 는 보조기기 감지 전까지 DOM 시맨틱 트리를 만들지 않음 → placeholder 활성화
  await page.evaluate(() => {
    const el = document.querySelector('flt-semantics-placeholder');
    if (el) { el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); el.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  }).catch(() => {});
  await page.waitForTimeout(1200);
}
async function semantics(page) {
  return page.evaluate(() => {
    const nodes = [...document.querySelectorAll('flt-semantics')];
    const items = [];
    for (const e of nodes) {
      // 자식 flt-semantics 를 제외한 직접 텍스트
      const own = [...e.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName !== 'FLT-SEMANTICS' && !n.querySelector('flt-semantics'))).map(n => n.textContent).join(' ');
      const label = (e.getAttribute('aria-label') || own || '').replace(/\s+/g, ' ').trim();
      const role = e.getAttribute('role') || (e.querySelector(':scope > input, :scope > textarea') ? 'input' : '');
      const r = e.getBoundingClientRect();
      if (!label && !role) continue;
      items.push({ role, label: label.slice(0, 160), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return items;
  });
}

const LOGIN = process.env.ADMIN_ID && process.env.ADMIN_PW;
async function uiLogin(page) {
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3500);
  await enableSemantics(page);
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].map(i => { const r = i.getBoundingClientRect(); return { type: i.type, x: r.x + r.width / 2, y: r.y + r.height / 2 }; }));
  const id = inputs.find(i => i.type === 'tel') || inputs[0]; const pw = inputs.find(i => i.type === 'password');
  if (!id || !pw) throw new Error('login inputs not found');
  await page.mouse.click(id.x, id.y); await page.keyboard.type(process.env.ADMIN_ID, { delay: 20 });
  await page.mouse.click(pw.x, pw.y); await page.keyboard.type(process.env.ADMIN_PW, { delay: 20 });
  await page.keyboard.press('Enter'); await page.waitForTimeout(5000);
  console.log('login ->', page.url());
}
for (const vp of ['desktop', 'mobile']) {
  const viewport = vp === 'desktop' ? { width: 1440, height: 2200 } : { width: 390, height: 844 };
  const ctx = await browser.newContext({ viewport, locale: 'ko-KR', deviceScaleFactor: 1, isMobile: vp === 'mobile', hasTouch: vp === 'mobile', ...(STATE ? { storageState: STATE } : {}) });
  const page = await ctx.newPage();
  const allLogs = [];
  page.on('console', m => m.type() === 'error' && !/GL Driver|WebGL/.test(m.text()) && allLogs.push(`[console] ${m.text().slice(0, 250)}`));
  page.on('pageerror', e => allLogs.push(`[pageerror] ${String(e).slice(0, 250)}`));
  page.on('response', r => { if (r.status() >= 400) allLogs.push(`[http ${r.status()}] ${r.url().slice(0, 180)}`); });
  page.on('requestfailed', r => allLogs.push(`[reqfail] ${r.url().slice(0, 180)} ${r.failure()?.errorText}`));
  if (LOGIN) await uiLogin(page);
  for (const route of routes) {
    const logs = []; allLogs.length = 0;
    const t0 = Date.now();
    const entry = { route, vp, logs };
    if (entry.vp === 'mobile') { /* 모바일 뷰포트에서는 동일 페이지 객체 사용 */ }
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForSelector('flt-glass-pane, flutter-view', { timeout: 60000 });
      await page.waitForTimeout(3500);
      entry.ms = Date.now() - t0;
      entry.finalUrl = page.url();
      entry.title = await page.title();
      await enableSemantics(page);
      const sem = await semantics(page);
      entry.semCount = sem.length;
      entry.text = sem.filter(s => s.label).map(s => (s.role ? `[${s.role}]` : '') + s.label).join(' | ').slice(0, 6000);
      entry.buttons = sem.filter(s => s.role === 'button').length;
      entry.offscreen = sem.filter(s => s.x + s.w > viewport.width + 2 && s.w < viewport.width).map(s => s.label).slice(0, 10);
      entry.api = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => n.includes('/api/')).map(n => n.replace(location.origin, '')));
      const name = route.replace(/[^a-zA-Z0-9가-힣]+/g, '_').replace(/^_|_$/g, '') || 'root';
      entry.shot = path.join(OUT, `${name}_${vp}.png`);
      await page.screenshot({ path: entry.shot });
      if (vp === 'mobile') {
        for (let i = 1; i <= 3; i++) {
          await page.mouse.move(195, 500); await page.mouse.wheel(0, 700); await page.waitForTimeout(700);
          await page.screenshot({ path: path.join(OUT, `${name}_${vp}_s${i}.png`) });
        }
      }
    } catch (e) { entry.error = String(e).slice(0, 300); }
    console.log(`${route} [${vp}] ${entry.ms || '-'}ms sem=${entry.semCount ?? '-'} final=${entry.finalUrl || '-'} ${entry.error ? 'ERR ' + entry.error : ''} ${logs.length ? 'logs=' + logs.length : ''}`);
    logs.push(...allLogs); entry.logs = logs;
    summary.push(entry);
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 2));
  }
  await ctx.close();
}
await browser.close();
