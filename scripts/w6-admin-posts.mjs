// 관리자: FAQ / 교우소식 글 등록 → 공개 확인 → 숨김 → 삭제 (제목에 [QA테스트] 표기, 검증 후 즉시 삭제)
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/posts' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
const tabs = (process.argv[2] || 'FAQ,교우소식').split(',');
try {
  step('login'); await login(page);
  for (const tab of tabs) {
    step(`${tab} 새 글 화면`); await goto(page, '/manage/posts'); await click(page, new RegExp(`^${tab}$`), { role: 'button', wait: 2500 });
    console.log(await text(page, 400)); console.log(await btns()); await shot(`${tab}_list`);
    await click(page, /^(새 글|새 소식|새 FAQ|글쓰기|새 질문|새 항목|등록)$/, { role: 'button', wait: 3000 }); console.log('url', page.url()); console.log(await text(page, 600)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type))); console.log(await btns()); await shot(`${tab}_form`);
    const ins = await inputs(page);
    await typeInto(page, 0, `${TAG} ${tab} ${Date.now()}`);
    for (let i = 1; i < ins.length; i++) if (ins[i].type === 'textarea') { await typeInto(page, i, `자동 검수용 ${tab} 글입니다. 곧 삭제됩니다.`); break; }
    { const chip = (await nodes(page)).find(n => n.role === 'checkbox' && !/게시 중|숨김|삭제됨|전체|신고/.test(n.label)); if (chip) { await page.mouse.click(chip.x + chip.w / 2, chip.y + chip.h / 2); await page.waitForTimeout(600); console.log('category chip:', chip.label); } }
    await shot(`${tab}_filled`);
    step(`${tab} 저장`); await clickLast(/^(게시|등록|저장|올리기|발행|게시하기)$/); await page.waitForTimeout(1500); console.log('url', page.url()); console.log(await text(page, 600)); await shot(`${tab}_saved`);
    const pub = tab === '교우소식' ? '/member-news' : '/faq';
    step(`${tab} 공개 확인`); await goto(page, pub); const t = await text(page, 1500); console.log(/QA테스트/.test(t) ? 'VISIBLE in public list' : 'NOT visible: ' + t.slice(0, 300)); await shot(`${tab}_public`);
    step(`${tab} 관리자 목록에서 삭제`); await goto(page, '/manage/posts'); await click(page, new RegExp(`^${tab}$`), { role: 'button', wait: 2500 });
    const row = (await nodes(page)).find(n => /QA테스트/.test(n.label) && n.role === 'button'); if (!row) { console.log('row not found:', await text(page, 500)); continue; }
    await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url()); console.log(await btns()); await shot(`${tab}_admin_detail`);
    if ((await nodes(page)).some(n => /^숨김$/.test(n.label) && n.role === 'button')) { await click(page, /^숨김$/, { role: 'button', wait: 2000 }); await clickLast(/^(숨김|확인)$/).catch(() => {}); console.log('after hide:', await text(page, 300)); await goto(page, pub); console.log(/QA테스트/.test(await text(page, 1500)) ? 'still visible after hide' : 'hidden from public'); await page.goBack(); await page.waitForTimeout(2500); }
    await click(page, /^삭제$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(삭제|확인)$/); console.log('after delete:', page.url(), await text(page, 400)); await shot(`${tab}_deleted`);
    await goto(page, pub); console.log(/QA테스트/.test(await text(page, 1500)) ? 'STILL VISIBLE' : 'gone from public');
  }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
