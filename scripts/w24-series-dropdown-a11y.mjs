// 설교 목록 시리즈 드롭다운의 시맨틱/DOM 상태 덤프 (접근성 라벨 유무 근거)
import { launch, goto, enableSemantics, nodes } from './qa-lib.mjs';
const { browser, page, shot } = await launch({ out: 'reports/write/a11y' });
await goto(page, '/worship/sermons'); await enableSemantics(page);
const ns = await nodes(page);
const i = ns.findIndex(n => n.role === 'checkbox' && n.label === '수요');
console.log('칩 다음 노드들:', ns.slice(i - 2, i + 4).map(n => `[${n.role}] "${n.label}" @(${Math.round(n.x)},${Math.round(n.y)} ${Math.round(n.w)}x${Math.round(n.h)})`).join('\n'));
const dump = await page.evaluate(() => {
  const list = [...document.querySelectorAll('flt-semantics')];
  const idx = list.findIndex(e => (e.getAttribute('aria-label') || e.textContent || '').trim() === '수요');
  return list.slice(idx, idx + 3).map(e => e.outerHTML.replace(/\s+/g, ' ').slice(0, 400));
});
console.log('\nDOM(outerHTML):'); dump.forEach(d => console.log(' -', d));
// 키보드 탐색: Tab 으로 드롭다운에 포커스가 가는지, 스크린리더가 읽을 이름이 있는지
const dd = ns.slice(i + 1).find(n => n.role === 'button');
console.log('\n드롭다운 버튼 label:', JSON.stringify(dd?.label), 'size', dd && `${Math.round(dd.w)}x${Math.round(dd.h)}`);
await shot('sermons_filters');
await browser.close();
