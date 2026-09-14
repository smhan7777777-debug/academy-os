/* 원장실 Academy OS v3 — 결재함 엔진 (샘플 규칙, 외부 AI·발송·결제 미연결) */
(function(){
'use strict';
const TODAY='2026-09-14';
const KEY='wonjangsil-v3';
const won=n=>new Intl.NumberFormat('ko-KR').format(n)+'원';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

/* ---------- AI 직원 명부 ---------- */
const STAFF=[
 {id:'chief',   name:'교무 실장',     ch:'실', killer:true,  core:true, does:'매일 아침 장부와 기록을 읽고 오늘 결재할 서류를 순서대로 정리합니다.', when:'매일 아침 8:30', needs:'없음 (정리만 함)', src:'출결·수납·수업 기록'},
 {id:'report',  name:'리포트 담당',   ch:'보', killer:true,  core:true, does:'강사가 체크한 수업 기록만 근거로 학부모 리포트 초안을 씁니다. 근거 없는 문장은 쓰지 않습니다.', when:'수업 기록 저장 직후', needs:'원장 확인 (아침 결재함)', src:'수업 기록·숙제·시험'},
 {id:'timetable',name:'시간표 담당',  ch:'표', killer:true,  core:true, does:'시간표가 바뀌면 영향받는 학생·강사·교실 충돌을 검사하고 새 시간표 안내를 준비합니다.', when:'시간표 변경 시', needs:'원장 확인 후 배포', src:'시간표·학생 개인 일정'},
 {id:'wrong',   name:'오답 담당',     ch:'오', killer:true,  core:true, does:'조교가 체크한 오답을 단원별로 모아 학생마다 취약 단원과 맞춤 문제 세트를 준비합니다.', when:'시험 채점 후', needs:'강사 검수 → 원장 확인', src:'오답 체크표·문제 은행(사용 허가분)'},
 {id:'care',    name:'관심학생 담당', ch:'관', killer:true,  core:true, does:'결석·숙제·학부모 문의·성적 신호를 공개된 점수 기준으로 합산해 원장이 볼 학생을 표시합니다. 확률을 말하지 않습니다.', when:'매일 아침', needs:'즉시 확인 (상담 연결)', src:'출결·숙제·문의·성적'},
 {id:'career',  name:'진로상담 담당', ch:'진', killer:true,  core:true, does:'학생이 직접 말한 관심·활동·희망만으로 다음 탐색 단계와 상담 질문을 정리한 리포트를 씁니다.', when:'상담 예약 전날', needs:'담당 강사 확인 → 원장 확인', src:'학생 자기 기록·상담 메모'},
 {id:'billing', name:'수납 담당',     ch:'수', killer:false, core:true, does:'청구·납부·잔액을 맞추고, 납부가 확인되면 이전 미납 안내를 자동으로 멈춥니다.', when:'납부 확인 시·매월 1일', needs:'금액 안내는 즉시 확인', src:'청구서·입금 기록'},
 {id:'lesson',  name:'수업기록 담당', ch:'기', killer:false, core:true, does:'강사의 체크 입력을 학생별 기록으로 정리합니다. 체크하지 않은 학생은 "미관찰"로 남깁니다.', when:'수업 직후', needs:'없음 (내부 기록)', src:'강사 체크 입력'},
 {id:'consult', name:'상담·등록 담당',ch:'상', killer:false, core:true, does:'문의 → 상담 예약 → 등록 → 첫 청구서까지 중복 없이 연결합니다.', when:'문의 접수 시', needs:'등록 확정만 원장 확인', src:'문의·상담 메모'},
 {id:'attend',  name:'출결 담당',     ch:'출', killer:false, core:true, does:'미기록을 결석으로 단정하지 않고 "확인할 학생"으로 표시합니다. 원장이 켠 경우에만 정형 결석 안내를 보냅니다.', when:'수업 시작 15분 후', needs:'정책에 따라 자동/확인', src:'출결 기기·강사 체크'},
 {id:'makeup',  name:'보강 담당',     ch:'보', killer:false, core:false, does:'결석 학생의 보강 시간을 강사·교실 충돌 없이 제안합니다.', when:'결석 확인 시', needs:'강사 확인', src:'시간표·출결'},
 {id:'reenroll',name:'재등록 담당',   ch:'재', killer:false, core:false, does:'수강 종료 30일 전, 학습 변화 기록을 붙여 재등록 상담 서류를 준비합니다.', when:'종료 30일 전', needs:'원장 확인', src:'수강 기간·리포트'},
 {id:'inquiry', name:'문의 답변 담당',ch:'문', killer:false, core:false, does:'학원이 정한 FAQ 범위 안에서만 답장 초안을 씁니다. 범위 밖은 담당자에게 넘깁니다.', when:'문의 도착 시', needs:'없음 (범위 안)', src:'확정 FAQ'},
 {id:'news',    name:'학원 소식 담당',ch:'소', killer:false, core:false, does:'허가된 사진과 한 줄 메모로 학원 소식·팝업·SNS 글을 만듭니다.', when:'요청 시', needs:'원장 확인 (공개 게시)', src:'허가 자료'},
 {id:'admin',   name:'행정 서류 담당',ch:'행', killer:false, core:false, does:'교육청 신고·수강료 게시·환불 계산표 등 기한이 있는 서류를 체크리스트로 준비합니다.', when:'기한 14일 전', needs:'원장 확인', src:'관할 규정·기한'},
];

/* ---------- 초기 데이터 ---------- */
function seed(){
 const S=[
  {id:'S1', name:'이서준', cls:'A', grade:'중2', guardian:'이서준 어머니', consent:true},
  {id:'S2', name:'김지우', cls:'A', grade:'중2', guardian:'김지우 아버지', consent:true},
  {id:'S3', name:'박하린', cls:'A', grade:'중2', guardian:'박하린 어머니', consent:true},
  {id:'S4', name:'최도윤', cls:'A', grade:'중2', guardian:'최도윤 어머니', consent:true},
  {id:'S5', name:'정서연', cls:'A', grade:'중2', guardian:'정서연 어머니', consent:false},
  {id:'S6', name:'한유진', cls:'B', grade:'초6', guardian:'한유진 어머니', consent:true},
  {id:'S7', name:'윤지호', cls:'B', grade:'초6', guardian:'윤지호 아버지', consent:true},
  {id:'S8', name:'오민서', cls:'B', grade:'초6', guardian:'오민서 어머니', consent:true},
  {id:'S9', name:'강시우', cls:'C', grade:'중3', guardian:'강시우 어머니', consent:true},
  {id:'S10',name:'임수아', cls:'C', grade:'중3', guardian:'임수아 어머니', consent:true},
 ].map(s=>Object.assign(s,{version:1,records:[],personal:[]}));
 const byId=Object.fromEntries(S.map(s=>[s.id,s]));
 byId.S3.personal=[{day:'화',start:16,end:17,what:'피아노 레슨'}];
 byId.S1.personal=[{day:'금',start:17,end:18,what:'축구 클럽'}];
 byId.S9.personal=[{day:'수',start:17,end:18,what:'영어 회화'}];
 // 최근 2주 신호
 const sig={
  S7:{absent:2,hwMiss:2,inquiry:1,drop:0,payLate:0},
  S3:{absent:0,hwMiss:1,inquiry:0,drop:12,payLate:1},
  S10:{absent:1,hwMiss:0,inquiry:0,drop:0,payLate:0},
 };
 S.forEach(s=>s.signals=sig[s.id]||{absent:0,hwMiss:0,inquiry:0,drop:0,payLate:0});
 const CL={
  A:{id:'A',name:'중2 수학 A',teacher:'김민정',room:'1강의실',days:['월','수'],start:16,end:17.5,members:['S1','S2','S3','S4','S5']},
  B:{id:'B',name:'초6 수학 B',teacher:'김민정',room:'2강의실',days:['화','목'],start:15,end:16.5,members:['S6','S7','S8']},
  C:{id:'C',name:'중3 영어 C',teacher:'박준호',room:'1강의실',days:['월','수'],start:18,end:19.5,members:['S9','S10']},
 };
 const exam={id:'EX1',cls:'A',name:'이차함수 단원평가 (9/10)',units:['평행이동','꼭짓점·축','최댓값·최솟값','그래프 개형','판별식','식 세우기'],
  items:[1,2,3,4,5,6,7,8,9,10].map(n=>({n,unit:['평행이동','평행이동','꼭짓점·축','꼭짓점·축','최댓값·최솟값','그래프 개형','그래프 개형','판별식','판별식','식 세우기'][n-1]})),
  wrong:{S1:[1,2,9],S2:[6],S3:[1,3,4,5,9,10],S4:[8],S5:[2,5,6,7]}};
 const invoices=S.map((s,i)=>({id:'INV'+(i+1),studentId:s.id,label:'9월 수강료',amount:320000,paid:(s.id==='S3'||s.id==='S7')?0:(s.id==='S9'?200000:320000),due:'2026-09-10',version:1}));
 const st={
  rev:0,students:S,classes:CL,exams:[exam],invoices,docs:[],log:[],
  hired:Object.fromEntries(STAFF.map(x=>[x.id,x.core])),
  policy:{autoAttendance:false,weights:{absent:3,hwMiss:2,inquiry:2,drop:2,payLate:1},threshold:5},
  lessonSaved:{},
  career:{S9:{interests:['게임 만들기','영상 편집'],acts:['학교 코딩 동아리 6개월','유튜브 편집 영상 3편'],hopes:['컴퓨터 관련 고등학교','대학은 아직 모름']}},
  leads:[{id:'L1',name:'조은채',source:'네이버 검색',stage:'consulted',cls:'B',slot:'2026-09-15 16:00'},{id:'L2',name:'서지안',source:'학부모 소개',stage:'new',cls:'A',slot:null}],
 };
 return st;
}

let S=load()||seed();
function load(){try{const j=localStorage.getItem(KEY);return j?JSON.parse(j):null}catch(e){return null}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function log(action,detail,actor='원장'){S.rev++;S.log.unshift({at:new Date().toISOString(),action,detail,actor});}
const stu=id=>S.students.find(s=>s.id===id);
const cls=id=>S.classes[id];
const money=inv=>inv.amount-inv.paid;

/* ---------- 관심 학생 점수 (기준 공개) ---------- */
function careScore(s){
 const w=S.policy.weights,g=s.signals;const parts=[];
 if(g.absent>=2)parts.push({k:`최근 2주 결석 ${g.absent}회`,p:w.absent});
 if(g.hwMiss>=2)parts.push({k:`숙제 미제출 연속 ${g.hwMiss}회`,p:w.hwMiss});
 if(g.inquiry>=1)parts.push({k:`학부모 문의·불만 ${g.inquiry}건`,p:w.inquiry});
 if(g.drop>=10)parts.push({k:`직전 시험 대비 ${g.drop}점 하락`,p:w.drop});
 if(g.payLate>=1)parts.push({k:'수강료 납부 지연',p:w.payLate});
 return {total:parts.reduce((a,x)=>a+x.p,0),parts};
}
function careList(){return S.students.map(s=>({s,...careScore(s)})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);}

/* ---------- 확인이 필요한 학생 (목록 정렬·필터 공용) ---------- */
const isOverdue=inv=>money(inv)>0&&inv.due<TODAY;
function attention(s){
 const inv=S.invoices.find(i=>i.studentId===s.id);const c=careScore(s);const r=[];
 if(c.total>=S.policy.threshold)r.push({k:'care',t:`살펴볼 학생 ${c.total}점`,w:4,cls:'r'});
 if(inv&&isOverdue(inv))r.push({k:'overdue',t:`미납 ${won(money(inv))}`,w:3,cls:'r'});
 if(!s.consent)r.push({k:'consent',t:'AI 동의 미확인',w:2,cls:'a'});
 if(c.total>0&&c.total<S.policy.threshold)r.push({k:'signal',t:`신호 ${c.total}점`,w:1,cls:'a'});
 return {reasons:r,weight:r.reduce((a,x)=>a+x.w,0),care:c,inv};
}
const GRADES=()=>[...new Set(S.students.map(s=>s.grade))];
const stuF={grade:'',cls:'',only:false};
const billF={grade:'',cls:'',only:false,group:false};
function passF(s,f){return (!f.grade||s.grade===f.grade)&&(!f.cls||s.cls===f.cls);}
function filterBar(pfx,f,extra){
 return `<div class="filters"><label>학년 <select data-f="${pfx}:grade"><option value="">전체</option>${GRADES().map(g=>`<option ${f.grade===g?'selected':''}>${g}</option>`).join('')}</select></label>
 <label>반 <select data-f="${pfx}:cls"><option value="">전체</option>${Object.values(S.classes).map(c=>`<option value="${c.id}" ${f.cls===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label>${extra||''}</div>`;
}

/* ---------- 결재 서류 ---------- */
const TIER={now:'지금 확인',morning:'아침 결재함',auto:'자동 처리'};
function addDoc(d){
 const dup=S.docs.find(x=>x.key===d.key&&!['sent','cancelled','stale'].includes(x.status));
 if(dup)return dup;
 const doc=Object.assign({id:'D'+(S.docs.length+1),status:d.tier==='auto'?'auto':'review',version:1,createdAt:TODAY,history:[]},d);
 S.docs.push(doc);log('서류 준비',doc.title,doc.by);return doc;
}
const docsOpen=()=>S.docs.filter(d=>['review','held'].includes(d.status));
const FACT_RE=/[0-9][0-9,]*|[가-힣]{2,4}(?= 학생| 어머니| 아버지)|\d{1,2}월 \d{1,2}일/g;
function facts(t){return (t.match(FACT_RE)||[]).sort().join('|');}

function approve(id){
 const d=S.docs.find(x=>x.id===id);if(!d||d.status==='sent')return;
 const blocked=guard(d);if(blocked){d.status='stale';d.reason=blocked;log('결재 중지',d.title+' — '+blocked);save();render();toast(blocked,true);return;}
 d.status='sent';d.approvedAt=new Date().toISOString();d.history.push({at:d.approvedAt,what:'원장 결재 → 모의 전송 완료 (v'+d.version+')'});
 log('결재·전송',d.title);save();render();toast('결재했습니다. '+(d.recipient?d.recipient+'에게 모의 전송 완료':'처리 완료'));
 const card=$('[data-doc="'+id+'"]');if(card){const st=card.querySelector('.stamp');if(st)st.classList.add('pop');}
}
function hold(id){const d=S.docs.find(x=>x.id===id);if(!d)return;d.status='held';d.history.push({at:new Date().toISOString(),what:'보류 → 내일 아침 결재함'});log('보류',d.title);save();render();toast('내일 아침 결재함으로 옮겼습니다.');}
function editDoc(id,body){
 const d=S.docs.find(x=>x.id===id);const clean=body.trim();if(!clean){toast('내용을 입력해 주세요.',true);return}
 if(clean===d.body)return;
 const minor=facts(clean)===facts(d.body);
 d.body=clean;d.version++;
 if(d.status==='sent'){ /* 이미 결재된 서류 수정: 사소한 수정은 재결재 없음 */
   if(minor){d.history.push({at:new Date().toISOString(),what:'문장만 다듬음 (사실 변경 없음) → 재결재 없이 유지, 아침 알림'});log('사소한 수정',d.title+' v'+d.version);toast('문장만 바뀌어 재결재 없이 유지됩니다. 아침 브리핑에 알려드립니다.');}
   else{d.status='review';d.history.push({at:new Date().toISOString(),what:'이름·숫자·날짜가 바뀜 → 새 결재 필요'});log('수정 후 재결재 필요',d.title+' v'+d.version);toast('이름·숫자·날짜가 바뀌어 다시 결재해야 합니다.',true);}
 }else{d.history.push({at:new Date().toISOString(),what:'원장이 고침 (v'+d.version+')'});log('서류 수정',d.title+' v'+d.version);toast('고쳤습니다.');}
 save();render();
}
function guard(d){
 if(d.studentId){const s=stu(d.studentId);
  if(d.kind==='report'&&!s.consent)return 'AI 활용 동의가 없어 리포트를 보낼 수 없습니다.';
  if(d.kind==='report'&&d.sourceVersion!==s.version)return '수업 기록이 바뀌어 새 초안이 필요합니다.';
  if(d.kind==='billing'){const inv=S.invoices.find(i=>i.id===d.invoiceId);if(money(inv)<=0)return '납부가 확인되어 안내를 멈췄습니다.';if(inv.version!==d.invoiceVersion)return '청구 금액이 바뀌어 새 초안이 필요합니다.';}
 }
 return null;
}
function invalidate(kind,pred,reason){S.docs.forEach(d=>{if(d.kind===kind&&pred(d)&&['review','held'].includes(d.status)){d.status='stale';d.reason=reason;}});}

/* ---------- 서류 생성기 (각 AI 직원) ---------- */
function prepareReport(sid,rec){
 const s=stu(sid);const c=cls(s.cls);
 const ev=[{l:'출결',v:rec.att},{l:'숙제',v:rec.hw},{l:'이해도',v:rec.level}];
 if(rec.tags.length)ev.push({l:'수업 중 관찰',v:rec.tags.join(', ')});
 if(rec.memo)ev.push({l:'선생님 한 줄 메모',v:rec.memo});
 const ex=S.exams.find(e=>e.cls===s.cls);let weak='';
 if(ex&&ex.wrong[sid]){const w=weakUnits(ex,sid);if(w.length){weak=`\n지난 단원평가에서는 ${w.map(x=>x.unit).join(', ')} 부분을 더 연습하면 좋겠습니다.`;ev.push({l:'단원평가 오답',v:w.map(x=>`${x.unit} ${x.wrong}/${x.total}`).join(', ')});}}
 const lvl={'잘 이해':'오늘 내용을 잘 이해했습니다.','보통':'오늘 내용은 대체로 따라왔고, 몇 군데는 다시 확인이 필요합니다.','다시 설명 필요':'오늘 내용 중 일부는 다음 수업에서 다시 설명할 예정입니다.'}[rec.level];
 const hw={'제출':'숙제는 제출을 확인했습니다.','일부':'숙제는 일부만 제출했습니다.','미제출':'숙제는 아직 제출이 확인되지 않았습니다.'}[rec.hw];
 const body=`${s.guardian}께, ${s.name} 학생의 오늘(9월 14일) ${c.name} 수업 안내입니다.\n\n${lvl}${rec.tags.length?' 수업 중에는 '+rec.tags.map(t=>TAGTXT[t]||t).join(', ')+' 모습이 있었습니다.':''}\n${hw}${rec.memo?'\n선생님 메모: '+rec.memo:''}${weak}\n\n가정에서는 오늘 푼 문제 하나를 아이가 말로 설명해 보게 해 주세요. 한 문장이면 충분합니다.\n\nAI가 초안을 돕고 담당 선생님과 원장이 확인한 안내입니다.`;
 return addDoc({key:'report:'+sid+':v'+s.version,kind:'report',tier:'morning',by:'리포트 담당',ic:'보',title:`${s.name} 학습 리포트`,sum:`${c.name} · 근거 ${ev.length}건 · ${s.guardian}에게`,body,evidence:ev,studentId:sid,sourceVersion:s.version,recipient:s.guardian});
}
const TAGTXT={'질문 많음':'질문을 많이 하는','집중 잘함':'끝까지 집중하는','집중 흐트러짐':'중간에 집중이 흐트러지는','개념 혼동':'개념을 헷갈려 다시 짚어 본','풀이 설명 잘함':'풀이를 말로 잘 설명하는','칭찬':'칭찬할 만한'};

function weakUnits(ex,sid){
 const wrong=new Set(ex.wrong[sid]||[]);const m={};
 ex.items.forEach(it=>{m[it.unit]=m[it.unit]||{unit:it.unit,total:0,wrong:0};m[it.unit].total++;if(wrong.has(it.n))m[it.unit].wrong++;});
 return Object.values(m).filter(x=>x.wrong>0&&x.wrong/x.total>=0.5).sort((a,b)=>b.wrong/b.total-a.wrong/a.total);
}
function prepareProblemSet(ex,sid){
 const s=stu(sid);const w=weakUnits(ex,sid);if(!w.length)return null;
 const ev=w.map(x=>({l:x.unit,v:`${x.wrong}문항 중 ${x.wrong}/${x.total} 오답 · 문항 ${ex.items.filter(i=>i.unit===x.unit&&ex.wrong[sid].includes(i.n)).map(i=>i.n+'번').join(', ')}`}));
 const body=`${s.name} 학생 맞춤 문제 세트 (초안)\n근거 시험: ${ex.name}\n\n`+w.map((x,i)=>`${i+1}. ${x.unit} — 유사 문항 ${x.wrong*2}개 (기본 ${x.wrong}, 응용 ${x.wrong})`).join('\n')+`\n\n출처: 학원 문제 은행(사용 허가분)만 사용합니다. 정답·해설은 담당 선생님 검수 후 학생 화면에 열립니다.`;
 return addDoc({key:'pset:'+sid+':'+ex.id+':'+(ex.wrong[sid]||[]).join(','),kind:'pset',tier:'morning',by:'오답 담당',ic:'오',title:`${s.name} 맞춤 문제 세트`,sum:`취약 단원 ${w.map(x=>x.unit).join(', ')} · 강사 검수 필요`,body,evidence:ev,studentId:sid,recipient:null,reviewer:cls(s.cls).teacher+' 선생님'});
}
function prepareBilling(inv){
 const s=stu(inv.studentId);const bal=money(inv);if(bal<=0)return null;
 const body=`${s.guardian}께, ${s.name} 학생의 ${inv.label} 중 ${won(bal)}이 아직 확인되지 않았습니다.\n납부 기한은 9월 10일이었습니다. 이미 납부하셨다면 학원으로 알려 주세요. 바로 확인해 드리겠습니다.\n\n수학의숲 판교학원 드림`;
 return addDoc({key:'bill:'+inv.id+':v'+inv.version,kind:'billing',tier:'now',by:'수납 담당',ic:'수',ico:'a',title:`${s.name} 수강료 안내`,sum:`잔액 ${won(bal)} · 기한 9월 10일 경과 · 금액이 들어가 즉시 확인`,body,evidence:[{l:'청구',v:won(inv.amount)},{l:'납부 확인',v:won(inv.paid)},{l:'잔액',v:won(bal)}],studentId:s.id,invoiceId:inv.id,invoiceVersion:inv.version,recipient:s.guardian});
}
function prepareCare(){
 careList().filter(x=>x.total>=S.policy.threshold).forEach(x=>{
  const s=x.s;const body=`${s.name} 학생(${cls(s.cls).name})을 이번 주에 한 번 살펴봐 주세요.\n\n확인된 신호:\n`+x.parts.map(p=>`· ${p.k} (+${p.p}점)`).join('\n')+`\n\n합계 ${x.total}점 (기준 ${S.policy.threshold}점 이상이면 표시)\n\n이유를 추측하지 않습니다. 담당 ${cls(s.cls).teacher} 선생님과 짧게 이야기한 뒤, 필요하면 보호자 상담을 잡는 것을 제안합니다.\n제안 상담 시간: 9월 16일(수) 15:00 (강사·교실 비어 있음)`;
  addDoc({key:'care:'+s.id+':'+x.total,kind:'care',tier:'now',by:'관심학생 담당',ic:'관',ico:'r',title:`${s.name} 학생 살펴보기`,sum:`신호 ${x.parts.length}개 · 합계 ${x.total}점 · 상담 제안 포함`,body,evidence:x.parts.map(p=>({l:p.k,v:'+'+p.p+'점'})),studentId:s.id,recipient:null});
 });
}
function prepareCareer(sid){
 const s=stu(sid);const c=S.career[sid];if(!c)return null;
 const body=`${s.name} 학생 진로 탐색 리포트 (초안)\n\n학생이 직접 말한 관심: ${c.interests.join(', ')}\n실제로 해 본 활동: ${c.acts.join(' / ')}\n학생이 적어 낸 희망: ${c.hopes.join(', ')}\n\n다음 탐색 단계 (제안)\n1. 코딩 동아리에서 만든 결과물 하나를 학원에서 5분 발표해 보기\n2. 컴퓨터 관련 고등학교 두 곳의 입학 요건을 학생이 직접 찾아와서 정리하기\n3. 4주 뒤 같은 질문으로 관심이 유지되는지 다시 묻기\n\n상담에서 물어볼 질문\n· 영상 편집과 게임 만들기 중 시간을 더 많이 쓰는 쪽은?\n· 그 활동을 할 때 어떤 부분이 가장 재미있었는지?\n\n학생이 말하지 않은 적성·성적 판단은 넣지 않았습니다. 담당 선생님이 확인한 뒤 보호자와 공유합니다.`;
 return addDoc({key:'career:'+sid,kind:'career',tier:'morning',by:'진로상담 담당',ic:'진',ico:'b',title:`${s.name} 진로상담 리포트`,sum:'학생이 말한 관심 2개·활동 2개·희망 2개 근거 · 9월 17일 상담 전',body,evidence:[{l:'관심',v:c.interests.join(', ')},{l:'활동',v:c.acts.join(', ')},{l:'희망',v:c.hopes.join(', ')}],studentId:sid,recipient:s.guardian,reviewer:cls(s.cls).teacher+' 선생님'});
}
function prepareTimetable(change){
 const c=cls(change.cls);const conflicts=[];const affected=c.members.map(stu);
 // 강사·교실 충돌
 Object.values(S.classes).forEach(o=>{if(o.id===c.id)return;const overlap=o.days.includes(change.day)&&o.start<change.start+c.end-c.start&&change.start<o.end;
  if(overlap&&o.teacher===c.teacher)conflicts.push(`${c.teacher} 선생님이 같은 시간 ${o.name} 수업`);
  if(overlap&&o.room===c.room)conflicts.push(`${c.room}이 같은 시간 ${o.name}에 사용 중`);});
 const personal=[];affected.forEach(s=>s.personal.forEach(p=>{if(p.day===change.day&&p.start<change.start+c.end-c.start&&change.start<p.end)personal.push(`${s.name} — ${p.day} ${p.what} (${p.start}:00)`);}));
 return {c,affected,conflicts,personal};
}
function commitTimetable(change){
 const r=prepareTimetable(change);const c=r.c;
 const old=`${c.days.join('·')} ${fmt(c.start)}~${fmt(c.end)}`;
 const dur=c.end-c.start;c.days=[change.day,...c.days.filter(d=>d!==change.replace&&d!==change.day)].slice(0,c.days.length);c.start=change.start;c.end=change.start+dur;
 const nu=`${c.days.join('·')} ${fmt(c.start)}~${fmt(c.end)}`;
 log('시간표 변경',`${c.name}: ${old} → ${nu}`);
 const body=`${c.name} 시간표 변경 안내\n\n변경 전: ${old}\n변경 후: ${nu}\n적용: 9월 21일(월)부터\n\n대상 학생 ${r.affected.length}명: ${r.affected.map(s=>s.name).join(', ')}\n담당: ${c.teacher} 선생님 · ${c.room}\n\n${r.personal.length?'개인 일정이 겹치는 학생 '+r.personal.length+'명은 먼저 개별 연락합니다: '+r.personal.join(', ')+'\n\n':''}보호자께는 새 시간표 이미지와 함께 안내합니다. 종이 시간표는 더 출력하지 않습니다.`;
 addDoc({key:'tt:'+c.id+':'+nu,kind:'timetable',tier:'morning',by:'시간표 담당',ic:'표',ico:'b',title:`${c.name} 새 시간표 배포`,sum:`${old} → ${nu} · 학생 ${r.affected.length}명 · 강사 1명 ${r.personal.length?'· 개인 일정 겹침 '+r.personal.length+'명':'· 충돌 없음'}`,body,evidence:[{l:'변경 전',v:old},{l:'변경 후',v:nu},{l:'대상',v:r.affected.map(s=>s.name).join(', ')},...r.personal.map(p=>({l:'개인 일정 겹침',v:p}))],recipient:`${c.name} 보호자 ${r.affected.length}명`});
 save();render();toast('시간표를 바꾸고 배포 서류를 준비했습니다. 아침 결재함에서 확인하세요.');
}
const fmt=h=>{const m=Math.round((h%1)*60);return `${Math.floor(h)}:${m?String(m).padStart(2,'0'):'00'}`;};

/* ---------- 아침 준비 (교무 실장) ---------- */
function morningPrep(){
 if(S.morningDone)return;
 S.invoices.forEach(inv=>{if(money(inv)>0&&inv.due<TODAY)prepareBilling(inv);});
 prepareCare();prepareCareer('S9');
 addDoc({key:'attend:S7:'+TODAY,kind:'attend',tier:'auto',by:'출결 담당',ic:'출',title:'윤지호 학생 어제 출결 미기록',sum:'결석으로 단정하지 않고 확인 목록에 올림 · 자동 처리(내부 기록)',body:'9월 11일(목) 초6 수학 B 출결 기록이 없습니다. 결석으로 기록하지 않았습니다. 김민정 선생님께 확인 요청을 남겼습니다.',evidence:[{l:'출결 기기',v:'입실 기록 없음'},{l:'강사 체크',v:'미입력'}],studentId:'S7'});
 addDoc({key:'lead:L1',kind:'consult',tier:'auto',by:'상담·등록 담당',ic:'상',title:'조은채 상담 예약 확정 (9/15 16:00)',sum:'네이버 검색 문의 → 상담 예약 · 강사·교실 충돌 없음 · 자동 처리',body:'조은채 학생(초6) 상담이 9월 15일 16:00 2강의실로 잡혔습니다. 같은 시간 다른 상담 없음. 등록 확정 시에만 원장 확인을 요청합니다.',evidence:[{l:'문의 경로',v:'네이버 검색'},{l:'희망 반',v:'초6 수학 B'}]});
 S.morningDone=true;save();
}

/* ---------- 렌더 ---------- */
const NAV=[
 {id:'today',t:'오늘 결재함',i:'M4 6h16M4 12h16M4 18h10'},
 {id:'students',t:'학생',i:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'},
 {id:'lesson',t:'수업 기록',i:'M5 4h11l3 3v13H5zM8 12h8M8 16h5'},
 {id:'timetable',t:'시간표',i:'M4 5h16v15H4zM4 10h16M9 5v15'},
 {id:'wrong',t:'오답 현황',i:'M6 6l12 12M18 6L6 18'},
 {id:'billing',t:'수납',i:'M3 7h18v11H3zM3 11h18M7 15h3'},
 {sep:'운영'},
 {id:'staff',t:'AI 직원 명부',i:'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M12 20a6 6 0 0 1 10 0'},
 {id:'rules',t:'결재 규칙',i:'M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z'},
 {id:'guide',t:'사용 안내',i:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17v-5M12 8h.01'},
];
let route='today',role='owner';
function renderNav(){
 const n=docsOpen().length;
 $('#nav').innerHTML=NAV.map(x=>x.sep?`<div class="sep">${x.sep}</div>`:`<a href="#${x.id}" class="${route===x.id?'on':''}"><span class="ico"><svg viewBox="0 0 24 24"><path d="${x.i}"/></svg></span>${x.t}${x.id==='today'&&n?`<span class="cnt">${n}</span>`:''}</a>`).join('');
}
function render(){
 if(role==='owner'){renderNav();$('#rail').style.display='';}else{$('#nav').innerHTML='';}
 const v=$('#view');
 const V={today:vToday,students:vStudents,lesson:vLesson,timetable:vTimetable,wrong:vWrong,billing:vBilling,staff:vStaff,rules:vRules,guide:vGuide};
 if(role==='teacher')v.innerHTML=vTeacher();else if(role==='parent')v.innerHTML=vParent();else if(role==='student')v.innerHTML=vStudent();
 else v.innerHTML=(V[route]||vToday)();
 bind();
}
function docCard(d){
 const done=d.status==='sent';const stale=d.status==='stale';
 return `<article class="doc ${done?'done':''}" data-doc="${d.id}"><div class="ic ${d.ico||''}">${d.ic}</div><div>
  <h4>${esc(d.title)} ${d.status==='held'?'<span class="pill a">보류</span>':''}${stale?'<span class="pill r">중지</span>':''}${d.reviewer&&!done?(d.reviewed?`<span class="pill g">${esc(d.reviewer)} 검수 완료</span>`:`<span class="pill b">${esc(d.reviewer)} 검수 먼저</span>`):''}</h4>
  <div class="sum">${esc(d.sum)}</div>
  ${stale?`<div class="sum bad" style="margin-top:4px">${esc(d.reason)}</div>`:''}
  <div class="meta"><span>준비: ${esc(d.by)}</span><span>v${d.version}</span>${d.recipient?`<span>받는 사람: ${esc(d.recipient)}</span>`:''}</div>
  <div class="acts">
   ${done||stale?`<button class="btn-sm" data-open="${d.id}">내용 보기</button>`:`<button class="btn-ok btn-sm" data-ok="${d.id}">확인 (결재)</button><button class="btn-fix btn-sm" data-open="${d.id}">고치기 · 근거 보기</button>${d.status!=='held'?`<button class="btn-hold btn-sm" data-hold="${d.id}">보류</button>`:''}`}
  </div></div>${done?'<div class="stamp">결재</div>':''}</article>`;
}
function vToday(){
 morningPrep();
 const open=docsOpen();const now=open.filter(d=>d.tier==='now');const morn=open.filter(d=>d.tier==='morning');
 const auto=S.docs.filter(d=>d.status==='auto');const done=S.docs.filter(d=>['sent','stale'].includes(d.status));
 const care=careList();const overdue=S.invoices.filter(i=>money(i)>0&&i.due<TODAY);
 const minor=S.docs.filter(d=>d.history.some(h=>h.what.startsWith('문장만')));
 const careN=care.filter(x=>x.total>=S.policy.threshold).length;
 const headline=open.length?`오늘 결재할 서류 ${open.length}건`:'오늘 결재할 서류가 없습니다.';
 const lines=[
  now.length?{n:now.length,u:'건',t:'지금 확인',d:overdue.length?`미납 ${overdue.length}건은 금액이 들어가 맨 앞에 두었습니다`:'금액·상담처럼 바로 볼 서류',cls:'r'}:null,
  morn.length?{n:morn.length,u:'건',t:'아침 결재함',d:'리포트·시간표·문제 세트 등 모아서 보는 서류',cls:''}:null,
  careN?{n:careN,u:'명',t:'살펴볼 학생',d:`기준 ${S.policy.threshold}점 이상 · 오른쪽 목록`,cls:'a'}:null,
  auto.length?{n:auto.length,u:'건',t:'자동 처리',d:'규칙대로 처리하고 알림만 남김',cls:'g'}:null,
  minor.length?{n:minor.length,u:'건',t:'재결재 없이 유지',d:'어제 결재한 서류를 문장만 다듬음',cls:'g'}:null,
 ].filter(Boolean);
 return `<div class="head"><div><div class="eyebrow">수학의숲 판교학원 · 원장실</div><h1>원장님, 서류가 준비되어 있습니다.</h1><p>AI 직원들이 밤사이 준비한 서류입니다. 원장님은 <b>확인</b>, <b>고치기</b>, <b>보류</b> 세 가지만 하시면 됩니다.</p></div></div>
 <div class="brief"><div><div class="who">교무 실장 · 아침 8:30 정리</div><h2>${headline}</h2>
  ${lines.length?`<ul class="brief-list">${lines.map(l=>`<li><strong class="num ${l.cls}">${l.n}<small>${l.u}</small></strong><div><b>${l.t}</b><span>${l.d}</span></div></li>`).join('')}</ul>`:'<p>장부와 기록에 새로 확인할 것이 없습니다. 준비되는 대로 여기에 쌓입니다.</p>'}</div>
  <div><a href="#rules" class="btn-hold btn-sm" style="display:inline-block;text-decoration:none">결재 규칙 보기</a></div></div>
 <div class="kpis">
  <div class="kpi"><div class="l">재원 학생</div><strong class="num">${S.students.length}<small>명</small></strong><p>반 3개 · 강사 2명</p></div>
  <div class="kpi"><div class="l">오늘 수업</div><strong class="num">2<small>개 반</small></strong><p>중2 수학 A 16:00 · 중3 영어 C 18:00</p></div>
  <div class="kpi"><div class="l">미납 잔액</div><strong class="num">${won(overdue.reduce((a,i)=>a+money(i),0))}</strong><p>${overdue.length}건 · 장부 기준</p></div>
  <div class="kpi"><div class="l">결재 대기</div><strong class="num">${open.length}<small>건</small></strong><p>결재하면 바로 전송·처리</p></div>
 </div>
 <div class="cols"><div class="card">
  <div class="card-h"><div><h2>결재함</h2><p>서류마다 "준비한 직원"과 근거가 붙어 있습니다.</p></div><span class="pill">가상 기록</span></div>
  <div class="inbox-sec"><h3>지금 확인 <span class="n">${now.length}</span></h3>${now.length?now.map(docCard).join(''):'<div class="empty">금액·상담처럼 바로 봐야 할 서류가 없습니다.</div>'}</div>
  <div class="inbox-sec"><h3>아침 결재함 <span class="n">${morn.length}</span></h3>${morn.length?morn.map(docCard).join(''):'<div class="empty">리포트·시간표·문제 세트가 준비되면 이곳에 모입니다. <a href="#lesson">수업 기록</a>을 저장해 보세요.</div>'}</div>
  <details class="inbox-sec"><summary style="padding:14px 22px;cursor:pointer;font-size:12px;font-weight:700;color:var(--muted)">자동 처리됨 ${auto.length}건 · 처리 완료 ${done.length}건 (펼치기)</summary>${[...auto,...done].map(docCard).join('')||'<div class="empty">아직 없습니다.</div>'}</details>
 </div>
 <div class="grid">
  <div class="card side"><div class="card-h"><div><h2>살펴볼 학생</h2><p>관심학생 담당 · 기준 ${S.policy.threshold}점 이상 표시</p></div></div><div class="card-b">${care.length?care.map(x=>`<div class="row"><div style="flex:1"><b>${x.s.name}</b> <span class="muted small">${cls(x.s.cls).name}</span><p>${x.parts.map(p=>p.k).join(' · ')}</p></div><span class="score ${x.total>=S.policy.threshold?'hi':x.total>=3?'':'lo'}">${x.total}점</span></div>`).join(''):'<div class="empty">신호가 있는 학생이 없습니다.</div>'}<p class="small muted" style="margin-top:10px">점수 기준은 <a href="#rules">결재 규칙</a>에서 원장님이 직접 바꿀 수 있습니다. 퇴원 확률을 말하지 않습니다.</p></div></div>
  <div class="card side"><div class="card-h"><div><h2>오늘 수업</h2><p>월요일</p></div></div><div class="card-b">${Object.values(S.classes).filter(c=>c.days.includes('월')).map(c=>`<div class="row"><div style="flex:1"><b>${c.name}</b><p>${fmt(c.start)}~${fmt(c.end)} · ${c.teacher} 선생님 · ${c.room} · ${c.members.length}명</p></div><a href="#lesson" class="btn-sm" style="text-decoration:none;border:1px solid var(--line2);border-radius:7px;padding:5px 10px;font-size:12px">기록</a></div>`).join('')}</div></div>
  <div class="card side"><div class="card-h"><div><h2>최근 처리 기록</h2></div></div><div class="card-b"><ul class="timeline">${S.log.slice(0,6).map(l=>`<li><span>${l.at.slice(11,16)}</span><div><b>${esc(l.action)}</b> <span class="muted">${esc(l.detail)}</span></div></li>`).join('')||'<li><span>—</span><div class="muted">아직 없습니다.</div></li>'}</ul></div></div>
 </div></div>`;
}

function vStudents(){
 const all=S.students.map(s=>({s,...attention(s)}));
 const needN=all.filter(x=>x.weight>0).length;
 const rows=all.filter(x=>passF(x.s,stuF)&&(!stuF.only||x.weight>0)).sort((a,b)=>b.weight-a.weight||a.s.name.localeCompare(b.s.name,'ko'));
 const firstOk=rows.findIndex(x=>x.weight===0);
 return `<div class="head"><div><div class="eyebrow">학생</div><h1>확인이 필요한 학생이 먼저 보입니다.</h1><p>살펴볼 학생, 미납, AI 동의 미확인 순으로 위에 올립니다. 이름을 누르면 수업 기록, 오답, 수납, 신호, 진로가 한 화면에 나옵니다. 이름이 같아도 학생 ID로 구분합니다.</p></div></div>
 <div class="card"><div class="card-h"><div><h2>재원 ${S.students.length}명 · 확인 필요 ${needN}명</h2><p>학년·반으로 좁혀 볼 수 있습니다</p></div>
 ${filterBar('stu',stuF,`<label class="chk"><input type="checkbox" data-f="stu:only" ${stuF.only?'checked':''}> 확인 필요 학생만</label>`)}</div>
 <div class="tw"><table><thead><tr><th>학생</th><th>확인 필요</th><th>학년 · 반</th><th>오늘 기록</th><th>취약 단원</th><th>수납</th><th>신호</th><th>AI 활용 동의</th></tr></thead><tbody>
 ${rows.map((x,i)=>{const s=x.s;const inv=x.inv;const ex=S.exams.find(e=>e.cls===s.cls);const w=ex?weakUnits(ex,s.id):[];const c=x.care;const rec=S.lessonSaved[s.id];
  return `${i===firstOk&&i>0?`<tr class="grp"><td colspan="8">확인할 것이 없는 학생 ${rows.length-i}명</td></tr>`:''}<tr class="click ${x.weight?'need':''}" data-stu="${s.id}"><td><b>${s.name}</b> <span class="muted small">${s.id}</span></td><td>${x.reasons.length?x.reasons.map(r=>`<span class="pill ${r.cls}">${r.t}</span>`).join(' '):'<span class="muted">—</span>'}</td><td>${s.grade} · ${cls(s.cls).name}</td><td>${rec?`<span class="pill g">${rec.att} · ${rec.hw}</span>`:'<span class="pill">미관찰</span>'}</td><td>${w.length?w.map(x=>x.unit).join(', '):'<span class="muted">—</span>'}</td><td>${money(inv)>0?`<span class="pill ${isOverdue(inv)?'r':'a'}">잔액 ${won(money(inv))}</span>`:'<span class="pill g">완납</span>'}</td><td>${c.total?`<span class="score ${c.total>=S.policy.threshold?'hi':''}">${c.total}점</span>`:'<span class="muted">—</span>'}</td><td>${s.consent?'<span class="pill g">확인</span>':'<span class="pill a">미확인</span>'}</td></tr>`}).join('')||'<tr><td colspan="8" class="empty">조건에 맞는 학생이 없습니다.</td></tr>'}
 </tbody></table></div></div>
 <div class="grid g2" style="margin-top:18px">
  <div class="card"><div class="card-h"><div><h2>상담·등록 진행</h2><p>상담·등록 담당 · 문의 → 예약 → 등록 → 첫 청구서</p></div></div><div class="card-b">${S.leads.map(l=>`<div class="side"><div class="row"><div style="flex:1"><b>${l.name}</b> <span class="muted small">${l.source} · ${cls(l.cls).name}</span><p>${l.stage==='consulted'?'상담 예약 '+l.slot+' · 등록 확정 시 원장 확인':'새 문의 · 상담 시간 제안 예정'}</p></div><span class="pill ${l.stage==='consulted'?'g':'b'}">${l.stage==='consulted'?'상담 예약':'새 문의'}</span></div></div>`).join('')}</div></div>
  <div class="card"><div class="card-h"><div><h2>진로상담</h2><p>진로상담 담당 · 학생이 말한 것만 근거로</p></div></div><div class="card-b"><div class="side"><div class="row"><div style="flex:1"><b>강시우</b> <span class="muted small">중3 · 9월 17일 상담 예정</span><p>관심 ${S.career.S9.interests.join(', ')} · 리포트는 아침 결재함에 준비</p></div><button class="btn-sm" data-stu="S9">보기</button></div></div><p class="note" style="margin-top:12px">학생이 직접 말하지 않은 적성·성적 판단은 넣지 않습니다. 담당 선생님 확인 → 원장 확인 → 보호자 공유 순서입니다.</p></div></div>
 </div>`;
}

const TAGS=['질문 많음','집중 잘함','집중 흐트러짐','개념 혼동','풀이 설명 잘함','칭찬'];
let lessonCls='A';const draft={};
function vLesson(){
 const c=cls(lessonCls);
 return `<div class="head"><div><div class="eyebrow">수업 기록 · 강사 화면과 같음</div><h1>체크 다섯 번이면 한 반 기록이 끝납니다.</h1><p>말로 하지 않아도 됩니다. 출결·숙제·이해도를 누르고, 특이사항은 태그로 고릅니다. 체크하지 않은 학생은 "미관찰"로 남고, 없는 이야기를 만들지 않습니다.</p></div>
 <div><select id="lessonCls">${Object.values(S.classes).map(x=>`<option value="${x.id}" ${x.id===lessonCls?'selected':''}>${x.name} · ${x.teacher}</option>`).join('')}</select></div></div>
 <div class="card"><div class="card-h"><div><h2>${c.name} · 오늘 ${fmt(c.start)}</h2><p>${c.teacher} 선생님 · ${c.members.length}명 · 저장하면 리포트 담당이 초안을 준비합니다</p></div><span class="pill">약 60초</span></div>
 ${c.members.map(id=>{const s=stu(id);const d=draft[id]||(draft[id]={att:'출석',hw:'제출',level:'보통',tags:[],memo:''});const saved=S.lessonSaved[id];
  return `<div class="rec" data-rec="${id}"><div class="nm">${s.name}<small>${s.grade} · ${saved?'오늘 저장됨':'미관찰'}</small></div><div>
   <div class="line"><span>출결</span><div class="chips">${['출석','지각','결석'].map(v=>`<button class="chip ${d.att===v?'on'+(v==='결석'?' bad':v==='지각'?' warn':''):''}" data-set="att" data-v="${v}">${v}</button>`).join('')}</div></div>
   <div class="line"><span>숙제</span><div class="chips">${['제출','일부','미제출'].map(v=>`<button class="chip ${d.hw===v?'on'+(v==='미제출'?' bad':v==='일부'?' warn':''):''}" data-set="hw" data-v="${v}">${v}</button>`).join('')}</div></div>
   <div class="line"><span>이해도</span><div class="chips">${['잘 이해','보통','다시 설명 필요'].map(v=>`<button class="chip ${d.level===v?'on'+(v==='다시 설명 필요'?' warn':''):''}" data-set="level" data-v="${v}">${v}</button>`).join('')}</div></div>
   <div class="line"><span>특이사항</span><div class="chips">${TAGS.map(v=>`<button class="chip ${d.tags.includes(v)?'on':''}" data-tag="${v}">${v}</button>`).join('')}</div></div>
   <div class="line"><span>한 줄(선택)</span><input type="text" data-memo placeholder="꼭 필요할 때만 · 예: 다음 시간 꼭짓점 다시" value="${esc(d.memo)}"></div>
  </div></div>`}).join('')}
 <div class="card-b" style="padding-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn-ok" id="saveLesson">기록 저장 → 리포트 초안 준비</button><span class="small muted">음성 입력은 켜지 않았습니다. 필요하면 <a href="#staff">AI 직원 명부</a>에서 수업기록 담당 설정을 바꿀 수 있습니다.</span></div></div>`;
}
function saveLesson(){
 const c=cls(lessonCls);let made=0;
 c.members.forEach(id=>{const d=draft[id];if(!d)return;const s=stu(id);S.lessonSaved[id]=JSON.parse(JSON.stringify(d));s.version++;s.records.unshift({at:TODAY,...d});
  invalidate('report',x=>x.studentId===id,'수업 기록이 바뀌어 새 초안으로 교체');
  if(d.att==='결석'){S.docs.push({id:'D'+(S.docs.length+1),key:'mk:'+id+':'+TODAY,kind:'makeup',tier:'auto',status:'auto',by:'보강 담당',ic:'보',title:`${s.name} 보강 제안`,sum:'결석 확인 → 강사·교실 빈 시간 검색 · 자동 준비',body:`${s.name} 학생 결석 확인. 보강 가능 시간: 9월 17일(수) 15:00 ${c.room} (${c.teacher} 선생님 가능). 강사 확인 후 보호자에게 안내합니다.`,evidence:[{l:'출결',v:'결석 (강사 체크)'}],studentId:id,version:1,createdAt:TODAY,history:[]});}
  if(s.consent){prepareReport(id,d);made++;}
 });
 log('수업 기록 저장',`${c.name} ${c.members.length}명`,c.teacher);save();
 toast(`${c.members.length}명 기록 저장. 리포트 초안 ${made}건이 아침 결재함에 준비되었습니다.${made<c.members.length?' (동의 미확인 학생 제외)':''}`);
 location.hash='#today';
}

let ttChange={cls:'A',day:'화',start:17};
function vTimetable(){
 const days=['월','화','수','목','금'];const hours=[15,16,17,18,19];
 const r=prepareTimetable(ttChange);const c=r.c;const dur=c.end-c.start;
 const grid=days.map(d=>hours.map(h=>{const cur=Object.values(S.classes).find(x=>x.days.includes(d)&&Math.floor(x.start)===h);const ghost=(d===ttChange.day&&h===Math.floor(ttChange.start));
  if(cur)return `<div class="blk ${cur.id} ${ghost?'ghost':''}">${cur.name}<small>${fmt(cur.start)}~${fmt(cur.end)} · ${cur.teacher}</small></div>`;
  if(ghost)return `<div class="blk ${c.id} ghost" style="opacity:.75">${c.name} (변경안)<small>${fmt(ttChange.start)}~${fmt(ttChange.start+dur)}</small></div>`;
  return '<div class="cell"></div>';}));
 return `<div class="head"><div><div class="eyebrow">시간표 · 시간표 담당</div><h1>시간표를 바꾸면 누가 영향을 받는지 바로 보입니다.</h1><p>방학·개인 일정으로 자주 바뀌는 시간표를 종이로 출력하지 않습니다. 바꾸면 영향 학생·강사·교실 충돌을 검사하고, 새 시간표 안내가 결재함에 올라갑니다.</p></div></div>
 <div class="cols"><div class="card"><div class="card-h"><div><h2>주간 시간표</h2><p>점선 테두리는 변경안입니다</p></div></div><div class="card-b"><div class="tw"><div class="tt" style="min-width:560px"><div></div>${days.map(d=>`<div class="hd">${d}</div>`).join('')}
 ${hours.map((h,hi)=>`<div class="tm">${h}:00</div>`+days.map((d,di)=>grid[di][hi]).join('')).join('')}</div></div></div></div>
 <div class="grid"><div class="card"><div class="card-h"><div><h2>변경해 보기</h2><p>예: 중2 수학 A 수요일 수업을 화요일 17:00으로</p></div></div><div class="card-b">
  <label for="ttCls">반</label><select id="ttCls">${Object.values(S.classes).map(x=>`<option value="${x.id}" ${x.id===ttChange.cls?'selected':''}>${x.name} (${x.days.join('·')} ${fmt(x.start)})</option>`).join('')}</select>
  <div class="grid g2"><div><label for="ttRep">바꿀 요일</label><select id="ttRep">${c.days.map(d=>`<option ${d===ttChange.replace?'selected':''}>${d}</option>`).join('')}</select></div><div><label for="ttDay">새 요일</label><select id="ttDay">${days.map(d=>`<option ${d===ttChange.day?'selected':''}>${d}</option>`).join('')}</select></div></div>
  <label for="ttStart">새 시작 시간</label><select id="ttStart">${hours.map(h=>`<option value="${h}" ${h===ttChange.start?'selected':''}>${h}:00</option>`).join('')}</select>
  <div class="sec">영향 검사</div>
  <ul class="impact"><li><span>영향 학생</span><b>${r.affected.length}명</b></li><li><span>담당 강사 · 교실</span><b>${c.teacher} · ${c.room}</b></li><li><span>강사·교실 충돌</span>${r.conflicts.length?`<span class="bad">${r.conflicts.join(' / ')}</span>`:'<span class="ok">없음</span>'}</li><li><span>학생 개인 일정 겹침</span>${r.personal.length?`<span class="bad">${r.personal.join(' / ')}</span>`:'<span class="ok">없음</span>'}</li></ul>
  <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn-ok" id="ttGo" ${r.conflicts.length?'disabled':''}>변경 확정 → 배포 서류 준비</button>${r.conflicts.length?'<span class="small bad">강사·교실 충돌이 있으면 확정할 수 없습니다.</span>':''}</div>
  <p class="note" style="margin-top:12px">개인 일정이 겹치는 학생은 배포 전에 먼저 개별 연락 목록에 올라갑니다. 학부모에게는 새 시간표 이미지와 함께 안내가 갑니다.</p>
 </div></div></div></div>`;
}

let waExam='EX1';
function unitRates(ex){
 const c=cls(ex.cls);
 return ex.units.map(u=>{const its=ex.items.filter(i=>i.unit===u);let w=0,t=0;c.members.forEach(id=>its.forEach(i=>{t++;if((ex.wrong[id]||[]).includes(i.n))w++;}));return {u,p:Math.round(w/t*100)};});
}
const rateBars=ex=>unitRates(ex).map(x=>`<div style="display:grid;grid-template-columns:110px 1fr 48px;gap:10px;align-items:center;padding:6px 0;font-size:13px"><span>${x.u}</span><div class="bar"><i style="width:${x.p}%;background:${x.p>=50?'var(--stamp)':'var(--amber)'}"></i></div><span class="num muted small" style="text-align:right">${x.p}%</span></div>`).join('');
/* 원장 화면: 통계와 결재 상태만. 오답 체크·문제 세트 준비는 강사 화면 */
function vWrong(){
 const ex=S.exams.find(e=>e.id===waExam);const c=cls(ex.cls);
 const weakN=c.members.filter(id=>weakUnits(ex,id).length).length;
 const psets=S.docs.filter(d=>d.kind==='pset');
 const stage=d=>!d?'<span class="pill">준비 전</span>':d.status==='sent'?'<span class="pill g">결재 완료</span>':d.status==='review'&&!d.reviewed?'<span class="pill b">강사 검수 중</span>':d.status==='review'?'<span class="pill a">결재 대기</span>':d.status==='held'?'<span class="pill a">보류</span>':'<span class="pill">'+d.status+'</span>';
 const top=unitRates(ex).filter(x=>x.p>=50).map(x=>x.u);
 return `<div class="head"><div><div class="eyebrow">오답 현황 · 오답 담당</div><h1>오답은 강사가 관리하고, 원장님은 결과만 봅니다.</h1><p>문항 체크와 맞춤 문제 준비는 담당 선생님의 수업 업무라 강사 화면에 있습니다. 여기서는 반별 취약 단원과 문제 세트 결재 상태만 봅니다. 준비된 세트는 아침 결재함으로 옵니다.</p></div>
 <div><button class="btn-sm" id="toTeacherWrong">강사 화면에서 오답 체크 보기</button></div></div>
 <div class="kpis"><div class="kpi"><div class="l">채점된 시험</div><strong class="num">${S.exams.length}<small>개</small></strong><p>${ex.name}</p></div><div class="kpi"><div class="l">취약 단원 있는 학생</div><strong class="num">${weakN}<small>명</small></strong><p>${c.name} ${c.members.length}명 중</p></div><div class="kpi"><div class="l">반 전체 50% 이상 오답</div><strong class="num">${top.length}<small>단원</small></strong><p>${top.join(', ')||'없음'}</p></div><div class="kpi"><div class="l">문제 세트 결재 대기</div><strong class="num">${psets.filter(d=>d.status==='review'&&d.reviewed).length}<small>건</small></strong><p>검수 중 ${psets.filter(d=>d.status==='review'&&!d.reviewed).length}건 · 완료 ${psets.filter(d=>d.status==='sent').length}건</p></div></div>
 <div class="grid g2"><div class="card"><div class="card-h"><div><h2>${c.name} · 단원별 오답률</h2><p>${ex.name}</p></div></div><div class="card-b">${rateBars(ex)}<p class="small muted" style="margin-top:10px">반 전체 오답률이 높은 단원은 다음 수업 계획에도 반영됩니다.</p></div></div>
 <div class="card"><div class="card-h"><div><h2>학생별 맞춤 문제 세트</h2><p>강사 검수 → 원장 결재 → 학생 화면</p></div></div><div class="card-b">${c.members.map(id=>{const s=stu(id);const w=weakUnits(ex,id);const d=psets.filter(x=>x.studentId===id).sort((a,b)=>b.id.localeCompare(a.id))[0];return `<div class="row"><div style="flex:1"><b>${s.name}</b> <span class="muted small">오답 ${(ex.wrong[id]||[]).length}개</span><p>${w.length?'취약 '+w.map(x=>x.unit).join(', '):'취약 단원 없음'}</p></div>${w.length?stage(d):'<span class="muted small">—</span>'}</div>`}).join('')}</div></div></div>
 <div class="card" style="margin-top:18px"><div class="card-h"><div><h2>이 흐름이 하는 일</h2></div></div><div class="card-b"><ul class="timeline"><li><span>1</span><div><b>강사 화면</b> · 조교·강사가 채점 뒤 틀린 문항만 체크</div></li><li><span>2</span><div>오답 담당이 단원별로 모아 학생마다 취약 단원 계산</div></li><li><span>3</span><div><b>강사 화면</b> · 취약 단원별 유사 문항 세트 초안 준비 → 담당 선생님 검수</div></li><li><span>4</span><div><b>원장 화면</b> · 아침 결재함에서 결재 → 학생 화면에 열림</div></li><li><span>5</span><div>학부모 리포트에 "이번 시험 취약 단원" 한 줄 자동 반영</div></li></ul></div></div>`;
}
/* 강사 화면: 오답 체크표와 문제 세트 준비 */
function vWrongGrid(){
 const ex=S.exams.find(e=>e.id===waExam);const c=cls(ex.cls);
 return `<div class="card"><div class="card-h"><div><h2>${ex.name}</h2><p>${c.name} · 10문항 · 칸을 누르면 오답 표시가 바뀝니다</p></div><span class="pill">조교·강사 입력</span></div>
 <div class="tw"><table class="wa"><thead><tr><th>학생</th>${ex.items.map(i=>`<th>${i.n}<br><span class="muted" style="font-weight:500">${i.unit.slice(0,4)}</span></th>`).join('')}<th style="text-align:left">취약 단원 (50% 이상 오답)</th></tr></thead><tbody>
 ${c.members.map(id=>{const s=stu(id);const w=weakUnits(ex,id);const wr=ex.wrong[id]||[];return `<tr><td><b>${s.name}</b><br><span class="muted small">오답 ${wr.length}개</span></td>${ex.items.map(i=>`<td><button class="q ${wr.includes(i.n)?'x':'o'}" data-wa="${id}:${i.n}" aria-label="${s.name} ${i.n}번">${wr.includes(i.n)?'✕':'○'}</button></td>`).join('')}<td style="text-align:left">${w.length?w.map(x=>`<div style="display:grid;grid-template-columns:90px 80px 1fr;gap:8px;align-items:center;font-size:12px"><span>${x.unit}</span><div class="bar"><i style="width:${Math.round(x.wrong/x.total*100)}%"></i></div><span class="muted">${x.wrong}/${x.total}</span></div>`).join(''):'<span class="muted">없음</span>'}</td></tr>`}).join('')}
 </tbody></table></div>
 <div class="card-b" style="padding-top:18px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn-ok" id="waGo">취약 단원별 맞춤 문제 세트 준비</button><span class="small muted">취약 단원이 있는 학생만 · 선생님이 검수 완료하면 원장 결재함으로 갑니다</span></div></div>
 <div class="card" style="margin-top:18px"><div class="card-h"><div><h2>단원별 반 전체 오답률</h2></div></div><div class="card-b">${rateBars(ex)}<p class="small muted" style="margin-top:10px">반 전체 오답률이 높은 단원은 다음 수업 계획에도 반영됩니다.</p></div></div>`;
}

function vBilling(){
 const total=S.invoices.reduce((a,i)=>a+i.amount,0),paid=S.invoices.reduce((a,i)=>a+i.paid,0);
 const head=`<div class="head"><div><div class="eyebrow">수납 · 수납 담당</div><h1>납부가 확인되면, 보내려던 안내는 저절로 멈춥니다.</h1><p>청구·납부·잔액을 따로 기록합니다. 같은 입금이 두 번 들어와도 한 번만 반영하고, 금액이 들어간 안내는 항상 원장이 확인합니다.</p></div></div>
 <div class="kpis"><div class="kpi"><div class="l">9월 청구</div><strong class="num">${won(total)}</strong></div><div class="kpi"><div class="l">납부 확인</div><strong class="num">${won(paid)}</strong></div><div class="kpi"><div class="l">잔액</div><strong class="num">${won(total-paid)}</strong><p>${S.invoices.filter(i=>money(i)>0).length}건</p></div><div class="kpi"><div class="l">대기 중 안내</div><strong class="num">${S.docs.filter(d=>d.kind==='billing'&&['review','held'].includes(d.status)).length}<small>건</small></strong><p>결재함에서 확인</p></div></div>`;
 const rank=i=>isOverdue(i)?0:money(i)>0?1:2;
 const rows=S.invoices.map(i=>({i,s:stu(i.studentId)})).filter(x=>passF(x.s,billF)&&(!billF.only||money(x.i)>0))
  .sort((a,b)=>billF.group&&a.s.cls!==b.s.cls?a.s.cls.localeCompare(b.s.cls):rank(a.i)-rank(b.i)||money(b.i)-money(a.i)||a.s.name.localeCompare(b.s.name,'ko'));
 const overdueN=S.invoices.filter(isOverdue).length;
 const row=({i,s})=>{const b=money(i);return `<tr class="${isOverdue(i)?'need':''}"><td><b>${s.name}</b> <span class="muted small">${s.grade} · ${cls(s.cls).name}</span></td><td>${i.label}</td><td class="num">${won(i.amount)}</td><td class="num">${won(i.paid)}</td><td class="num"><b>${won(b)}</b></td><td>${b<=0?'<span class="pill g">완납</span>':isOverdue(i)?`<span class="pill r">${i.paid>0?'부분 납부 · 기한 경과':'미납 · 기한 경과'}</span>`:i.paid>0?'<span class="pill a">부분 납부</span>':'<span class="pill a">미납</span>'}</td><td>${b>0?`<button class="btn-sm" data-pay="${i.id}:100000">10만원</button> <button class="btn-sm" data-pay="${i.id}:${b}">완납</button>`:'<span class="muted small">—</span>'}</td></tr>`};
 let body='';
 if(billF.group){const g={};rows.forEach(x=>(g[x.s.cls]=g[x.s.cls]||[]).push(x));body=Object.keys(g).sort().map(k=>{const list=g[k].sort((a,b)=>rank(a.i)-rank(b.i)||money(b.i)-money(a.i));const od=list.filter(x=>isOverdue(x.i)).length;return `<tr class="grp"><td colspan="7">${cls(k).name} · ${list.length}명${od?` · 기한 경과 ${od}건`:' · 기한 경과 없음'}</td></tr>`+list.map(row).join('')}).join('');}
 else{const firstOk=rows.findIndex(x=>!isOverdue(x.i));body=rows.map((x,i)=>(i===firstOk&&i>0?`<tr class="grp"><td colspan="7">기한 안 · 완납 ${rows.length-i}건</td></tr>`:'')+row(x)).join('');}
 return `${head}
 <div class="card"><div class="card-h"><div><h2>기한 경과 ${overdueN}건이 먼저 보입니다</h2><p>잔액이 큰 순서 · 학년·반으로 좁히거나 반별로 묶어 볼 수 있습니다</p></div>
 ${filterBar('bill',billF,`<label class="chk"><input type="checkbox" data-f="bill:only" ${billF.only?'checked':''}> 잔액 있는 학생만</label><label class="chk"><input type="checkbox" data-f="bill:group" ${billF.group?'checked':''}> 반별로 묶기</label>`)}</div>
 <div class="tw"><table><thead><tr><th>학생</th><th>항목</th><th>청구</th><th>납부</th><th>잔액</th><th>상태</th><th>가상 입금</th></tr></thead><tbody>
 ${body||'<tr><td colspan="7" class="empty">조건에 맞는 청구가 없습니다.</td></tr>'}
 </tbody></table></div><div class="card-b" style="padding-top:14px"><p class="note">부분 납부 예: 320,000원 청구에 100,000원이 들어오면 잔액 220,000원. 이전 금액으로 만든 안내 서류는 "중지"로 바뀌고 새 잔액으로 다시 준비합니다. 환불 계산은 AI가 하지 않고 정해진 계산표로만 합니다.</p></div></div>`;
}

function vStaff(){
 const k=STAFF.filter(x=>x.killer),c=STAFF.filter(x=>!x.killer&&x.core),o=STAFF.filter(x=>!x.core);
 const card=x=>`<article class="st ${x.killer?'killer':''}">${x.killer?'<span class="kmark">핵심</span>':''}<div class="role"><div class="badge">${x.ch}</div><h3>${x.name}<small>${x.when}</small></h3></div><p>${x.does}</p><dl><dt>보는 자료</dt><dd>${x.src}</dd><dt>원장 결재</dt><dd>${x.needs}</dd></dl><div class="foot"><span class="tag"><i style="background:${S.hired[x.id]?'var(--green)':'var(--line2)'}"></i>${S.hired[x.id]?'일하는 중':'쉬는 중'}</span><button class="sw ${S.hired[x.id]?'on':''}" data-hire="${x.id}" aria-label="${x.name} ${S.hired[x.id]?'끄기':'켜기'}" aria-pressed="${S.hired[x.id]}"></button></div></article>`;
 return `<div class="head"><div><div class="eyebrow">AI 직원 명부</div><h1>직원은 15명이지만, 원장님이 알아야 할 건 한 가지입니다.</h1><p>모두 서류만 준비하고, 보내거나 결제하는 일은 스스로 하지 않습니다. 켜고 끄는 것 외에 설정할 것이 없습니다. 위 여섯 명이 이 학원의 핵심입니다.</p></div></div>
 <div class="sec" style="margin-top:0">핵심 직원 6 · 처음부터 켜져 있음</div><div class="staff">${k.map(card).join('')}</div>
 <div class="sec" style="margin-top:26px">기본 직원 4 · 장부를 맞추는 사람들</div><div class="staff">${c.map(card).join('')}</div>
 <div class="sec" style="margin-top:26px">필요할 때 켜는 직원 5</div><div class="staff">${o.map(card).join('')}</div>
 <p class="note" style="margin-top:22px">가게용 직원(재고·위생·쿠폰 등)은 학원 명부에서 뺐습니다. 직원 수를 자랑하지 않고, 학원에서 실제로 쓰는 일만 남겼습니다.</p>`;
}

function vRules(){
 const w=S.policy.weights;
 return `<div class="head"><div><div class="eyebrow">결재 규칙</div><h1>원장님 시간을 지키는 세 칸.</h1><p>어떤 서류가 자동으로 처리되고, 어떤 서류는 아침에 모아서 보고, 어떤 서류는 바로 봐야 하는지 원장님이 정합니다. 승인이 쌓이지 않게 하는 것이 목적입니다.</p></div></div>
 <div class="cols"><div><div class="card"><div class="card-b" style="padding-top:8px">
  <div class="tier"><div><b>자동 처리</b><span class="k">알림만 받음</span></div><div><ul><li>수업 기록 저장, 출결 "확인 필요" 표시, 상담 예약 잡기</li><li>이미 결재한 서류의 <b>사소한 수정</b>: 오타·띄어쓰기·문장 다듬기처럼 이름·숫자·날짜·받는 사람이 그대로인 수정</li><li>정형 결석 안내 <label style="display:inline-flex;gap:6px;align-items:center;margin:0 0 0 6px;font-weight:500"><input type="checkbox" id="autoAtt" ${S.policy.autoAttendance?'checked':''}> 원장이 켠 경우에만</label></li></ul></div></div>
  <div class="tier"><div><b>아침 결재함</b><span class="k">매일 8:30 한 번에</span></div><div><ul><li>학부모 리포트, 새 시간표 배포, 맞춤 문제 세트, 진로상담 리포트, 재등록 상담 서류</li><li>보류한 서류는 다음 날 아침 결재함으로 옮겨집니다</li></ul></div></div>
  <div class="tier"><div><b>지금 확인</b><span class="k">준비되는 즉시</span></div><div><ul><li>금액이 들어간 모든 안내(미납·환불·요금 변경)</li><li>살펴볼 학생 상담 제안, 공개 게시물, 계약 변경</li><li>이미 결재한 서류에서 <b>이름·숫자·날짜·받는 사람</b>이 바뀐 수정 → 새 결재</li></ul></div></div>
 </div></div>
 <div class="card" style="margin-top:18px"><div class="card-h"><div><h2>재결재 기준을 지금 확인해 보기</h2><p>결재가 끝난 서류를 고쳐 보면 규칙이 어떻게 작동하는지 볼 수 있습니다</p></div></div><div class="card-b"><p class="small muted">오늘 결재함에서 서류를 결재한 뒤 "내용 보기 → 고치기"로 문장만 바꾸면 그대로 유지되고, 금액이나 이름을 바꾸면 결재함으로 돌아옵니다.</p></div></div></div>
 <div class="card"><div class="card-h"><div><h2>살펴볼 학생 점수 기준</h2><p>관심학생 담당이 쓰는 표 · 원장님이 바꿀 수 있음</p></div></div><div class="card-b">
  <div class="wt"><span>최근 2주 결석 2회 이상</span><input type="number" data-w="absent" value="${w.absent}"><span>숙제 미제출 연속 2회</span><input type="number" data-w="hwMiss" value="${w.hwMiss}"><span>학부모 문의·불만 1건 이상</span><input type="number" data-w="inquiry" value="${w.inquiry}"><span>직전 시험 대비 10점 이상 하락</span><input type="number" data-w="drop" value="${w.drop}"><span>수강료 납부 지연</span><input type="number" data-w="payLate" value="${w.payLate}"><span><b>표시 기준 (합계)</b></span><input type="number" id="thr" value="${S.policy.threshold}"></div>
  <p class="note" style="margin-top:14px">이 점수는 <b>초기 기준값</b>입니다. 확률이 아니라 "원장이 한 번 볼 학생"을 고르는 규칙이며, 파일럿에서 실제 퇴원 사례와 대조해 가중치를 조정합니다.</p>
  <div class="sec">기준 조정용 대조 (파일럿에서 측정)</div><ul class="impact"><li><span>지난 6개월 퇴원 학생 중 사전에 표시된 비율</span><b class="muted">측정 전</b></li><li><span>표시됐지만 재등록한 학생 비율</span><b class="muted">측정 전</b></li></ul>
 </div></div></div>`;
}

function vGuide(){
 return `<div class="head"><div><div class="eyebrow">사용 안내</div><h1>원장실을 5분 안에 이해하기</h1></div></div>
 <div class="grid g2"><div class="card"><div class="card-h"><h2>이 화면이 다른 점</h2></div><div class="card-b"><ul class="timeline"><li><span>하나</span><div><b>결재함이 전부입니다.</b> AI 직원이 준비한 서류가 쌓이고, 원장은 확인·고치기·보류만 합니다. 학생·수납 목록도 확인이 필요한 사람이 먼저 옵니다.</div></li><li><span>둘</span><div><b>서류마다 근거가 붙습니다.</b> "고치기 · 근거 보기"를 누르면 어떤 기록으로 썼는지 나옵니다. 없는 내용은 쓰지 않습니다.</div></li><li><span>셋</span><div><b>강사는 체크만 합니다.</b> 말로 길게 설명하지 않아도 한 반 기록이 1분 안에 끝납니다.</div></li><li><span>넷</span><div><b>보내기 전에 다시 확인합니다.</b> 납부가 들어오거나 기록이 바뀌면 결재해 둔 서류도 스스로 멈춥니다.</div></li><li><span>다섯</span><div><b>규칙은 원장이 정합니다.</b> 무엇을 자동으로 하고 무엇을 볼지, 살펴볼 학생 기준까지 원장이 바꿉니다.</div></li></ul></div></div>
 <div class="card"><div class="card-h"><h2>체험 순서 (3분)</h2></div><div class="card-b"><ul class="timeline"><li><span>1</span><div>오늘 결재함 → 미납 안내 하나를 <b>확인</b>해 도장이 찍히는지 봅니다.</div></li><li><span>2</span><div>수업 기록 → 중2 수학 A 학생들을 체크하고 <b>저장</b>. 아침 결재함에 리포트가 생깁니다.</div></li><li><span>3</span><div>시간표 → 중2 수학 A를 화요일 17:00으로 바꿔 보고, 박하린 학생의 피아노 일정 겹침이 잡히는지 봅니다.</div></li><li><span>4</span><div>왼쪽 아래에서 <b>강사 화면</b>으로 바꾸고 "오답 체크·맞춤 문제" 탭에서 칸을 몇 개 바꾼 뒤 <b>맞춤 문제 세트 준비</b> → 검수 완료. 원장 화면 "오답 현황"에는 결재 상태만 보입니다.</div></li><li><span>5</span><div>수납 → 기한 경과가 맨 위에 있는지 보고, 박하린 10만원 가상 입금. 미납 안내가 "중지"되는지 봅니다.</div></li><li><span>6</span><div>학생 → 확인 필요 학생이 먼저 오는지, 학년·반 필터가 되는지 봅니다. 학부모·학생 화면도 바꿔 봅니다.</div></li></ul></div></div></div>
 <p class="note" style="margin-top:18px">이 파일은 한 개의 HTML 체험판입니다. 실제 AI 모델·음성·문자 발송·결제·출결 기기는 연결되어 있지 않고, 모든 인물과 기록은 가상입니다. 로그인·권한·서버 저장은 설계서(v2.1)의 참조 서버 규칙을 따릅니다.</p>`;
}

/* ---------- 다른 역할 ---------- */
let teacherTab='home';
function vTeacher(){
 const tabs=`<div class="tabs" role="tablist">${[['home','오늘'],['wrong','오답 체크·맞춤 문제']].map(([k,t])=>`<button role="tab" aria-selected="${teacherTab===k}" class="tab ${teacherTab===k?'on':''}" data-ttab="${k}">${t}</button>`).join('')}</div>`;
 if(teacherTab==='wrong')return `<div class="head"><div><div class="eyebrow">강사 화면 · 김민정 선생님</div><h1>틀린 문항만 체크하면, 학생마다 취약 단원과 맞춤 문제가 나옵니다.</h1><p>학부모가 원하는 "학원이 해 주는 오답 관리"입니다. 엑셀 대신 여기서 체크합니다. 문제는 사용 허가된 문제 은행에서만 가져오고, 선생님이 검수한 뒤 원장 결재를 거쳐 학생에게 열립니다.</p></div></div>${tabs}${vWrongGrid()}`;
 const pending=S.docs.filter(d=>d.reviewer&&d.reviewer.startsWith('김민정')&&d.status==='review'&&!d.reviewed);
 return `<div class="head"><div><div class="eyebrow">강사 화면 · 김민정 선생님</div><h1>선생님, 오늘 반 두 개입니다.</h1><p>담당 반의 기록과 오답 체크만 하면 됩니다. 수납·전송·다른 반은 보이지 않습니다.</p></div><div><button class="btn-ok" id="toLesson">중2 수학 A 기록하기</button></div></div>${tabs}
 <div class="grid g2"><div class="card"><div class="card-h"><div><h2>오늘 수업</h2></div></div><div class="card-b side">${Object.values(S.classes).filter(x=>x.teacher==='김민정').map(x=>`<div class="row"><div style="flex:1"><b>${x.name}</b><p>${x.days.join('·')} ${fmt(x.start)}~${fmt(x.end)} · ${x.room} · ${x.members.length}명</p></div><span class="pill ${x.members.every(id=>S.lessonSaved[id])?'g':''}">${x.members.every(id=>S.lessonSaved[id])?'기록 완료':'기록 전'}</span></div>`).join('')}</div></div>
 <div class="card"><div class="card-h"><div><h2>검수 요청 ${pending.length?`<span class="pill b">${pending.length}</span>`:''}</h2><p>오답 담당·진로상담 담당이 선생님 확인을 기다립니다. 검수 완료하면 원장 결재함으로 갑니다.</p></div></div><div class="card-b side">${pending.map(d=>`<div class="row"><div style="flex:1"><b>${esc(d.title)}</b><p>${esc(d.sum)}</p></div><button class="btn-sm" data-open="${d.id}">보기</button><button class="btn-ok btn-sm" data-reviewed="${d.id}">검수 완료</button></div>`).join('')||'<div class="empty">지금은 없습니다. 오답 체크 탭에서 문제 세트를 준비하면 여기에 올라옵니다.</div>'}</div></div></div>
 <p class="note" style="margin-top:18px">선생님 입력은 체크가 기본입니다. 체크하지 않은 학생은 "미관찰"로 남고 리포트에 아무 말도 만들어 넣지 않습니다.</p>`;
}
function markReviewed(id){const d=S.docs.find(x=>x.id===id);if(!d)return;d.reviewed=true;d.history.push({at:new Date().toISOString(),what:(d.reviewer||'담당 강사')+' 검수 완료 → 원장 결재함'});log('강사 검수 완료',d.title,d.reviewer||'강사');save();render();toast('검수 완료. 원장 아침 결재함으로 보냈습니다.');}
function vParent(){
 const s=stu('S1');const sent=S.docs.filter(d=>d.studentId==='S1'&&d.status==='sent'&&d.recipient===s.guardian);const inv=S.invoices.find(i=>i.studentId==='S1');const c=cls('A');
 return `<div class="hero-parent"><div class="head"><div><div class="eyebrow">수학의숲 판교학원 · 학부모</div><h1>이서준 학생의 학습 소식</h1><p>앱 설치 없이 문자 링크로 열립니다. 연결된 자녀의 기록만 보입니다.</p></div></div>
 <div class="card"><div class="card-h"><div><h2>도착한 안내</h2></div><span class="pill ${sent.length?'g':''}">${sent.length}건</span></div><div class="card-b">${sent.length?sent.map(d=>`<div class="body" style="margin-bottom:12px">${esc(d.body)}</div>`).join(''):'<div class="body">아직 도착한 안내가 없습니다.\n원장 화면에서 리포트를 결재하면 이곳에 같은 내용이 도착합니다.</div>'}</div></div>
 <div class="grid g2" style="margin-top:18px"><div class="card"><div class="card-h"><h2>시간표</h2></div><div class="card-b"><b>${c.name}</b><p class="muted">${c.days.join('·')} ${fmt(c.start)}~${fmt(c.end)} · ${c.teacher} 선생님</p><p class="small muted" style="margin-top:8px">시간표가 바뀌면 여기 먼저 바뀌고 안내가 갑니다.</p></div></div>
 <div class="card"><div class="card-h"><h2>수강료</h2></div><div class="card-b"><b>${inv.label} ${won(inv.amount)}</b><p class="muted">납부 확인 ${won(inv.paid)}</p><span class="pill ${money(inv)<=0?'g':'a'}" style="margin-top:8px">${money(inv)<=0?'납부 완료':'잔액 '+won(money(inv))}</span></div></div></div>
 <p class="note" style="margin-top:18px">다른 학생 이름, 선생님 내부 메모, 학원 장부는 포함되지 않습니다.</p></div>`;
}
function vStudent(){
 const ps=S.docs.find(d=>d.kind==='pset'&&d.studentId==='S1'&&d.status==='sent');
 return `<div class="hero-parent"><div class="head"><div><div class="eyebrow">수학의숲 판교학원 · 학생</div><h1>서준아, 오늘은 평행이동 하나만.</h1><p>${ps?'선생님이 검수한 맞춤 문제가 열렸어요.':'맞춤 문제는 선생님 검수와 원장 결재 후에 열려요. 지금은 예시 문제예요.'}</p></div></div>
 <div class="card"><div class="card-h"><h2>오늘의 문제</h2><span class="pill ${ps?'g':''}">${ps?'맞춤 세트':'예시'}</span></div><div class="card-b"><p class="q">y = x²의 그래프를 왼쪽으로 3만큼 옮긴 식은?</p>
 ${['y = (x − 3)²','y = (x + 3)²','y = x² + 3'].map((t,i)=>`<button class="choice" data-ans="${i}">${['①','②','③'][i]} ${t}</button>`).join('')}<p class="small muted" id="ansMsg" style="margin-top:10px">정답을 고르고, 왜 그런지 한 문장으로 말해 보세요.</p></div></div>
 <p class="note" style="margin-top:18px">이 화면은 검수된 문제만 보여 줍니다. 자유 대화형 AI는 보호자 고지와 평가 뒤에 추가합니다.</p></div>`;
}

/* ---------- drawer ---------- */
function openDoc(id){
 const d=S.docs.find(x=>x.id===id);if(!d)return;const done=d.status==='sent';
 $('#dr').innerHTML=`<button class="x" id="drX" aria-label="닫기">×</button><span class="pill ${done?'g':d.status==='stale'?'r':'a'}">${done?'결재·전송 완료':d.status==='stale'?'중지':d.status==='auto'?'자동 처리':TIER[d.tier]}</span><h2>${esc(d.title)}</h2><div class="sub">준비: ${esc(d.by)} · v${d.version}${d.recipient?' · 받는 사람: '+esc(d.recipient):''}${d.reviewer?' · 검수: '+esc(d.reviewer):''}</div>
 <div class="sec">이 서류의 근거</div><ul class="ev">${(d.evidence||[]).map(e=>`<li><b>${esc(e.l)}</b>${esc(e.v)}</li>`).join('')}</ul>
 <div class="sec">내용 ${done?'(결재 후 수정: 문장만 바꾸면 유지, 이름·숫자·날짜를 바꾸면 재결재)':'(고칠 수 있습니다)'}</div>
 ${d.status==='auto'||d.status==='stale'?`<div class="body">${esc(d.body)}</div>`:`<textarea id="drBody">${esc(d.body)}</textarea>`}
 ${d.history.length?`<div class="sec">기록</div><ul class="ev">${d.history.map(h=>`<li><b>${h.at.slice(0,16).replace('T',' ')}</b>${esc(h.what)}</li>`).join('')}</ul>`:''}
 <div class="bottom">${d.status==='auto'||d.status==='stale'?'<button id="drX2">닫기</button>':`<button class="btn-fix" id="drSave">고친 내용 저장</button>${done?'':`<button class="btn-ok" id="drOk">확인 (결재)</button>`}<button class="btn-hold" id="drX3">닫기</button>`}</div>`;
 $('#ov').classList.add('open');
 $$('#drX,#drX2,#drX3').forEach(b=>b.onclick=closeDr);
 const sv=$('#drSave');if(sv)sv.onclick=()=>{editDoc(id,$('#drBody').value);openDoc(id);};
 const ok=$('#drOk');if(ok)ok.onclick=()=>{editDoc(id,$('#drBody').value);closeDr();approve(id);};
}
function openStudent(id){
 const s=stu(id);const inv=S.invoices.find(i=>i.studentId===id);const ex=S.exams.find(e=>e.cls===s.cls);const w=ex?weakUnits(ex,id):[];const c=careScore(s);const car=S.career[id];
 $('#dr').innerHTML=`<button class="x" id="drX" aria-label="닫기">×</button><span class="pill">${s.id}</span><h2>${s.name} <span class="muted" style="font-size:14px;font-family:var(--font)">${s.grade} · ${cls(s.cls).name}</span></h2><div class="sub">보호자 ${esc(s.guardian)} · AI 활용 동의 ${s.consent?'확인':'미확인'}</div>
 <div class="sec">수업 기록</div><ul class="ev">${s.records.length?s.records.map(r=>`<li><b>${r.at}</b>${r.att} · 숙제 ${r.hw} · ${r.level}${r.tags.length?' · '+r.tags.join(', '):''}${r.memo?' · '+esc(r.memo):''}</li>`).join(''):'<li class="muted">오늘 기록 없음 (미관찰)</li>'}</ul>
 <div class="sec">오답·취약 단원</div><ul class="ev">${w.length?w.map(x=>`<li><b>${x.unit}</b>${x.wrong}/${x.total} 오답</li>`).join(''):'<li class="muted">취약 단원 없음</li>'}</ul>
 <div class="sec">신호</div><ul class="ev">${c.parts.length?c.parts.map(p=>`<li><b>+${p.p}점</b>${p.k}</li>`).join('')+`<li><b>합계</b>${c.total}점 (기준 ${S.policy.threshold})</li>`:'<li class="muted">없음</li>'}</ul>
 <div class="sec">수납</div><ul class="ev"><li><b>${inv.label}</b>청구 ${won(inv.amount)} · 납부 ${won(inv.paid)} · 잔액 ${won(money(inv))}</li></ul>
 ${car?`<div class="sec">진로</div><ul class="ev"><li><b>관심</b>${car.interests.join(', ')}</li><li><b>활동</b>${car.acts.join(', ')}</li><li><b>희망</b>${car.hopes.join(', ')}</li></ul>`:''}
 <div class="sec">개인 일정 (시간표 충돌 검사용)</div><ul class="ev">${s.personal.length?s.personal.map(p=>`<li><b>${p.day} ${p.start}:00</b>${p.what}</li>`).join(''):'<li class="muted">등록된 일정 없음</li>'}</ul>
 <div class="sec">관련 서류</div><ul class="ev">${S.docs.filter(d=>d.studentId===id).map(d=>`<li><b>${d.status==='sent'?'결재 완료':d.status==='stale'?'중지':d.status==='auto'?'자동':'대기'}</b><button class="btn-link" data-open="${d.id}">${esc(d.title)}</button></li>`).join('')||'<li class="muted">없음</li>'}</ul>
 <div class="bottom"><button id="drX2">닫기</button></div>`;
 $('#ov').classList.add('open');$$('#drX,#drX2').forEach(b=>b.onclick=closeDr);
 $$('#dr [data-open]').forEach(b=>b.onclick=()=>openDoc(b.dataset.open));
}
function closeDr(){$('#ov').classList.remove('open');}

/* ---------- bind ---------- */
function bind(){
 $$('[data-ok]').forEach(b=>b.onclick=()=>approve(b.dataset.ok));
 $$('[data-hold]').forEach(b=>b.onclick=()=>hold(b.dataset.hold));
 $$('[data-open]').forEach(b=>b.onclick=()=>openDoc(b.dataset.open));
 $$('tr[data-stu],button[data-stu]').forEach(b=>b.onclick=()=>openStudent(b.dataset.stu));
 const lc=$('#lessonCls');if(lc)lc.onchange=()=>{lessonCls=lc.value;render();};
 $$('.rec').forEach(r=>{const id=r.dataset.rec;const d=draft[id];
  $$('[data-set]',r).forEach(b=>b.onclick=()=>{d[b.dataset.set]=b.dataset.v;render();});
  $$('[data-tag]',r).forEach(b=>b.onclick=()=>{const t=b.dataset.tag;d.tags=d.tags.includes(t)?d.tags.filter(x=>x!==t):[...d.tags,t];render();});
  const m=$('[data-memo]',r);if(m)m.oninput=()=>{d.memo=m.value;};});
 const sl=$('#saveLesson');if(sl)sl.onclick=saveLesson;
 const tc=$('#ttCls');if(tc)tc.onchange=()=>{ttChange.cls=tc.value;ttChange.replace=cls(tc.value).days[0];render();};
 const tr=$('#ttRep');if(tr){if(!ttChange.replace)ttChange.replace=tr.value;tr.onchange=()=>{ttChange.replace=tr.value;render();};}
 const td=$('#ttDay');if(td)td.onchange=()=>{ttChange.day=td.value;render();};
 const ts=$('#ttStart');if(ts)ts.onchange=()=>{ttChange.start=+ts.value;render();};
 const tg=$('#ttGo');if(tg)tg.onclick=()=>commitTimetable(ttChange);
 $$('[data-wa]').forEach(b=>b.onclick=()=>{const [sid,n]=b.dataset.wa.split(':');const ex=S.exams.find(e=>e.id===waExam);const arr=ex.wrong[sid]||(ex.wrong[sid]=[]);const i=arr.indexOf(+n);if(i>=0)arr.splice(i,1);else arr.push(+n);save();render();});
 const wg=$('#waGo');if(wg)wg.onclick=()=>{const ex=S.exams.find(e=>e.id===waExam);let n=0;cls(ex.cls).members.forEach(id=>{if(prepareProblemSet(ex,id))n++;});save();if(n)teacherTab='home';render();toast(n?`맞춤 문제 세트 ${n}건을 준비했습니다. 검수 요청에서 확인하고 검수 완료를 누르면 원장 결재함으로 갑니다.`:'취약 단원이 있는 학생이 없습니다.');};
 $$('[data-ttab]').forEach(b=>b.onclick=()=>{teacherTab=b.dataset.ttab;render();});
 $$('[data-reviewed]').forEach(b=>b.onclick=()=>markReviewed(b.dataset.reviewed));
 const tw=$('#toTeacherWrong');if(tw)tw.onclick=()=>{role='teacher';teacherTab='wrong';$('#roleSel').value='teacher';render();window.scrollTo({top:0});};
 $$('[data-f]').forEach(el=>el.onchange=()=>{const [p,k]=el.dataset.f.split(':');const f=p==='stu'?stuF:billF;f[k]=el.type==='checkbox'?el.checked:el.value;render();});
 $$('[data-pay]').forEach(b=>b.onclick=()=>{const [id,amt]=b.dataset.pay.split(':');const inv=S.invoices.find(i=>i.id===id);const a=Math.min(+amt,money(inv));inv.paid+=a;inv.version++;const s=stu(inv.studentId);log('가상 입금',`${s.name} ${won(a)} · 잔액 ${won(money(inv))}`,'수납 담당');
  invalidate('billing',d=>d.invoiceId===id,money(inv)<=0?'납부가 확인되어 안내를 멈췄습니다.':'금액이 바뀌어 새 잔액으로 다시 준비했습니다.');
  if(money(inv)>0)prepareBilling(inv);save();render();toast(`${s.name} ${won(a)} 입금 반영. ${money(inv)<=0?'미납 안내를 멈췄습니다.':'잔액 '+won(money(inv))+'으로 안내를 다시 준비했습니다.'}`);});
 $$('[data-hire]').forEach(b=>b.onclick=()=>{S.hired[b.dataset.hire]=!S.hired[b.dataset.hire];save();render();});
 $$('[data-w]').forEach(i=>i.onchange=()=>{S.policy.weights[i.dataset.w]=+i.value||0;S.docs.forEach(d=>{if(d.kind==='care'&&d.status==='review')d.status='cancelled';});prepareCare();save();render();toast('기준을 바꿨습니다. 살펴볼 학생 목록을 다시 계산했습니다.');});
 const th=$('#thr');if(th)th.onchange=()=>{S.policy.threshold=+th.value||5;S.docs.forEach(d=>{if(d.kind==='care'&&d.status==='review')d.status='cancelled';});prepareCare();save();render();};
 const aa=$('#autoAtt');if(aa)aa.onchange=()=>{S.policy.autoAttendance=aa.checked;save();toast(aa.checked?'정형 결석 안내를 자동으로 보냅니다 (범위 안에서만).':'결석 안내도 원장 확인 후 보냅니다.');};
 const tl=$('#toLesson');if(tl)tl.onclick=()=>{role='owner';$('#roleSel').value='owner';location.hash='#lesson';};
 $$('[data-ans]').forEach(b=>b.onclick=()=>{$$('[data-ans]').forEach(x=>x.classList.remove('ok','no'));const ok=b.dataset.ans==='1';b.classList.add(ok?'ok':'no');$('#ansMsg').textContent=ok?'맞았어요. x = −3일 때 괄호 안이 0이 되어 꼭짓점이 (−3, 0)에 와요.':'다시 생각해 볼까요? 이동 후 꼭짓점이 (−3, 0)이 되려면 괄호 안이 0이 되는 x를 찾아 보세요.';});
}
let toastT;function toast(m,err){const t=$('#toast');t.textContent=m;t.style.background=err?'var(--stamp)':'';t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200);}

/* ---------- boot ---------- */
function go(){route=(location.hash||'#today').slice(1);if(!NAV.some(n=>n.id===route))route='today';render();$('#rail').classList.remove('open');window.scrollTo({top:0});}
window.addEventListener('hashchange',go);
$('#roleSel').onchange=e=>{role=e.target.value;render();$('#rail').classList.remove('open');};
$('#menuBtn').onclick=()=>$('#rail').classList.toggle('open');
$('#resetBtn').onclick=()=>{if(!confirm('체험 기록을 모두 지우고 처음부터 시작할까요?'))return;try{localStorage.removeItem(KEY)}catch(e){}S=seed();Object.keys(draft).forEach(k=>delete draft[k]);location.hash='#today';render();toast('처음 상태로 돌아왔습니다.');};
$('#ov').addEventListener('click',e=>{if(e.target.id==='ov')closeDr();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDr();});
go();
})();
