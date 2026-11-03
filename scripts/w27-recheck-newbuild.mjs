import { launch, goto, click, text, nodes } from './qa-lib.mjs';
const { browser, page, shot } = await launch({ out: 'reports/write/recheck' });
page.on('request', r => { if (r.url().includes('/api/sermons?')) console.log('REQ', r.url().replace('https://dongilchurch.com', '')); });
await goto(page, '/worship/sermons'); await shot('sermons_newbuild');
const ns = await nodes(page); console.log('상단 노드:', ns.slice(0, 14).map(n => `[${n.role}]${n.label}`).join(' | '));
const chip = ns.find(n => n.role === 'checkbox' && /주일/.test(n.label)); console.log('주일 칩:', chip?.label);
if (chip) { await page.mouse.click(chip.x + chip.w / 2, chip.y + chip.h / 2); await page.waitForTimeout(2500); console.log('필터 결과:', (await text(page, 400)).slice(0, 250)); await shot('sunday_filter'); }
await goto(page, '/home'); const hdr = (await nodes(page)).filter(n => n.y < 100).map(n => `[${n.role}]${n.label}`); console.log('헤더 시맨틱:', hdr.length ? hdr.join(' | ') : '(없음)');
await browser.close();
