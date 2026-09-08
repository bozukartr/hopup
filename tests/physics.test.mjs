// Deterministic, dependency-free checks for core physics. Browser suite covers input/layout.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const elements=new Map();
const noop=()=>{};
const paint=new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
function element(){return {style:{setProperty:noop},dataset:{},classList:{add:noop,remove:noop,toggle:noop},children:[],setAttribute:noop,addEventListener:noop,getContext:()=>paint,appendChild(e){this.children.push(e);},remove:noop};}
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},documentElement:element(),querySelector:()=>element(),createElement:element,addEventListener:noop};
const world={document,innerWidth:390,innerHeight:844,devicePixelRatio:2,matchMedia:()=>({matches:false}),addEventListener:noop,requestAnimationFrame:noop,setTimeout:noop,clearTimeout:noop,navigator:{},localStorage:{getItem:()=>null,setItem:noop},performance,console};
world.window=world;
vm.createContext(world);
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'window.run=s=>eval(s);})();'),world);
let count=0;
function check(name,code){assert.equal(world.run(code),true,name);console.log('✓ '+name);count++;}
check('Practice freezes clock and preserves records',`(()=>{startRun('practice');const t=timeLeft;for(let i=0;i<3600;i++)step();return timeLeft===t&&save.runs===0&&state==='play';})()`);
check('Cancelled aim does not shoot',`(()=>{startRun();aimId=2;startAim(200,400);aim.y=500;cancelAim({pointerId:2});return aim===null&&shots===0&&phase==='aim';})()`);
check('Other pointer cannot cancel aim',`(()=>{startRun();aimId=2;startAim(200,400);cancelAim({pointerId:3});return aim!==null;})()`);
check('Shot counts once',`(()=>{startRun();aimId=2;startAim(200,400);aim.y=500;release({pointerId:2});return phase==='fly'&&shots===1;})()`);
check('Separating rim contact keeps velocity',`(()=>{startRun();ball.x=200;ball.y=300;ball.vx=5;ball.vy=3;circleHit(182,300,5,.62);return ball.vx===5&&ball.vy===3;})()`);
check('Rim bounce preserves tangent',`(()=>{ball.x=200;ball.y=300;ball.vx=-5;ball.vy=3;circleHit(182,300,5,.62);return Math.abs(ball.vx-3.1)<.001&&ball.vy===3;})()`);
check('Backboard returns approaching ball',`(()=>{ball.x=185;ball.y=320;ball.vx=10;ball.vy=3;rectHit(195,300,10,92,.58);return ball.vx<0&&ball.vy===3;})()`);
check('Preview is side-effect free',`(()=>{startRun();startAim(200,400);aim.y=510;const a=JSON.stringify({ball,bars,seed,parts});drawAim(ball.x,ball.y);return a===JSON.stringify({ball,bars,seed,parts});})()`);
check('Buzzer shot can save run',`(()=>{startRun();hoop.amp=0;ball.x=(tipX()+innerX())/2;ball.y=hoopY()-30;ball.vx=0;ball.vy=3;phase='fly';timeLeft=.001;for(let i=0;i<15&&!scored;i++)step();return scored&&state==='play'&&timeLeft>0;})()`);
check('Expired idle run ends',`(()=>{startRun();timeLeft=.001;step();return state==='over-anim';})()`);
check('Run reset clears stats',`(()=>{shots=20;swishes=15;startRun();return shots===0&&swishes===0&&score===0;})()`);
check('All six courts offer a feasible shot',`(()=>{startRun();for(let i=0;i<6;i++){ci=i;for(let j=0;j<8;j++){newShot();probeUntil=performance.now()+500;if(!shotFeasible())return false;}}return true;})()`);
console.log(count+' physics checks passed');
