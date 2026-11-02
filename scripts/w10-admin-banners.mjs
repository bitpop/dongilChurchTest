// 관리자: '관리자' 메뉴(공개 화면에 노출되지 않는 메뉴) 배너 추가(이미지 업로드) → 보관 → 완전 삭제
// 안전장치: 시작 시 '관리자' 메뉴의 게시/보관 배너가 0개일 때만 진행하고, 추가 후 1개가 된 항목만 조작한다.
import { launch, goto, click, text, nodes, login, logout, step } from './qa-lib.mjs';
const { browser, page, logs, shot } = await launch({ out: 'reports/write/banners' });
const btns = async () => (await nodes(page)).filter(n => n.role).map(n => `[${n.role}]${n.label}`).join(' | ');
const clickLast = async (re) => { const list = (await nodes(page)).filter(n => n.role === 'button' && re.test(n.label)); const n = list[list.length - 1]; if (!n) throw new Error('no ' + re); await page.mouse.click(n.x + n.w / 2, n.y + n.h / 2); await page.waitForTimeout(3000); };
const counts = async () => { const t = await text(page, 800); const m1 = t.match(/관리자 · 게시 중 (\d+)개/); const m2 = t.match(/보관함 · (\d+)개/); return { active: m1 ? +m1[1] : null, archived: m2 ? +m2[1] : null, t }; };
try {
  step('login'); await login(page);
  await goto(page, '/manage/banners'); await click(page, /^관리자$/, { role: 'checkbox', wait: 2500 });
  const c0 = await counts(); console.log('before:', c0.active, c0.archived, c0.t.slice(0, 300)); await shot('before');
  if (c0.active !== 0 || c0.archived !== 0) { console.log('SKIP: 관리자 메뉴에 기존 배너가 있어 안전하게 식별할 수 없음'); throw new Error('skip'); }
  step('배너 추가');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), click(page, /^배너 추가$/, { role: 'button', wait: 2500 })]);
  console.log('chooser on click?', !!chooser); console.log(await text(page, 500)); console.log(await btns()); await shot('add_dialog');
  let ch = chooser;
  if (!ch) { const [ch2] = await Promise.all([page.waitForEvent('filechooser', { timeout: 10000 }).catch(() => null), click(page, /사진 올리기|사진 선택|이미지 선택|파일 선택|이미지 올리기/, { role: 'button', wait: 2000 }).catch(e => console.log('no upload button:', e.message))]); ch = ch2; }
  if (!ch) throw new Error('file chooser not opened');
  await ch.setFiles('reports/write/qa-banner.png'); await page.waitForTimeout(5000); console.log('after file:', await text(page, 600)); console.log(await btns()); await shot('after_file');
  await clickLast(/^(게시|저장|등록|완료|적용|다음)$/).catch(e => console.log('save?', e.message)); await page.waitForTimeout(2000);
  await clickLast(/^(게시|저장|등록|완료|적용)$/).catch(() => {}); await page.waitForTimeout(2000);
  const c1 = await counts(); console.log('after add:', c1.active, c1.archived, c1.t.slice(0, 400)); await shot('added');
  if (c1.active !== 1) { console.log('배너가 1개로 확인되지 않아 중단'); throw new Error('stop'); }
  step('보관'); await click(page, /^보관$/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await clickLast(/^(보관|확인)$/).catch(() => {}); await page.waitForTimeout(1500);
  const c2 = await counts(); console.log('after archive:', c2.active, c2.archived); await shot('archived');
  if (c2.active === 0 && c2.archived === 1) {
    step('완전 삭제'); await click(page, /완전 삭제/, { role: 'button', wait: 1500 }); console.log('dialog', await text(page, 300)); await shot('delete_dialog'); await clickLast(/^(완전 삭제|삭제|확인)$/).catch(() => {}); await page.waitForTimeout(1500);
    const c3 = await counts(); console.log('after delete:', c3.active, c3.archived); await shot('deleted');
  } else console.log('보관 결과가 예상과 달라 완전 삭제 생략');
} catch (e) { console.log('END', e.message); await shot('end'); console.log(await text(page, 500)); }
finally { console.log('\nLOGS:\n' + logs.filter(l => !/GET/.test(l)).join('\n')); await logout(page); await browser.close(); }
