// 동일교회 사이트 자동 검수 스크립트
// 사용법: node scripts/audit.mjs            (비로그인 크롤링)
//        ADMIN_ID=... ADMIN_PW=... node scripts/audit.mjs   (로그인 후 크롤링 포함)
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = (process.env.BASE_URL || 'https://dongilchurch.com').replace(/\/$/, '');
const MAX_PAGES = Number(process.env.MAX_PAGES || 150);
const ADMIN_ID = process.env.ADMIN_ID || '';
const ADMIN_PW = process.env.ADMIN_PW || '';
const ORIGIN = new URL(BASE_URL).origin;
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = path.join('reports', `audit-${ts}`);
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const results = [];
const linkStatus = new Map(); // url -> status (HEAD/GET check)

function norm(u) {
  try {
    const url = new URL(u, BASE_URL);
    url.hash = '';
    return url.href;
  } catch { return null; }
}
function isInternal(u) { return u && u.startsWith(ORIGIN); }
function slug(u) { return u.replace(ORIGIN, '').replace(/[^a-zA-Z0-9가-힣]+/g, '_').slice(0, 80) || 'home'; }

async function checkLink(ctx, url) {
  if (linkStatus.has(url)) return linkStatus.get(url);
  let status = 'ERR';
  try {
    const r = await ctx.request.fetch(url, { method: 'GET', maxRedirects: 5, timeout: 15000 });
    status = r.status();
  } catch (e) { status = 'ERR:' + (e.message || '').split('\n')[0].slice(0, 80); }
  linkStatus.set(url, status);
  return status;
}

async function auditPage(ctx, url, label) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', e => pageErrors.push(String(e).slice(0, 300)));
  page.on('requestfailed', r => failedRequests.push(`${r.url().slice(0, 200)} :: ${r.failure()?.errorText}`));
  page.on('response', r => { if (r.status() >= 400) failedRequests.push(`${r.url().slice(0, 200)} :: HTTP ${r.status()}`); });

  const entry = { label, url, status: null, title: '', consoleErrors, pageErrors, failedRequests, links: [], brokenLinks: [], brokenImages: [], mixedContent: [], overflow: {}, axe: [], meta: {}, forms: [], shots: {} };
  try {
    await page.setViewportSize(VIEWPORTS.desktop);
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(e => { entry.gotoError = String(e).slice(0, 200); return null; });
    entry.status = resp ? resp.status() : null;
    entry.finalUrl = page.url();
    entry.title = await page.title();

    // 메타/기본 정보
    entry.meta = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      viewport: document.querySelector('meta[name=viewport]')?.content || null,
      description: document.querySelector('meta[name=description]')?.content || null,
      h1Count: document.querySelectorAll('h1').length,
      h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()).slice(0, 5),
      imgNoAlt: [...document.querySelectorAll('img:not([alt])')].map(i => i.src).slice(0, 20),
      emptyLinks: [...document.querySelectorAll('a')].filter(a => !a.textContent.trim() && !a.querySelector('img') && !a.getAttribute('aria-label')).length,
      hashLinks: [...document.querySelectorAll('a[href="#"], a[href="javascript:;"], a[href="javascript:void(0)"]')].length,
      lorem: /lorem ipsum|샘플 텍스트|테스트 게시물/i.test(document.body.innerText),
      bodyTextSample: document.body.innerText.replace(/\s+/g, ' ').slice(0, 300),
    }));
    entry.forms = await page.evaluate(() => [...document.querySelectorAll('form')].map(f => ({
      action: f.action, method: f.method,
      fields: [...f.querySelectorAll('input,select,textarea')].map(i => `${i.tagName.toLowerCase()}[${i.type || ''}]#${i.id || ''}.${i.name || ''}`).slice(0, 20),
    })));

    // 링크 수집
    const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.href));
    entry.links = [...new Set(hrefs.map(norm).filter(Boolean))];

    // 깨진 이미지
    entry.brokenImages = await page.evaluate(() => [...document.querySelectorAll('img')]
      .filter(i => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith('data:'))
      .map(i => i.src).slice(0, 30));

    // mixed content
    entry.mixedContent = await page.evaluate(() => location.protocol === 'https:'
      ? [...document.querySelectorAll('[src^="http://"],[href^="http://"][rel=stylesheet]')].map(e => e.src || e.href).slice(0, 20) : []);

    // axe 접근성
    try {
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      entry.axe = axe.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
    } catch (e) { entry.axeError = String(e).slice(0, 200); }

    entry.shots.desktop = path.join('shots', `${slug(url)}_desktop.png`);
    await page.screenshot({ path: path.join(OUT, entry.shots.desktop), fullPage: true }).catch(() => {});

    // 모바일 뷰포트: 가로 스크롤(오버플로) 검사
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    entry.overflow = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const over = [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.right > docW + 2 && getComputedStyle(el).position !== 'fixed';
      }).slice(0, 10).map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`);
      return { scrollWidth: document.documentElement.scrollWidth, clientWidth: docW, hasHorizontalScroll: document.documentElement.scrollWidth > docW + 2, elements: over };
    });
    entry.shots.mobile = path.join('shots', `${slug(url)}_mobile.png`);
    await page.screenshot({ path: path.join(OUT, entry.shots.mobile), fullPage: true }).catch(() => {});
  } catch (e) {
    entry.error = String(e).slice(0, 300);
  } finally {
    await page.close();
  }
  return entry;
}

async function crawl(ctx, startUrls, label, visited) {
  const queue = [...startUrls];
  while (queue.length && visited.size < MAX_PAGES) {
    const url = queue.shift();
    if (!url || visited.has(url)) continue;
    if (/\.(pdf|jpg|jpeg|png|gif|zip|hwp|docx?|xlsx?|pptx?|mp[34])(\?|$)/i.test(url)) continue;
    if (/logout|로그아웃|delete|remove/i.test(url)) continue; // 파괴적 동작 회피
    visited.add(url);
    console.log(`[${label}] (${visited.size}) ${url}`);
    const entry = await auditPage(ctx, url, label);
    // 링크 상태 점검 (내부+외부 모두 GET)
    for (const l of entry.links) {
      if (/logout|로그아웃|delete|remove|mailto:|tel:/i.test(l)) continue;
      const st = await checkLink(ctx, l);
      if (st === 'ERR' || (typeof st === 'number' && st >= 400) || String(st).startsWith('ERR')) entry.brokenLinks.push({ url: l, status: st });
      if (isInternal(l) && !visited.has(l)) queue.push(l);
    }
    results.push(entry);
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  }
}

async function tryLogin(ctx) {
  const page = await ctx.newPage();
  const log = [];
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 45000 });
    // 로그인 링크 탐색
    const loginHref = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a')].find(a => /login|로그인|signin/i.test(a.href + ' ' + a.textContent));
      return a ? a.href : null;
    });
    log.push(`login link: ${loginHref}`);
    if (loginHref) await page.goto(loginHref, { waitUntil: 'networkidle', timeout: 45000 });
    const idSel = 'input[name*="id" i], input[name*="user" i], input[name*="phone" i], input[name*="tel" i], input[type="tel"], input[type="text"]';
    const pwSel = 'input[type="password"]';
    const pw = page.locator(pwSel).first();
    if (!(await pw.count())) { log.push('비밀번호 입력란을 찾지 못함'); return { ok: false, log, url: page.url() }; }
    const idInput = page.locator(idSel).first();
    await idInput.fill(ADMIN_ID);
    await pw.fill(ADMIN_PW);
    log.push(`login form at ${page.url()}`);
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {}),
      pw.press('Enter'),
    ]);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => ({ url: location.href, hasLogout: /logout|로그아웃/i.test(document.body.innerHTML), text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 200) }));
    log.push(`after login: ${JSON.stringify(after)}`);
    await page.screenshot({ path: path.join(OUT, 'shots', '_after_login.png'), fullPage: true }).catch(() => {});
    return { ok: after.hasLogout, log, url: after.url };
  } catch (e) {
    log.push('login error: ' + String(e).slice(0, 200));
    return { ok: false, log };
  } finally { await page.close(); }
}

function writeMarkdown(loginInfo) {
  const lines = [`# 자동 검수 리포트 (${BASE_URL})`, '', `생성: ${new Date().toLocaleString('ko-KR')}`, `점검 페이지 수: ${results.length}`, ''];
  if (loginInfo) lines.push('## 로그인', '', '```', ...loginInfo.log, '```', '');
  const sum = (k) => results.reduce((a, r) => a + (r[k]?.length || 0), 0);
  lines.push('## 요약', '', '| 항목 | 건수 |', '|---|---|',
    `| HTTP 4xx/5xx 페이지 | ${results.filter(r => r.status >= 400).length} |`,
    `| JS 콘솔 오류 | ${sum('consoleErrors')} |`,
    `| JS 런타임 예외 | ${sum('pageErrors')} |`,
    `| 실패한 리소스 요청 | ${sum('failedRequests')} |`,
    `| 깨진 링크 | ${sum('brokenLinks')} |`,
    `| 깨진 이미지 | ${sum('brokenImages')} |`,
    `| 모바일 가로 스크롤 발생 페이지 | ${results.filter(r => r.overflow?.hasHorizontalScroll).length} |`,
    `| 접근성 위반(axe, 유형 합계) | ${sum('axe')} |`, '');
  for (const r of results) {
    lines.push(`## [${r.label}] ${r.title || '(제목 없음)'}`, '', `- URL: ${r.url}`, `- HTTP: ${r.status}${r.finalUrl && r.finalUrl !== r.url ? ` → ${r.finalUrl}` : ''}`, `- h1: ${r.meta.h1Count}개 ${JSON.stringify(r.meta.h1)}`, `- lang=${r.meta.lang || '(없음)'} / viewport=${r.meta.viewport || '(없음)'}`);
    if (r.gotoError) lines.push(`- ⚠️ 로딩 오류: ${r.gotoError}`);
    if (r.pageErrors.length) lines.push(`- ⚠️ JS 예외:`, ...r.pageErrors.map(e => `  - ${e}`));
    if (r.consoleErrors.length) lines.push(`- ⚠️ 콘솔 오류 (${r.consoleErrors.length}):`, ...[...new Set(r.consoleErrors)].slice(0, 10).map(e => `  - ${e}`));
    if (r.failedRequests.length) lines.push(`- ⚠️ 실패 요청 (${r.failedRequests.length}):`, ...[...new Set(r.failedRequests)].slice(0, 10).map(e => `  - ${e}`));
    if (r.brokenLinks.length) lines.push(`- ⚠️ 깨진 링크:`, ...r.brokenLinks.map(b => `  - ${b.url} (${b.status})`));
    if (r.brokenImages.length) lines.push(`- ⚠️ 깨진 이미지:`, ...r.brokenImages.map(b => `  - ${b}`));
    if (r.mixedContent.length) lines.push(`- ⚠️ Mixed content:`, ...r.mixedContent.map(b => `  - ${b}`));
    if (r.meta.imgNoAlt?.length) lines.push(`- ℹ️ alt 없는 이미지 ${r.meta.imgNoAlt.length}개`);
    if (r.meta.hashLinks) lines.push(`- ℹ️ href="#" 등 빈 링크 ${r.meta.hashLinks}개`);
    if (r.meta.lorem) lines.push(`- ⚠️ 샘플/더미 텍스트 의심`);
    if (r.overflow?.hasHorizontalScroll) lines.push(`- ⚠️ 모바일(390px) 가로 스크롤 발생: scrollWidth=${r.overflow.scrollWidth} / 원인 후보: ${r.overflow.elements.join(', ')}`);
    if (r.axe.length) lines.push(`- 접근성(axe):`, ...r.axe.map(v => `  - [${v.impact}] ${v.id}: ${v.help} (${v.nodes}곳, 예: ${v.sample})`));
    lines.push(`- 스크린샷: ${r.shots.desktop} / ${r.shots.mobile}`, '');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), lines.join('\n'));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ locale: 'ko-KR', ignoreHTTPSErrors: false });
  const visited = new Set();
  await crawl(ctx, [BASE_URL + '/'], 'guest', visited);

  let loginInfo = null;
  if (ADMIN_ID && ADMIN_PW) {
    loginInfo = await tryLogin(ctx);
    console.log(loginInfo.log.join('\n'));
    if (loginInfo.ok) {
      const adminVisited = new Set();
      const starts = [loginInfo.url, BASE_URL + '/admin', BASE_URL + '/adm', BASE_URL + '/manager', BASE_URL + '/mypage'].map(norm).filter(Boolean);
      await crawl(ctx, starts, 'admin', adminVisited);
    }
  }
  writeMarkdown(loginInfo);
  console.log(`\n리포트: ${OUT}/report.md`);
  await browser.close();
})();
