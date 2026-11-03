// 주보 등록 직후 공개 목록 미노출 재현: 주보 등록(날짜 2026-11-02, 월요일) → 공개 목록 API 호출/응답과 화면 비교 → 날짜를 주일(2026-11-08)로 수정 후 재확인 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/bulletin-repro' });
const clickLast = (re) => clickLastLib(page, re);
const apiLog = [];
page.on('response', async r => { if (/\/api\/boards\/bulletin\/posts(\?|$)/.test(r.url())) { let b = ''; try { b = await r.text(); } catch {} const j = (() => { try { return JSON.parse(b); } catch { return null; } })(); apiLog.push(`${r.request().method()} ${r.url().replace('https://dongilchurch.com', '')} -> ${r.status()} items=${j?.items?.map(i => `${i.id}:${i.title}:${i.bulletinDate || i.publishedAt || i.createdAt || ''}`).join(' | ') ?? b.slice(0, 120)}`); } });
const addPhoto = async () => { const [ch] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }), click(page, /^사진 추가$/, { role: 'button', wait: 1500 })]); await ch.setFiles('reports/write/qa-banner.png'); await page.waitForTimeout(6000); };
let id = null;
try {
  step('login'); await login(page);
  step('공개 목록(등록 전)'); apiLog.length = 0; await goto(page, '/bulletins'); console.log((await text(page, 400)).slice(0, 200)); console.log(apiLog.join('\n'));
  step('주보 등록 2026-11-02(월)'); await goto(page, '/manage/posts'); await click(page, /^새 주보$/, { role: 'button', wait: 3000 });
  await typeInto(page, 0, '2026-11-02'); await typeInto(page, 1, `${TAG} 주보 재현`); await typeInto(page, 2, '자동 검수용 주보입니다.'); await addPhoto();
  await clickLast(/^등록$/); id = page.url().match(/bulletins\/(\d+)/)?.[1]; console.log('created id', id, (await text(page, 300)).slice(0, 200));
  step('공개 목록(등록 직후)'); apiLog.length = 0; await goto(page, '/bulletins'); const t1 = await text(page, 600); console.log(t1.slice(0, 300)); console.log(apiLog.join('\n')); console.log(/QA테스트/.test(t1) ? 'VISIBLE' : 'NOT VISIBLE'); await shot('after_create');
  step('월 드롭다운 열기'); const dd = (await nodes(page)).find(n => n.role === 'button'); if (dd) { await page.mouse.click(dd.x + dd.w / 2, dd.y + dd.h / 2); await page.waitForTimeout(1500); console.log('월 목록:', (await nodes(page)).filter(n => /\d{4}년 \d+월/.test(n.label)).map(n => n.label).join(', ')); await shot('month_menu'); await page.keyboard.press('Escape'); }
  step('API 직접 확인'); const direct = await page.evaluate(async () => { const out = {}; for (const q of ['?month=2026-11', '?month=2026-11&size=50', '']) { const r = await fetch('/api/boards/bulletin/posts' + q); const j = await r.json(); out[q || '(none)'] = { status: r.status, ids: j.items?.map(i => i.id), keys: j.items?.[0] ? Object.keys(j.items[0]) : [] }; } return out; }); console.log(JSON.stringify(direct, null, 1));
  if (id) {
    step('날짜를 2026-11-08(주일)로 수정'); await goto(page, `/manage/posts/bulletins/${id}`); await click(page, /^수정$/, { role: 'button', wait: 3000 }); console.log('edit url', page.url()); await typeInto(page, 0, '2026-11-08', { clear: true }); await clickLast(/^(수정 완료|저장|등록)$/); console.log((await text(page, 300)).slice(0, 200));
    step('공개 목록(수정 후)'); apiLog.length = 0; await goto(page, '/bulletins'); const t2 = await text(page, 600); console.log(t2.slice(0, 300)); console.log(apiLog.join('\n')); console.log(/QA테스트/.test(t2) ? 'VISIBLE' : 'NOT VISIBLE'); await shot('after_edit');
  }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 600))); }
finally {
  if (id) { try { step('삭제'); await goto(page, `/manage/posts/bulletins/${id}`); await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await clickLast(/^(삭제|확인)$/); console.log((await text(page, 300)).slice(0, 150)); await goto(page, '/bulletins'); console.log('public after delete:', /QA테스트/.test(await text(page, 600)) ? 'STILL VISIBLE' : 'gone'); } catch (e) { console.log('cleanup error', e.message); } }
  console.log('\nLOGS:\n' + logs.filter(l => /4\d\d|5\d\d|POST|PUT|DELETE/.test(l)).join('\n')); await logout(page); await browser.close();
}
