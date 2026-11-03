// 새 빌드 관리자 화면 재확인(저장 없음): 소모임 삭제 UI, 취소된 일정 복구 버튼, 보관 소그룹 404, 강의 안내문 중복, 교우소식 기본 카테고리,
// 명부 상태 표기, 테스트 계정 잔존, 내 정보 기기 이름, 지난주 복사 버튼의 확인 여부(클릭하지 않고 버튼만 확인), refresh 재사용 발생 여부
import { launch, goto, click, text, nodes, inputs, login, logout, step, clickLast as clickLastLib } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/recheck-admin' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
const cancel = async () => { await click(page, /^(취소|닫기|목록으로)$/, { role: 'button', wait: 1200 }).catch(() => page.keyboard.press('Escape')); };
try {
  step('login'); await login(page);
  step('A 소모임 삭제 UI'); await goto(page, '/somoim/1165'); console.log((await text(page, 300)).slice(0, 200)); console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).slice(0, 8).join(' | '));
  await goto(page, '/manage/groups'); await click(page, /^소모임$/, { role: 'checkbox', wait: 2500 }); console.log('admin 소모임 탭:', (await text(page, 500)).slice(80, 400)); console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ')); await shot('somoim_admin');
  await click(page, /^명단$/, { role: 'button', wait: 2500 }).catch(() => {}); console.log('명단 buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | '));
  step('E 취소된 일정 복구 버튼'); await goto(page, '/manage/events/1/edit'); console.log((await text(page, 300)).slice(0, 200)); console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button').map(n => n.label).join(' | ')); await shot('cancelled_event_edit');
  step('F 보관 소그룹 404'); const before = logs.length; await goto(page, '/manage/groups/1'); console.log('logs:', logs.slice(before).filter(l => /4\d\d|5\d\d/.test(l)).join(' | ') || '(오류 없음)');
  step('G 강의 안내문 중복'); await goto(page, '/manage/lectures'); await click(page, /^새 강의$/, { role: 'button', wait: 2500 }); await inputs(page).then(i => i.length); await (await import('./qa-lib.mjs')).typeInto(page, 0, '임시'); await clickLastLib(page, /^등록$/); const t = await text(page, 3000); console.log('"영상을 1개 이상" 출현 횟수:', (t.match(/영상을 1개 이상 추가해 주세요/g) || []).length); await shot('lecture_validation'); await cancel();
  step('H 교우소식 기본 카테고리'); await goto(page, '/manage/posts'); await click(page, /^교우소식$/, { role: 'button', wait: 2000 }); await click(page, /^등록$/, { role: 'button', wait: 2500 }); console.log('카테고리 체크 상태:', (await nodes(page)).filter(n => n.role === 'checkbox').map(n => `${n.label}=${n.checked}`).join(', ')); await cancel();
  step('J/20 명부 상태 표기·테스트 계정'); await goto(page, '/manage/members'); const mt = await text(page, 1500); console.log('QA 명부 행:', mt.match(/\[QA테스트\] 명부.{0,120}/)?.[0]); console.log('홍길동 잔존?', /홍길동/.test(mt)); await shot('members_list');
  step('새가족 접수 잔존'); await click(page, /^새가족 접수$/, { role: 'checkbox', wait: 2500 }); await click(page, /^전체$/, { role: 'checkbox', wait: 2000 }); console.log((await text(page, 500)).slice(60, 300));
  step('21 내 정보 기기 이름'); await goto(page, '/me'); console.log((await text(page, 1500)).match(/로그인 기기.{0,160}/)?.[0]);
  step('B 지난주 복사 버튼 존재/문구'); await goto(page, '/manage/posts'); console.log('buttons:', (await nodes(page)).filter(n => n.role === 'button' && /복사|새 주보/.test(n.label)).map(n => n.label).join(' | '));
  step('L 안내 문구 탭 검색 추천어 블록'); await goto(page, '/manage/contents'); await click(page, /^안내 문구$/, { role: 'button', wait: 2000 }); console.log((await text(page, 1500)).match(/검색 추천어.{0,160}/)?.[0] || '(검색 추천어 블록 없음)');
  step('관리자 페이지 연속 이동(refresh 재사용 관찰)'); for (const r of ['/manage', '/manage/members', '/manage/permissions', '/manage/sermons', '/manage/contents', '/manage/lectures', '/manage/banners', '/manage/groups', '/manage/posts', '/manage/events', '/me', '/home', '/manage']) { await goto(page, r, 1500); }
  console.log('REFRESH_REUSED 발생?', logs.some(l => /REFRESH_REUSED|모든 기기/.test(l)) ? 'YES' : 'no'); console.log('refresh 호출 수:', logs.filter(l => /auth\/refresh/.test(l)).length);
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log((await text(page, 500))); }
finally { console.log('\nLOGS(4xx/5xx):\n' + logs.filter(l => /4\d\d|5\d\d/.test(l)).join('\n')); await logout(page); await browser.close(); }
