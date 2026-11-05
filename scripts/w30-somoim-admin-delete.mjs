// 관리자 소모임 탭: 운영팀 준비 소모임(1178)의 버튼 확인 → 검수용 소모임 직접 생성 → 상세·명단 → [삭제] 클릭 → 확인 → 목록/공개/API 반영 확인
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/somoim-delete' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
const clickLast = (re) => clickLastLib(page, re);
let createdId = null;
try {
  step('login'); await login(page);
  step('관리자 소모임 탭 (운영팀 준비 1178)'); await goto(page, '/manage/groups'); await click(page, /^소모임$/, { role: 'checkbox', wait: 2500 }); console.log((await text(page, 800)).slice(80, 600)); console.log(await btns()); await shot('admin_somoim_tab');
  step('관리자에서 소모임 등록'); await click(page, /^소모임 등록$/, { role: 'button', wait: 3000 }); console.log('url', page.url()); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type)));
  await typeInto(page, 0, `${TAG} 관리자 생성 소모임 ${Date.now()}`); await typeInto(page, 1, '자동 검수용. 삭제 테스트 대상.'); await typeInto(page, 2, '비전센터 2층').catch(() => {}); await typeInto(page, 3, '5').catch(() => {});
  await click(page, /^선택$/, { role: 'button', wait: 1500 }).catch(() => {}); await clickLast(/^(확인|OK|선택)$/).catch(() => {}); await clickLast(/^(확인|OK)$/).catch(() => {});
  await clickLast(/^(등록하기|등록)$/); createdId = page.url().match(/somoim\/(\d+)/)?.[1]; console.log('created', createdId, page.url(), (await text(page, 300)).slice(0, 200)); await shot('created');
  step('관리자 탭에서 생성본 확인 및 삭제 버튼'); await goto(page, '/manage/groups'); await click(page, /^소모임$/, { role: 'checkbox', wait: 2500 }); console.log(await btns()); await shot('tab_after_create');
  const row = (await nodes(page)).find(n => n.role === 'button' && /관리자 생성 소모임/.test(n.label)); if (!row) throw new Error('생성본 행 없음');
  const del = (await nodes(page)).find(n => n.role === 'button' && /삭제/.test(n.label) && Math.abs(n.y - row.y) < 60); console.log('행 옆 삭제 버튼:', !!del);
  if (!del) { await page.mouse.click(row.x + row.w / 2, row.y + row.h / 2); await page.waitForTimeout(2500); console.log('row ->', page.url()); console.log(await btns()); await shot('row_detail'); await click(page, /^명단$/, { role: 'button', wait: 2500 }).catch(() => {}); console.log('명단 ->', page.url()); console.log(await btns()); await shot('roster'); }
  const delBtn = (await nodes(page)).find(n => n.role === 'button' && /삭제/.test(n.label)); console.log('삭제 버튼 존재:', !!delBtn, delBtn?.label);
  if (delBtn) { await page.mouse.click(delBtn.x + delBtn.w / 2, delBtn.y + delBtn.h / 2); await page.waitForTimeout(1500); const dlg = await text(page, 400); console.log('dialog:', dlg.slice(0, 250)); await shot('delete_dialog'); if (/관리자 생성 소모임|삭제할까요|삭제/.test(dlg)) { await clickLast(/^(삭제|확인)$/); } console.log('after:', page.url(), (await text(page, 400)).slice(0, 250)); await shot('after_delete'); }
  const api = await page.evaluate(async (id) => (await fetch('/api/recruitments/' + id)).status, createdId); console.log('API 상태(생성본):', api);
  await goto(page, '/somoim'); await click(page, /^전체$/, { role: 'checkbox', wait: 2000 }).catch(() => {}); console.log('공개 전체 목록:', (await text(page, 600)).slice(60, 400));
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 600))); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => /POST|PUT|DELETE|4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
