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
 {id:'web',     name:'웹사이트·예약 담당', ch:'웹', killer:true,  core:true, plan:'free', does:'agent1000 무료 웹사이트와 원장실을 잇습니다. 24시간 상담 신청·레벨 테스트·문의·리뷰를 서류로 만들고, 결재된 소식·수강료·시간표만 웹에 올립니다.', when:'웹 이벤트 발생 시 · 매주 월요일', needs:'공개 게시·상담 확정은 즉시 확인, 리뷰 답글·주간 리포트는 아침', src:'웹사이트 이벤트·시간표·수납·지식 슬롯 9칸'},
 {id:'content', name:'콘텐츠 담당',     ch:'콘', killer:true,  core:true, plan:'free', does:'이번 주 소재 3장(수업 이야기·학사 일정·공부법)으로 광장·웹사이트 글과 인스타·블로그·플레이스 복붙 꾸러미를 만듭니다. 성적·합격 실적은 쓰지 않습니다.', when:'매주 월요일 소재 갱신', needs:'공개 게시라 원장 확인', src:'수업 기록·시간표·허가 사진'},
 {id:'place',   name:'플레이스 담당',   ch:'플', killer:false, core:true, plan:'basic', does:'학원 정보만 넣으면 네이버·카카오맵·구글·당근에 그대로 붙여 넣을 등록 꾸러미와 대표 키워드, 사진 체크리스트를 만듭니다. 직접 올리지 않고 순위 약속도 하지 않습니다.', when:'요청 시 · 분기 1회 점검', needs:'원장 확인 후 직접 붙여넣기', src:'학원 기본 정보·키워드'},
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
 ].map(s=>Object.assign(s,{version:1,records:[],personal:[],term:{total:24,used:8,end:'2026-11-30',next:'2026-12-02'}}));
 const byId=Object.fromEntries(S.map(s=>[s.id,s]));
 byId.S1.term={total:24,used:19,end:'2026-10-05',next:'2026-10-07'};
 byId.S9.term={total:16,used:14,end:'2026-09-30',next:'2026-10-06'};
 byId.S3.term={total:24,used:20,end:'2026-10-12',next:'2026-10-14'};
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
  site:seedSite(),
 };
 return st;
}
/* agent1000 프리미엄 웹사이트(무료)와 이어지는 상태 — 실제 사이트·서버는 미연결, 모의 */
function seedSite(){
 return {slug:'suhak-forest',url:'agent1000.kr/site/suhak-forest',
  live:{popup:null,tuition:false,timetable:true,seats:true,teachers:true},
  capacity:{A:8,B:6,C:6},
  /* 문의 답변 지식 슬롯 9칸 — 채울수록 웹 챗이 답하는 범위가 넓어지고, 빈 칸은 "원으로 문의"로 돌아감 */
  knowledge:{tuition:'중등 수학·영어 주 2회 90분, 월 320,000원. 교재비 별도.',schedule:'중2 수학 A 월·수 16:00, 초6 수학 B 화·목 15:00, 중3 영어 C 월·수 18:00.',levelTest:'웹사이트에서 무료 AI 레벨 테스트를 먼저 보고, 첫 상담 때 20분 진단을 함께 합니다.',classSize:'한 반 최대 8명. 레벨 테스트 결과로 편성합니다.',curriculum:'학기 중 내신 대비, 방학 중 다음 학기 선행.',consult:'웹사이트 상담 신청은 24시간, 전화 상담은 평일 14~18시.',location:'판교역 3번 출구 도보 5분. 건물 주차 불가.',refund:'',shuttle:''},
  posts:[],place:null,
  news:[{t:'2027학년도 수능 11월 19일 시행 확정',src:'교육부',at:'2026-09-14'},{t:'중학교 자유학기제 개편안 발표',src:'교육부',at:'2026-09-13'},{t:'경기도교육청 2학기 학업성취도 평가 일정',src:'경기도교육청',at:'2026-09-12'}],
  levelTests:[],plaza:{views:312,saves:9,conv:2,src:'플랫폼 집계(모의)'},
  reviews:[{id:'R1',author:'초6 학부모',rating:5,text:'매주 리포트를 보내 주셔서 아이가 뭘 배우는지 알 수 있어요.',at:'2026-09-08',reply:'리포트를 읽어 주셔서 감사합니다. 아이가 수업에서 한 이야기를 그대로 담고 있습니다.'}],
  requests:[],chats:[],surveys:[],
  stats:{visits:184,inquiries:6,bookings:2,prev:{visits:150,inquiries:4,bookings:1}}};
}
const KSLOT=[['tuition','수강료',['수강료','학원비','비용','얼마','원비']],['schedule','시간표',['시간표','시간','요일','몇 시']],['levelTest','레벨 테스트',['레벨','테스트','진단','시험']],['classSize','반 정원',['정원','몇 명','인원','소수']],['curriculum','커리큘럼',['커리큘럼','진도','선행','내신','교재']],['consult','상담 시간',['상담','전화','문의']],['location','위치·주차',['위치','주소','어디','주차','역']],['refund','환불',['환불','취소','반환']],['shuttle','셔틀',['셔틀','버스','차량','픽업']]];

let S=load()||seed();
if(!S.site){S.site=seedSite();}
if(!S.site.knowledge){const f=seedSite();Object.assign(S.site,{knowledge:f.knowledge,posts:[],place:null,news:f.news,levelTests:[],plaza:f.plaza,surveys:[]});}
S.students.forEach(s=>{if(!s.term)s.term={total:24,used:8,end:'2026-11-30',next:'2026-12-02'};});
['web','content','place'].forEach(k=>{if(S.hired&&S.hired[k]===undefined)S.hired[k]=true;});
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
 afterApprove(d);
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

/* ---------- 웹사이트 담당 (agent1000 프리미엄 웹사이트 ↔ 원장실) ---------- */
const WEEK=[['2026-09-15','화'],['2026-09-16','수'],['2026-09-17','목'],['2026-09-18','금']];
function consultSlots(){
 /* 원장실 시간표에서 실제로 비어 있는 상담 시간만 웹에 연다: 강사 수업·기존 상담·웹 신청과 겹치지 않는 칸 */
 const taken=new Set([...S.leads.filter(l=>l.slot).map(l=>l.slot),...S.site.requests.map(r=>r.slot)]);
 const out=[];
 WEEK.forEach(([date,day])=>[15,16,17,18].forEach(h=>{const iso=`${date} ${h}:00`;if(taken.has(iso))return;
  const teacherFree=!Object.values(S.classes).some(c=>c.days.includes(day)&&c.start<=h&&h<c.end&&c.teacher==='김민정');
  out.push({iso,label:`${date.slice(5).replace('-','/')}(${day}) ${h}:00`,teacherFree});}));
 return out;
}
function webBook(name,phone,slotIso,clsId){
 /* 플랫폼 규칙: 로그인 없이 이름·전화만 받고, 확정은 사람이 한다 (status=requested) */
 const slot=consultSlots().find(s=>s.iso===slotIso);if(!slot)return toast('그 시간은 방금 찼습니다. 다른 시간을 골라 주세요.',true);
 const id='WR'+(S.site.requests.length+1);const c=cls(clsId);
 S.site.requests.push({id,name,phone,slot:slotIso,cls:clsId,status:'requested',at:TODAY});
 S.leads.push({id:'L'+(S.leads.length+1),name,source:'웹사이트 상담 신청',stage:'requested',cls:clsId,slot:slotIso,reqId:id});
 S.site.stats.bookings++;
 const lt=S.site.levelTests.slice(-1)[0];
 const body=`${name} 보호자님, 수학의숲 판교학원 상담 요청을 확인했습니다.\n\n상담 시간: ${slot.label} (30분, 무료)\n희망 반: ${c.name} · 담당 ${c.teacher} 선생님${slot.teacherFree?' 동석 가능':' (원장 상담 후 강사 연결)'}\n장소: 판교역 3번 출구 도보 5분, 2강의실\n${lt?`\n웹 레벨 테스트 결과(${lt.subject} ${lt.band}, ${lt.n}/${lt.total})를 참고해 첫 상담 때 20분 진단을 함께 합니다.`:'\n첫 상담 때 20분 진단을 함께 합니다.'} 시간을 바꾸시려면 이 문자에 답장해 주세요.\n\n수학의숲 판교학원 드림`;
 addDoc({key:'webbook:'+id,kind:'webbook',tier:'now',by:'웹사이트·예약 담당',ic:'웹',ico:'b',title:`${name} 웹 상담 요청 (확정 대기)`,sum:`${slot.label} · ${c.name} 희망 · 잔여석 ${seatsLeft(clsId)}석${lt?` · 레벨 테스트 ${lt.band}`:''} · 결재해야 확정`,body,evidence:[{l:'요청 경로',v:'웹사이트 상담 신청 칸 (로그인 없음, 이름·전화만)'},{l:'연락처',v:phone},{l:'시간 검사',v:'강사 수업·다른 상담과 겹치지 않음'},{l:'잔여석',v:`${c.name} ${seatsLeft(clsId)}석`},...(lt?[{l:'레벨 테스트',v:`${lt.grade} ${lt.subject} · ${lt.band} (${lt.n}/${lt.total}) · 개인정보 없음`}]:[])],recipient:name+' 보호자',reqId:id});
 log('웹 상담 요청',`${name} · ${slot.label}`,'웹사이트·예약 담당');save();render();toast('요청이 접수됐어요. 결재함(지금 확인)에서 결재해야 확정 안내가 나갑니다.');
}
const seatsLeft=id=>Math.max(0,S.site.capacity[id]-cls(id).members.length);
function webAsk(q){
 const hit=answerFromKnowledge(q);S.site.stats.inquiries++;
 if(hit&&hit.a){S.site.chats.push({q,a:hit.a,src:'FAQ',slot:hit.label});log('웹 문의 자동 답변',`"${q}" → 슬롯「${hit.label}」`,'문의 답변 담당');save();render();return;}
 const why=hit?`「${hit.label}」 칸이 비어 있음`:'지식 슬롯 9칸 중 해당 없음';
 S.site.chats.push({q,a:'이 질문은 학원에서 확인한 뒤 답변드리겠습니다. 연락처를 남겨 주시면 오늘 안에 연락드립니다.',src:'escalated',slot:hit?hit.label:null});
 addDoc({key:'inquiry:'+S.site.chats.length,kind:'inquiry',tier:'morning',by:'문의 답변 담당',ic:'문',title:`웹 문의 답변 (${hit?hit.label+' 칸 비어 있음':'슬롯 밖'})`,sum:`"${q.slice(0,28)}${q.length>28?'…':''}" · ${why} · 원장님 답을 적어 결재하면 ${hit?'그 칸에 채워집니다':'담당자가 연락합니다'}`,body:`방문자 질문: ${q}\n\n답변 (원장님이 적어 주세요):\n`,evidence:[{l:'질문',v:q},{l:'지식 슬롯 대조',v:why},{l:'규칙',v:'범위 밖은 추측하지 않고 담당자에게 넘김'}],recipient:'웹 방문자 (연락처 대기)',slotKey:hit?hit.k:null});
 log('웹 문의 넘김',q.slice(0,30),'문의 답변 담당');save();render();toast(`${why}. 답을 만들지 않고 아침 결재함으로 넘겼습니다.`);
}
function webReview(rating,text){
 const id='R'+(S.site.reviews.length+1);S.site.reviews.push({id,author:'재원 학부모',rating,text,at:TODAY,reply:null});
 const draft=rating>=4?`말씀 감사합니다. 아이가 수업에서 한 이야기를 그대로 리포트에 담고 있습니다. 앞으로도 매주 같은 방식으로 알려드리겠습니다.`:`솔직하게 말씀해 주셔서 감사합니다. 말씀하신 부분은 담당 선생님과 함께 확인하고, 이번 주 안에 직접 연락드리겠습니다.`;
 addDoc({key:'review:'+id,kind:'review',tier:'morning',by:'웹사이트 담당',ic:'웹',title:`웹사이트 리뷰 답글 (별 ${rating}개)`,sum:`"${text.slice(0,26)}${text.length>26?'…':''}" · 답글 초안 1개 · 성적·합격 실적 언급 없음`,body:draft,evidence:[{l:'리뷰',v:text},{l:'별점',v:rating+'개'},{l:'규칙',v:'과한 약속·성적 자랑 금지, 학원 말투'}],recipient:'웹사이트 리뷰 페이지 (공개)',reviewId:id});
 log('웹 리뷰 접수',`별 ${rating}개`,'웹사이트 담당');save();render();toast('리뷰가 들어왔습니다. 답글 초안이 아침 결재함에 준비되었습니다.');
}
function preparePopup(text){
 const clean=(text||'').trim();if(!clean)return toast('한 줄 소식을 적어 주세요.',true);
 const body=`[상단 띠] ${clean}\n[팝업] ${clean}\n게시 기간: 9월 14일 ~ 9월 30일\n\n같은 문구를 네이버 플레이스·카카오 채널에도 복사해 쓸 수 있게 준비했습니다 (게시는 원장 결재 후).`;
 addDoc({key:'news:'+clean,kind:'news',tier:'now',by:'학원 소식 담당',ic:'소',ico:'r',title:'웹사이트 상단 소식 게시',sum:`"${clean.slice(0,30)}" · 공개 게시라 즉시 확인`,body,evidence:[{l:'원장 메모',v:clean},{l:'게시 위치',v:'웹사이트 상단 띠 + 팝업'},{l:'규칙',v:'이모지·성적 자랑 없음, 기간 명시'}],recipient:'웹사이트 (공개)'});
 log('소식 초안 준비',clean,'학원 소식 담당');save();render();toast('소식 초안을 준비했습니다. 공개 게시라 결재함(지금 확인)에서 확인해 주세요.');
}
function prepareTuitionPost(){
 const body=`수강료 안내 (교육청 게시 기준)\n\n중2 수학 A · 주 2회 90분 · 월 320,000원\n초6 수학 B · 주 2회 90분 · 월 320,000원\n중3 영어 C · 주 2회 90분 · 월 320,000원\n교재비 별도 · 환불은 학원법 환불 기준표에 따릅니다.\n\n게시일 2026년 9월 14일 · 수납 장부의 청구 금액과 같습니다.`;
 addDoc({key:'tuition:2026-09',kind:'tuition',tier:'now',by:'행정 서류 담당',ic:'행',ico:'a',title:'수강료 게시문 (웹사이트 공개)',sum:'수납 장부 청구 금액 그대로 · 교육청 게시 의무 · 공개라 즉시 확인',body,evidence:[{l:'근거',v:'9월 청구서 3개 반 320,000원'},{l:'규정',v:'학원법 수강료 게시 의무'},{l:'환불',v:'AI 계산 없음, 기준표 링크'}],recipient:'웹사이트 (공개)'});
 log('수강료 게시문 준비','9월','행정 서류 담당');save();render();toast('수강료 게시문을 준비했습니다. 결재하면 웹사이트에 공개됩니다.');
}
function prepareWebReport(){
 const s=S.site.stats,p=s.prev;const d=(a,b)=>a-b>=0?'+'+(a-b):String(a-b);
 const body=`웹사이트 주간 리포트 (9월 7일 ~ 9월 13일)\n\n방문 ${s.visits}회 (지난주 ${p.visits}, ${d(s.visits,p.visits)})\n문의 ${s.inquiries}건 (지난주 ${p.inquiries}, ${d(s.inquiries,p.inquiries)}) · FAQ 자동 답변 비율은 다음 주부터 측정\n상담 신청 ${s.bookings}건 (지난주 ${p.bookings}, ${d(s.bookings,p.bookings)})\n\n말할 수 있는 것: 상담 신청은 모두 웹사이트 빈 시간 칸에서 들어왔습니다.\n말할 수 없는 것: 방문이 늘어난 이유(검색·소개·소식 게시)는 아직 구분되지 않습니다. 등록 전환은 상담이 끝나야 셉니다.\n\n제안: 이번 주 상단 소식 한 줄을 올려 보고 다음 주 방문과 비교합니다.`;
 addDoc({key:'webreport:2026-09-14',kind:'webreport',tier:'morning',by:'웹사이트 담당',ic:'웹',title:'웹사이트 주간 리포트',sum:`방문 ${s.visits} · 문의 ${s.inquiries} · 상담 신청 ${s.bookings} · 말할 수 없는 것도 적음`,body,evidence:[{l:'방문',v:`${s.visits} (지난주 ${p.visits})`},{l:'문의',v:`${s.inquiries} (지난주 ${p.inquiries})`},{l:'상담 신청',v:`${s.bookings} (지난주 ${p.bookings})`}],recipient:null});
}
function afterApprove(d){
 /* 결재가 곧 웹사이트 반영: 결재된 것만 공개된다 */
 if(d.kind==='webbook'){const l=S.leads.find(x=>x.reqId===d.reqId);if(l)l.stage='consulted';const r=S.site.requests.find(x=>x.id===d.reqId);if(r)r.status='confirmed';}
 if(d.kind==='review'){const r=S.site.reviews.find(x=>x.id===d.reviewId);if(r)r.reply=d.body;}
 if(d.kind==='news'){S.site.live.popup=d.body.split('\n')[0].replace('[상단 띠] ','');}
 if(d.kind==='tuition'){S.site.live.tuition=true;}
 if(d.kind==='timetable'){S.site.live.timetable=true;}
 if(d.kind==='sns'){const m=MATERIALS.find(x=>x.id===d.material);S.site.posts.unshift({t:m?m.t:'소식',text:d.text||d.body.split('\n')[3]||'',at:TODAY,faces:{site:true,plaza:true,sns:'copy'}});S.site.plaza.views+=0;}
 if(d.kind==='place'){S.site.place={at:TODAY,channels:{naver:false,kakao:false,google:false,karrot:false}};}
 if(d.kind==='inquiry'&&d.slotKey){const ans=d.body.split('답변 (원장님이 적어 주세요):')[1];if(ans&&ans.trim())S.site.knowledge[d.slotKey]=ans.trim();}
}
const webOpen=()=>docsOpen().filter(d=>['webbook','inquiry','review','survey'].includes(d.kind));

/* ---------- 지식 슬롯 답변 (문의 답변 담당) ---------- */
function answerFromKnowledge(q){
 for(const [k,label,words] of KSLOT){if(words.some(w=>q.includes(w))){const v=(S.site.knowledge[k]||'').trim();return v?{k,label,a:v}:{k,label,a:null};}}
 return null;
}

/* ---------- 무료 AI 레벨 테스트 (개인정보 없음 · 결정론적) ---------- */
const LEVEL_Q={
 '수학':[{q:'y = x²의 그래프를 왼쪽으로 3만큼 옮긴 식은?',c:['y = (x − 3)²','y = (x + 3)²','y = x² + 3'],a:1},{q:'일차방정식 2x + 5 = 11의 해는?',c:['x = 2','x = 3','x = 8'],a:1},{q:'다음 중 이차함수 y = −x² + 4의 최댓값은?',c:['0','4','−4'],a:1},{q:'분수 3/4 + 1/6 은?',c:['11/12','4/10','5/12'],a:0},{q:'직각삼각형에서 빗변이 5, 한 변이 3이면 나머지 변은?',c:['2','4','√34'],a:1}],
 '영어':[{q:'빈칸: She ___ to school every day.',c:['go','goes','going'],a:1},{q:'"I have lived here since 2020." 시제는?',c:['과거','현재완료','미래'],a:1},{q:'"despite"와 뜻이 가장 가까운 것은?',c:['because of','in spite of','instead of'],a:1},{q:'빈칸: If it ___ tomorrow, we will stay home.',c:['rains','will rain','rained'],a:0},{q:'"The book was written by her."는?',c:['능동태','수동태','명령문'],a:1}],
};
function scoreLevel(subject,answers){
 const qs=LEVEL_Q[subject]||LEVEL_Q['수학'];const n=qs.filter((x,i)=>answers[i]===x.a).length;
 const band=n>=4?'심화':n>=2?'보통':'기초';
 const rec=subject==='영어'?'C':'A';
 return {n,total:qs.length,band,rec,note:{'심화':'개념이 잘 잡혀 있습니다. 응용·심화 반이 맞습니다.','보통':'기본 개념은 있고 몇 군데 다시 짚으면 됩니다. 정규 반이 맞습니다.','기초':'개념부터 차근히 다지는 반이 맞습니다. 첫 상담에서 20분 진단을 함께 합니다.'}[band]};
}

/* ---------- 콘텐츠 담당 (무료 · 콘텐츠 매니저) ---------- */
const MATERIALS=[
 {id:'m1',t:'이번 주 수업 이야기',tip:'무엇을 배웠는지 한 문단 — 학생 이름과 얼굴은 빼 주세요',seed:()=>{const ex=S.exams[0];return `이번 주 중2 수학 A반은 이차함수의 평행이동을 다뤘습니다. 꼭짓점을 잡는 연습을 하고, 그래프를 옮길 때 부호가 어떻게 바뀌는지 직접 그려 보았습니다. 다음 주에는 ${ex?ex.units[4]:'최댓값·최솟값'}으로 이어집니다.`}},
 {id:'m2',t:'학사 일정 안내',tip:'시험 기간, 보강, 휴원일 — 학부모가 가장 먼저 찾는 정보예요',seed:()=>`9월 셋째 주 안내입니다. 중간고사 대비는 9월 22일(월)부터 시작합니다. 추석 연휴(10월 3~6일)는 휴원이며, 결석 보강은 담당 선생님이 개별로 안내합니다.`},
 {id:'m3',t:'학습 방법 한 가지',tip:'성적·합격 실적 대신 공부법으로 — 광고 심의 대상이 아닙니다',seed:()=>`오늘 푼 문제 하나를 아이가 말로 설명해 보게 해 주세요. 한 문장이면 충분합니다. 설명이 막히는 지점이 바로 다음 수업에서 다시 볼 곳입니다.`},
];
const SURFACES=[['plaza','콘텐츠 광장','저장'],['site','학원 웹사이트','저장'],['insta','인스타그램','복사'],['blog','네이버 블로그','복사'],['place','네이버 플레이스','복사']];
function prepareContent(mid,text){
 const m=MATERIALS.find(x=>x.id===mid);const clean=(text||'').trim();if(!clean)return toast('소재 글을 적어 주세요.',true);
 if(/합격|1등급|만점|성적 향상|성적이 올/.test(clean))return toast('성적·합격 실적 표현은 표시광고 심의 대상이라 초안을 만들지 않습니다. 공부법이나 수업 이야기로 바꿔 주세요.',true);
 const body=`[${m.t}]\n\n■ 콘텐츠 광장·학원 웹사이트 (결재하면 앱이 저장)\n${clean}\n\n■ 인스타그램 (복사해서 올리기)\n${clean.split('.')[0]}.\n#수학의숲판교 #판교수학학원 #중등수학\n\n■ 네이버 블로그 (복사해서 올리기)\n${m.t} — 수학의숲 판교학원\n${clean}\n\n■ 네이버 플레이스 소식 (복사해서 올리기)\n${clean.slice(0,90)}${clean.length>90?'…':''}\n\n자동으로 올라가지 않습니다. 광장·웹사이트만 앱이 저장하고, 나머지는 복사해서 붙여 넣습니다.`;
 addDoc({key:'sns:'+mid+':'+clean.slice(0,20),kind:'sns',tier:'morning',by:'콘텐츠 담당',ic:'콘',ico:'b',title:`${m.t} · 5면 초안`,sum:'광장·웹사이트 저장 2면 + 인스타·블로그·플레이스 복붙 3면 · 학생 이름 없음',body,evidence:[{l:'소재',v:m.t},{l:'규칙',v:m.tip},{l:'게시 방식',v:'광장·웹사이트 저장 / 나머지 복사'}],recipient:'웹사이트·광장 (공개)',material:mid,text:clean});
 log('콘텐츠 초안 준비',m.t,'콘텐츠 담당');save();render();toast('5면 초안을 준비했습니다. 아침 결재함에서 결재하면 광장·웹사이트에 올라갑니다.');
}
function preparePlace(){
 const k=['판교수학학원','중등수학','초등수학','중3영어','내신대비','소수정예'];
 const body=`플레이스 등록 꾸러미 (붙여넣기용)\n\n■ 상호: 수학의숲 판교학원\n■ 업종: 학원 > 수학·영어\n■ 한 줄 소개: 매주 리포트로 아이의 수업을 그대로 알려드리는 판교 중등 수학·영어 학원\n■ 대표 키워드: ${k.join(', ')}\n■ 주소·교통: 판교역 3번 출구 도보 5분 · 주차 불가\n■ 운영시간: 평일 14:00~20:00 (수업 시간표는 웹사이트)\n■ 전화·상담: 웹사이트 상담 신청 24시간\n\n채널별 글자 수 맞춤: 네이버 플레이스(소개 300자) · 카카오맵(200자) · 구글 비즈니스(750자) · 당근(동네 소개 100자)\n\n사진 체크리스트: 외관 1 · 강의실 2 · 교재 1 · 학생 얼굴 없는 수업 장면 1\n\n직접 올려 드리지는 않습니다. 순위를 올려 준다는 약속도 하지 않습니다.`;
 addDoc({key:'place:2026-09',kind:'place',tier:'morning',by:'플레이스 담당',ic:'플',title:'플레이스 등록 꾸러미 (네이버·카카오·구글·당근)',sum:`대표 키워드 ${k.length}개 · 채널별 글자 수 맞춤 · 사진 체크리스트 5장 · 직접 붙여넣기`,body,evidence:[{l:'근거',v:'학원 기본 정보·시간표·수강료 게시문'},{l:'키워드',v:k.join(', ')},{l:'규칙',v:'순위 상승 약속 없음, 직접 게시 없음'}],recipient:null});
 log('플레이스 꾸러미 준비','4채널','플레이스 담당');save();render();toast('플레이스 등록 꾸러미를 준비했습니다. 아침 결재함에서 확인 후 채널에 붙여 넣으세요.');
}
/* ---------- 재등록 담당 (성적 근거 없음 · 남은 회차·종료일만) ---------- */
const daysTo=d=>Math.round((new Date(d)-new Date(TODAY))/864e5);
function reenrollDue(){return S.students.filter(s=>s.term&&daysTo(s.term.end)<=30&&daysTo(s.term.end)>=0);}
function prepareReenroll(s){
 const t=s.term;const left=t.total-t.used;
 const body=`${s.guardian}께, ${s.name} 학생의 ${cls(s.cls).name} 수강이 ${t.end.slice(5).replace('-','월 ')}일에 끝납니다.\n\n남은 수업: ${left}회 (전체 ${t.total}회 중 ${t.used}회 진행)\n다음 학기 시작: ${t.next.slice(5).replace('-','월 ')}일\n\n다음 학기 계속 다닐지 편하게 알려 주세요. 궁금한 점은 상담을 잡아 드리겠습니다.\n\n수학의숲 판교학원 드림`;
 return addDoc({key:'reenroll:'+s.id+':'+t.end,kind:'reenroll',tier:'morning',by:'재등록 담당',ic:'재',title:`${s.name} 재등록 안내`,sum:`종료 ${daysTo(t.end)}일 전 · 남은 ${left}회 · 성적 언급 없음`,body,evidence:[{l:'수강 종료',v:t.end},{l:'남은 회차',v:`${left}/${t.total}`},{l:'다음 학기',v:t.next},{l:'규칙',v:'성적을 근거로 쓰지 않음'}],studentId:s.id,recipient:s.guardian});
}
/* ---------- 학부모 페이지 셀프 서비스 ---------- */
function parentBook(slotIso){
 const s=stu('S1');const slot=consultSlots().find(x=>x.iso===slotIso);if(!slot)return toast('그 시간은 방금 찼습니다.',true);
 const id='WR'+(S.site.requests.length+1);S.site.requests.push({id,name:s.name,phone:'(학부모 페이지 로그인)',slot:slotIso,cls:s.cls,status:'requested',at:TODAY,src:'parent'});
 S.leads.push({id:'L'+(S.leads.length+1),name:s.name+' 보호자',source:'학부모 페이지 상담 요청',stage:'requested',cls:s.cls,slot:slotIso,reqId:id});
 addDoc({key:'webbook:'+id,kind:'webbook',tier:'now',by:'웹사이트·예약 담당',ic:'웹',ico:'b',title:`${s.guardian} 상담 요청 (재원)`,sum:`${slot.label} · 학부모 페이지에서 요청 · 확정 안내는 원장 확인 후`,body:`${s.guardian}께, ${s.name} 학생 상담 요청을 확인했습니다.\n\n상담 시간: ${slot.label} (30분)\n담당: ${cls(s.cls).teacher} 선생님${slot.teacherFree?' 동석':' (원장 상담)'}\n\n시간을 바꾸시려면 이 문자에 답장해 주세요.\n\n수학의숲 판교학원 드림`,evidence:[{l:'요청 경로',v:'학부모 페이지 (로그인)'},{l:'학생',v:s.name+' · '+cls(s.cls).name},{l:'시간 검사',v:'수업·다른 상담과 겹치지 않음'}],studentId:s.id,recipient:s.guardian,reqId:id});
 log('학부모 상담 요청',`${s.guardian} · ${slot.label}`,'웹사이트·예약 담당');save();render();toast('상담 요청이 접수됐어요. 학원에서 확인한 뒤 확정 안내가 옵니다.');
}
function parentSurvey(rating,note){
 S.site.surveys.push({rating,note,at:TODAY,studentId:'S1'});
 addDoc({key:'survey:S1:'+TODAY,kind:'survey',tier:rating<=3?'now':'auto',by:'웹사이트·예약 담당',ic:'웹',ico:rating<=3?'r':'',title:`이서준 보호자 만족도 ${rating}점`,sum:rating<=3?'3점 이하 · 원장이 직접 연락 제안 · 지금 확인':'4점 이상 · 기록만 남김 · 자동 처리',body:`만족도 ${rating}/5\n한 줄: ${note||'(없음)'}\n\n${rating<=3?'제안: 이번 주 안에 원장이 직접 전화해 이야기를 듣습니다. 이유를 추측하지 않습니다.':'감사 인사는 다음 리포트 끝에 한 줄로 붙입니다.'}`,evidence:[{l:'점수',v:rating+'/5'},{l:'한 줄',v:note||'—'}],studentId:'S1',recipient:rating<=3?'이서준 어머니':null});
 log('만족도 설문 접수',`${rating}점`,'웹사이트·예약 담당');save();render();toast('설문을 보냈어요. 감사합니다.');
}
/* ---------- 경영지원 (행정 서류 담당) ---------- */
const BIZ_DOCS=['수강 계약서','환불 규정 안내문','휴원·보강 안내문','강사 채용 공고'];
const BIZ_FAQ=[['학원법 등록·변경','교습 과목·정원·교습비를 바꾸면 14일 안에 교육지원청에 변경 등록합니다.'],['교습비 반환 기준','학원법 시행령 제18조. 교습 시작 전 전액, 시작 후 경과 기간에 따라 일할 반환. 계산은 기준표로만 합니다.'],['강사 채용 결격조회','채용 전 성범죄·아동학대 경력 조회를 반드시 거칩니다.'],['표시광고 심의','성적·합격 실적 광고는 심의 대상입니다. 공부법·수업 이야기는 대상이 아닙니다.']];
const BIZ_CAL=[['2026-09-25','3분기 원천세 신고 준비'],['2026-10-25','부가가치세 예정신고 (간이과세 제외)'],['2026-10-31','교습비 게시 현황 점검']];
function prepareBizDoc(name){
 addDoc({key:'biz:'+name,kind:'biz',tier:'morning',by:'행정 서류 담당',ic:'행',title:`${name} 초안`,sum:'학원법 기준 서식 · 학원 정보 자동 채움 · 전문가 검토 연결 가능',body:`${name} (초안)\n\n학원명: 수학의숲 판교학원\n작성일: 2026년 9월 14일\n\n[본문은 학원법 기준 서식에 학원 정보를 채운 초안입니다. 금액·기간 칸은 수납 장부와 시간표에서 가져왔습니다.]\n\n이 초안은 정보 정리와 서식 채움까지입니다. 법적 효력이 필요한 문서는 제휴 세무사·노무사 검토를 연결해 드립니다.`,evidence:[{l:'근거',v:'학원법·시행령, 학원 기본 정보'},{l:'한계',v:'정보 → 초안 → 전문가 연결까지만'}],recipient:null});
 log('행정 서류 초안',name,'행정 서류 담당');save();render();toast(`${name} 초안을 아침 결재함에 준비했습니다.`);
}
/* ---------- 오늘 화면 지표 ---------- */
const SAVED_MIN={report:15,billing:10,care:20,career:30,timetable:20,pset:30,webbook:10,inquiry:10,review:15,news:15,tuition:20,webreport:20,sns:30,place:40,reenroll:15,survey:5,biz:40,attend:5,consult:10,makeup:10};
function laborToday(){
 const sent=S.docs.filter(d=>d.status==='sent').length;const auto=S.docs.filter(d=>d.status==='auto').length;
 const prepared=S.docs.length;const saved=S.docs.reduce((a,d)=>a+(SAVED_MIN[d.kind]||10),0);
 return {sent,auto,prepared,saved};
}
function triggers(){
 const t=[];const re=reenrollDue().filter(s=>!S.docs.some(d=>d.kind==='reenroll'&&d.studentId===s.id));
 if(re.length)t.push({id:'t-reenroll',txt:`재등록 시기가 온 학생이 ${re.length}명 있어요. 재등록 담당이 학부모 안내 초안을 준비해 드려요.`,btn:'재등록 안내 준비',act:'reenroll'});
 const unrecorded=S.students.filter(s=>!S.lessonSaved[s.id]).length;
 if(unrecorded>=5)t.push({id:'t-journal',txt:`오늘 수업 기록이 아직 없는 학생이 ${unrecorded}명이에요. 체크 다섯 번이면 리포트 담당이 초안을 준비해요.`,btn:'수업 기록 열기',act:'lesson'});
 const inq=docsOpen().filter(d=>d.kind==='inquiry').length;
 if(inq)t.push({id:'t-inquiry',txt:`답변을 기다리는 학부모 문의가 ${inq}건 있어요. 원장님이 답을 적으면 지식 슬롯에 넣을지 물어봐요.`,btn:'문의 보기',act:'inquiry'});
 return t;
}
function mondayBrief(){
 const st=S.site.stats;const sent=S.docs.filter(d=>d.status==='sent').length;
 if(!S.log.length)return null;
 return [`지난주 웹사이트 방문 ${st.visits}회, 상담 신청 ${st.bookings}건, 문의 ${st.inquiries}건이 들어왔습니다.`,`결재한 서류 ${sent}건이 모의 전송되었고, 살펴볼 학생 ${careList().filter(x=>x.total>=S.policy.threshold).length}명이 표시되어 있습니다.`,`이번 주에는 재등록 시기 학생 ${reenrollDue().length}명의 안내와 콘텐츠 소재 3장이 기다립니다.`];
}
/* ---------- AI 매니저 (원장용 · 장부에 있는 것만 답함) ---------- */
function managerAnswer(q){
 const overdue=S.invoices.filter(isOverdue);const open=docsOpen();
 if(/미납|잔액|수납/.test(q))return `기한 경과 미납은 ${overdue.length}건, 잔액 합계 ${won(overdue.reduce((a,i)=>a+money(i),0))}입니다. ${overdue.map(i=>stu(i.studentId).name).join(', ')} 학생이고, 안내 서류는 결재함 "지금 확인"에 있습니다.`;
 if(/결재|서류|대기/.test(q))return `결재 대기 ${open.length}건입니다. 지금 확인 ${open.filter(d=>d.tier==='now').length}건, 아침 결재함 ${open.filter(d=>d.tier==='morning').length}건입니다.`;
 if(/잔여석|정원|자리/.test(q))return Object.values(S.classes).map(c=>`${c.name} ${seatsLeft(c.id)}석`).join(', ')+' 남았습니다. 웹사이트에 같은 숫자가 보입니다.';
 if(/오늘 수업|수업/.test(q))return Object.values(S.classes).filter(c=>c.days.includes('월')).map(c=>`${c.name} ${fmt(c.start)} (${c.teacher})`).join(', ')+' 입니다.';
 if(/상담|신청|예약/.test(q))return `웹·학부모 페이지 상담 요청은 ${S.site.requests.length}건이고, 그중 원장 확인 대기 ${S.site.requests.filter(r=>r.status==='requested').length}건입니다. 이번 주 빈 상담 칸은 ${consultSlots().length}개입니다.`;
 if(/살펴볼|위험|관심/.test(q)){const c=careList().filter(x=>x.total>=S.policy.threshold);return c.length?`살펴볼 학생은 ${c.map(x=>x.s.name+' '+x.total+'점').join(', ')}입니다. 이유는 추측하지 않고, 신호만 보여 드립니다.`:'기준 이상인 학생이 없습니다.';}
 if(/재등록|종료/.test(q))return reenrollDue().length?`30일 안에 수강이 끝나는 학생은 ${reenrollDue().map(s=>s.name+'('+daysTo(s.term.end)+'일)').join(', ')}입니다.`:'30일 안에 끝나는 수강이 없습니다.';
 if(/수강료|얼마/.test(q))return `9월 청구는 반별 320,000원, 총 ${won(S.invoices.reduce((a,i)=>a+i.amount,0))}입니다. 웹사이트 수강료 게시는 ${S.site.live.tuition?'게시 중':'미게시'}입니다.`;
 if(/웹|방문|문의/.test(q))return `이번 주 웹사이트 방문 ${S.site.stats.visits}회, 문의 ${S.site.stats.inquiries}건, 상담 신청 ${S.site.stats.bookings}건입니다. 광고비는 0원입니다.`;
 return '그건 장부에 없는 내용이라 답하지 않습니다. 필요하면 결재함에 확인 서류로 남겨 드릴까요? (수납·결재·잔여석·수업·상담·살펴볼 학생·재등록·수강료·웹사이트를 물어보실 수 있습니다)';
}

/* ---------- 아침 준비 (교무 실장) ---------- */
function morningPrep(){
 if(S.morningDone)return;
 S.invoices.forEach(inv=>{if(money(inv)>0&&inv.due<TODAY)prepareBilling(inv);});
 prepareCare();prepareCareer('S9');prepareWebReport();
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
 {id:'website',t:'웹사이트',i:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18'},
 {id:'content',t:'콘텐츠·플레이스',i:'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01'},
 {id:'biz',t:'경영지원',i:'M4 7h16v13H4zM9 7V4h6v3M4 13h16'},
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
 const V={today:vToday,students:vStudents,lesson:vLesson,timetable:vTimetable,wrong:vWrong,billing:vBilling,website:vWebsite,content:vContent,biz:vBiz,staff:vStaff,rules:vRules,guide:vGuide};
 $('#mgr').hidden=role!=='owner';
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
 const lab=laborToday();const trig=triggers();const mb=mondayBrief();
 const savedIds=Object.keys(S.lessonSaved);
 const quick=[
  {id:'ledger',by:'학습 장부 담당',pre:['중2 수학 A · 5명','출결·숙제·이해도 체크','오답 3문항 표시'],d:'수업마다 다룬 범위와 숙제를 체크해 두면, 그게 쌓여 아이의 학습 장부가 됩니다.',btn:'기록 열기'},
  {id:'report',by:'학부모 리포트',pre:[savedIds.length?`저장된 기록 ${savedIds.length}명`:'저장된 기록 없음','근거 문장만 사용','보내기 전 원장 확인'],d:'한 주 치 기록을 보호자가 읽기 좋은 한 장으로 정리해요. 보내기 전에 원장님이 확인합니다.',btn:savedIds.length?'초안 준비':'기록부터'},
  {id:'place',by:'플레이스 담당',pre:['판교 · 수학·영어 학원','대표 키워드 6개','사진 체크리스트 5장'],d:'네이버·카카오맵·구글·당근에 그대로 붙여 넣을 등록 꾸러미를 한 번에 만들어요.',btn:'꾸러미 준비'},
  {id:'career',by:'진로 상담 리포트',pre:['강시우 · 관심 2개(본인 기재)','활동 2건 · 희망 2개','9월 17일 상담 전'],d:'학생이 직접 말한 관심과 기록을 모아 이번 상담에서 물어볼 것을 정리해 드려요.',btn:'리포트 준비'},
 ];
 const headline=open.length?`오늘 결재할 서류 ${open.length}건`:'오늘 결재할 서류가 없습니다.';
 const lines=[
  now.length?{n:now.length,u:'건',t:'지금 확인',d:overdue.length?`미납 ${overdue.length}건은 금액이 들어가 맨 앞에 두었습니다`:'금액·상담처럼 바로 볼 서류',cls:'r'}:null,
  morn.length?{n:morn.length,u:'건',t:'아침 결재함',d:'리포트·시간표·문제 세트 등 모아서 보는 서류',cls:''}:null,
  webOpen().length?{n:webOpen().length,u:'건',t:'웹사이트에서 온 것',d:'상담 신청·문의·리뷰 · 위 두 칸에 포함',cls:'b'}:null,
  careN?{n:careN,u:'명',t:'살펴볼 학생',d:`기준 ${S.policy.threshold}점 이상 · 오른쪽 목록`,cls:'a'}:null,
  auto.length?{n:auto.length,u:'건',t:'자동 처리',d:'규칙대로 처리하고 알림만 남김',cls:'g'}:null,
  minor.length?{n:minor.length,u:'건',t:'재결재 없이 유지',d:'어제 결재한 서류를 문장만 다듬음',cls:'g'}:null,
 ].filter(Boolean);
 return `<div class="head"><div><div class="eyebrow">수학의숲 판교학원 · 원장실</div><h1>원장님, 서류가 준비되어 있습니다.</h1><p>AI 직원들이 밤사이 준비한 서류입니다. 원장님은 <b>확인</b>, <b>고치기</b>, <b>보류</b> 세 가지만 하시면 됩니다.</p></div></div>
 <div class="brief"><div><div class="who">교무 실장 · 아침 8:30 정리</div><h2>${headline}</h2>
  ${lines.length?`<ul class="brief-list">${lines.map(l=>`<li><strong class="num ${l.cls}">${l.n}<small>${l.u}</small></strong><div><b>${l.t}</b><span>${l.d}</span></div></li>`).join('')}</ul>`:'<p>장부와 기록에 새로 확인할 것이 없습니다. 준비되는 대로 여기에 쌓입니다.</p>'}</div>
  <div><a href="#rules" class="btn-hold btn-sm" style="display:inline-block;text-decoration:none">결재 규칙 보기</a></div></div>
 <div class="kpis">
  <div class="kpi"><div class="l">재원 학생</div><strong class="num">${S.students.length}<small>명</small></strong><p>반 3개 · 강사 2명 · 오늘 수업 2개 반</p></div>
  <div class="kpi"><div class="l">광고비 0원으로 온 새 학부모 문의</div><strong class="num">${S.site.stats.inquiries+S.site.stats.bookings}<small>건</small></strong><p>이번 달 · 웹사이트 상담 신청·문의</p></div>
  <div class="kpi"><div class="l">미납 잔액</div><strong class="num">${won(overdue.reduce((a,i)=>a+money(i),0))}</strong><p>${overdue.length}건 · 장부 기준</p></div>
  <div class="kpi"><div class="l">원장님의 오늘 노동</div><strong class="num">결재 ${lab.sent}<small>번</small></strong><p>나머지 ${lab.prepared-lab.sent}건은 직원들이 준비 · 절감 추정 ${lab.saved}분</p></div>
 </div>
 ${trig.length?`<div class="bubbles">${trig.map(t=>`<div class="bubble"><p>${t.txt}</p><button class="btn-sm" data-trig="${t.act}">${t.btn}</button></div>`).join('')}</div>`:''}
 <div class="card" style="margin-bottom:22px"><div class="card-h"><div><h2>오늘 바로 쓸 수 있어요</h2><p>카드를 누르면 이 자리에서 바로 일을 시킬 수 있어요. 입력은 장부에서 미리 채워 두었습니다.</p></div><span class="pill b">플랫폼 핵심 직원</span></div>
  <div class="quick">${quick.map(q=>`<div class="qcard"><div class="pre">${q.pre.map(p=>`<span>${esc(p)}</span>`).join('')}</div><div class="qb"><b>${q.by}</b><p>${q.d}</p><button class="btn-ok btn-sm" data-quick="${q.id}">${q.btn}</button></div></div>`).join('')}</div></div>
 <div class="cols"><div class="card">
  <div class="card-h"><div><h2>결재함</h2><p>AI가 준비하고, 원장님이 결재합니다. 결재 없이는 아무것도 나가지 않아요.</p></div><span class="pill">가상 기록</span></div>
  <div class="inbox-sec"><h3>지금 확인 <span class="n">${now.length}</span></h3>${now.length?now.map(docCard).join(''):'<div class="empty">금액·상담처럼 바로 봐야 할 서류가 없습니다.</div>'}</div>
  <div class="inbox-sec"><h3>아침 결재함 <span class="n">${morn.length}</span></h3>${morn.length?morn.map(docCard).join(''):'<div class="empty">리포트·시간표·문제 세트가 준비되면 이곳에 모입니다. <a href="#lesson">수업 기록</a>을 저장해 보세요.</div>'}</div>
  <details class="inbox-sec"><summary style="padding:14px 22px;cursor:pointer;font-size:12px;font-weight:700;color:var(--muted)">자동 처리됨 ${auto.length}건 · 처리 완료 ${done.length}건 (펼치기)</summary>${[...auto,...done].map(docCard).join('')||'<div class="empty">아직 없습니다.</div>'}</details>
 </div>
 <div class="grid">
  <div class="card side"><div class="card-h"><div><h2>살펴볼 학생</h2><p>관심학생 담당 · 기준 ${S.policy.threshold}점 이상 표시</p></div></div><div class="card-b">${care.length?care.map(x=>`<div class="row"><div style="flex:1"><b>${x.s.name}</b> <span class="muted small">${cls(x.s.cls).name}</span><p>${x.parts.map(p=>p.k).join(' · ')}</p></div><span class="score ${x.total>=S.policy.threshold?'hi':x.total>=3?'':'lo'}">${x.total}점</span></div>`).join(''):'<div class="empty">신호가 있는 학생이 없습니다.</div>'}<p class="small muted" style="margin-top:10px">점수 기준은 <a href="#rules">결재 규칙</a>에서 원장님이 직접 바꿀 수 있습니다. 퇴원 확률을 말하지 않습니다.</p></div></div>
  <div class="card side"><div class="card-h"><div><h2>월요 원장 브리핑</h2><p>지난 한 주 · 세 줄 · 지어내지 않음</p></div></div><div class="card-b">${mb?`<ol class="brief3">${mb.map(l=>`<li>${l}</li>`).join('')}</ol>`:'<div class="empty">지난주 활동이 아직 없어요. 방문·상담·결재 기록이 쌓이면 브리핑이 도착해요.</div>'}</div></div>
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

/* ---------- 웹사이트 화면 ---------- */
let webDraft={name:'',phone:'',slot:'',cls:'A',q:'',rating:5,review:'',popup:''};
let ltDraft={grade:'중2',subject:'수학',started:false,answers:[],result:null};
function vWebsite(){
 const st=S.site;const slots=consultSlots();if(!webDraft.slot&&slots.length)webDraft.slot=slots[0].iso;
 const liveN=['popup','tuition','timetable','seats','teachers'].filter(k=>st.live[k]).length;
 const pend=k=>S.docs.find(d=>d.kind===k&&['review','held'].includes(d.status));
 const status=(on,k)=>on?'<span class="pill g">게시 중</span>':pend(k)?'<span class="pill a">결재 대기</span>':'<span class="pill">미게시</span>';
 const mockSite=`<div class="site"><div class="site-bar"><span></span><span></span><span></span><i>${st.url}</i></div>
  ${st.live.popup?`<div class="site-strip">${esc(st.live.popup)}</div>`:'<div class="site-strip off">상단 소식 없음 · 원장실에서 한 줄을 적고 결재하면 여기 걸립니다</div>'}
  <div class="site-hero"><small>수학의숲 판교학원 · 판교역 3번 출구 5분</small><h3>매주 리포트로 아이의 수업을 그대로 알려드립니다.</h3><p>성적 자랑 대신 기록을 보여드립니다. 재원 학부모는 아래 학부모 페이지에서 자녀 리포트·시간표·수강료를 봅니다.</p></div>
  <div class="site-sec"><h4>반과 잔여석 <span class="src">원장실 시간표·명단에서 자동</span></h4><div class="site-classes">${Object.values(S.classes).map(c=>`<div><b>${c.name}</b><span>${c.days.join('·')} ${fmt(c.start)}~${fmt(c.end)} · ${c.teacher} 선생님</span>${st.live.seats?`<em class="${seatsLeft(c.id)<=1?'low':''}">${seatsLeft(c.id)?'잔여 '+seatsLeft(c.id)+'석':'대기 신청'}</em>`:''}</div>`).join('')}</div></div>
  <div class="site-sec"><h4>수강료 안내 <span class="src">행정 서류 담당 · 교육청 게시</span></h4>${st.live.tuition?'<p>중2 수학 A · 초6 수학 B · 중3 영어 C 각 월 320,000원 (주 2회 90분) · 교재비 별도 · 환불 기준표 링크</p>':'<p class="off">게시 전 · 원장 결재 후 공개됩니다</p>'}</div>
  <div class="site-sec"><h4>무료 AI 레벨 테스트 <span class="src">학년·과목만 고르면 진단 · 개인정보 없음 · 서버 호출 없음</span></h4>
   ${(()=>{const t=ltDraft;const qs=LEVEL_Q[t.subject]||LEVEL_Q['수학'];
    if(t.result)return `<div class="lt"><span class="band">${t.result.band}</span> <span class="muted small">${t.subject} ${t.result.n}/${t.result.total} · ${t.grade}</span><p>${t.result.note}</p><p class="small" style="margin-top:6px">맞는 반: <b>${cls(t.result.rec).name}</b> · 잔여 ${seatsLeft(t.result.rec)}석</p><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn-ok btn-sm" id="ltBook">이 결과로 상담 신청</button><button class="btn-sm" id="ltReset">다시 하기</button></div><p class="small muted" style="margin-top:6px">결과는 레벨 밴드와 반 추천뿐, 아이의 프로필이 아닙니다. 첫 상담 때 20분 진단을 함께 합니다.</p></div>`;
    const i=t.answers.length;if(!t.started)return `<div class="site-form"><select data-lt="grade">${['초5','초6','중1','중2','중3','고1'].map(g=>`<option ${t.grade===g?'selected':''}>${g}</option>`).join('')}</select><select data-lt="subject">${['수학','영어'].map(s=>`<option ${t.subject===s?'selected':''}>${s}</option>`).join('')}</select><button class="btn-ok btn-sm" id="ltStart">5문항 시작</button></div>`;
    const q=qs[i];return `<div class="lt"><div class="q">${i+1}/${qs.length} · ${esc(q.q)}</div><div class="opts">${q.c.map((c,j)=>`<button class="chip" data-ltans="${j}">${esc(c)}</button>`).join('')}</div></div>`;})()}</div>
  <div class="site-sec"><h4>상담 신청 <span class="src">원장실 시간표의 빈 시간만 열림 · 로그인 없음</span></h4>
   <div class="site-form"><input type="text" data-web="name" placeholder="학생 이름" value="${esc(webDraft.name)}"><input type="text" data-web="phone" placeholder="보호자 연락처" value="${esc(webDraft.phone)}">
   <select data-web="cls">${Object.values(S.classes).map(c=>`<option value="${c.id}" ${webDraft.cls===c.id?'selected':''}>${c.name}</option>`).join('')}</select>
   <select data-web="slot">${slots.map(s=>`<option value="${s.iso}" ${webDraft.slot===s.iso?'selected':''}>${s.label}${s.teacherFree?' · 강사 동석 가능':''}</option>`).join('')||'<option value="">이번 주 빈 시간 없음</option>'}</select>
   <button class="btn-ok btn-sm" id="webBook" ${slots.length?'':'disabled'}>상담 신청</button></div>
   ${st.requests.length?`<ul class="site-list">${st.requests.map(r=>`<li>${esc(r.name)} · ${r.slot.slice(5)} · ${r.status==='confirmed'?'<span class="pill g">확정 (원장 승인 · 안내 모의 전송)</span>':'<span class="pill a">요청이 접수됐어요 · 학원 확인 중</span>'}</li>`).join('')}</ul>`:''}</div>
  <div class="site-sec"><h4>궁금한 점 바로 묻기 <span class="src">문의 답변 담당 · 학원이 채운 지식 슬롯 ${Object.values(st.knowledge).filter(v=>v&&v.trim()).length}/9칸 안에서만</span></h4>
   <div class="site-chat">${st.chats.slice(-4).map(c=>`<div class="me">${esc(c.q)}</div><div class="bot ${c.src}">${esc(c.a)}<small>${c.src==='FAQ'?'「'+c.slot+'」 칸에서 답함':(c.slot?'「'+c.slot+'」 칸이 비어 있어 원장실로 넘김':'슬롯 밖 질문이라 원장실로 넘김')}</small></div>`).join('')||'<div class="bot">안녕하세요. 수강료·시간표·레벨 테스트·반 정원·커리큘럼·상담·위치를 물어보실 수 있습니다.</div>'}</div>
   <div class="site-form"><input type="text" data-web="q" placeholder="예: 수강료가 얼마인가요?" value="${esc(webDraft.q)}"><button class="btn-sm" id="webAsk">묻기</button><span class="small muted">추천: ${KSLOT.slice(0,5).map(([k,l])=>`<button class="btn-link" data-webq="${l}">${l}</button>`).join(' · ')} · <button class="btn-link" data-webq="셔틀버스가 있나요?">셔틀(빈 칸)</button></span></div></div>
  <div class="site-sec"><h4>배움 이야기 <span class="src">우리 학원 소식 · 알아두면 좋아요 · 오늘의 소식 · 모델 호출 없음</span></h4>
   <div class="stories">${st.posts.slice(0,3).map(p=>`<div class="story"><b>${esc(p.t)}</b>${esc(p.text.slice(0,120))}${p.text.length>120?'…':''}<small> · ${p.at}</small></div>`).join('')||'<div class="story off muted">아직 올라온 학습 이야기가 없어요. 원장실 콘텐츠 화면에서 소재를 결재하면 여기에 실립니다.</div>'}
   <div class="story"><b>알아두면 좋아요 · 오늘 푼 문제 하나 말로 설명하기</b>한 문장이면 충분합니다. 설명이 막히는 곳이 다음 수업에서 다시 볼 곳입니다.<small> · 일반적인 학습 정보예요. 자세한 건 학원에 물어봐 주세요.</small></div>
   ${st.news.map(n=>`<div class="story"><b>오늘의 소식 · ${esc(n.t)}</b><small>${esc(n.src)} · ${n.at} · 원장 해설은 특정 학원의 관점이며 정확한 전형은 공식 발표를 확인하세요.</small></div>`).join('')}</div></div>
  <div class="site-sec"><h4>학부모 후기 <span class="src">재원 학부모만 · 답글은 원장 결재 후</span></h4>
   ${st.reviews.map(r=>`<div class="site-review"><b>${'★'.repeat(r.rating)}<span class="muted"> ${r.author} · ${r.at.slice(5)}</span></b><p>${esc(r.text)}</p>${r.reply?`<p class="reply">학원 답글 · ${esc(r.reply)}</p>`:'<p class="reply off">답글 준비 중 (원장 결재 대기)</p>'}</div>`).join('')}
   <div class="site-form"><select data-web="rating">${[5,4,3].map(n=>`<option value="${n}" ${webDraft.rating===n?'selected':''}>${'★'.repeat(n)}</option>`).join('')}</select><input type="text" data-web="review" placeholder="후기 한 줄 (체험용)" value="${esc(webDraft.review)}"><button class="btn-sm" id="webReview">후기 남기기</button></div></div>
  <div class="site-foot"><button class="btn-sm" id="toParent">학부모 페이지 로그인 → 자녀 리포트·시간표·수강료</button><span class="muted small">AI 활용 동의한 자녀의 기록만 보입니다</span></div></div>`;
 return `<div class="head"><div><div class="eyebrow">웹사이트 · 웹사이트 담당 · agent1000 프리미엄 웹사이트(무료)</div><h1>웹사이트는 결재함의 입구이고, 결재된 것만 밖으로 나갑니다.</h1><p>agent1000이 무료로 주는 학원 웹사이트를 원장실에 연결했습니다. 웹에서 온 상담 신청·문의·후기는 서류가 되어 결재함에 오고, 소식·수강료·시간표·잔여석은 원장실 장부에서 그대로 올라가되 공개는 결재 뒤에만 합니다.</p></div></div>
 <div class="kpis"><div class="kpi"><div class="l">이번 주 방문</div><strong class="num">${st.stats.visits}<small>회</small></strong><p>지난주 ${st.stats.prev.visits}회</p></div><div class="kpi"><div class="l">웹에서 온 문의·후기·상담</div><strong class="num">${st.stats.inquiries+st.stats.bookings+st.reviews.length}<small>건</small></strong><p>결재 대기 ${webOpen().length}건</p></div><div class="kpi"><div class="l">웹사이트에 게시 중</div><strong class="num">${liveN}<small>/5</small></strong><p>결재된 것만 공개</p></div><div class="kpi"><div class="l">이번 주 빈 상담 시간</div><strong class="num">${slots.length}<small>칸</small></strong><p>시간표에서 자동 계산</p></div></div>
 <div class="cols"><div>
  <div class="card"><div class="card-h"><div><h2>방문자가 보는 웹사이트 (모의)</h2><p>직접 신청·질문·후기를 남겨 보면 결재함에 어떻게 들어오는지 볼 수 있습니다</p></div><span class="pill">실제 사이트 미연결</span></div><div class="card-b">${mockSite}</div></div>
 </div><div class="grid">
  <div class="card side"><div class="card-h"><div><h2>웹사이트에 올라가는 것</h2><p>모두 원장실 장부가 근거 · 공개는 결재 뒤</p></div></div><div class="card-b">
   <div class="row"><div style="flex:1"><b>상단 소식·팝업</b><p>학원 소식 담당 · 원장 한 줄 → 초안 → 지금 확인</p><div class="site-form" style="margin-top:6px"><input type="text" data-web="popup" placeholder="예: 겨울방학 특강 상담 시작" value="${esc(webDraft.popup)}"><button class="btn-sm" id="webPopup">초안 준비</button></div></div>${status(!!st.live.popup,'news')}</div>
   <div class="row"><div style="flex:1"><b>수강료 게시</b><p>행정 서류 담당 · 수납 장부 청구 금액 그대로 · 교육청 게시 의무</p>${st.live.tuition||pend('tuition')?'':'<button class="btn-sm" id="webTuition" style="margin-top:6px">게시문 준비</button>'}</div>${status(st.live.tuition,'tuition')}</div>
   <div class="row"><div style="flex:1"><b>시간표</b><p>시간표 담당 · 변경 배포 서류가 결재되면 웹이 먼저 바뀜</p></div>${status(st.live.timetable,'timetable')}</div>
   <div class="row"><div style="flex:1"><b>반별 잔여석</b><p>정원 − 재원 명단 · 0석이면 "대기 신청"으로 바뀜</p></div><label class="chk"><input type="checkbox" data-live="seats" ${st.live.seats?'checked':''}> 공개</label></div>
   <div class="row"><div style="flex:1"><b>강사 소개</b><p>이름·담당 반만 · 학력·실적 문구 없음</p></div><label class="chk"><input type="checkbox" data-live="teachers" ${st.live.teachers?'checked':''}> 공개</label></div>
  </div></div>
  <div class="card side"><div class="card-h"><div><h2>웹사이트에서 들어오는 것</h2><p>전부 서류가 되어 결재함으로</p></div></div><div class="card-b">
   <ul class="impact"><li><span>상담 신청</span><b>빈 시간 검사 → 지금 확인 (확정 문자)</b></li><li><span>문의 (챗)</span><b>FAQ 안: 자동 답 · 밖: 아침 결재함</b></li><li><span>후기</span><b>답글 초안 → 아침 결재함 → 게시</b></li><li><span>주간 리포트</span><b>매주 월요일 아침 결재함</b></li></ul>
   <p class="small muted" style="margin-top:10px">지금 결재 대기 ${webOpen().length}건 · <a href="#today">오늘 결재함</a></p></div></div>
  <div class="card side"><div class="card-h"><div><h2>지식 슬롯 9칸</h2><p>채울수록 웹 챗이 답하는 범위가 넓어집니다. 빈 칸은 "원으로 문의"로 돌아갑니다.</p></div></div><div class="card-b"><div class="kslots">${KSLOT.map(([k,l])=>`<div class="kslot ${st.knowledge[k]&&st.knowledge[k].trim()?'':'empty'}"><label>${l}</label><input type="text" data-k="${k}" value="${esc(st.knowledge[k]||'')}" placeholder="비어 있음 · 이 질문은 원장실로 넘어옵니다"></div>`).join('')}</div><p class="small muted" style="margin-top:8px">빈 칸 질문에 원장님이 결재함에서 답을 적어 결재하면 그 칸이 채워집니다.</p></div></div>
  <div class="card side"><div class="card-h"><div><h2>지키는 선</h2></div></div><div class="card-b"><ul class="timeline"><li><span>1</span><div>성적·합격 실적을 웹에 쓰지 않습니다. 기록(리포트)을 보여 줍니다.</div></li><li><span>2</span><div>학부모 페이지는 동의한 자녀의 기록만, 다른 학생 이름은 없습니다.</div></li><li><span>3</span><div>웹 챗은 확정 FAQ 밖을 추측하지 않습니다.</div></li><li><span>4</span><div>공개 게시·상담 확정 문자는 항상 원장이 먼저 봅니다.</div></li></ul></div></div>
 </div></div>`;
}

/* ---------- 콘텐츠·플레이스 (콘텐츠 매니저 · 플레이스 담당) ---------- */
let matDraft={};
function vContent(){
 const st=S.site;const posts=st.posts;const pending=S.docs.filter(d=>d.kind==='sns'&&['review','held'].includes(d.status));
 const placeDoc=S.docs.find(d=>d.kind==='place');
 return `<div class="head"><div><div class="eyebrow">콘텐츠·플레이스 · 콘텐츠 담당(무료) · 플레이스 담당</div><h1>이번 주 뭘 올리지? 소재 세 장이면 됩니다.</h1><p>사진 한 장, 한 문단이면 콘텐츠 담당이 광장·웹사이트 글과 인스타·블로그·플레이스 복붙 꾸러미를 만듭니다. 자동으로 올라가지 않습니다. 광장·웹사이트만 앱이 저장하고 나머지는 복사해서 붙여 넣습니다.</p></div></div>
 <div class="kpis"><div class="kpi"><div class="l">발행한 콘텐츠</div><strong class="num">${posts.length}<small>건</small></strong><p>웹사이트·광장 게시</p></div><div class="kpi"><div class="l">승인 대기</div><strong class="num">${pending.length}<small>건</small></strong><p>아침 결재함</p></div><div class="kpi"><div class="l">광장 노출</div><strong class="num">${st.plaza.views}<small>회</small></strong><p>저장 ${st.plaza.saves} · 상담 전환 ${st.plaza.conv} · ${st.plaza.src}</p></div><div class="kpi"><div class="l">플레이스 꾸러미</div><strong class="num">${st.place?'준비됨':placeDoc?'결재 대기':'없음'}</strong><p>${st.place?'채널에 직접 붙여넣기':'네이버·카카오·구글·당근'}</p></div></div>
 <div class="cols"><div>
  <div class="card"><div class="card-h"><div><h2>이번 주 소재 3장 · 월요일 갱신</h2><p>소재마다 지켜야 할 것이 적혀 있습니다</p></div></div><div class="card-b">
   ${MATERIALS.map(m=>{const v=matDraft[m.id]===undefined?m.seed():matDraft[m.id];return `<div class="mat"><div class="mat-h"><b>${m.t}</b><span class="tip">${m.tip}</span></div><textarea data-mat="${m.id}" rows="3">${esc(v)}</textarea><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px"><button class="btn-ok btn-sm" data-matgo="${m.id}">콘텐츠 담당에게 5면 초안 요청</button><span class="small muted">광장·웹사이트 저장 + 인스타·블로그·플레이스 복사</span></div></div>`}).join('')}
  </div></div>
  <div class="card" style="margin-top:18px"><div class="card-h"><div><h2>발행한 콘텐츠</h2><p>3면 노출 배지 · 홈페이지 "배움 이야기"에 보입니다</p></div></div><div class="card-b">${posts.length?posts.map(p=>`<div class="row"><div style="flex:1"><b>${esc(p.t)}</b> <span class="muted small">${p.at}</span><p>${esc(p.text.slice(0,80))}${p.text.length>80?'…':''}</p></div><span class="pill g">홈페이지</span><span class="pill g">광장</span><span class="pill">SNS 복사</span></div>`).join(''):'<div class="empty">아직 발행한 콘텐츠가 없어요. 위 소재로 초안을 요청하고 아침 결재함에서 결재하면 여기에 쌓입니다.</div>'}</div></div>
 </div><div class="grid">
  <div class="card side"><div class="card-h"><div><h2>플레이스 담당</h2><p>등록 꾸러미 · 직접 올리지 않음 · 순위 약속 없음</p></div></div><div class="card-b">
   ${st.place?`<ul class="impact">${[['naver','네이버 플레이스'],['kakao','카카오맵'],['google','구글 비즈니스'],['karrot','당근']].map(([k,n])=>`<li><span>${n}</span><label class="chk"><input type="checkbox" data-placech="${k}" ${st.place.channels[k]?'checked':''}> 붙여넣기 완료</label></li>`).join('')}</ul><button class="btn-sm" data-open="${placeDoc.id}" style="margin-top:10px">꾸러미 내용 보기 · 복사</button>`:placeDoc?`<p class="small muted">꾸러미가 아침 결재함에 있습니다. 결재하면 채널별 체크가 열립니다.</p>`:`<p class="small muted">학원 정보·시간표·수강료 게시문을 근거로 네이버·카카오맵·구글·당근용 등록 문안과 대표 키워드, 사진 체크리스트를 만듭니다.</p><button class="btn-ok btn-sm" id="placeGo" style="margin-top:10px">등록 꾸러미 준비</button>`}
  </div></div>
  <div class="card side"><div class="card-h"><div><h2>공유 도구 4종</h2><p>발행이 아니라 공유물 · 광고비 0원</p></div></div><div class="card-b"><div class="tools">${[['card','학원 자랑 카드','웹사이트 링크가 담긴 카드 이미지'],['qr','학원 QR 키트','안내문·문 앞에 붙이는 QR'],['caption','인스타 캡션','발행한 글에서 캡션만 다시 뽑기'],['invite','학부모 초대장','소개 학부모에게 보내는 초대 (쿠폰은 참조만)']].map(([k,t,d])=>`<button class="tool" data-tool="${k}"><b>${t}</b><span>${d}</span></button>`).join('')}</div><div id="toolOut" class="small muted" style="margin-top:8px"></div></div></div>
  <div class="card side"><div class="card-h"><div><h2>지키는 선</h2></div></div><div class="card-b"><ul class="timeline"><li><span>1</span><div>성적·합격 실적 표현이 들어오면 초안을 만들지 않습니다(표시광고 심의).</div></li><li><span>2</span><div>학생 이름·얼굴은 소재에서 뺍니다. 공유 기능은 미성년자 기록에 붙이지 않습니다.</div></li><li><span>3</span><div>"발송했다·게시했다"라고 말하지 않습니다. 저장과 복사만 합니다.</div></li></ul></div></div>
 </div></div>`;
}
/* ---------- 경영지원 (행정 서류 담당) ---------- */
function vBiz(){
 const mine=S.docs.filter(d=>d.kind==='biz');
 return `<div class="head"><div><div class="eyebrow">경영지원 · 행정 서류 담당</div><h1>학원법 서류와 기한을 미리 챙깁니다.</h1><p>정보 정리와 초안까지 합니다. 법적 판단이 필요한 것은 제휴 세무사·노무사에게 연결합니다. 그 이상을 약속하지 않습니다.</p></div></div>
 <div class="cols"><div>
  <div class="card"><div class="card-h"><div><h2>서류 초안</h2><p>학원 정보를 자동으로 채운 학원법 기준 서식</p></div></div><div class="card-b">${BIZ_DOCS.map(n=>{const d=mine.find(x=>x.title.startsWith(n));return `<div class="row"><div style="flex:1"><b>${n}</b><p>${d?(d.status==='sent'?'결재 완료':'아침 결재함에 초안'):'초안 없음'}</p></div>${d?`<button class="btn-sm" data-open="${d.id}">보기</button>`:`<button class="btn-sm" data-biz="${n}">초안 요청</button>`}</div>`}).join('')}</div></div>
  <div class="card" style="margin-top:18px"><div class="card-h"><div><h2>자주 묻는 학원법</h2></div></div><div class="card-b"><ul class="ev">${BIZ_FAQ.map(([q,a])=>`<li><b>${q}</b>${a}</li>`).join('')}</ul></div></div>
 </div><div class="grid">
  <div class="card side"><div class="card-h"><div><h2>기한 달력</h2></div></div><div class="card-b"><ul class="impact">${BIZ_CAL.map(([d,t])=>`<li><span>${t}</span><b>D-${daysTo(d)}</b></li>`).join('')}</ul></div></div>
  <div class="card side"><div class="card-h"><div><h2>지원금 매칭</h2><p>해당되는 것만 · 신청서 초안은 결재함으로</p></div></div><div class="card-b"><div class="row"><div style="flex:1"><b>소상공인 디지털 전환 지원</b><p>학원 웹사이트·운영 시스템 도입 비용 일부 · 10월 8일까지</p></div><button class="btn-sm" data-biz="지원금 신청서 (디지털 전환)">초안 요청</button></div></div></div>
  <div class="card side"><div class="card-h"><div><h2>전문가 연결</h2></div></div><div class="card-b"><p class="small">학원 설립·운영 경험이 있는 제휴 세무사 1곳, 노무사 1곳. 초안을 결재한 뒤 "검토 요청"을 누르면 서류가 전달됩니다(체험판에서는 모의).</p></div></div>
 </div></div>`;
}

function vStaff(){
 const k=STAFF.filter(x=>x.killer),c=STAFF.filter(x=>!x.killer&&x.core),o=STAFF.filter(x=>!x.core);
 const PLAN={free:'<span class="pill g">평생 무료</span>',basic:'<span class="pill b">Basic</span>',premium:'<span class="pill">Premium</span>'};
 const card=x=>`<article class="st ${x.killer?'killer':''}">${x.killer?'<span class="kmark">핵심</span>':''}<div class="role"><div class="badge">${x.ch}</div><h3>${x.name} ${PLAN[x.plan||(x.core?'basic':'premium')]}<small>${x.when}</small></h3></div><p>${x.does}</p><dl><dt>보는 자료</dt><dd>${x.src}</dd><dt>원장 결재</dt><dd>${x.needs}</dd></dl><div class="foot"><span class="tag"><i style="background:${S.hired[x.id]?'var(--green)':'var(--line2)'}"></i>${S.hired[x.id]?'일하는 중':'쉬는 중'}</span><button class="sw ${S.hired[x.id]?'on':''}" data-hire="${x.id}" aria-label="${x.name} ${S.hired[x.id]?'끄기':'켜기'}" aria-pressed="${S.hired[x.id]}"></button></div></article>`;
 return `<div class="head"><div><div class="eyebrow">AI 직원 명부 · agent1000 요금제 기준</div><h1>직원은 ${STAFF.length}명이지만, 원장님이 알아야 할 건 한 가지입니다.</h1><p>모두 서류만 준비하고, 보내거나 결제하는 일은 스스로 하지 않습니다. 웹사이트·예약 담당과 콘텐츠 담당은 무료 웹사이트와 함께 평생 무료입니다. 여기는 파는 자리가 아니라 일하는 자리라 가격표를 두지 않았습니다.</p></div></div>
 <div class="sec" style="margin-top:0">핵심 직원 ${k.length} · 처음부터 켜져 있음</div><div class="staff">${k.map(card).join('')}</div>
 <div class="sec" style="margin-top:26px">기본 직원 ${c.length} · 장부를 맞추는 사람들</div><div class="staff">${c.map(card).join('')}</div>
 <div class="sec" style="margin-top:26px">필요할 때 켜는 직원 ${o.length}</div><div class="staff">${o.map(card).join('')}</div>
 <p class="note" style="margin-top:22px">agent1000 플랫폼의 학원 로스터 38명(원장 23·학생 9·학부모 6) 중 원장실에서 실제로 서류를 만드는 일만 ${STAFF.length}명으로 묶었습니다. 학생·학부모용 직원(레벨 테스트, 남은 회차, 상담 요청, 만족도 설문, AI에게 물어보기)은 웹사이트와 학부모·학생 페이지 안에서 일합니다. 가게용 직원(재고·위생·쿠폰)은 뺐습니다.</p>`;
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
 <div class="card"><div class="card-h"><h2>체험 순서 (3분)</h2></div><div class="card-b"><ul class="timeline"><li><span>1</span><div>오늘 결재함 → 미납 안내 하나를 <b>확인</b>해 도장이 찍히는지 봅니다.</div></li><li><span>2</span><div>수업 기록 → 중2 수학 A 학생들을 체크하고 <b>저장</b>. 아침 결재함에 리포트가 생깁니다.</div></li><li><span>3</span><div>시간표 → 중2 수학 A를 화요일 17:00으로 바꿔 보고, 박하린 학생의 피아노 일정 겹침이 잡히는지 봅니다.</div></li><li><span>4</span><div>왼쪽 아래에서 <b>강사 화면</b>으로 바꾸고 "오답 체크·맞춤 문제" 탭에서 칸을 몇 개 바꾼 뒤 <b>맞춤 문제 세트 준비</b> → 검수 완료. 원장 화면 "오답 현황"에는 결재 상태만 보입니다.</div></li><li><span>5</span><div>수납 → 기한 경과가 맨 위에 있는지 보고, 박하린 10만원 가상 입금. 미납 안내가 "중지"되는지 봅니다.</div></li><li><span>6</span><div>학생 → 확인 필요 학생이 먼저 오는지, 학년·반 필터가 되는지 봅니다. 학부모·학생 화면도 바꿔 봅니다.</div></li><li><span>7</span><div>웹사이트 → 모의 사이트에서 <b>무료 AI 레벨 테스트</b>를 풀고 "이 결과로 상담 신청", "셔틀(빈 칸)" 질문, 후기를 남기고 결재함에 서류가 생기는지 봅니다. 한 줄 소식을 적어 결재하면 사이트 상단에 걸립니다.</div></li><li><span>8</span><div>오늘 → "오늘 바로 쓸 수 있어요" 카드로 플레이스 꾸러미·진로 리포트를 준비하고, 트리거 버블에서 재등록 안내를 만듭니다. 콘텐츠·플레이스 → 소재 한 장으로 5면 초안을 만들어 결재하면 웹사이트 "배움 이야기"에 실립니다. 우하단 <b>AI 매니저</b>에게 "미납 얼마야?"라고 물어봅니다.</div></li></ul></div></div></div>
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
 return `<div class="hero-parent"><div class="head"><div><div class="eyebrow">수학의숲 판교학원 웹사이트 · 학부모 페이지</div><h1>이서준 학생의 학습 소식</h1><p>학원 웹사이트(${S.site.url})의 학부모 로그인 뒷면입니다. 앱 설치 없이 문자 링크로 열리고, 연결된 자녀의 기록만 보입니다.</p></div></div>
 <div class="card"><div class="card-h"><div><h2>도착한 안내</h2></div><span class="pill ${sent.length?'g':''}">${sent.length}건</span></div><div class="card-b">${sent.length?sent.map(d=>`<div class="body" style="margin-bottom:12px">${esc(d.body)}</div>`).join(''):'<div class="body">아직 도착한 안내가 없습니다.\n원장 화면에서 리포트를 결재하면 이곳에 같은 내용이 도착합니다.</div>'}</div></div>
 <div class="grid g2" style="margin-top:18px"><div class="card"><div class="card-h"><h2>시간표</h2></div><div class="card-b"><b>${c.name}</b><p class="muted">${c.days.join('·')} ${fmt(c.start)}~${fmt(c.end)} · ${c.teacher} 선생님</p><p class="small muted" style="margin-top:8px">시간표가 바뀌면 여기 먼저 바뀌고 안내가 갑니다.</p></div></div>
 <div class="card"><div class="card-h"><h2>수강료</h2></div><div class="card-b"><b>${inv.label} ${won(inv.amount)}</b><p class="muted">납부 확인 ${won(inv.paid)}</p><span class="pill ${money(inv)<=0?'g':'a'}" style="margin-top:8px">${money(inv)<=0?'납부 완료':'잔액 '+won(money(inv))}</span></div></div>
 <div class="card"><div class="card-h"><h2>남은 수업</h2></div><div class="card-b"><b>${s.term.total-s.term.used}회 남음</b><p class="muted">전체 ${s.term.total}회 중 ${s.term.used}회 진행 · ${s.term.end.slice(5).replace('-','월 ')}일 종료</p><p class="small muted" style="margin-top:8px">${daysTo(s.term.end)<=30?'다음 학기 안내가 곧 도착합니다. 성적이 아니라 남은 회차와 날짜만으로 안내합니다.':'다음 학기 시작 '+s.term.next}</p></div></div>
 <div class="card"><div class="card-h"><h2>수업 이력</h2></div><div class="card-b">${s.records.length?`<ul class="ev">${s.records.slice(0,4).map(r=>`<li><b>${r.at}</b>${r.att} · 숙제 ${r.hw} · ${r.level}</li>`).join('')}</ul>`:'<p class="muted small">아직 기록이 없습니다. 선생님이 체크하면 여기 쌓입니다.</p>'}</div></div></div>
 <div class="grid g2" style="margin-top:18px"><div class="card"><div class="card-h"><div><h2>상담 요청</h2><p>빈 시간만 보입니다 · 학원이 확인하면 확정 안내가 옵니다</p></div></div><div class="card-b"><div class="site-form"><select id="pSlot">${consultSlots().slice(0,8).map(x=>`<option value="${x.iso}">${x.label}${x.teacherFree?' · 선생님 동석':''}</option>`).join('')}</select><button class="btn-ok btn-sm" id="pBook">상담 요청 보내기</button></div>${S.site.requests.filter(r=>r.src==='parent').map(r=>`<p class="small" style="margin-top:8px">${r.slot.slice(5)} · ${r.status==='confirmed'?'<span class="pill g">확정</span>':'<span class="pill a">요청이 접수됐어요</span>'}</p>`).join('')}</div></div>
 <div class="card"><div class="card-h"><div><h2>이번 달 만족도</h2><p>한 번만 · 원장님께 그대로 전해집니다</p></div></div><div class="card-b">${S.site.surveys.length?`<p class="small">보내 주신 점수 ${S.site.surveys.slice(-1)[0].rating}/5 · 감사합니다.</p>`:`<div class="site-form"><select id="pRate">${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select><input type="text" id="pNote" placeholder="한 줄 (선택)"><button class="btn-sm" id="pSurvey">보내기</button></div>`}</div></div></div>
 <p class="note" style="margin-top:18px">다른 학생 이름, 선생님 내부 메모, 학원 장부는 포함되지 않습니다. 이 페이지에는 공유 버튼이 없습니다. 미성년자 기록이기 때문입니다.</p></div>`;
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
 $$('[data-web]').forEach(el=>el.oninput=el.onchange=()=>{const k=el.dataset.web;webDraft[k]=k==='rating'?+el.value:el.value;});
 const wb=$('#webBook');if(wb)wb.onclick=()=>{if(!webDraft.name.trim()||webDraft.phone.trim().length<9)return toast('학생 이름과 보호자 연락처(9자리 이상)를 적어 주세요.',true);webBook(webDraft.name.trim(),webDraft.phone.trim(),webDraft.slot,webDraft.cls);webDraft.name='';webDraft.phone='';webDraft.slot='';};
 const wa=$('#webAsk');if(wa)wa.onclick=()=>{const q=webDraft.q.trim();if(!q)return;webDraft.q='';webAsk(q);};
 $$('[data-webq]').forEach(b=>b.onclick=()=>{webDraft.q='';webAsk(b.dataset.webq.includes('?')?b.dataset.webq:b.dataset.webq+'는 어떻게 되나요?');});
 const wr=$('#webReview');if(wr)wr.onclick=()=>{const t=webDraft.review.trim();if(!t)return toast('후기 한 줄을 적어 주세요.',true);webDraft.review='';webReview(webDraft.rating,t);};
 const wp=$('#webPopup');if(wp)wp.onclick=()=>{preparePopup(webDraft.popup);webDraft.popup='';};
 const wt=$('#webTuition');if(wt)wt.onclick=prepareTuitionPost;
 $$('[data-live]').forEach(el=>el.onchange=()=>{S.site.live[el.dataset.live]=el.checked;log(el.checked?'웹 공개':'웹 비공개',el.dataset.live==='seats'?'반별 잔여석':'강사 소개','웹사이트 담당');save();render();});
 const tp=$('#toParent');if(tp)tp.onclick=()=>{role='parent';$('#roleSel').value='parent';render();window.scrollTo({top:0});};
 /* 오늘: 트리거 · 바로 쓰기 카드 */
 $$('[data-trig]').forEach(b=>b.onclick=()=>{const a=b.dataset.trig;if(a==='reenroll'){let n=0;reenrollDue().forEach(s=>{if(prepareReenroll(s))n++;});save();render();toast(`재등록 안내 ${n}건을 아침 결재함에 준비했습니다.`);}else if(a==='lesson')location.hash='#lesson';else if(a==='inquiry'){const d=docsOpen().find(x=>x.kind==='inquiry');if(d)openDoc(d.id);}});
 $$('[data-quick]').forEach(b=>b.onclick=()=>{const k=b.dataset.quick;if(k==='ledger')location.hash='#lesson';else if(k==='report'){const ids=Object.keys(S.lessonSaved);if(!ids.length){location.hash='#lesson';return;}let n=0;ids.forEach(id=>{if(stu(id).consent&&prepareReport(id,S.lessonSaved[id]))n++;});save();render();toast(`리포트 초안 ${n}건이 아침 결재함에 있습니다.`);}else if(k==='place')preparePlace();else if(k==='career'){prepareCareer('S9');save();render();toast('진로상담 리포트가 아침 결재함에 준비되어 있습니다.');}});
 /* 콘텐츠·플레이스·경영지원 */
 $$('[data-mat]').forEach(t=>t.oninput=()=>{matDraft[t.dataset.mat]=t.value;});
 $$('[data-matgo]').forEach(b=>b.onclick=()=>{const id=b.dataset.matgo;const m=MATERIALS.find(x=>x.id===id);prepareContent(id,matDraft[id]===undefined?m.seed():matDraft[id]);});
 const pg=$('#placeGo');if(pg)pg.onclick=preparePlace;
 $$('[data-placech]').forEach(el=>el.onchange=()=>{S.site.place.channels[el.dataset.placech]=el.checked;save();});
 $$('[data-tool]').forEach(b=>b.onclick=()=>{const k=b.dataset.tool;const out={card:`[학원 자랑 카드] 수학의숲 판교학원 · 매주 리포트로 아이의 수업을 그대로 · ${S.site.url} (이미지로 저장 · 모의)`,qr:`[QR 키트] ${S.site.url} 로 연결되는 QR과 "상담 신청은 웹에서" 문구 안내지 (PDF · 모의)`,caption:S.site.posts.length?`[인스타 캡션] ${S.site.posts[0].text.split('.')[0]}. #판교수학학원 #수학의숲`:'[인스타 캡션] 발행한 콘텐츠가 없어 캡션을 만들지 않았습니다.',invite:`[학부모 초대장] 이서준 어머니가 소개하는 수학의숲 판교학원 · 첫 상담 무료 · 소개 쿠폰은 등록 확정 후 발급 (쿠폰 참조만, 지금 발급 없음)`}[k];$('#toolOut').textContent=out;toast('공유물을 만들었습니다. 발행 건수에는 들어가지 않습니다.');});
 $$('[data-biz]').forEach(b=>b.onclick=()=>prepareBizDoc(b.dataset.biz));
 /* 웹사이트: 레벨 테스트 · 지식 슬롯 */
 $$('[data-lt]').forEach(el=>el.onchange=()=>{ltDraft[el.dataset.lt]=el.value;});
 const ls=$('#ltStart');if(ls)ls.onclick=()=>{ltDraft.started=true;ltDraft.answers=[];ltDraft.result=null;render();};
 $$('[data-ltans]').forEach(b=>b.onclick=()=>{ltDraft.answers.push(+b.dataset.ltans);const qs=LEVEL_Q[ltDraft.subject]||LEVEL_Q['수학'];if(ltDraft.answers.length>=qs.length){ltDraft.result=scoreLevel(ltDraft.subject,ltDraft.answers);S.site.levelTests.push({grade:ltDraft.grade,subject:ltDraft.subject,band:ltDraft.result.band,n:ltDraft.result.n,total:ltDraft.result.total,at:TODAY});log('웹 레벨 테스트',`${ltDraft.grade} ${ltDraft.subject} · ${ltDraft.result.band} (개인정보 없음)`,'웹사이트·예약 담당');save();}render();});
 const lr=$('#ltReset');if(lr)lr.onclick=()=>{ltDraft={grade:ltDraft.grade,subject:ltDraft.subject,started:false,answers:[],result:null};render();};
 const lb=$('#ltBook');if(lb)lb.onclick=()=>{webDraft.cls=ltDraft.result.rec;render();const el=$('[data-web="name"]');if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();}toast('희망 반을 추천 반으로 채웠습니다. 이름·연락처만 적으면 됩니다.');};
 $$('[data-k]').forEach(el=>el.onchange=()=>{S.site.knowledge[el.dataset.k]=el.value;log('지식 슬롯 수정',KSLOT.find(x=>x[0]===el.dataset.k)[1],'원장');save();render();});
 /* 학부모 페이지 */
 const pb=$('#pBook');if(pb)pb.onclick=()=>parentBook($('#pSlot').value);
 const ps=$('#pSurvey');if(ps)ps.onclick=()=>parentSurvey(+$('#pRate').value,$('#pNote').value.trim());
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
/* AI 매니저 (원장용) */
$('#mgrBtn').onclick=()=>{const p=$('#mgrPanel');p.hidden=!p.hidden;if(!p.hidden)$('#mgrIn').focus();};
function mgrAsk(){const q=$('#mgrIn').value.trim();if(!q)return;$('#mgrIn').value='';const lg=$('#mgrLog');const me=document.createElement('div');me.className='me';me.textContent=q;lg.appendChild(me);const bot=document.createElement('div');bot.className='bot';bot.textContent=managerAnswer(q);lg.appendChild(bot);lg.scrollTop=lg.scrollHeight;}
$('#mgrGo').onclick=mgrAsk;$('#mgrIn').addEventListener('keydown',e=>{if(e.key==='Enter')mgrAsk();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDr();});
go();
})();
