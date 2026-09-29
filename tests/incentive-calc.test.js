// ทดสอบตัวคิด incentive (ประกาศ 9/2569) — ดึงโค้ดช่วง INC-CALC-START/END จาก index.html มารันจริง
// รัน: node tests/incentive-calc.test.js
const fs=require('fs'), path=require('path'), assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=html.match(/\/\* INC-CALC-START[^\n]*\*\/([\s\S]*?)\/\* INC-CALC-END \*\//);
assert(m,'ไม่พบช่วง INC-CALC ใน index.html');
const {incCalc,INC_TIERS,INC_RULE}=new Function(m[1]+';return {incCalc,INC_TIERS,INC_RULE};')();
let n=0; const t=(name,fn)=>{ fn(); n++; console.log('✓',name); };
const OK={leave:0,workDays:20,workAns:50*20,workTalk:100*60*20};   // ผ่านทั้ง 3 เกณฑ์พอดี
const BAD={leave:3,workDays:20,workAns:49*20,workTalk:99*60*20};

t('ขอบขั้นยอดขายสุทธิ',()=>{
  const cases=[[0,0],[149999,0],[150000,1],[199999,1],[200000,2],[249999,2],[250000,3],[299999,3],[300000,4],[349999,4],[350000,5],[399999,5],[400000,6],[2000000,6]];
  for(const [net,tier] of cases) assert.strictEqual(incCalc({...OK,sales:net}).tier,tier,`net ${net} → ขั้น ${tier}`);
});
t('ยอดสูงสุดต่อขั้น (ผ่านครบ) ตรงประกาศ',()=>{
  const want={1:900,2:2000,3:2500,4:3000,5:3500,6:4000}, base={1:150000,2:200000,3:250000,4:300000,5:350000,6:400000};
  for(const k in want) assert.strictEqual(incCalc({...OK,sales:base[k]}).amt,want[k],'ขั้น '+k);
});
t('ไม่ผ่านเลย → ได้แค่หมวดยอดขาย (ขั้น 1 = 0)',()=>{
  assert.strictEqual(incCalc({...BAD,sales:150000}).amt,0);
  assert.strictEqual(incCalc({...BAD,sales:260000}).amt,1000);
  assert.strictEqual(incCalc({...BAD,sales:450000}).amt,2500);
});
t('ต่ำกว่า 150,000 → 0 แม้ผ่านเกณฑ์ครบ',()=>{ const r=incCalc({...OK,sales:149999}); assert.strictEqual(r.amt,0); assert.deepStrictEqual(r.pay,{sales:0,ontime:0,ans:0,talk:0}); });
t('แต่ละหมวดได้แยกกันตามที่ผ่าน',()=>{
  const r=incCalc({sales:320000,leave:5,workDays:20,workAns:60*20,workTalk:80*60*20});   // ลาเกิน · รับสายผ่าน · talktime ไม่ผ่าน
  assert.deepStrictEqual(r.pay,{sales:1500,ontime:0,ans:500,talk:0}); assert.strictEqual(r.amt,2000);
});
t('วันลา: 2 ผ่าน · 2.5 ไม่ผ่าน · ไม่กรอก(undefined)=0 ผ่าน',()=>{
  assert.strictEqual(incCalc({...OK,sales:200000,leave:2}).passOn,true);
  assert.strictEqual(incCalc({...OK,sales:200000,leave:2.5}).passOn,false);
  assert.strictEqual(incCalc({...OK,sales:200000,leave:undefined}).passOn,true);
});
t('รับสาย/talktime เทียบค่าจริงไม่ปัด: 49.95 ไม่ผ่าน · 50 ผ่าน · 99:59 ไม่ผ่าน',()=>{
  assert.strictEqual(incCalc({sales:200000,workDays:20,workAns:999,workTalk:0}).passAns,false);   // 49.95
  assert.strictEqual(incCalc({sales:200000,workDays:20,workAns:1000,workTalk:0}).passAns,true);
  assert.strictEqual(incCalc({sales:200000,workDays:1,workAns:0,workTalk:5999}).passTalk,false);
  assert.strictEqual(incCalc({sales:200000,workDays:1,workAns:0,workTalk:6000}).passTalk,true);
});
t('ไม่มีวันทำงาน → รับสาย/talktime ไม่ผ่าน (ไม่หารศูนย์)',()=>{ const r=incCalc({sales:300000,workDays:0,workAns:0,workTalk:0}); assert.strictEqual(r.passAns,false); assert.strictEqual(r.passTalk,false); assert(Number.isFinite(r.ansPD)); });
t('ยอดสุทธิ = ยอด + อัพ − ตีกลับ · ติดลบ = 0 · ค่าสตริง/null ไม่พัง',()=>{
  assert.strictEqual(incCalc({sales:180000,upsell:30000,returns:15000}).net,195000);
  assert.strictEqual(incCalc({sales:180000,upsell:30000,returns:15000}).tier,1);   // ตีกลับดันลงขั้น
  assert.strictEqual(incCalc({sales:1000,returns:5000}).net,0);
  assert.strictEqual(incCalc({sales:'250000',upsell:null,returns:undefined}).tier,3);
});
t('ตาราง INC_TIERS เรียงสูง→ต่ำ และ min ไม่ซ้ำ',()=>{ for(let i=1;i<INC_TIERS.length;i++) assert(INC_TIERS[i-1].min>INC_TIERS[i].min); assert.deepStrictEqual(INC_RULE,{maxLeave:2,minAnsPerDay:50,minTalkMinPerDay:100}); });
console.log(`\nผ่านทั้งหมด ${n} ชุด`);
