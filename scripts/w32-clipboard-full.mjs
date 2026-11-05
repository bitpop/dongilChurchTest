// 주소 복사 예외 재확인: 5개 화면(설교·주보·갤러리·오시는 길·헌금 계좌) × 3환경(클립보드 거부 / 허용 / 카카오톡 인앱 UA + 거부)
import { chromium } from 'playwright';
import { goto, click, text, nodes } from './qa-lib.mjs';
const KAKAO_UA = 'Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36;KAKAOTALK 10.8.5;KAKAOTALK 2410080';
const browser = await chromium.launch();
const envs = [
  { name: '클립보드 거부(기본)', ctx: { viewport: { width: 1440, height: 1200 } } },
  { name: '클립보드 허용', ctx: { viewport: { width: 1440, height: 1200 }, permissions: ['clipboard-write', 'clipboard-read'] } },
  { name: '카카오톡 인앱 UA + 거부', ctx: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: KAKAO_UA } },
];
const targets = [['/worship/sermons/674', /^주소 복사$/], ['/bulletins/1161', /^주소 복사$/], ['/gallery/1030', /^주소 복사$/], ['/about/location', /^주소 복사$/], ['/offering', /^계좌 복사$/]];
for (const env of envs) {
  const ctx = await browser.newContext({ locale: 'ko-KR', ...env.ctx }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  for (const [route, re] of targets) {
    await goto(page, route, 3000); const before = errs.length; const t0 = await text(page, 4000);
    const ok = await click(page, re, { role: 'button', wait: 1500 }).then(() => true).catch(() => false);
    const t1 = await text(page, 4000);
    const toast = [...t1.matchAll(/.{0,6}(복사했어요|복사됐어요|복사되었어요|복사할 수 없|복사 실패|길게 눌러).{0,30}/g)].map(m => m[0].trim()).filter(s => !t0.includes(s));
    console.log(`[${env.name}] ${route}: 버튼 ${ok ? '클릭' : '없음'}, pageerror ${errs.length - before}건, 피드백: ${toast.length ? JSON.stringify(toast) : '없음'}`);
    if (errs.length > before) console.log('   ', errs[errs.length - 1]);
  }
  await ctx.close();
}
await browser.close();
