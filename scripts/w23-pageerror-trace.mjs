// 공개 화면 pageerror 추적: w13 과 같은 경로를 밟으며 pageerror 의 stack/단계/URL, console.error 의 위치를 기록
import { launch, goto, click, typeInto, text, nodes, inputs, step } from './qa-lib.mjs';
const { browser, page, shot } = await launch({ out: 'reports/write/pageerror' });
let current = 'init';
const errors = [];
page.on('pageerror', e => { errors.push({ step: current, url: page.url(), message: e.message, stack: (e.stack || '').split('\n').slice(0, 12).join('\n') }); console.log(`\n!!! pageerror @ ${current} ${page.url()}\n${e.stack || e.message}`); });
page.on('console', m => { if (m.type() === 'error' && !/GL Driver|WebGL/.test(m.text())) { const l = m.location(); console.log(`[console.error @ ${current}] ${m.text().slice(0, 300)} (${l.url}:${l.lineNumber})`); } });
const run = async (name, fn) => { current = name; step(name); try { await fn(); } catch (e) { console.log('  step error:', e.message.slice(0, 120)); } };
try {
  await run('새가족 등록 빈 제출', async () => { await goto(page, '/newcomer'); await click(page, /^등록 신청하기$/, { role: 'button', wait: 2500 }); });
  await run('새가족 잘못된 휴대전화', async () => { const ins = await inputs(page); await typeInto(page, 0, '검수용'); const tel = ins.findIndex(i => i.type === 'tel'); if (tel >= 0) await typeInto(page, tel, '1234'); await click(page, /^등록 신청하기$/, { role: 'button', wait: 2500 }); });
  await run('새가족 주소 검색 팝업', async () => { const [popup] = await Promise.all([page.context().waitForEvent('page', { timeout: 8000 }).catch(() => null), click(page, /^주소 검색$/, { role: 'button', wait: 2500 })]); console.log('popup:', popup?.url()); if (popup) await popup.close(); await page.keyboard.press('Escape'); });
  await run('새가족 동의문 전문', async () => { await click(page, /^동의문 전문 보기$/, { role: 'button', wait: 2000 }); await click(page, /^(닫기|확인)$/, { role: 'button', wait: 1000 }).catch(() => page.keyboard.press('Escape')); });
  await run('회원가입 잘못된 번호', async () => { await goto(page, '/join/phone'); await typeInto(page, 0, '0101234'); await click(page, /^인증번호 받기$/, { role: 'button', wait: 2500 }); });
  await run('비밀번호 재설정 잘못된 번호', async () => { await goto(page, '/reset'); await typeInto(page, 0, '0101234'); await click(page, /^인증번호 받기$/, { role: 'button', wait: 2500 }); });
  await run('성경 검색', async () => { await goto(page, '/bible/search'); await typeInto(page, 0, '사랑'); await page.keyboard.press('Enter'); await page.waitForTimeout(3000); });
  await run('성경 장절 이동', async () => { await goto(page, '/bible'); await typeInto(page, 0, '마 5:3'); await page.keyboard.press('Enter'); await page.waitForTimeout(3000); });
  await run('통합검색 탭', async () => { await goto(page, '/search?q=%EC%98%88%EB%B0%B0'); for (const t of ['교우소식', 'FAQ', '갤러리·영상']) await click(page, new RegExp('^' + t), { role: 'checkbox', wait: 2000 }).catch(() => {}); await click(page, /^정확도순$/, { role: 'checkbox', wait: 2000 }).catch(() => {}); });
  await run('주보 뷰어', async () => { await goto(page, '/bulletins/1161'); await click(page, /이미지 1 확대/, { role: 'button', wait: 2500 }); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(800); await page.keyboard.press('Escape'); await page.waitForTimeout(1000); await click(page, /^지난 주 주보$/, { role: 'button', wait: 3000 }); });
  await run('갤러리 뷰어', async () => { await goto(page, '/gallery/1030'); await click(page, /사진 1 확대/, { role: 'button', wait: 2500 }); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1000); await page.keyboard.press('Escape'); });
  await run('설교 상세 이전/다음·주소 복사', async () => { await goto(page, '/worship/sermons/674'); await click(page, /^주소 복사$/, { role: 'button', wait: 1500 }); await click(page, /^다음 설교$/, { role: 'button', wait: 3000 }); await click(page, /^이전 설교$/, { role: 'button', wait: 3000 }); });
  await run('영상 상세', async () => { await goto(page, '/videos/687'); });
  await run('오시는 길 주소 복사·길찾기·지도 크게', async () => { await goto(page, '/about/location'); await click(page, /^주소 복사$/, { role: 'button', wait: 1500 }); const [ext] = await Promise.all([page.context().waitForEvent('page', { timeout: 6000 }).catch(() => null), click(page, /^길찾기$/, { role: 'button', wait: 2000 })]); if (ext) await ext.close(); await click(page, /지도 크게 보기/, { role: 'button', wait: 2000 }).catch(() => {}); await page.keyboard.press('Escape'); });
  await run('푸터 유튜브·동일교회', async () => { const [yt] = await Promise.all([page.context().waitForEvent('page', { timeout: 6000 }).catch(() => null), click(page, /^유튜브$/, { role: 'button', wait: 2000 })]); if (yt) await yt.close(); const [fam] = await Promise.all([page.context().waitForEvent('page', { timeout: 6000 }).catch(() => null), click(page, /^동일교회$/, { role: 'button', wait: 2000 })]); if (fam) await fam.close(); });
  await run('전화 링크', async () => { const [tel] = await Promise.all([page.context().waitForEvent('page', { timeout: 4000 }).catch(() => null), click(page, /^041-355-0757$/, { role: 'button', wait: 1500 })]); if (tel) await tel.close(); });
  await run('FAQ 아코디언·필터', async () => { await goto(page, '/faq'); await click(page, /교회 차량 운행 안내/, { wait: 1500 }); await click(page, /^시설$/, { role: 'checkbox', wait: 1500 }); await click(page, /^예배$/, { role: 'checkbox', wait: 1500 }); });
  await run('교회 일정 이전/다음 달', async () => { await goto(page, '/events'); await click(page, /^다음 달$/, { role: 'button', wait: 2000 }); await click(page, /^이전 달$/, { role: 'button', wait: 2000 }); await click(page, /^이전 달$/, { role: 'button', wait: 2000 }); });
  await run('주보 월 선택', async () => { await goto(page, '/bulletins'); const dd = (await nodes(page)).find(n => n.role === 'button'); if (dd) { await page.mouse.click(dd.x + dd.w / 2, dd.y + dd.h / 2); await page.waitForTimeout(1500); await click(page, /2026년 10월/, { wait: 2500 }).catch(() => page.keyboard.press('Escape')); } });
} finally {
  console.log('\n===== pageerror 요약 (' + errors.length + '건)'); for (const e of errors) console.log(JSON.stringify(e, null, 1));
  await browser.close();
}
