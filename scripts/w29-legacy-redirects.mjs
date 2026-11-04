// 옛 링크 리다이렉트 확인: /faq/{id} → /faq#{id} (301), /press/{id} → 기사 원문 URL (302), 없는 press id → /press
// 리다이렉트를 따라가지 않고 상태코드·Location 만 검사한다.
const BASE = 'https://dongilchurch.com';
const head = async (path) => { const r = await fetch(BASE + path, { redirect: 'manual' }); return { status: r.status, location: r.headers.get('location') }; };
const press = await (await fetch(BASE + '/api/boards/press/posts?size=3')).json();
const faq = await (await fetch(BASE + '/api/boards/faq/posts?size=3')).json();
const cases = [];
for (const p of faq.items || []) cases.push({ path: `/faq/${p.id}`, expectStatus: 301, expectLoc: `/faq#${p.id}` });
for (const p of press.items || []) { const art = p.press?.articleUrl || p.press?.url || p.press?.link; cases.push({ path: `/press/${p.id}`, expectStatus: 302, expectLoc: art || '(API 응답에서 기사 URL 필드를 찾지 못함: ' + JSON.stringify(p.press).slice(0, 80) + ')' }); }
cases.push({ path: '/press/999999', expectStatus: 302, expectLoc: '/press' });
cases.push({ path: '/faq/999999', expectStatus: 301, expectLoc: '/faq#999999' });
let fail = 0;
for (const c of cases) {
  const r = await head(c.path);
  const locOk = r.location && (r.location === c.expectLoc || r.location === BASE + c.expectLoc || (c.expectLoc.startsWith('http') && r.location === c.expectLoc));
  const ok = r.status === c.expectStatus && locOk;
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${c.path} -> ${r.status} ${r.location ?? '(no Location)'}   expected ${c.expectStatus} ${c.expectLoc}`);
}
console.log(`\n${cases.length - fail}/${cases.length} passed`);
