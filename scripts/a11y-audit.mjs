// 접근성 트리 전수 점검: 'Enable accessibility' 활성화 후 각 라우트의 시맨틱 노드를 수집하고
//  - 라벨 없는 버튼/링크, 라벨 없는 입력란, 라벨 없는 이미지, 헤더 영역(y<100) 노드, Tab 포커스 순서(앞 12개)를 기록
import { launch, goto, enableSemantics, nodes, text } from './qa-lib.mjs';
import fs from 'node:fs';
const routes = (process.argv[2] ? process.argv[2].split(',') : ['/', '/home', '/worship/sermons', '/worship/sermons/675', '/worship/time', '/bulletins', '/member-news', '/gallery', '/videos', '/about', '/about/location', '/faq', '/events', '/bible', '/search?q=%EC%98%88%EB%B0%B0', '/newcomer', '/offering', '/login', '/join/phone', '/heritage']);
const out = [];
for (const mobile of [false, true]) {
  const { browser, page } = await launch({ mobile, out: 'reports/a11y' });
  for (const route of routes) {
    try {
      await goto(page, route, 3500);
      // 활성화 전/후 비교
      const before = await page.evaluate(() => ({ placeholder: !!document.querySelector('flt-semantics-placeholder'), nodes: document.querySelectorAll('flt-semantics').length }));
      // 실제 placeholder 버튼을 '클릭'(키보드 Tab→Enter 방식과 동일한 결과)
      await enableSemantics(page); await page.waitForTimeout(1500);
      const ns = await nodes(page);
      const detail = await page.evaluate(() => [...document.querySelectorAll('flt-semantics')].map(e => { const r = e.getBoundingClientRect(); const own = [...e.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName !== 'FLT-SEMANTICS' && !n.querySelector('flt-semantics'))).map(n => n.textContent).join(' ').replace(/\s+/g, ' ').trim(); return { role: e.getAttribute('role') || '', aria: e.getAttribute('aria-label') || '', own, tabindex: e.getAttribute('tabindex'), hasInput: !!e.querySelector(':scope > input, :scope > textarea'), img: !!e.querySelector(':scope > img') || e.getAttribute('role') === 'img', x: r.x, y: r.y, w: r.width, h: r.height, flt: e.getAttribute('flt-tappable') }; }).filter(n => n.w > 0 && n.h > 0));
      const unlabeledButtons = detail.filter(n => n.role === 'button' && !n.aria && !n.own);
      const unlabeledInputs = detail.filter(n => n.hasInput && !n.aria && !n.own);
      const unlabeledImgs = detail.filter(n => n.img && !n.aria && !n.own);
      const header = detail.filter(n => n.y < 100 && n.h < 100).map(n => `[${n.role || '-'}]${(n.aria || n.own || '(빈 라벨)').slice(0, 30)}`);
      // Tab 포커스 순서
      const focus = [];
      for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(150); focus.push(await page.evaluate(() => { const a = document.activeElement; if (!a) return '-'; const s = a.closest('flt-semantics') || a; return `${s.getAttribute('role') || a.tagName.toLowerCase()}:${(s.getAttribute('aria-label') || s.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 25) || '(빈)'}`; })); }
      const rec = { route, viewport: mobile ? 'mobile' : 'desktop', placeholderBefore: before.placeholder, nodesBefore: before.nodes, nodesAfter: detail.length, buttons: detail.filter(n => n.role === 'button').length, unlabeledButtons: unlabeledButtons.length, unlabeledInputs: unlabeledInputs.length, unlabeledImgs: unlabeledImgs.length, header, focus, textHead: (await text(page, 200)).slice(0, 120) };
      out.push(rec);
      console.log(`${rec.viewport} ${route}: nodes ${rec.nodesBefore}→${rec.nodesAfter}, buttons ${rec.buttons}, 라벨없음 버튼 ${rec.unlabeledButtons} 입력 ${rec.unlabeledInputs} 이미지 ${rec.unlabeledImgs}\n   header: ${header.join(' | ') || '(없음)'}\n   tab: ${focus.join(' → ')}`);
    } catch (e) { console.log(route, 'ERROR', e.message); }
  }
  await browser.close();
}
fs.mkdirSync('reports/a11y', { recursive: true }); fs.writeFileSync('reports/a11y/summary.json', JSON.stringify(out, null, 2));
