// 관리자: 사진 업로드가 필요한 게시판(갤러리·사역·언론·주보)과 영상(유튜브 불러오기) 등록 → 공개 확인 → 삭제
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/media-posts' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
const addPhoto = async (re) => { const [ch] = await Promise.all([page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null), click(page, re, { role: 'button', wait: 1500 })]); if (!ch) throw new Error('no filechooser for ' + re); await ch.setFiles('reports/write/qa-banner.png'); await page.waitForTimeout(6000); };
const tabs = (process.argv[2] || '갤러리,영상,사역,언론,주보').split(',');
const pub = { 갤러리: '/gallery', 영상: '/videos', 사역: '/ministry', 언론: '/press', 주보: '/bulletins' };
try {
  step('login'); await login(page);
  for (const tab of tabs) {
    step(`${tab} 등록`); await goto(page, '/manage/posts'); await click(page, new RegExp(`^${tab}$`), { role: 'button', wait: 2500 }); await click(page, tab === '주보' ? /^새 주보$/ : /^등록$/, { role: 'button', wait: 3000 });
    console.log(page.url()); const ins = await inputs(page); console.log('inputs', JSON.stringify(ins.map(i => i.type)));
    if (tab === '영상') { await typeInto(page, 0, 'https://www.youtube.com/watch?v=_4EbWE7Xxjk'); await click(page, /^불러오기$/, { role: 'button', wait: 4000 }); console.log('after 불러오기:', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value.slice(0, 40)))); await typeInto(page, 1, `${TAG} 영상`, { clear: true }); await typeInto(page, 2, '자동 검수용 영상입니다.'); }
    else if (tab === '주보') { await typeInto(page, 0, '2026-11-02'); await typeInto(page, 1, `${TAG} 주보`); await typeInto(page, 2, '자동 검수용 주보입니다.'); await addPhoto(/^사진 추가$/); }  // 순서: 주보 날짜, 주보 제목, 본문, 경조사 4개
    else if (tab === '언론') { await typeInto(page, 0, '검수신문'); await typeInto(page, 1, '2026-11-02'); await typeInto(page, 2, 'https://example.com/qa-article'); await typeInto(page, 3, `${TAG} 보도`); await typeInto(page, 4, '자동 검수용 보도입니다.'); await addPhoto(/^사진 추가$/); }  // 순서: 매체명, 보도일, 기사 링크, 기사 제목, 본문
    else { await typeInto(page, 0, `${TAG} ${tab}`); await typeInto(page, 1, `자동 검수용 ${tab} 글입니다.`); await addPhoto(/^사진 추가$/); }
    console.log('after fill:', (await text(page, 800)).slice(0, 400)); await shot(`${tab}_filled`);
    await clickLast(/^등록$/); console.log('url', page.url()); console.log((await text(page, 700)).slice(0, 500)); await shot(`${tab}_saved`);
    if (page.url().endsWith('/new')) { console.log('STILL ON FORM:', (await text(page, 3000)).match(/.{0,30}(주세요|필수|올려).{0,20}/g)); continue; }
    step(`${tab} 공개 확인`); await goto(page, pub[tab]); console.log(/QA테스트/.test(await text(page, 3000)) ? 'VISIBLE in public' : 'NOT visible'); await shot(`${tab}_public`);
    step(`${tab} 삭제`); await goto(page, '/manage/posts'); await click(page, new RegExp(`^${tab}$`), { role: 'button', wait: 2500 });
    const row = (await nodes(page)).find(n => /QA테스트/.test(n.label) && n.role === 'button'); if (!row) { console.log('row not found'); continue; }
    await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500);
    await click(page, /^삭제$/, { role: 'button', wait: 1500 }); await clickLast(/^(삭제|확인)$/); console.log((await text(page, 300)).slice(0, 200)); await shot(`${tab}_deleted`);
    await goto(page, pub[tab]); console.log(/QA테스트/.test(await text(page, 3000)) ? 'STILL VISIBLE' : 'gone from public');
  }
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l) || /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
