/*
 * SAPAN — oyun testleri
 *
 * Oyunu gerçek bir tarayıcıda çalıştırır, iç durumunu okur ve davranışını doğrular.
 * Çalıştırmak için:  npm i -D playwright && npx playwright install chromium
 *                    node tests/game.test.mjs
 *
 * index.html'e dokunmaz: geçici bir kopya üretip IIFE'nin sonuna kanca enjekte eder.
 */
import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, '.probe.html');

const HOOKS = `window.__dbg=()=>({state,phase,score,baskets,streak,time:+timeLeft.toFixed(2),ci,
 bx:Math.round(ball.x), by:Math.round(ball.y),
 hoopSide:hoop.side, hoopY:Math.round(hoopY()), tipX:Math.round(tipX()),
 innerX:Math.round(innerX()), rim:Math.round(rimLen()),
 bars:bars.length, orbs:orbs.filter(o=>!o.taken).length,
 wide:wideShots, air:airShots, best:save.best, S:+S.toFixed(3)});
window.__x=(s)=>eval(s);

/* durum kaydet / geri al — deneme atışları için */
window.__snap=()=>({bx:ball.x,by:ball.y,bvx:ball.vx,bvy:ball.vy,ph:phase,sc:score,bk:baskets,
  st:streak,t:timeLeft,tk:tick,scored,hitRim,hitBoard,ft:flightT,ws:wideShots,as:airShots,
  hoop:Object.assign({},hoop), bars:bars.map(b=>Object.assign({},b)),
  orbs:orbs.map(o=>Object.assign({},o))});
window.__rest=(s)=>{ ball.x=s.bx;ball.y=s.by;ball.vx=s.bvx;ball.vy=s.bvy;phase=s.ph;score=s.sc;
  baskets=s.bk;streak=s.st;timeLeft=s.t;tick=s.tk;scored=s.scored;hitRim=s.hitRim;
  hitBoard=s.hitBoard;flightT=s.ft;wideShots=s.ws;airShots=s.as;
  hoop=Object.assign({},s.hoop);
  bars.length=0; for(const b of s.bars) bars.push(Object.assign({},b));
  orbs.length=0; for(const o of s.orbs) orbs.push(Object.assign({},o)); };
window.__try=(ang,pow)=>{
  const s=window.__snap();
  ball.vx=Math.cos(ang)*pow; ball.vy=Math.sin(ang)*pow; phase='fly'; flightT=0; ball.y-=2;
  let n=0; while(phase==='fly' && n++<900) step();
  const r={made:scored, swish:scored&&!hitRim&&!hitBoard};
  window.__rest(s); return r;
};
/* bu turda basket atmanın bir yolu var mı? */
window.__solvable=()=>{
  for(let d=19; d<=87; d+=2){
    for(let p=11; p<=30; p+=1){
      for(const sgn of [1,-1]){
        const a=-(d*Math.PI/180), ang = sgn>0 ? a : -Math.PI-a;
        if(window.__try(ang,p).made) return true;
      }
    }
  }
  return false;
};
})();
</script>`;

const src = readFileSync(join(here, '..', 'index.html'), 'utf8');
if (src.split('})();\n</script>').length !== 2) {
  console.error('index.html beklenen yapıda değil (IIFE sonu bulunamadı).');
  process.exit(2);
}
writeFileSync(probe, src.replace('})();\n</script>', HOOKS));

let pass = 0, fail = 0;
const ok = (name, cond, note = '') => {
  cond ? pass++ : fail++;
  console.log(`  ${cond ? '✓' : '✗'} ${name}${note ? `   [${note}]` : ''}`);
};
const group = t => console.log(`\n─ ${t} ─`);

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], hasTouch: true });
const pg = await ctx.newPage();
const errs = [];
pg.on('pageerror', e => errs.push(String(e).split('\n')[0]));
pg.on('console', m => {
  if (m.type() === 'error' && !/fonts\.g|ERR_CONNECTION/.test(m.text())) errs.push(m.text());
});
const dbg = () => pg.evaluate(() => __dbg());
const run = s => pg.evaluate(src => __x(src), s);

await pg.goto('file://' + probe);
await pg.waitForTimeout(600);

group('açılış ve atış');
let d = await dbg();
ok('menüde saha hazır', d.state === 'menu' && d.phase === 'aim');
await pg.click('#btnStart');
await pg.waitForTimeout(250);
d = await dbg();
ok('oyun başlıyor', d.state === 'play' && d.time > 40, `süre=${d.time}`);
ok('top zeminde duruyor', d.by === 797, `y=${d.by}`);
ok('pota duvara monte', d.innerX === (d.hoopSide > 0 ? 396 : 24), `innerX=${d.innerX}`);
ok('çember uzunluğu doğru', Math.abs(Math.abs(d.tipX - d.innerX) - 64) < 1, `rim=${d.rim}`);

const vp = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
const p0 = await run('({x:offX+ball.x*S, y:offY+ball.y*S})');
await pg.mouse.move(p0.x, p0.y);
await pg.mouse.down();
await pg.mouse.move(p0.x - 60, p0.y + 110, { steps: 8 });
await pg.mouse.up();
await pg.waitForTimeout(200);
ok('çek-bırak topu fırlatıyor', (await dbg()).phase !== 'aim');

group('basket algılama');
let r = await run(`(()=>{
  startRun(); hoop.amp=0;
  const hy=hoopY(), mid=(tipX()+innerX())/2, s0=score;
  ball.x=mid; ball.y=hy-90; ball.vx=0; ball.vy=1; phase='fly'; flightT=0;
  scored=false; hitRim=false; hitBoard=false;
  let n=0; while(!scored && n++<250) step();
  return {scored, pts:score-s0, baskets, streak};
})()`);
ok('çemberden geçen top sayılıyor', r.scored, JSON.stringify(r));
ok('temiz atış 3 sayı', r.pts === 3, `${r.pts} sayı`);

r = await run(`(()=>{
  startRun(); hoop.amp=0;
  const hy=hoopY(), out = hoop.side>0 ? tipX()-60 : tipX()+60;
  ball.x=out; ball.y=hy-90; ball.vx=0; ball.vy=1; phase='fly'; flightT=0;
  let n=0; while(phase==='fly' && n++<500) step();
  return {scored, score};
})()`);
ok('çember dışından geçen sayılmıyor', !r.scored && r.score === 0, JSON.stringify(r));

r = await run(`(()=>{
  startRun(); hoop.amp=0;
  const hy=hoopY(), mid=(tipX()+innerX())/2;
  ball.x=mid; ball.y=hy+80; ball.vx=0; ball.vy=-14; phase='fly'; flightT=0;
  let n=0; while(n++<24) step();          // sadece yükselirken
  return {scored, above:ball.y<hy};
})()`);
ok('yalnızca yukarı geçiş sayı vermiyor', !r.scored && r.above, JSON.stringify(r));

r = await run(`(()=>{
  startRun(); hoop.amp=0;
  const hy=hoopY(), mid=(tipX()+innerX())/2, s0=score;
  ball.x=mid; ball.y=hy-90; ball.vx=0; ball.vy=1; phase='fly'; flightT=0;
  scored=false; hitRim=true; hitBoard=false;   // çembere değmiş say
  let n=0; while(!scored && n++<250) step();
  return {pts:score-s0};
})()`);
ok('çembere değen atış 2 sayı', r.pts === 2, `${r.pts} sayı`);

group('çember, panya ve engel');
r = await run(`(()=>{
  startRun(); hoop.amp=0; const hy=hoopY();
  ball.x=tipX(); ball.y=hy-70; ball.vx=0; ball.vy=6; phase='fly'; flightT=0;
  let n=0; while(n++<40 && !hitRim) step();
  return {hitRim, vy:+ball.vy.toFixed(1)};
})()`);
ok('çember ucu topu sektiriyor', r.hitRim && r.vy < 6, JSON.stringify(r));

r = await run(`(()=>{
  startRun(); hoop.amp=0; const hy=hoopY();
  ball.x = hoop.side>0 ? boardX()-40 : boardX()+BOARDW+40;
  ball.y=hy-40; ball.vx=hoop.side*14; ball.vy=0; phase='fly'; flightT=0;
  let n=0; while(n++<30 && !hitBoard) step();
  return {hitBoard, away: Math.sign(ball.vx) === -hoop.side};
})()`);
ok('panya topu geri sektiriyor', r.hitBoard && r.away, JSON.stringify(r));

r = await run(`(()=>{
  startRun();
  bars.length=0; bars.push({bx:150,x:150,y:500,w:120,h:13,amp:0,spd:0,ph:0});
  ball.x=210; ball.y=430; ball.vx=0; ball.vy=8; phase='fly'; flightT=0;
  let n=0; while(n++<20 && ball.vy>0) step();
  return {bounced: ball.vy<0};
})()`);
ok('engel topu sektiriyor', r.bounced);

group('tur akışı');
r = await run(`(()=>{
  startRun();
  ball.vx=0; ball.vy=-4; phase='fly'; flightT=0;
  let n=0; while(phase!=='aim' && state==='play' && n++<900) step();
  return {phase, score, streak};
})()`);
ok('kaçan atış turu bitirip yenisini kuruyor', r.phase === 'aim' && r.score === 0,
   JSON.stringify(r));

r = await run(`(()=>{
  startRun(); streak=5;
  hoop.amp=0; const hy=hoopY(), mid=(tipX()+innerX())/2, s0=score;
  ball.x=mid; ball.y=hy-90; ball.vx=0; ball.vy=1; phase='fly'; flightT=0;
  scored=false; hitRim=true; hitBoard=false;
  let n=0; while(!scored && n++<250) step();
  return {pts:score-s0, streak};
})()`);
ok('seri çarpanı uygulanıyor', r.pts === 2 * (1 + Math.min(3, Math.floor(6 / 3))),
   `seri ${r.streak} → ${r.pts} sayı`);

r = await run(`(()=>{
  startRun(); streak=4;
  ball.vx=0; ball.vy=-4; phase='fly'; flightT=0;
  let n=0; while(phase!=='aim' && state==='play' && n++<900) step();
  return streak;
})()`);
ok('kaçırınca seri sıfırlanıyor', r === 0, `seri=${r}`);

group('süre');
r = await run(`(()=>{ startRun(); const t0=timeLeft; for(let i=0;i<60;i++) step(); return t0-timeLeft; })()`);
ok('saat saniyede bir azalıyor', Math.abs(r - 1) < .05, `${r.toFixed(2)} sn / 60 kare`);

r = await run(`(()=>{
  startRun(); hoop.amp=0;
  const hy=hoopY(), mid=(tipX()+innerX())/2, t0=timeLeft;
  ball.x=mid; ball.y=hy-90; ball.vx=0; ball.vy=1; phase='fly'; flightT=0;
  scored=false; hitRim=false; hitBoard=false;
  let n=0; while(!scored && n++<250) step();
  return +(timeLeft-t0).toFixed(2);
})()`);
ok('temiz atış süre ekliyor', r > 3.4, `+${r} sn`);
ok('süre bitince oyun bitiyor',
   (await run(`(()=>{ startRun(); timeLeft=0.02; step(); step(); return state; })()`)) === 'over-anim');

group('sahalar');
const courts = await run(`(()=>{
  const seen=[]; startRun();
  for(let b=0;b<40;b++){ baskets=b; const c=courtAt(b); if(!seen.includes(c)) seen.push(c); }
  return {count:seen.length, names:seen.map(i=>COURTS[i].n)};
})()`);
ok('basket sayısı ilerledikçe saha değişiyor', courts.count === 6, courts.names.join(' → '));

group('her tur çözülebilir olmalı');
const solve = await run(`(()=>{
  startRun();
  let bad=0, tested=0;
  for(let shot=0; shot<14; shot++){
    if(!window.__solvable()) bad++;
    tested++;
    baskets += 3;
    const c=courtAt(baskets); if(c!==ci){ ciPrev=ci; ci=c; cMix=1; applyCourt(); }
    newShot();
  }
  return {bad, tested};
})()`);
ok('hiçbir tur çözümsüz değil', solve.bad === 0,
   `${solve.tested} tur denendi, çözümsüz=${solve.bad}`);

group('güçlendirmeler');
for (const [t, check] of [['time', 'time'], ['wide', 'wide'], ['double', 'air']]) {
  const got = await run(`(()=>{
    startRun(); const t0=timeLeft;
    const o={type:'${t}', x:ball.x, y:ball.y-10, ph:0};
    orbs.push(o); grab(o);
    return {taken:!!o.taken, wide:wideShots, air:airShots, dt:+(timeLeft-t0).toFixed(1)};
  })()`);
  const good = check === 'time' ? got.dt === 4 : check === 'wide' ? got.wide === 3 : got.air === 1;
  ok(`${t} toplanıyor`, got.taken && good, JSON.stringify(got));
}
ok('HUD rozeti çiziliyor',
   (await pg.evaluate(() => document.querySelectorAll('#power .pw').length)) > 0);

r = await run(`(()=>{
  startRun(); const base=rimLen(); wideShots=3; const wide=rimLen();
  return +(wide/base).toFixed(2);
})()`);
ok('geniş pota çemberi büyütüyor', r === 1.5, `×${r}`);

r = await run(`(()=>{
  startRun();
  const o={type:'time', x:ball.x, y:ball.y-150, ph:0}; orbs.push(o);
  ball.vx=0; ball.vy=-14; phase='fly'; flightT=0;
  let n=0; while(!o.taken && n++<40) step();
  return !!o.taken;
})()`);
ok('uçuş sırasında küre toplanıyor', r);

r = await run(`(()=>{
  startRun(); airShots=1;
  ball.vx=0; ball.vy=-10; phase='fly'; flightT=0; aimId=null; aim=null;
  cvs.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,clientX:200,clientY:400,bubbles:true}));
  const aimed = aim!==null; if(aim){ aim.x=200; aim.y=540; }
  release({pointerId:9});
  return {aimed, air:airShots, vy:Math.round(ball.vy)};
})()`);
ok('çift atış havada nişan açıyor', r.aimed, JSON.stringify(r));
ok('çift atış hakkı tükeniyor', r.air === 0 && r.vy < 0, JSON.stringify(r));
ok('hak yokken havada nişan açılmıyor', await run(`(()=>{
  ball.vx=0; ball.vy=-6; phase='fly'; airShots=0; aimId=null; aim=null;
  cvs.dispatchEvent(new PointerEvent('pointerdown',{pointerId:11,clientX:200,clientY:400,bubbles:true}));
  const a=aim; release({pointerId:11}); return a===null; })()`));

group('ekran ve durum');
await run('startRun()');
await run('score=17; baskets=6; timeLeft=30;');
const before = await dbg();
await pg.setViewportSize({ width: 390, height: 700 });

await pg.waitForTimeout(350);
const after = await dbg();
ok('yeniden boyutlanma koşuyu bozmuyor',
   after.score === before.score && after.state === 'play' && Math.abs(after.time - before.time) < 1,
   `${before.score} → ${after.score}`);

const geo = [];
for (const [w, h] of [[360, 640], [390, 844], [430, 932], [820, 1180]]) {
  await pg.setViewportSize({ width: w, height: h });
  await pg.waitForTimeout(180);
  geo.push(await run('(()=>({playW:Math.round(PR-PL), floor:FLOOR}))()'));
}
ok('saha her cihazda aynı ölçüde', new Set(geo.map(g => g.playW)).size === 1,
   geo.map(g => g.playW).join('/'));
await pg.setViewportSize({ width: 390, height: 844 });
await pg.waitForTimeout(200);

await run('startRun()');
await pg.waitForTimeout(150);
await pg.click('#btnPause');
await pg.waitForTimeout(200);
ok('duraklat düğmesi', (await dbg()).state === 'paused');
const tPaused = (await dbg()).time;
await pg.waitForTimeout(600);
ok('duraklatınca saat durmuş', Math.abs((await dbg()).time - tPaused) < .05);
await pg.click('#btnResume');
await pg.waitForTimeout(2200);
ok('geri sayımdan sonra devam ediyor', (await dbg()).state === 'play');
await pg.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await pg.waitForTimeout(200);
ok('sekme gizlenince duruyor', (await dbg()).state === 'paused');
await pg.evaluate(() => Object.defineProperty(document, 'hidden', { value: false, configurable: true }));

group('kayıt');
await run('startRun(); score=42; timeLeft=0.02;');
await pg.waitForTimeout(1400);
const best = (await dbg()).best;
ok('rekor kaydediliyor', best === 42, `rekor=${best}`);
await pg.reload();
await pg.waitForTimeout(600);
ok('rekor yenilemeden sonra duruyor', (await dbg()).best === 42);
ok('menüde rekor gösteriliyor', /Rekor/.test(await pg.textContent('#menuStats')));

group('performans');
await pg.click('#btnStart');
await pg.waitForTimeout(200);
await run('baskets=35; ci=courtAt(35); ciPrev=ci; cMix=1; applyCourt(); newShot(); wideShots=3; airShots=2;');
await pg.waitForTimeout(400);
const fps = await pg.evaluate(() => new Promise(res => {
  let n = 0; const t0 = performance.now();
  (function f() {
    n++;
    performance.now() - t0 < 2000 ? requestAnimationFrame(f)
                                  : res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
  })();
}));
// Eşik gerçek gerilemeleri yakalayacak kadar yüksek, paylaşımlı CI CPU'sunda
// gürültüye takılmayacak kadar düşük tutuldu (gerçek cihazda ölçüm 60 fps).
ok('kare hızı 45 fps üzerinde', fps > 45, `${fps} fps`);
ok('konsolda hata yok', errs.length === 0, errs.slice(0, 2).join(' | ') || 'yok');

await browser.close();
unlinkSync(probe);
console.log(`\n${pass} geçti, ${fail} kaldı\n`);
process.exit(fail ? 1 : 0);
