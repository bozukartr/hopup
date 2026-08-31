/*
 * SAPAN — oyun testleri
 *
 * Oyunu gerçek bir tarayıcıda çalıştırır, iç durumunu okur ve davranışını doğrular.
 * Çalıştırmak için:  npm i -D playwright && npx playwright install chromium
 *                    node tests/game.test.mjs
 *
 * index.html'e dokunmaz: geçici bir kopya üretip IIFE'nin sonuna hata ayıklama
 * kancaları enjekte eder.
 */
import { chromium, devices } from 'playwright';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, '.probe.html');

const HOOKS = `window.__dbg=()=>({plats:plats.length,parts:parts.length,state,score,
 cam:Math.round(cam),visH:Math.round(visH),ballY:Math.round(ball.y),grounded:ball.grounded,
 combo,zi,best:save.best,S:+S.toFixed(3),
 shield:ball.shield,rocket:ball.rocket,air:ball.airShots,inv:ball.inv});
window.__x=(s)=>eval(s);
window.__perch=(y)=>{ ball.y=y; cam=y-visH*.62; camBest=cam; nextY=y+300;
  plats.length=0; recent.length=0; grow();
  const p=plats.filter(q=>q.kind==='plat'&&q.y>y-260&&q.y<y+320)
               .sort((a,b)=>Math.abs(a.y-y)-Math.abs(b.y-y))[0];
  if(!p) return false;
  ball.x=p.x+p.w/2; ball.y=p.y-15; ball.on=p; ball.grounded=true; ball.vx=0; ball.vy=0;
  ball.rx=ball.x; ball.ry=ball.y; score=Math.round(-ball.y/12); landY=ball.y; lastPlat=p;
  zi=zoneAt(score); ziPrev=zi; zMix=1; applyZone(); return true; };
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

group('açılış ve giriş');
let d = await dbg();
ok('menüde canlı dünya var', d.state === 'menu' && d.plats > 5, `plats=${d.plats}`);
await pg.click('#btnStart');
await pg.waitForTimeout(250);
ok('oyun başlıyor', (await dbg()).state === 'play');

const vp = await pg.evaluate(() => ({ w: innerWidth, h: innerHeight }));
await pg.mouse.move(vp.w / 2, vp.h * 0.72);
await pg.mouse.down();
await pg.mouse.move(vp.w / 2 + 35, vp.h * 0.72 + 130, { steps: 10 });
await pg.mouse.up();
await pg.waitForTimeout(800);
ok('çek-bırak topu yükseltiyor', (await dbg()).score > 3, `skor=${(await dbg()).score}`);

group('ekran boyutu koşuyu bozmamalı');
await pg.evaluate(() => __perch(-9000));
await pg.waitForTimeout(250);
const before = await dbg();
await pg.setViewportSize({ width: 390, height: 700 });
await pg.waitForTimeout(350);
const after = await dbg();
ok('skor korunuyor', after.score === before.score, `${before.score} → ${after.score}`);
ok('konum korunuyor', Math.abs(after.ballY - before.ballY) < 60);
ok('oyun devam ediyor', after.state === 'play');
await pg.setViewportSize({ width: 390, height: 844 });
await pg.waitForTimeout(300);

group('cihazdan bağımsız zorluk');
const geo = [];
for (const [w, h] of [[360, 640], [390, 844], [430, 932], [820, 1180]]) {
  await pg.setViewportSize({ width: w, height: h });
  await pg.waitForTimeout(200);
  geo.push(await run('(()=>({visH:Math.round(visH), playW:Math.round(PR-PL)}))()'));
}
ok('oynanabilir genişlik her cihazda aynı', new Set(geo.map(g => g.playW)).size === 1,
   geo.map(g => g.playW).join('/'));
ok('görünür yükseklik sabit',
   Math.max(...geo.map(g => g.visH)) - Math.min(...geo.map(g => g.visH)) < 40,
   geo.map(g => g.visH).join('/'));
await pg.setViewportSize({ width: 390, height: 844 });
await pg.waitForTimeout(200);

group('dünya üretimi');
await pg.evaluate(() => __perch(-60000));
await pg.waitForTimeout(900);
ok('ekran dışı platformlar budanıyor', (await dbg()).plats < 130, `plats=${(await dbg()).plats}`);

const curve = await run('(()=>[0,300,750,1500,3000,8000,20000].map(h=>+diff(h).toFixed(3)))()');
ok('zorluk hiçbir yükseklikte düzleşmiyor', curve[6] > curve[4] && curve[4] > curve[2],
   curve.join(' '));

const gen = await run(`(()=>{
  plats.length=0; recent.length=0; nextY=-165; srand(12345);
  for(let i=0;i<4000;i++){ row(nextY); nextY-=140; }
  const P=plats.filter(p=>p.kind==='plat'), S=plats.filter(p=>p.kind==='spike'),
        O=plats.filter(p=>p.kind==='orb');
  let overlap=0, orbClash=0;
  for(const s of S) for(const p of P){
    if(Math.abs(p.y-s.y)>34) continue;
    if(!(s.x+s.w<p.x || p.x+p.w<s.x)) overlap++;
  }
  for(const o of O) for(const q of P.concat(S)){
    if(Math.abs(q.y-o.y)>40) continue;
    if(!(o.x+16 < q.x-4 || o.x-16 > q.x+q.w+4)) orbClash++;
  }
  const types={}; P.forEach(p=>types[p.type]=(types[p.type]||0)+1);
  const outside = O.filter(o=>o.x<PL+16||o.x>PR-16).length;
  return {rows:P.length, spikes:S.length, overlap, orbs:O.length, orbClash, types, outside};
})()`);
ok('hiçbir diken platformla çakışmıyor', gen.overlap === 0,
   `${gen.rows} satır / ${gen.spikes} diken / çakışma=${gen.overlap}`);
ok('yalnızca üç zemin tipi üretiliyor', Object.keys(gen.types).length === 3,
   JSON.stringify(gen.types));
ok('güçlendirme küreleri üretiliyor', gen.orbs > 150, `${gen.orbs} küre`);
ok('küreler platform veya dikene gömülmüyor', gen.orbClash === 0, `çakışma=${gen.orbClash}`);
ok('küreler duvarların içinde kalmıyor', gen.outside === 0, `dışarıda=${gen.outside}`);

const det = await run(`(()=>{
  const gen=()=>{ plats.length=0; recent.length=0; nextY=-165; srand(999);
    for(let i=0;i<50;i++){ row(nextY); nextY-=140; }
    return plats.map(p=>p.kind+p.type+Math.round(p.x)+Math.round(p.y)).join('|'); };
  return gen()===gen();
})()`);
ok('aynı tohum aynı dünyayı üretiyor', det);

group('fizik');
const push = await run(`(()=>{
  const base={kind:'plat',type:'normal',y:-500,h:14,w:200,x:100,px:100};
  const other={kind:'plat',type:'normal',y:-505,h:14,w:60,x:250,px:250};
  plats.length=0; plats.push(base,other);
  ball.on=base; ball.grounded=true; ball.x=245; ball.y=-515; ball.vx=3;
  sidePush(); return {x:ball.x, vx:ball.vx};
})()`);
ok('yerdeki top platformun içine giremiyor', push.x <= 235.1 && push.vx < 0, JSON.stringify(push));

const cr = await run(`(()=>{
  const p={kind:'plat',type:'crumble',y:-600,h:14,w:120,x:150,px:150};
  plats.push(p); ball.grounded=false; ball.on=null; ball.vy=4; ball.x=210; ball.y=-620;
  land(p);
  const started=ball.grounded && p.fuse===28;
  for(let i=0;i<40;i++){ if(p.fuse>0){ p.fuse--; if(p.fuse===0) breakPlat(p); } }
  return {started, gone:!!p.gone, dropped:!ball.grounded};
})()`);
ok('çürük zemin basılınca sayaç başlatıyor', cr.started);
ok('süre dolunca kırılıp topu düşürüyor', cr.gone && cr.dropped);

const combo = await run(`(()=>{
  const mk=y=>({kind:'plat',type:'normal',y,h:14,w:120,x:150,px:150});
  const a=mk(-500), b=mk(-700), c=mk(-900), down=mk(-400);
  plats.push(a,b,c,down);
  ball.grounded=false; ball.on=null; landY=0; lastPlat=null; combo=0;
  land(a); const s1=combo; land(b); const s2=combo; land(c); const s3=combo;
  land(down); return {s1,s2,s3,afterDrop:combo};
})()`);
ok('yükselerek seri büyüyor', combo.s1 === 1 && combo.s2 === 2 && combo.s3 === 3);
ok('aşağı inince seri sıfırlanıyor', combo.afterDrop === 0);

const nm = await run(`(()=>{
  const s={kind:'spike',dir:'up',x:200,y:-500,w:60,h:11};
  ball.x=170; ball.y=-505; ball.grounded=false;
  return {near:nearSpike(s), hit:overlapSpike(s)};
})()`);
ok('kıl payı ölüm sayılmıyor', nm.near && !nm.hit);

group('giriş dayanıklılığı');
await run('startRun()');
await pg.waitForTimeout(200);
const fire = (type, id, x, y) => pg.evaluate(a => {
  document.getElementById('game')
    .dispatchEvent(new PointerEvent(a.type, { pointerId: a.id, clientX: a.x, clientY: a.y, bubbles: true }));
}, { type, id, x, y });
await fire('pointerdown', 1, vp.w / 2, vp.h * 0.7);
await fire('pointermove', 1, vp.w / 2 + 20, vp.h * 0.7 + 80);
const aimA = await run('aim?{sx:Math.round(aim.sx),x:Math.round(aim.x)}:null');
await fire('pointerdown', 2, 10, 10);
await fire('pointermove', 2, 10, 10);
const aimB = await run('aim?{sx:Math.round(aim.sx),x:Math.round(aim.x)}:null');
ok('ikinci parmak nişanı bozmuyor', JSON.stringify(aimA) === JSON.stringify(aimB));
await fire('pointerup', 2, 10, 10);
ok('ikinci parmak kalkınca atış olmuyor', await run('aim!==null'));
await fire('pointerup', 1, vp.w / 2 + 20, vp.h * 0.7 + 80);
await pg.waitForTimeout(300);
ok('ilk parmak kalkınca fırlatıyor', !(await dbg()).grounded);

const buf = await run(`(()=>{
  const p={kind:'plat',type:'normal',y:-300,h:14,w:150,x:130,px:130};
  plats.push(p);
  aim=null; aimId=7; buffered=true; ptr.x=100; ptr.y=200;
  ball.grounded=false; ball.on=null; ball.vy=5; ball.x=200; ball.y=-320;
  land(p); return {started:aim!==null, cleared:!buffered};
})()`);
ok('havada basılı tutulan parmak inişte nişana dönüşüyor', buf.started && buf.cleared);

group('güçlendirmeler');
for (const [t, check] of [['shield', 'shield'], ['rocket', 'rocket'], ['double', 'air']]) {
  await run('startRun()');
  await pg.waitForTimeout(120);
  const got = await run(`(()=>{
    const o={kind:'orb',type:'${t}',x:ball.x,y:ball.y-10,w:0,h:0,ph:0};
    plats.push(o); grab(o);
    return {taken:o.taken, shield:ball.shield, rocket:ball.rocket, air:ball.airShots};
  })()`);
  ok(`${t} toplanıyor`, got.taken && (check === 'air' ? got.air === 1 : got[check]),
     JSON.stringify(got));
}
ok('HUD rozeti çiziliyor', (await pg.evaluate(() => document.querySelectorAll('#power .pw').length)) > 0);

const flight = await run(`(()=>{
  startRun();
  const o={kind:'orb',type:'rocket',x:ball.x,y:ball.y-160,w:0,h:0,ph:0};
  plats.push(o);
  ball.grounded=false; ball.on=null; ball.vx=0; ball.vy=-14;
  for(let i=0;i<26 && !o.taken;i++) step();
  return {taken:!!o.taken, rocket:ball.rocket};
})()`);
ok('uçuş sırasında küre toplanıyor', flight.taken && flight.rocket, JSON.stringify(flight));

await run('startRun()');
await pg.waitForTimeout(120);
let sh = await run(`(()=>{ ball.shield=true; die('spike');
  return {state, shield:ball.shield, inv:ball.inv}; })()`);
ok('kalkan diken ölümünü emiyor', sh.state === 'play' && !sh.shield && sh.inv > 0,
   JSON.stringify(sh));
sh = await run(`(()=>{ ball.shield=true; const c0=camBest; die('fall');
  return {state, shield:ball.shield, moved:Math.round(camBest-c0)}; })()`);
ok('kalkan düşmeyi emiyor, en yüksek nokta sıfırlanıyor',
   sh.state === 'play' && !sh.shield && sh.moved > 0, JSON.stringify(sh));
ok('kalkan yokken ölüm normal işliyor',
   (await run(`(()=>{ ball.shield=false; ball.inv=0; die('spike'); return state; })()`)) === 'dying');

const rk = await run(`(()=>{
  startRun(); aim={sx:200,sy:400,x:200,y:600,lt:0};
  const n=Math.hypot(launchVec().x, launchVec().y);
  ball.rocket=true;
  const r=Math.hypot(launchVec().x, launchVec().y);
  release();
  return {ratio:+(r/n).toFixed(2), spent:!ball.rocket};
})()`);
ok('roket gücü 1.7 katına çıkarıp tükeniyor', rk.ratio > 1.65 && rk.ratio < 1.75 && rk.spent,
   `×${rk.ratio}`);

const air = await run(`(()=>{
  startRun();
  ball.grounded=false; ball.on=null; ball.airShots=1; ball.vy=9; aimId=null; aim=null;
  cvs.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,clientX:200,clientY:400,bubbles:true}));
  const aimed=aim!==null; if(aim){ aim.x=200; aim.y=540; }
  release({pointerId:9});
  return {aimed, air:ball.airShots, vy:Math.round(ball.vy)};
})()`);
ok('çift atış havada nişan açıyor', air.aimed, JSON.stringify(air));
ok('çift atış hakkı tükeniyor ve yön değişiyor', air.air === 0 && air.vy < 0, JSON.stringify(air));
ok('hak yokken havada nişan açılmıyor', await run(`(()=>{
  ball.grounded=false; ball.on=null; ball.airShots=0; aimId=null; aim=null;
  cvs.dispatchEvent(new PointerEvent('pointerdown',{pointerId:11,clientX:200,clientY:400,bubbles:true}));
  const a=aim; release({pointerId:11}); return a===null; })()`));

group('ölüm ve kayıt');
await run('startRun()');
await pg.waitForTimeout(200);
await pg.evaluate(() => __perch(-9000));
await pg.waitForTimeout(300);
await run('plats.length=0; ball.grounded=false; ball.on=null; ball.vy=26;');
await pg.waitForTimeout(2400);
d = await dbg();
ok('kamera geride kalınca düşme ölümü', d.state === 'dead', `state=${d.state}`);
ok('ölüm sebebi doğru yazılıyor', /düş/i.test(await pg.textContent('#overTitle')));
const overVisible = await pg.evaluate(() => !document.getElementById('over').classList.contains('hide'));
await pg.setViewportSize({ width: 400, height: 730 });
await pg.waitForTimeout(400);
ok('panel açıkken oyun arkada yeniden başlamıyor',
   overVisible && (await dbg()).state === 'dead' &&
   (await pg.evaluate(() => !document.getElementById('over').classList.contains('hide'))));

const best = (await dbg()).best;
ok('rekor kaydediliyor', best > 0, `rekor=${best}`);
await pg.reload();
await pg.waitForTimeout(600);
ok('rekor yenilemeden sonra duruyor', (await dbg()).best === best);
ok('menüde rekor gösteriliyor', /Rekor/.test(await pg.textContent('#menuStats')));

group('duraklatma');
await pg.click('#btnStart');
await pg.waitForTimeout(250);
await pg.click('#btnPause');
await pg.waitForTimeout(200);
ok('duraklat düğmesi', (await dbg()).state === 'paused');
await pg.click('#btnResume');
await pg.waitForTimeout(2200);
ok('geri sayımdan sonra devam ediyor', (await dbg()).state === 'play');
await pg.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await pg.waitForTimeout(200);
ok('sekme gizlenince kendiliğinden duruyor', (await dbg()).state === 'paused');

group('performans');
await pg.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});
await pg.click('#btnResume');
await pg.waitForTimeout(2200);
await pg.evaluate(() => __perch(-30000));
await pg.waitForTimeout(600);
const fps = await pg.evaluate(() => new Promise(res => {
  let n = 0; const t0 = performance.now();
  (function f() {
    n++;
    performance.now() - t0 < 2000 ? requestAnimationFrame(f)
                                  : res(+(n / ((performance.now() - t0) / 1000)).toFixed(1));
  })();
}));
ok('kare hızı 50 fps üzerinde', fps > 50, `${fps} fps`);

ok('konsolda hata yok', errs.length === 0, errs.join(' | ') || 'yok');

await browser.close();
unlinkSync(probe);
console.log(`\n${pass} geçti, ${fail} kaldı\n`);
process.exit(fail ? 1 : 0);
