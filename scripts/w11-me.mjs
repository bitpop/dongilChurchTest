// 내 정보: 글자 크기 변경/복원, 알림 스위치 토글/복원, 알림함 전부 읽음, 다른 기기 로그아웃, 로그아웃 후 보호 페이지 접근
import { launch, goto, click, typeInto, text, nodes, inputs, login, logout, step, TAG } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/me' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}${n.checked ? '=' + n.checked : ''}`).join(' | ');
try {
  step('login'); await login(page);
  await goto(page, '/me'); console.log(await btns()); await shot('me');
  step('글자 크게'); await click(page, /^크게$/, { role: 'button', wait: 2000 }); await shot('font_large'); const h1 = (await nodes(page)).find(n => /내 정보/.test(n.label)); console.log('font large applied? node h=', h1?.h);
  await goto(page, '/home'); await shot('home_font_large'); await goto(page, '/me');
  await click(page, /^기본$/, { role: 'button', wait: 2000 }); await shot('font_default');
  step('알림 스위치 토글'); const sw = (await nodes(page)).filter(n => n.role === 'switch'); console.log('switches', sw.map(s => s.label + '=' + s.checked).join(', '));
  if (sw.length) { const s = sw[0]; await page.mouse.click(s.x + s.w / 2, s.y + s.h / 2); await page.waitForTimeout(2000); const after = (await nodes(page)).filter(n => n.role === 'switch')[0]; console.log('after toggle', after.label, after.checked); await goto(page, '/me'); const re = (await nodes(page)).filter(n => n.role === 'switch')[0]; console.log('persisted after reload', re.label, re.checked); await page.mouse.click(re.x + re.w / 2, re.y + re.h / 2); await page.waitForTimeout(2000); console.log('restored', (await nodes(page)).filter(n => n.role === 'switch')[0].checked); }
  step('알림함'); await goto(page, '/me/notifications'); console.log(await text(page, 400)); await click(page, /^전부 읽음$/, { role: 'button', wait: 2000 }).catch(e => console.log(e.message)); console.log(await text(page, 300)); await shot('notifications');
  step('이름 변경 다이얼로그(취소)'); await goto(page, '/me'); await click(page, /^이름 변경$/, { role: 'button', wait: 1500 }); console.log(await text(page, 300)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type + ':' + i.value))); await shot('rename_dialog'); await click(page, /^취소$/, { role: 'button', wait: 1500 }).catch(() => {});
  step('비밀번호 변경 다이얼로그(취소)'); await click(page, /^비밀번호 변경$/, { role: 'button', wait: 1500 }); console.log(await text(page, 300)); console.log('inputs', JSON.stringify((await inputs(page)).map(i => i.type))); await shot('pw_dialog'); await click(page, /^취소$/, { role: 'button', wait: 1500 }).catch(() => {});
  step('다른 기기 로그아웃'); const others = (await nodes(page)).filter(n => n.role === 'button' && /^로그아웃$/.test(n.label)); console.log('로그아웃 buttons', others.length);
  if (others.length > 1) { const o = others[0]; await page.mouse.click(o.x + o.w / 2, o.y + o.h / 2); await page.waitForTimeout(1500); console.log('dialog', await text(page, 300)); const confirm = (await nodes(page)).filter(n => n.role === 'button' && /^(로그아웃|확인)$/.test(n.label)); const c = confirm[confirm.length - 1]; await page.mouse.click(c.x + c.w / 2, c.y + c.h / 2); await page.waitForTimeout(3000); console.log(await text(page, 600)); await shot('device_logged_out'); }
  step('로그아웃'); await click(page, /^로그아웃$/, { role: 'button', wait: 3000 }); console.log('url', page.url()); await goto(page, '/me'); console.log('after logout /me ->', page.url()); await goto(page, '/manage'); console.log('after logout /manage ->', page.url()); await shot('after_logout');
} catch (e) { console.log('ERROR', e.message); await shot('error'); console.log(await text(page, 800)); console.log(await btns()); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await browser.close(); }
