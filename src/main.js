import './style.css';

const CSV_URL='/data/FC26_20250921.csv';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>{n=Number(n)||0; if(n>=1e9)return `€${(n/1e9).toFixed(1)}B`; if(n>=1e6)return `€${(n/1e6).toFixed(1)}M`; if(n>=1e3)return `€${Math.round(n/1e3)}K`; return `€${n}`};
const fmtDate=d=>new Date(d).toLocaleDateString('ko-KR',{year:'numeric',month:'short',day:'numeric'});
let players=[], clubs=[], state=null, tab='home', selectedClub=null;

function parseCSV(text){
 const rows=[]; let row=[], cell='', q=false;
 for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
  if(c==='"'&&q&&n==='"'){cell+='"';i++;continue}
  if(c==='"'){q=!q;continue}
  if(c===','&&!q){row.push(cell);cell='';continue}
  if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(x=>x!==''))rows.push(row);row=[];continue}
  cell+=c;
 }
 if(cell||row.length){row.push(cell);rows.push(row)}
 const h=rows.shift().map(x=>x.trim());
 return rows.map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??''])));
}
function buildClubs(){
 const m=new Map();
 players.forEach(p=>{if(!p.club_name)return; if(!m.has(p.club_name))m.set(p.club_name,{name:p.club_name,league:p.league_name||'Unknown',level:p.league_level||'',players:[]});m.get(p.club_name).players.push(p)});
 return [...m.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
function seedFor(name){let x=0;for(const c of name)x=(x*31+c.charCodeAt(0))>>>0;return x}
function rand(seed){let x=(seed*1664525+1013904223)>>>0;return x/4294967296}
function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0}
function clubStrength(c){return Math.round(avg(c.players.slice(0,18).map(p=>+p.overall||60))||65)}
function squad(){return clubs.find(c=>c.name===state.club)?.players||[]}
function persist(){localStorage.setItem('fc_manager_save',JSON.stringify(state))}
function loadSave(){try{return JSON.parse(localStorage.getItem('fc_manager_save'))}catch{return null}}

async function boot(){
 $('#app').innerHTML='<div class="loading"><div class="loader"></div><b>FC Manager</b><span>선수 데이터 불러오는 중…</span></div>';
 try{
  const t=await fetch(CSV_URL).then(r=>r.text()); players=parseCSV(t); clubs=buildClubs();
  state=loadSave();
  render();
 }catch(e){$('#app').innerHTML=`<div class="error">데이터를 불러오지 못했습니다.<br><small>${esc(e.message)}</small></div>`}
}

function auth(){
 $('#app').innerHTML=`<main class="auth"><section class="auth-card">
 <div class="brand"><span class="brand-mark">FC</span><div><b>FC MANAGER</b><small>CAREER SIMULATOR</small></div></div>
 <div class="auth-hero"><p class="eyebrow">CAREER MODE</p><h1>당신의 팀.<br><em>당신의 결정.</em></h1><p>실제 선수 데이터와 전술·이적·경기 시뮬레이션으로 한 시즌을 직접 운영하세요.</p></div>
 <button class="primary wide" id="startGuest">커리어 시작하기 <span>→</span></button>
 <div class="auth-foot">브라우저에 커리어가 자동 저장됩니다.</div>
 </section></main>`;
 $('#startGuest').onclick=()=>{localStorage.setItem('fc_manager_user','Manager'); state=null; setup()};
}
function setup(){
 const q=selectedClub?.name||'';
 $('#app').innerHTML=`<div class="setup-shell"><header class="top minimal"><div class="brand"><span class="brand-mark">FC</span><b>FC MANAGER</b></div><span class="pill">NEW CAREER</span></header>
 <main class="setup"><section class="setup-copy"><p class="eyebrow">MANAGER CAREER</p><h1>이번 시즌의<br><em>주인공이 되세요.</em></h1><p>프리시즌부터 시작합니다. 구단의 목표를 달성하고, 전술과 이적을 통해 당신만의 팀을 만들어보세요.</p>
 <div class="setup-stats"><div><b>${players.length.toLocaleString()}</b><span>PLAYERS</span></div><div><b>${clubs.length}</b><span>CLUBS</span></div><div><b>4</b><span>COMPETITIONS</span></div></div></section>
 <section class="club-picker panel"><div class="panel-head"><div><p class="eyebrow">CHOOSE CLUB</p><h2>구단 선택</h2></div><span class="muted">${clubs.length} clubs</span></div>
 <div class="search-row"><input id="clubSearch" placeholder="구단명을 검색하세요" value="${esc(q)}"><select id="league"><option value="">모든 리그</option>${[...new Set(clubs.map(c=>c.league))].sort().map(x=>`<option>${esc(x)}</option>`).join('')}</select></div>
 <div id="clubList" class="club-list"></div></section></main></div>`;
 const renderList=()=>{
  const q=$('#clubSearch').value.toLowerCase(), l=$('#league').value;
  const a=clubs.filter(c=>(c.name.toLowerCase().includes(q)||c.league.toLowerCase().includes(q))&&(!l||c.league===l)).slice(0,80);
  $('#clubList').innerHTML=a.map(c=>`<button class="club-row ${selectedClub?.name===c.name?'selected':''}" data-club="${esc(c.name)}"><span class="crest">${esc(c.name.slice(0,2).toUpperCase())}</span><span><b>${esc(c.name)}</b><small>${esc(c.league)} · OVR ${clubStrength(c)}</small></span><strong>→</strong></button>`).join('')||'<div class="empty">검색 결과가 없습니다.</div>';
  document.querySelectorAll('[data-club]').forEach(b=>b.onclick=()=>{selectedClub=clubs.find(c=>c.name===b.dataset.club);renderList();});
 };
 $('#clubSearch').oninput=renderList; $('#league').onchange=renderList; renderList();
 document.querySelector('.club-picker').insertAdjacentHTML('beforeend','<button class="primary wide start-career" id="begin">이 구단으로 시작 <span>→</span></button>');
 $('#begin').onclick=()=>{if(!selectedClub)return alert('구단을 먼저 선택하세요.'); newCareer(selectedClub.name)};
}
function newCareer(name){
 const c=clubs.find(x=>x.name===name), sq=c.players.slice().sort((a,b)=>(+b.overall||0)- (+a.overall||0));
 state={manager:'Manager',club:name,league:c.league,season:2026,phase:'PRE-SEASON',day:1,week:1,budget:Math.max(8e6,clubStrength(c)*250000),wage:0,rep:50,morale:72,formation:'4-3-3',style:'Balanced',training:'Balanced',squad:sq.slice(0,30).map(p=>({id:p.player_id,mood:70,fitness:85,form:70,trust:60,apps:0,g:0,a:0})),news:[],fixtures:[],history:[],staff:{coach:50,doctor:50,scout:50},youth:[],board:{league:Math.max(5,Math.round((90-clubStrength(c))/3)),cup:'Round of 16'}, lastMatch:null};
 for(let i=0;i<3;i++)state.fixtures.push({type:'PRE',opponent:clubs.filter(x=>x.name!==name).sort((a,b)=>Math.abs(clubStrength(b)-clubStrength(c))-Math.abs(clubStrength(a)-clubStrength(c)))[i]?.name||'Preseason XI',played:false});
 state.news.unshift({d:'오늘',t:'새 감독이 부임했습니다.',b:`${name}이(가) 새로운 시즌을 준비합니다.`});
 persist(); tab='home'; render();
}
function nav(){
 return `<aside class="side"><div class="brand sidebrand"><span class="brand-mark">FC</span><div><b>FC MANAGER</b><small>CAREER</small></div></div>
 <div class="club-mini"><span class="crest big">${esc(state.club.slice(0,2).toUpperCase())}</span><div><b>${esc(state.club)}</b><small>${esc(state.league)}</small></div></div>
 <nav>${[['home','대시보드','⌂'],['squad','스쿼드','♙'],['tactics','전술','◈'],['matches','경기','▣'],['transfers','이적시장','⇄'],['scout','스카우팅','⌕'],['staff','스태프','✦'],['youth','유소년','◇'],['board','보드','▤'],['news','뉴스','◌']].map(x=>`<button class="${tab===x[0]?'active':''}" data-nav="${x[0]}"><i>${x[2]}</i>${x[1]}</button>`).join('')}</nav>
 <button class="save-btn" id="reset">새 커리어</button></aside>`;
}
function shell(content,title,sub=''){
 $('#app').innerHTML=`<div class="app"><div class="mobile-top"><button id="mobileNav">☰</button><b>FC MANAGER</b></div>${nav()}<main class="main"><header class="main-head"><div><p class="eyebrow">${esc(state.phase)} · ${state.season}/${String(state.season+1).slice(-2)}</p><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="head-right"><span class="status-dot"></span><span>자동 저장</span><b>${money(state.budget)}</b></div></header>${content}</main></div>`;
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{tab=b.dataset.nav;render()});
 $('#reset').onclick=()=>{if(confirm('현재 커리어를 삭제하고 새로 시작할까요?')){localStorage.removeItem('fc_manager_save');state=null;setup()}};
}
function playerCard(p){
 const r=state.squad.find(x=>String(x.id)===String(p.player_id))||{};
 return `<div class="player-card"><div class="avatar">${esc((p.short_name||'P').split(' ').map(x=>x[0]).join('').slice(0,2))}</div><div class="pc-main"><b>${esc(p.short_name)}</b><span>${esc(p.player_positions||p.club_position||'—')}</span></div><div class="rating"><b>${p.overall||'—'}</b><small>OVR</small></div><div class="mini-stat"><span>FIT</span><b>${r.fitness||85}</b></div><div class="mini-stat"><span>FORM</span><b>${r.form||70}</b></div></div>`;
}
function home(){
 const c=clubs.find(x=>x.name===state.club), sq=squad().slice().sort((a,b)=>(+b.overall||0)- (+a.overall||0)), next=state.fixtures.find(f=>!f.played);
 shell(`<div class="grid hero-grid"><section class="panel match-hero"><div class="panel-head"><div><p class="eyebrow">NEXT MATCH</p><h2>${next?esc(next.opponent):'시즌 일정 준비 중'}</h2><span class="muted">${next?'프리시즌 · 홈':'다음 일정 없음'}</span></div><div class="versus"><span>${esc(state.club.slice(0,2).toUpperCase())}</span><em>VS</em><span>${next?esc(next.opponent.slice(0,2).toUpperCase()):'—'}</span></div></div><div class="match-actions">${next?`<button class="primary" id="tactical">Tactical View</button><button class="secondary" id="skip">경기 결과 보기</button>`:'<button class="secondary" disabled>일정 대기</button>'}</div></section>
 <section class="panel balance"><p class="eyebrow">CLUB HEALTH</p><div class="health"><div><span>사기</span><b>${state.morale}</b></div><div><span>구단 평판</span><b>${state.rep}</b></div><div><span>선수단</span><b>${state.squad.length}</b></div></div><div class="bar"><i style="width:${state.morale}%"></i></div><small class="muted">현재 분위기</small></section></div>
 <div class="grid three"><section class="panel"><div class="panel-head"><h2>핵심 선수</h2><button class="text-btn" data-nav="squad">전체 보기 →</button></div>${sq.slice(0,5).map(playerCard).join('')}</section>
 <section class="panel"><div class="panel-head"><h2>이사회</h2><span class="tag">시즌 목표</span></div><div class="objective"><b>리그</b><strong>상위 ${state.board.league}위</strong><small>현재 시즌 목표를 달성하면 평판이 상승합니다.</small></div><div class="objective"><b>컵</b><strong>${esc(state.board.cup)}</strong><small>중요 경기에서 경쟁력을 보여주세요.</small></div></section>
 <section class="panel"><div class="panel-head"><h2>최근 뉴스</h2><button class="text-btn" data-nav="news">더보기 →</button></div>${state.news.slice(0,5).map(n=>`<div class="news-row"><small>${esc(n.d)}</small><div><b>${esc(n.t)}</b><span>${esc(n.b)}</span></div></div>`).join('')}</section></div>`,
 '대시보드','경기, 선수단, 이적시장과 구단 상황을 한 화면에서 관리하세요.');
 bindMatch();
}
function bindMatch(){
 $('#tactical')?.addEventListener('click',()=>playMatch(true));
 $('#skip')?.addEventListener('click',()=>playMatch(false));
}
function playMatch(live){
 const f=state.fixtures.find(x=>!x.played); if(!f)return;
 const my=clubStrength(clubs.find(c=>c.name===state.club)), op=clubStrength(clubs.find(c=>c.name===f.opponent)||{players:[]});
 const tactical=(state.formation==='4-3-3'?2:0)+(state.style==='Pressing'?3:state.style==='Defensive'?-3:0);
 const base=(my-op)/12+tactical/4+(Math.random()-.5)*3;
 let gf=Math.max(0,Math.min(5,Math.round(1.2+base*.35+Math.random()*1.7))), ga=Math.max(0,Math.min(5,Math.round(1.0-base*.25+Math.random()*1.7)));
 if(gf===ga&&Math.random()<.35) gf++;
 const lineup=squad().slice().sort((a,b)=>(+b.overall||0)-(+a.overall||0)).slice(0,11);
 lineup.forEach(p=>{const r=state.squad.find(x=>String(x.id)===String(p.player_id)); if(r){r.apps++;r.fitness=Math.max(35,r.fitness-(8+Math.floor(Math.random()*9)));r.form=Math.max(35,Math.min(95,r.form+(gf>=ga?3:-3)+Math.floor(Math.random()*7)-3));if(Math.random()<.08)r.mood=Math.max(20,r.mood-8)}});
 f.played=true; f.score=`${gf}-${ga}`; state.lastMatch={opponent:f.opponent,gf,ga,live,events:matchEvents(gf,ga)};
 state.history.unshift({...state.lastMatch,date:`${state.season} PRE`}); state.morale=Math.max(20,Math.min(95,state.morale+(gf-ga)*4)); state.day+=4;
 if(state.fixtures.every(x=>x.played))state.phase='REGULAR SEASON';
 state.news.unshift({d:'방금 전',t:`${state.club} ${gf}-${ga} ${f.opponent}`,b:gf>ga?'승리로 분위기가 상승했습니다.':gf<ga?'아쉬운 결과입니다. 다음 경기를 준비합니다.':'무승부로 경기를 마쳤습니다.'});
 persist(); matchModal();
}
function matchEvents(gf,ga){
 const total=gf+ga, out=['좋은 빌드업으로 공격을 전개합니다.','중원에서 압박을 시도합니다.','상대가 측면을 공략합니다.','수비진이 침착하게 걷어냅니다.','감독의 지시가 즉시 전술에 반영됩니다.'];
 let ev=[]; for(let i=0;i<Math.max(5,total+4);i++){let min=7+i*8+Math.floor(Math.random()*6); ev.push({m:Math.min(90,min),t:out[Math.floor(Math.random()*out.length)]});}
 for(let i=0;i<total;i++){let min=12+Math.floor(Math.random()*75);ev.push({m:min,t:`⚽ ${i<gf?state.club:'상대'} 득점! 공격 전개가 결실을 맺었습니다.`});}
 return ev.sort((a,b)=>a.m-b.m);
}
function matchModal(){
 const m=state.lastMatch;
 const events=m.events.map(e=>`<div class="event"><time>${e.m}'</time><span>${esc(e.t)}</span></div>`).join('');
 document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="matchModal"><div class="match-modal"><button class="close" id="closeM">×</button><p class="eyebrow">${m.live?'TACTICAL VIEW':'FULL TIME'}</p><div class="score"><span>${esc(state.club)}</span><strong>${m.gf} — ${m.ga}</strong><span>${esc(m.opponent)}</span></div><div class="event-log">${events}</div><button class="primary wide" id="doneM">확인</button></div></div>`);
 $('#closeM').onclick=$('#doneM').onclick=()=>{$('#matchModal').remove();render()};
}
function squadPage(){
 const arr=squad().slice().sort((a,b)=>(+b.overall||0)-(+a.overall||0));
 shell(`<section class="panel"><div class="toolbar"><input id="playerFilter" placeholder="선수 검색"><select id="posFilter"><option value="">모든 포지션</option><option>GK</option><option>DEF</option><option>MID</option><option>ATT</option></select></div><div id="playersGrid" class="players-grid"></div></section>`,`스쿼드`,`실제 데이터의 선수 능력치를 기반으로 컨디션과 폼을 함께 관리합니다.`);
 const draw=()=>{const q=$('#playerFilter').value.toLowerCase(),p=$('#posFilter').value;$('#playersGrid').innerHTML=arr.filter(x=>(x.short_name||'').toLowerCase().includes(q)&&(!p||(x.player_positions||'').includes(p))).map(playerCard).join('')};
 $('#playerFilter').oninput=draw;$('#posFilter').onchange=draw;draw();
}
function tacticsPage(){
 shell(`<div class="grid tactics-grid"><section class="panel"><div class="panel-head"><h2>전술 설정</h2><span class="tag">LIVE ENGINE</span></div><label>포메이션<select id="formation">${['4-3-3','4-2-3-1','4-4-2','3-4-2-1','3-5-2','5-3-2'].map(x=>`<option ${state.formation===x?'selected':''}>${x}</option>`).join('')}</select></label><label>전술 스타일<select id="style">${['Balanced','Pressing','Possession','Direct','Defensive'].map(x=>`<option ${state.style===x?'selected':''}>${x}</option>`).join('')}</select></label><div class="sliders">${[['공격성','attack'],['압박 강도','press'],['수비 라인','line'],['템포','tempo']].map(x=>`<label><span>${x[0]} <b id="${x[1]}Val">50</b></span><input type="range" id="${x[1]}" min="0" max="100" value="50"></label>`).join('')}</div><button class="primary wide" id="saveTac">전술 저장</button></section>
 <section class="panel pitch"><div class="pitch-inner"><div class="center-circle"></div><div class="pitch-line"></div><div class="formation-label">${state.formation}</div><div class="pitch-note">전술은 경기 엔진의 득점 기대치·수비 안정성·체력 소모에 영향을 줍니다.</div></div></section></div>`,`전술`,`경기 전 세부 전술을 조정하고 경기 중 선택의 결과를 확인하세요.`);
 ['attack','press','line','tempo'].forEach(id=>{$('#'+id).oninput=e=>$('#'+id+'Val').textContent=e.target.value});
 $('#formation').onchange=e=>state.formation=e.target.value;$('#style').onchange=e=>state.style=e.target.value;
 $('#saveTac').onclick=()=>{persist();alert('전술이 저장되었습니다.');};
}
function transfersPage(){
 const pool=players.filter(p=>p.club_name!==state.club&&+p.overall>=72).sort((a,b)=>(+b.overall)-(+a.overall));
 shell(`<section class="panel"><div class="toolbar"><input id="trSearch" placeholder="선수명 또는 포지션 검색"><span class="budget">이적 예산 <b>${money(state.budget)}</b></span></div><div id="transferList" class="transfer-list"></div></section>`,`이적시장`,`선수의 가치, 요구 조건, 구단 상황에 따라 협상 결과가 달라집니다.`);
 const draw=()=>{$('#transferList').innerHTML=pool.filter(p=>`${p.short_name} ${p.player_positions}`.toLowerCase().includes($('#trSearch').value.toLowerCase())).slice(0,60).map(p=>`<div class="transfer-row"><div class="avatar">${esc((p.short_name||'P').slice(0,2))}</div><div class="pc-main"><b>${esc(p.short_name)}</b><span>${esc(p.club_name)} · ${esc(p.player_positions)}</span></div><strong>${p.overall}</strong><span class="value">${money(p.value_eur)}</span><button class="secondary buy" data-id="${p.player_id}">협상</button></div>`).join('')};
 $('#trSearch').oninput=draw;draw();document.querySelectorAll('.buy').forEach(b=>b.onclick=()=>negotiate(b.dataset.id));
}
function negotiate(id){
 const p=players.find(x=>String(x.player_id)===String(id)), price=+p.value_eur||1e7, ask=price*(1.05+Math.random()*.45), chance=Math.min(.85,Math.max(.1,(state.budget/ask)*.55+(state.rep/100)*.25));
 if(state.budget<ask||Math.random()>chance){state.news.unshift({d:'오늘',t:`${p.short_name} 협상 결렬`,b:'선수 또는 구단의 조건을 맞추지 못했습니다.'});persist();alert('협상이 결렬되었습니다.');return}
 state.budget-=ask;state.squad.push({id:p.player_id,mood:75,fitness:82,form:70,trust:55,apps:0,g:0,a:0});state.news.unshift({d:'오늘',t:`${p.short_name} 영입 합의`,b:`${money(ask)}의 이적료로 합의했습니다.`});persist();alert(`${p.short_name} 영입 완료!`);render();
}
function simplePage(title,sub,body){shell(`<section class="panel prose">${body}</section>`,title,sub)}
function render(){
 if(!localStorage.getItem('fc_manager_user'))return auth();
 if(!state)return setup();
 ({home,squad:squadPage,tactics:tacticsPage,matches:()=>simplePage('경기 센터','프리시즌부터 시즌 일정을 관리합니다.',state.fixtures.map((f,i)=>`<div class="fixture ${f.played?'played':''}"><span>MD ${i+1}</span><b>${esc(state.club)}</b><strong>${f.played?f.score:'VS'}</strong><b>${esc(f.opponent)}</b>${!f.played?`<button class="secondary matchbtn" data-i="${i}">경기 시작</button>`:'<span class="tag">종료</span>'}</div>`).join(''))),transfers:transfersPage,scout:()=>simplePage('스카우팅','조건을 정하고 새로운 선수를 발견하세요.',`<div class="feature-grid"><div><h3>포지션 스카우트</h3><p>GK · DEF · MID · ATT 중 하나를 선택해 후보를 탐색합니다.</p><button class="primary" id="scoutBtn">스카우트 실행</button></div><div><h3>추천 선수</h3><p>${players.filter(p=>+p.potential>+p.overall+8).slice(0,3).map(p=>esc(p.short_name)).join(' · ')||'데이터 준비 중'}</p></div></div>`),staff:()=>simplePage('스태프','코치와 의무진은 훈련과 회복에 영향을 줍니다.',`<div class="staff-grid">${[['전술 코치','coach'],['팀 닥터','doctor'],['수석 스카우트','scout']].map(([n,k])=>`<div class="staff-card"><span>${n}</span><b>${state.staff[k]}</b><small>능력치가 높을수록 해당 시스템의 효과가 좋아집니다.</small><button class="secondary staffup" data-k="${k}">계약 업그레이드</button></div>`).join('')}</div>`),youth:()=>simplePage('유소년 아카데미','매 시즌 새로운 유망주를 육성할 수 있습니다.',`<div class="youth-empty"><div class="big-icon">◇</div><h2>아카데미 스카우팅</h2><p>시즌마다 잠재력이 높은 유망주가 발견됩니다.</p><button class="primary" id="youthBtn">유소년 발굴</button></div>`),board:()=>simplePage('이사회','구단 목표와 장기적인 프로젝트를 관리합니다.',`<div class="board-card"><span>리그 목표</span><b>상위 ${state.board.league}위</b><div class="bar"><i style="width:${Math.min(100,state.rep)}%"></i></div><p>현재 평판 ${state.rep}. 경기 결과와 선수단 운영이 이사회 평가에 반영됩니다.</p></div>`),news:()=>simplePage('뉴스 센터','구단에서 일어나는 모든 주요 소식을 확인합니다.',state.news.concat(state.history.map(h=>({d:h.date,t:`${h.opponent}전 ${h.gf}-${h.ga}`,b:'경기 기록'}))).map(n=>`<div class="news-row large"><small>${esc(n.d)}</small><div><b>${esc(n.t)}</b><span>${esc(n.b)}</span></div></div>`).join(''))})[tab]();
 bindExtra();
}
function bindExtra(){
 document.querySelectorAll('.text-btn').forEach(b=>b.onclick=()=>{tab=b.dataset.nav;render()});
 document.querySelectorAll('.matchbtn').forEach(b=>b.onclick=()=>playMatch(true));
 $('#scoutBtn')?.addEventListener('click',()=>alert('스카우트가 새로운 후보를 보고했습니다. 스쿼드의 potential을 확인하세요.'));
 document.querySelectorAll('.staffup').forEach(b=>b.onclick=()=>{const k=b.dataset.k;if(state.budget<1500000)return alert('예산이 부족합니다.');state.budget-=1500000;state.staff[k]=Math.min(95,state.staff[k]+10);persist();render()});
 $('#youthBtn')?.addEventListener('click',()=>{const pos=['CM','CB','ST','RW','LB'][Math.floor(Math.random()*5)],pot=75+Math.floor(Math.random()*17);state.youth.push({name:`Academy Prospect ${state.youth.length+1}`,pos,pot});state.news.unshift({d:'오늘',t:'유소년 유망주 발견',b:`${pos} 포지션, 잠재력 ${pot}의 유망주가 아카데미에 합류했습니다.`});persist();alert(`새 유망주 발견: ${pos} · POT ${pot}`);render()});
}
boot();
