const S = {cat:"",chip:"전체",model:"전체",q:"",openId:null,tag:"",glossTab:"전체"};
// 초기 히스토리 상태 설정 (뒤로가기 기준점)
history.replaceState({page:"home"}, "");

/* =============================================
   SECTION: ga-pageview (SPA 화면별 page_view)
   해시(#) 라우팅을 경로로 합성해 전송 → GA가 화면별로 구분해 집계
   (해시는 GA가 잘라내므로, 경로(path) 자리에 넣어 보냄)
============================================= */
function gaPage(path, title){
  if(typeof gtag!=="undefined"){
    gtag('event','page_view',{
      page_title: title,
      page_location: location.origin + location.pathname.replace(/\/+$/,'') + path
    });
  }
}

/* =============================================
   SECTION: js-tag-page
============================================= */
function goTag(tag) { _goTag(tag, true); }
function _goTag(tag, push) {
  gaPage('/tag/' + encodeURIComponent(tag), 'AK Archive – #' + tag);
  if (push) pushHistory({page:"tag", tag});
  S.tag = tag;
  // 모든 페이지 숨김
  document.body.className = "is-tag";
  // 상세 오버레이 흔적 제거 (상세→태그 복귀 시 깨끗하게)
  const _dvt=document.getElementById("detail");
  _dvt.classList.remove("show");_dvt.setAttribute("aria-hidden","true");
  _dvt.style.display="";_dvt.style.maxWidth="";_dvt.style.margin="";_dvt.style.padding="";
  const _tct=document.getElementById("tag-content");if(_tct)_tct.style.display="";
  S.openId=null;
  document.getElementById("gnb-wrap").style.display = "";
  document.querySelectorAll(".gnb-tab").forEach(t=>t.classList.remove("is-active"));
  // 태그 히어로
  document.getElementById("tag-hero-title").textContent = tag;
  const items = DATA.filter(d => d.tags.includes(tag));
  document.getElementById("tag-hero-count").textContent = `${items.length}개의 항목`;
  // 카드 렌더링
  renderTagCards(items, tag);
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderTagCards(items, tag) {
  const list = document.getElementById("tag-card-list");
  list.innerHTML = "";
  if(items.length === 0){
    list.innerHTML = `<p style="font-size:15px;color:var(--n-500);padding:40px 0">해당 태그를 가진 항목이 없습니다.</p>`;
    return;
  }
  items.forEach(d => {
    const el = document.createElement("div");
    el.className = "card";
    const catCls = CAT_CLS[d.category]||"b-model";
    const dp = d.date.split(".");
    const fmtDate = dp.length===3 ? `${dp[0]}. ${parseInt(dp[1])}. ${parseInt(dp[2])}.` : d.date;
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">
        <span class="badge ${catCls}">${d.category}</span>
      </div>
      <div class="card-title">${d.title}</div>
      <div class="card-meta">
        <span class="card-meta-author">${d.author}</span>
        <span class="card-meta-sep">·</span>
        <span class="card-meta-date">${fmtDate}</span>
      </div>
    `;
    el.addEventListener("click", () => {
      S.prevTag = tag;
      openDetailFromTag(d.id);
    });
    list.appendChild(el);
  });
}

function openDetailFromTag(id) {
  // 상세는 list-page 컨테이너에서 표시하고, 직전 페이지를 태그로 기록.
  // 목록으로/뒤로가기 시 history.back()이 태그 목록으로 복귀시킨다.
  openDetail(id, "is-tag");
}


/* =============================================
   SECTION: js-history
   브라우저 뒤로가기/앞으로가기 지원
============================================= */
// 카테고리 ↔ URL 슬러그 매핑 (주소창 링크를 깔끔한 영문으로)
const CAT_SLUG = {
  "제품 모델":    "product",
  "기능 히스토리": "uxhistory",
  "용어사전":     "akglossary",
};
const SLUG_CAT = Object.fromEntries(Object.entries(CAT_SLUG).map(([k,v])=>[v,k]));
function catToSlug(cat){ return CAT_SLUG[cat] || encodeURIComponent(cat || ""); }
// 신규 영문 슬러그 우선, 없으면 구 한글 링크(인코딩)도 그대로 해석 → 기존 공유 링크 호환
function slugToCat(slug){ return SLUG_CAT[slug] || decodeURIComponent(slug); }

// 상태 → 주소창에 표시할 해시 URL 변환 (항목/페이지별 고유 링크 생성)
function hashForState(state) {
  if (!state) return location.pathname + location.search;
  if (state.page === "home")   return location.pathname + location.search; // 홈은 해시 없는 깔끔한 주소
  if (state.page === "detail") {
    const d = DATA.find(x => x.id === state.id);
    if (!d || !CAT_SLUG[d.category]) return "#/doc/" + state.id; // 미매핑 카테고리는 기존 방식
    const slug = CAT_SLUG[d.category];
    // 제품은 제품명, 그 외(UX 히스토리·용어)는 번호 노출
    const key = (d.category === "제품 모델") ? encodeURIComponent(d.title) : state.id;
    return "#/" + slug + "/" + key;
  }
  if (state.page === "tag")    return "#/tag/" + encodeURIComponent(state.tag);
  if (state.page === "list")   return state.q
    ? "#/search/" + encodeURIComponent(state.q)
    : "#/" + catToSlug(state.cat);
  return location.pathname + location.search;
}
function pushHistory(state) {
  history.pushState(state, "", hashForState(state));
}
function replaceHistory(state) {
  history.replaceState(state, "", hashForState(state));
}

window.addEventListener("popstate", e => {
  const st = e.state;
  if (!st) { _goHome(false); return; }
  if (st.page === "home")   { _goHome(false); return; }
  if (st.page === "list")   { _goList(st.cat, st.q, false); return; }
  if (st.page === "detail") { _openDetail(st.id, st.prevPage, false); return; }
  if (st.page === "tag")    { _goTag(st.tag, false); return; }
});

/* =============================================
   SECTION: js-page-switch
   body 클래스로 페이지 전환
============================================= */
function goHome() { _goHome(true); }
function _goHome(push) {
  gaPage('/home', 'AK Archive – 홈');
  if (push) pushHistory({page:"home"});
  document.body.className = "is-home";
  document.getElementById("home-search").value = "";
  document.getElementById("home-clear").classList.remove("show");
  document.querySelectorAll(".gnb-tab").forEach(t=>t.classList.remove("is-active"));
  S.cat="";S.chip="전체";S.model="전체";S.q="";S.openId=null;
  window.scrollTo({top:0,behavior:"smooth"});
}

function goList(cat, q) { _goList(cat, q, true); }
function _goList(cat, q, push) {
  gaPage(cat ? '/list/' + catToSlug(cat) : '/search', 'AK Archive – ' + (cat || '검색'));
  if (push) pushHistory({page:"list", cat, q:q||""});
  document.body.className = "is-list";
  S.prevCat=S.cat; S.cat=cat; S.chip="전체"; S.model="전체"; S.q=q||""; S.openId=null;
  if(cat !== "용어사전") S.glossTab = "전체";
  // 항상 list UI 복구 (태그 페이지에서 올 때도 포함)
  ["card-list","count-row","hero"].forEach(i=>{
    const el=document.getElementById(i);
    if(el) el.style.display="";
  });
  document.getElementById("chip-bar").style.display="flex";
  // detail 숨김
  const dv=document.getElementById("detail");
  dv.classList.remove("show");dv.setAttribute("aria-hidden","true");
  dv.style.display=""; dv.style.maxWidth=""; dv.style.margin=""; dv.style.padding="";
  // thumb grid 초기화
  document.getElementById("card-list").classList.remove("is-thumb-grid");
  // tag-content 복구
  const tc=document.getElementById("tag-content");
  if(tc) tc.style.display="";
  // GNB 탭 동기화
  document.querySelectorAll(".gnb-tab").forEach(t=>
    t.classList.toggle("is-active", !!cat && t.dataset.cat===cat)
  );
  const h = HERO[cat]||{title:"검색 결과",desc:""};
  document.getElementById("hero-title").textContent = q ? `"${q}" 검색 결과` : h.title;
  document.getElementById("hero-desc").textContent  = q ? "" : h.desc;
  // 범위 안내: 카테고리 목록일 때만 표시 (검색 결과 화면에서는 숨김)
  document.getElementById("hero-scope").classList.toggle("show", !q && !!HERO[cat]);
  renderChipBar();
  renderCards();
  window.scrollTo({top:0,behavior:"smooth"});
}

/* =============================================
   SECTION: js-chip-bar
============================================= */
/* 항목이 속한 라인. 라인이 둘 이상 걸치면 자동으로 '공통'.
   RC로 다른 라인까지 퍼지면 models에 모델만 추가하면 공통으로 바뀐다. */
function lineOf(d){
  const ms=(d.models||[]).filter(m=>m && m!=="공통");
  if(!ms.length) return "공통";
  const set=new Set(ms.map(m=>MODEL_LINE[m]||m));
  return set.size===1 ? [...set][0] : "공통";
}

/* 유형 축 — 글의 성격. 값이 시간에 따라 변하지 않는다. */
function getTypeChips(cat){
  if(cat==="기능 히스토리") return ["전체","결정","규칙","리서치"];
  if(cat==="용어사전")     return ["전체","HW","SW","Local","Service","Feature","Dev"];
  return [];
}
/* 모델 축 — 데이터에서 자동 수집. 모델이 늘어도 코드를 고칠 필요가 없다. */
function getModelChips(cat){
  if(cat!=="기능 히스토리") return [];
  const set=new Set(DATA.filter(d=>d.category===cat).map(lineOf));
  const rest=[...set].filter(m=>m!=="공통").sort((x,y)=>x.localeCompare(y,["en","ko"],{numeric:true}));
  return ["전체",...(set.has("공통")?["공통"]:[]),...rest];
}

function renderChipBar() {
  const bar=document.getElementById("chip-bar");
  const wasSearchOpen=bar.classList.contains("search-open");
  bar.innerHTML=""; bar.style.cssText="";

  // 카운트는 '다른 축의 현재 선택'을 반영한다 (0건 막다른 칩이 안 생기도록)
  const countFor=(axis,key)=>{
    if(S.cat==="용어사전"){
      return key==="전체" ? DATA_glossary.length
                          : DATA_glossary.filter(d=>d.glossTab===key).length;
    }
    return DATA.filter(d=>{
      if(d.category!==S.cat) return false;
      if(axis==="type"){
        if(S.model!=="전체" && lineOf(d)!==S.model) return false;
        return key==="전체" || (d.labels||[]).includes(key);
      }
      if(S.chip!=="전체" && !(d.labels||[]).includes(S.chip)) return false;
      return key==="전체" || lineOf(d)===key;
    }).length;
  };

  const makeRow=(axis,label,keys)=>{
    const row=document.createElement("div");
    row.className="chip-row chip-row-"+axis;
    if(label){
      const l=document.createElement("span");
      l.className="chip-row-label"; l.textContent=label;
      row.appendChild(l);
    }
    const scroll=document.createElement("div");
    scroll.className="chip-scroll";
    if(axis==="type") scroll.id="chip-scroll";
    keys.forEach(k=>{
      const active=(axis==="type"?S.chip:S.model)===k;
      const btn=document.createElement("button");
      btn.className="chip-btn"+(active?" is-active":"");
      btn.dataset.chip=k; btn.dataset.axis=axis;
      btn.innerHTML=`${k} <span class="cnt">${countFor(axis,k)}</span>`;
      btn.addEventListener("click",()=>{
        if(axis==="type"){ S.chip=k; if(S.cat==="용어사전") S.glossTab=k; }
        else S.model=k;
        if(typeof gtag!=="undefined") gtag("event","select_filter",{filter_name:k,category:S.cat});
        renderChipBar(); renderCards();
      });
      scroll.appendChild(btn);
    });
    row.appendChild(scroll);
    return row;
  };

  const typeKeys=getTypeChips(S.cat);
  const modelKeys=getModelChips(S.cat);
  const twoAxis=modelKeys.length>1;
  const row1=makeRow("type", twoAxis?"유형":"", typeKeys);
  bar.appendChild(row1);

  // 검색 — 1행 우측 고정
  const sw=document.createElement("div");
  sw.id="chip-search-wrap";
  sw.innerHTML=`<svg class="csi" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="4"/><path d="M9 9l3 3"/></svg><input id="chip-search" type="search" placeholder="페이지 내 검색" autocomplete="off"/><span id="chip-search-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></svg></span>`;
  const clearBtn=document.createElement("button");
  clearBtn.id="chip-search-clear";
  clearBtn.innerHTML=`<svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>`;
  sw.appendChild(clearBtn);
  row1.appendChild(sw);
  const closeBtn=document.createElement("button");
  closeBtn.id="chip-search-close";
  closeBtn.innerHTML=`<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l10 10M14 4L4 14"/></svg>`;
  row1.appendChild(closeBtn);

  if(twoAxis) bar.appendChild(makeRow("model","모델",modelKeys));

  sw.addEventListener("click", ()=>{
    if(bar.classList.contains("search-open")) return;
    bar.classList.add("search-open");
    const inp=document.getElementById("chip-search"); if(inp) inp.focus();
  });
  clearBtn.addEventListener("click",(e)=>{
    e.stopPropagation(); S.q="";
    const inp=document.getElementById("chip-search");
    if(inp){ inp.value=""; inp.focus(); }
    clearBtn.classList.remove("show"); renderCards();
  });
  closeBtn.addEventListener("click",(e)=>{
    e.stopPropagation(); bar.classList.remove("search-open"); S.q="";
    const inp=document.getElementById("chip-search"); if(inp) inp.value="";
    renderCards();
  });

  const inp=document.getElementById("chip-search");
  if(inp){inp.value=S.q||"";clearBtn.classList.toggle("show",!!inp.value);inp.addEventListener("input",()=>{S.q=inp.value;clearBtn.classList.toggle("show",!!inp.value);renderCards();if(S.q.length>=1&&typeof gtag!=="undefined"){gtag("event","search",{search_term:S.q,search_location:"category_"+S.cat});}});}

  if(wasSearchOpen){
    bar.classList.add("search-open");
    if(inp){ inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
  }
}

function updateChips(){
  document.querySelectorAll(".chip-btn").forEach(b=>{
    const sel = b.dataset.axis==="model" ? S.model : S.chip;
    b.classList.toggle("is-active", b.dataset.chip===sel);
  });
}

/* =============================================
   SECTION: js-filter + render-cards
============================================= */
function filterData(){
  const q=S.q.trim().toLowerCase();
  return DATA.filter(d=>{
    if(S.cat&&d.category!==S.cat)return false;
    if(S.cat==="용어사전" && S.chip!=="전체" && d.glossTab!==S.chip) return false;
    if(S.cat==="기능 히스토리"){
      if(S.chip!=="전체"  && !(d.labels||[]).includes(S.chip))  return false;  // 유형 축
      if(S.model!=="전체" && lineOf(d)!==S.model) return false;               // 모델 축(라인)
    }
    if(!q)return true;
    return d.title.toLowerCase().includes(q);
  }).sort((a,b)=>{
    const titleCmp = (x,y) => x.title.localeCompare(y.title, ["en","ko"], {sensitivity:"base",numeric:true});
    if(!q){
      const dateDiff = b.date.replace(/\./g,"").localeCompare(a.date.replace(/\./g,""));
      if(dateDiff !== 0) return dateDiff;
      return titleCmp(a,b);
    }
    const score = d => {
      const lq = q;
      if(d.title.toLowerCase().includes(lq)) return 3;
      const tagModel = [...d.tags,...d.models,...(d.labels||[])].join(" ").toLowerCase();
      if(tagModel.includes(lq)) return 2;
      if((d.desc||"").toLowerCase().includes(lq)) return 1;
      return 0;
    };
    const diff = score(b) - score(a);
    if(diff !== 0) return diff;
    const dateDiff = b.date.replace(/\./g,"").localeCompare(a.date.replace(/\./g,""));
    if(dateDiff !== 0) return dateDiff;
    return titleCmp(a,b);
  });
}

function renderCards(){
  const list=document.getElementById("card-list");
  const empty=document.getElementById("empty");
  list.innerHTML="";
  const items=filterData();
  document.getElementById("count-num").textContent=items.length;
  if(items.length===0){empty.classList.add("show");if(S.q&&S.q.length>=1&&typeof gtag!=="undefined"){gtag("event","search_no_results",{search_term:S.q,category:S.cat});}return;}
  empty.classList.remove("show");
  const q=S.q.trim().toLowerCase();
  const MAX_MODELS=3;

  // 제품 모델: 썸네일 그리드
  if(S.cat==="제품 모델"){
    list.classList.add("is-thumb-grid");
    items.forEach(d=>{
      const el=document.createElement("div");
      el.className="card-thumb";el.setAttribute("role","listitem");el.setAttribute("tabindex","0");el.setAttribute("data-id",d.id);
      // 썸네일 이미지: _thumb 파일 우선, 없으면 images[0] 사용
      const thumbImg = d.images && d.images.find(img => img.src.toLowerCase().includes('_thumb'));
      const thumbFallback = (!d.noThumb && d.images && d.images.length) ? d.images[0] : null;
      const thumbSrc = thumbImg ? thumbImg.src : (thumbFallback ? thumbFallback.src : null);
      const thumbAlt = thumbImg ? thumbImg.alt : (thumbFallback ? thumbFallback.alt : d.title);
      const imgHtml = thumbSrc
        ? `<img src="${thumbSrc}" alt="${thumbAlt}" loading="lazy"/>`
        : `<div class="card-thumb-img-placeholder"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="6" y="8" width="28" height="22" rx="2"/><path d="M6 24l8-7 6 5 4-3 10 8"/><circle cx="27" cy="15" r="3"/></svg></div>`;
      // 모델 배지
      const vis=d.models.slice(0,MAX_MODELS);
      const hid=d.models.length-vis.length;
      const modelBadges=vis.map(m=>`<span class="badge ${DAP_CLS[m]||'b-more'}">${m}</span>`).join("")
        +(hid>0?`<span class="badge b-more">+${hid}</span>`:"");
      // 날짜 포맷
      const dp=d.date.split(".");
      const fmtDate=dp.length===3?`${dp[0]}. ${parseInt(dp[1])}. ${parseInt(dp[2])}.`:d.date;
      el.innerHTML=`
        <div class="card-thumb-img">${imgHtml}</div>
        <div class="card-thumb-body">
          <div class="card-thumb-title">${hl(d.title,q)}</div>
          <div class="card-thumb-label">${modelBadges}</div>
          <div class="card-thumb-meta">
            <span class="card-thumb-meta-author">${d.author}</span>
            <span class="card-thumb-meta-sep">·</span>
            <span>${fmtDate}</span>
          </div>
        </div>
      `;
      el.addEventListener("click",()=>openDetail(d.id));
      el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openDetail(d.id);});
      list.appendChild(el);
    });
    return;
  }

  // 그 외 카테고리: 기존 카드 리스트
  list.classList.remove("is-thumb-grid");
  items.forEach(d=>{
    const el=document.createElement("div");
    el.className="card";el.setAttribute("role","listitem");el.setAttribute("tabindex","0");el.setAttribute("data-id",d.id);
    // 상단: 탭명 배지(labels) + 반영모델 배지(models)
    const labelBadges = d.labels
      ? d.labels.map(l=>`<span class="badge ${LABEL_CLS[l]||'b-more'}">${l}</span>`).join("")
      : "";
    const glossBadge = d.glossTab ? `<span class="badge b-gloss">${d.glossTab}</span>` : "";  // AK 용어 분류 칩
    const vis=d.models.slice(0,MAX_MODELS);
    const hid=d.models.length-vis.length;
    const divider=(labelBadges&&vis.length>0)?`<span class="badge-divider"></span>`:"";
    const modelBadges=labelBadges+divider+vis.map(m=>`<span class="badge ${DAP_CLS[m]||'b-more'}">${m}</span>`).join("")
      +(hid>0?`<span class="badge b-more">+${hid}</span>`:"");
    const catBadge=!S.cat?`<span class="badge ${CAT_CLS[d.category]||'b-more'}">${d.category}</span>`:'';
    const stateBadge=d.state?`<span class="badge ${STATE_CLS[d.state]||'b-state-off'}">${d.state}</span>`:'';
    // 배지 순서: 유형 → 적용 → 모델
    const badges=catBadge+glossBadge+labelBadges+stateBadge
      +vis.map(m=>`<span class="badge ${DAP_CLS[m]||'b-more'}">${m}</span>`).join("")
      +(hid>0?`<span class="badge b-more">+${hid}</span>`:"");
    const dp=d.date.split(".");
    const fmtDate=dp.length===3?`${dp[0]}. ${parseInt(dp[1])}. ${parseInt(dp[2])}.`:d.date;
    // 제목 → 배지 → 작성자·날짜 순
    el.innerHTML=`
      <div class="card-title">${hl(d.title,q)}</div>
      ${badges?`<div class="card-badges">${badges}</div>`:""}
      <div class="card-meta">
        <span class="card-meta-author">${d.author}</span>
        <span class="card-meta-sep">·</span>
        <span class="card-meta-date">${fmtDate}</span>
      </div>
    `;
    el.addEventListener("click",()=>openDetail(d.id));
    el.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")openDetail(d.id);});
    list.appendChild(el);
  });
}

/* =============================================
   SECTION: js-detail
============================================= */
function openDetail(id, prevPage){ _openDetail(id, prevPage, true); }
function _openDetail(id, prevPage, push){
  const d=DATA.find(x=>x.id===id);if(!d)return;
  gaPage('/doc/' + id, 'AK Archive – ' + d.title);
  // GA4 문서 열람 이벤트 + 체류시간 측정 시작
  window._docOpenTime = Date.now();
  window._docOpenId = id;
  if(typeof gtag !== 'undefined') {
    gtag('event', 'view_document', {
      document_id: id,
      document_title: d.title,
      document_category: d.category
    });
  }
  S.prevPage = prevPage !== undefined ? prevPage : document.body.className;
  if (push) pushHistory({page:"detail", id, prevPage: S.prevPage});
  S.openId=id;
  // 상세는 항상 list-page 컨테이너 안에서 표시 (오버레이 방식 일원화)
  // "어디서 왔는지"는 브라우저 히스토리로만 관리 → 목록으로/뒤로가기 일관성 확보
  document.body.className="is-list";
  const _dv0=document.getElementById("detail");
  _dv0.style.display="";_dv0.style.maxWidth="";_dv0.style.margin="";_dv0.style.padding="";
  const _tc0=document.getElementById("tag-content");if(_tc0)_tc0.style.display="";
  ["card-list","chip-bar","count-row","hero"].forEach(i=>document.getElementById(i).style.display="none");
  document.getElementById("gloss-subtab-wrap").classList.remove("show");
  document.getElementById("empty").classList.remove("show");
  // 모델 배지: 레이블 먼저 + 모델 (기능 히스토리는 A&ultima 제외, showAllModels 예외)
  const detailLabels = d.labels
    ? d.labels.map(l=>`<span class="badge ${LABEL_CLS[l]||""}">${l}</span>`).join("")
    : "";
  const detailState = d.state
    ? `<span class="badge ${STATE_CLS[d.state]||"b-state-off"}">${d.state}</span>`
    : "";
  // 유형 → 적용 → 모델
  document.getElementById("d-models").innerHTML=
    detailLabels+detailState+d.models.map(m=>`<span class="badge ${DAP_CLS[m]||""}">${m}</span>`).join("");
  // 제목
  document.getElementById("d-title").textContent=d.title;
  // 날짜 포맷: 2026.05.18 → 2026. 5. 18.
  const dp=d.date.split(".");
  const fmtDate=dp.length===3?`${dp[0]}. ${parseInt(dp[1])}. ${parseInt(dp[2])}.`:d.date;
  document.getElementById("d-name").textContent=d.author;
  document.getElementById("d-date").textContent=fmtDate;
  // 확인 세그먼트 (작성자 · 확인 · 날짜) — d.verifiedBy: ["기획파트", ...]
  const vEl=document.getElementById("d-verify");
  const vSep=document.getElementById("d-sep-v");
  if(d.verifiedBy && d.verifiedBy.length){
    vEl.textContent="확인 "+d.verifiedBy.join(", ");
    vEl.style.display=""; if(vSep) vSep.style.display="";
  } else {
    // 미확인이면 '확인' 세그먼트와 앞 구분점을 숨김 (상태 배지 '초안'이 상태를 전달)
    vEl.textContent=""; vEl.style.display="none"; if(vSep) vSep.style.display="none";
  }
  document.getElementById("d-body").innerHTML=d.body?renderBody(d.body):"";
  // 담당자 크레딧
  const credEl=document.getElementById("d-credits");
  if(d.credits){
    const roles=Object.entries(d.credits);
    credEl.innerHTML=roles.map((([role,name],i)=>
      `${i>0?'<span class="credit-sep"></span>':''}<span class="credit-item"><span class="credit-role">${role}</span><span class="credit-name">${name}</span></span>`
    )).join("");
  } else { credEl.innerHTML=""; }
  // Key Concept 콜아웃 — 제품 상세에서만 노출, 없으면 추후 업데이트 예정
  const kcWrap=document.getElementById("d-keyconcept");
  if(d.category==="제품 모델"){
    const kcBody=document.getElementById("kc-body");
    if(d.keyConcept && d.keyConcept.title){
      const t=d.keyConcept.title, ds=d.keyConcept.desc||"";
      kcBody.innerHTML=`<div class="kc-title">${t}</div>`+(ds?`<div class="kc-desc">${ds}</div>`:"");
    } else {
      kcBody.innerHTML=`<div class="kc-empty">추후 업데이트 예정</div>`;
    }
    kcWrap.classList.add("show");
  } else {
    kcWrap.classList.remove("show");
  }
  // ── 통합 템플릿 섹션 (제품 전용 구조화 필드) ──
  const _esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const _tplLabel=(title,hint)=>`<div class="tpl-label"><span class="tpl-title">${title}</span>${hint?`<span class="tpl-hint">${hint}</span>`:""}</div>`;
  // 라인업 포지셔닝
  const posEl=document.getElementById("d-positioning");
  posEl.innerHTML=d.positioning
    ?_tplLabel("라인업 포지셔닝")+`<div class="pos-text">${_esc(d.positioning)}</div>`
    :"";
  // 신기능
  const nfEl=document.getElementById("d-newfeatures");
  if(d.newFeatures && d.newFeatures.length){
    const cards=d.newFeatures.map(f=>{
      const badge=f.badge==="개선"
        ?`<span class="nf-badge nf-imp">개선</span>`
        :`<span class="nf-badge nf-new">신규</span>`;
      let rows=`<div class="nf-row"><span class="nf-k">무엇</span><span class="nf-v">${_esc(f.what)}</span></div>`;
      if(f.when) rows+=`<div class="nf-row"><span class="nf-k">언제</span><span class="nf-v">${_esc(f.when)}</span></div>`;
      if(f.was)  rows+=`<div class="nf-row nf-was"><span class="nf-k">기존 대비</span><span class="nf-v">${_esc(f.was)}</span></div>`;
      const detail=f.detail?`<div class="nf-detail">${renderBody(f.detail)}</div>`:"";
      return `<div class="nf-card"><div class="nf-head"><span class="nf-name">${_esc(f.name)}</span>${badge}</div><div class="nf-rows">${rows}</div>${detail}</div>`;
    }).join("");
    nfEl.innerHTML=_tplLabel("신기능","이 모델에서 새로 추가·변경된 기능")+`<div class="nf-list">${cards}</div>`;
  } else { nfEl.innerHTML=""; }
  // 특징 & 계보
  const linEl=document.getElementById("d-lineage");
  if(d.lineage && d.lineage.length){
    const rows=d.lineage.map(l=>{
      const cls=l.type==="최초"?"lin-first":(l.type==="계승"?"lin-keep":"lin-unknown");
      return `<div class="lin-row"><span class="lin-name">${_esc(l.name)}</span><span class="lin-tag ${cls}">${_esc(l.origin||"확인 필요")}</span></div>`;
    }).join("");
    const legend=`<div class="lin-legend"><span><span class="lin-dot lin-first"></span>본 모델 최초</span><span><span class="lin-dot lin-keep"></span>이전 모델에서 계승</span></div>`;
    linEl.innerHTML=_tplLabel("특징 &amp; 계보","이 모델의 강점이 어디서 왔는가")+legend+`<div class="lin-list">${rows}</div>`;
  } else { linEl.innerHTML=""; }
  const imgEl=document.getElementById("d-images");
  const detailImgs = d.images ? d.images.filter(img => !img.src.toLowerCase().includes('_thumb')) : [];
  if(detailImgs.length){
    imgEl.innerHTML=`<div class="d-img-grid">${detailImgs.map(img=>{const cap=img.caption?`<span class="body-img-caption" style="margin-top:6px">${img.caption}</span>`:"";return `<div class="d-img-cell" style="display:flex;flex-direction:column">`+`<img src="${img.src}" alt="${(img.alt||img.caption||"").replace(/"/g,"&quot;")}" loading="lazy" style="cursor:pointer" onclick="openImgModal(this.src)"/>`+cap+`</div>`;}).join("")}</div>`;
  } else { imgEl.innerHTML=""; }
  // 첨부 파일
  const filesEl=document.getElementById("d-files");
  if(d.files && d.files.length){
    const dlIcon=`<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 2v7M3.5 6.5l3 3 3-3"/><path d="M2 11h9"/></svg>`;
    filesEl.innerHTML=d.files.map(f=>`<a class="dfile" href="${f.url}" target="_blank" rel="noopener">${dlIcon}${f.label}</a>`).join("");
  } else { filesEl.innerHTML=""; }
  // 태그 — # prefix, 클릭 시 goTag
  const chipsEl=document.getElementById("d-chips");
  chipsEl.innerHTML=d.tags.map(t=>`<span class="tag tag-click" data-tag="${t}">${t}</span>`).join("");
  chipsEl.querySelectorAll(".tag-click").forEach(el=>{
    el.addEventListener("click",()=>goTag(el.dataset.tag));
  });
  const links = d.links || [];
  document.getElementById("d-links").innerHTML=links.length
    ?links.map(l=>{
      const icon=`<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9L9 3M9 3H5M9 3v4"/></svg>`;
      if(l.url.startsWith("#search:")){
        const q=l.url.replace("#search:","");
        return `<button class="dlink" onclick="closeDetail();goList('용어사전','${q}')">${icon}${l.label}</button>`;
      }
      if(l.url.startsWith("#open:")){
        const ref=l.url.slice(6); // "#open:" 이후
        const parts=ref.split(":");
        let tgt;
        if(parts.length>=2 && SLUG_CAT[parts[0]]){            // 신형: #open:uxhistory:3
          const cat=SLUG_CAT[parts[0]], key=parts.slice(1).join(":");
          tgt=DATA.find(x=>x.category===cat && (String(x.id)===key || x.title===key));
        }else{                                                // 구형: #open:24 (전역 id)
          tgt=DATA.find(x=>String(x.id)===parts[0]);
        }
        if(tgt) return `<button class="dlink" onclick="closeDetail(false);openDetail(${tgt.id})">${icon}${l.label}</button>`;
        return `<button class="dlink" disabled style="opacity:.5">${icon}${l.label}</button>`;
      }
      return `<a class="dlink" href="${l.url}" target="_blank" rel="noopener" data-doc-id="${d.id}" data-label="${l.label}" onclick="if(typeof gtag!=='undefined'){gtag('event','click_reference_link',{link_label:this.dataset.label,document_id:this.dataset.docId});}">${icon}${l.label}</a>`;
    }).join("")
    :"";
  document.getElementById("d-links-wrap").style.display=links.length?"":"none";
  // 태그 위 구분선: 첨부 파일·참고 링크가 하나도 없으면 숨김 (선만 뜨는 문제)
  const _chipsWrap=document.getElementById("d-chips-wrap");
  if(_chipsWrap) _chipsWrap.classList.toggle("is-only", !((d.files&&d.files.length)||links.length));
  // 변경 이력 — 최하단 접이식. d.history: [{date, text, by?}] (최신순 권장)
  const histEl=document.getElementById("d-history");
  let hist=d.history||[];
  // 이력이 없으면 작성일 기준 '최초 등록' 한 줄을 자동 생성 (드롭다운 항상 표시)
  if(!hist.length && d.date){ hist=[{date:d.date, text:"최초 등록", by:d.author}]; }
  if(hist.length){
    const items=hist.map(h=>
      `<div class="dh-item"><span class="dh-date">${_esc(h.date||"")}</span><span class="dh-text">${_esc(h.text||"")}${h.by?` <span class="dh-by">· ${_esc(h.by)}</span>`:""}</span></div>`
    ).join("");
    histEl.innerHTML=
      `<button class="dh-toggle" type="button" aria-expanded="false">`+
        `<span class="dh-tl"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>변경 이력 <span class="dh-cnt">(${hist.length})</span></span>`+
        `<svg class="dh-chev" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6l4 4 4-4"/></svg>`+
      `</button><div class="dh-list">${items}</div>`;
    const tg=histEl.querySelector(".dh-toggle"), ls=histEl.querySelector(".dh-list");
    tg.addEventListener("click",()=>{
      const o=ls.classList.toggle("open");
      tg.classList.toggle("open",o);
      tg.setAttribute("aria-expanded",o?"true":"false");
    });
  } else { histEl.innerHTML=""; }
  const dv=document.getElementById("detail");dv.classList.add("show");dv.removeAttribute("aria-hidden");
  window.scrollTo({top:0,behavior:"smooth"});
}

function renderGlossSubtab(){
  const wrap = document.getElementById("gloss-subtab-wrap");
  if(!wrap) return;
  if(S.cat === "용어사전") {
    wrap.classList.add("show");
  } else {
    wrap.classList.remove("show");
  }
}

function closeDetail(rerender=true){
  const dv=document.getElementById("detail");dv.classList.remove("show");dv.setAttribute("aria-hidden","true");
  // GA4 체류시간 기록
  if(window._docOpenTime && typeof gtag!=="undefined"){
    const sec = Math.round((Date.now()-window._docOpenTime)/1000);
    const d = DATA.find(x=>x.id===window._docOpenId);
    gtag("event","document_read_time",{
      document_id: window._docOpenId,
      document_title: d?d.title:"",
      seconds_spent: sec
    });
    window._docOpenTime=null;
  }
  if(!rerender)return;
  S.openId=null;
  ["card-list","count-row","hero"].forEach(i=>document.getElementById(i).style.display="");
  document.getElementById("chip-bar").style.display="flex";
  renderGlossSubtab();
  renderChipBar();
  renderCards();
  window.scrollTo({top:0,behavior:"smooth"});
}

function hl(text,q){
  if(!q)return text;
  return text.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"gi"),"<mark>$1</mark>");
}

/* =============================================
   SECTION: js-render-body
   body 텍스트 → HTML 변환
   - ■ (개수 무관) 으로 시작 → 소제목 H2 (18px)
   - | 로 시작하는 블록 → 테이블
   - 일반 텍스트 → pre-wrap 단락
============================================= */
function renderBody(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;
  let inPre = false;

  function closePre() {
    if (inPre) { result.push('</span>'); inPre = false; }
  }
  function openPre() {
    if (!inPre) { result.push('<span class="body-pre">'); inPre = true; }
  }
  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── 그리드 카드: !!grid-start!! ~ !!grid-end!!
    if (trimmed === '!!grid-start!!') {
      closePre();
      i++;
      const items = [];
      while (i < lines.length && lines[i].trim() !== '!!grid-end!!') {
        const gl = lines[i].trim();
        if (gl.includes('::')) {
          const sep = gl.indexOf('::');
          const rawContent = gl.slice(sep + 2).trim();
          // \n → 줄바꿈, / → 줄바꿈
          const content = escHtml(rawContent)
            .replace(/\\n/g, '\n')
            .replace(/\s*\/\s*/g, '\n');
          items.push({
            title: escHtml(gl.slice(0, sep).trim()),
            content
          });
        }
        i++;
      }
      i++; // skip !!grid-end!!
      let html = '<div class="body-grid">';
      items.forEach(it => {
        html += `<div class="body-grid-item"><span class="body-grid-title">${it.title}</span><span class="body-grid-content">${it.content}</span></div>`;
      });
      html += '</div>';
      result.push(html);
      continue;
    }

    // ── 이미지 마커: !!img:파일명|대체텍스트!! (연속 2개 → 2단 그리드)
    if (/^!!img:.+!!$/.test(trimmed)) {
      closePre();
      const parseImg = (raw) => {
        const inner = raw.trim().slice(6, -2);
        const [src, alt=''] = inner.split('|');
        return {src: src.trim(), alt: alt.trim()};
      };
      const nextLine = (lines[i+1] || '').trim();
      if (/^!!img:.+!!$/.test(nextLine)) {
        const img1 = parseImg(trimmed);
        const img2 = parseImg(nextLine);
        result.push(`<div class="body-img-row"><div class="body-img-col"><img src="${img1.src}" alt="${img1.alt}" loading="lazy"/><span class="body-img-caption">${img1.alt}</span></div><div class="body-img-col"><img src="${img2.src}" alt="${img2.alt}" loading="lazy"/><span class="body-img-caption">${img2.alt}</span></div></div>`);
        i += 2;
      } else {
        const {src, alt} = parseImg(trimmed);
        result.push(`<div class="body-img-wrap"><img src="${src}" alt="${alt}" loading="lazy" style="max-width:100%;border-radius:8px;margin:12px 0;display:block;"/></div>`);
        i++;
      }
      continue;
    }

    // ── 소제목: ■ 개수로 h1/h2/h3 구분
    if (/^■+/.test(trimmed)) {
      closePre();
      const count = trimmed.match(/^■+/)[0].length;
      const t = escHtml(trimmed.replace(/^■+\s*/, ''));
      const cls = count >= 3 ? 'body-h1' : 'body-h2';
      result.push(`<span class="${cls}">${t}</span>`);
      i++;
      // 헤딩 바로 뒤 빈 줄 스킵
      while (i < lines.length && lines[i].trim() === '') i++;
      continue;
    }

    // ── 테이블 equal 마커: !!table-equal!! 바로 다음 표에만 1:1 비율 적용
    if (trimmed === '!!table-equal!!') {
      closePre();
      i++;
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const filtered = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
      let html = '<table class="table-col-equal">';
      filtered.forEach((row, idx) => {
        const cells = row.trim().replace(/^\||\|$/g,'').split('|');
        const tag = idx === 0 ? 'th' : 'td';
        html += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      });
      html += '</table>';
      result.push(html);
      continue;
    }

    // ── 테이블: | 로 시작하는 연속 줄
    if (trimmed.startsWith('|')) {
      closePre();
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const filtered = tableLines.filter(l => !/^\s*\|[\s\-|:]+\|\s*$/.test(l));
      let html = '<table>';
      filtered.forEach((row, idx) => {
        const cells = row.trim().replace(/^\||\|$/g,'').split('|');
        const tag = idx === 0 ? 'th' : 'td';
        html += '<tr>' + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
      });
      html += '</table>';
      result.push(html);
      continue;
    }

    // ── 일반 텍스트
    openPre();
    const escaped = trimmed === '' ? '' : escHtml(line);
    result.push(escaped + '\n');
    i++;
  }
  closePre();
  return result.join('');
}


// 홈 검색 + 자동완성
(function(){
  const hs   = document.getElementById("home-search");
  const hc   = document.getElementById("home-clear");
  const ac   = document.getElementById("home-autocomplete");
  const MAX  = 5;
  const HIST_MAX = 10;
  const HIST_MAX_SHOW = 5;
  const HIST_KEY = "ak_search_history";
  let focusIdx = -1;
  let acItems  = [];

  const CAT_LABEL = {
    "제품 모델":"제품",
    "기능 히스토리":"UX 히스토리",
    "디자인 가이드":"디자인",
    "용어사전":"용어"
  };

  /* ── 히스토리 유틸 ── */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY) || "[]"); } catch(e) { return []; }
  }
  function saveHistory(q) {
    if (!q || q.trim().length === 0) return;
    const q2 = q.trim();
    let hist = loadHistory().filter(h => h !== q2);
    hist.unshift(q2);
    hist = hist.slice(0, HIST_MAX);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  }
  function removeHistory(q) {
    const hist = loadHistory().filter(h => h !== q);
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  }
  function clearHistory() {
    localStorage.removeItem(HIST_KEY);
  }

  /* ── 히스토리 드롭다운 ── */
  function renderHistory() {
    const hist = loadHistory();
    ac.innerHTML = "";
    if (hist.length === 0) { ac.classList.remove("show"); return; }

    const header = document.createElement("div");
    header.className = "ac-history-header";
    header.innerHTML = `<span class="ac-history-label">최근 검색어</span><button class="ac-history-clear">전체 삭제</button>`;
    header.querySelector(".ac-history-clear").addEventListener("mousedown", e => {
      e.preventDefault();
      clearHistory();
      closeAC();
    });
    ac.appendChild(header);

    const ITEM_H = 46;
    const scrollWrap = document.createElement("div");
    scrollWrap.style.cssText = `overflow-y:auto;max-height:${ITEM_H * HIST_MAX_SHOW}px;`;

    hist.forEach(q => {
      const item = document.createElement("div");
      item.className = "ac-item";
      item.innerHTML = `
        <div class="ac-item-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="7" cy="7" r="5.5"/>
            <path d="M7 4.5V7l2 1.5"/>
          </svg>
        </div>
        <div class="ac-item-content">
          <div class="ac-item-title">${escHtml(q)}</div>
        </div>
        <button class="ac-item-del" aria-label="삭제">
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 1l7 7M8 1L1 8"/></svg>
        </button>
      `;
      item.querySelector(".ac-item-del").addEventListener("mousedown", e => {
        e.preventDefault();
        e.stopPropagation();
        removeHistory(q);
        renderHistory();
      });
      item.addEventListener("mousedown", e => {
        if (e.target.closest(".ac-item-del")) return;
        e.preventDefault();
        hs.value = q;
        hc.classList.add("show");
        saveHistory(q);
        closeAC();
        goList("", q);
      });
      scrollWrap.appendChild(item);
    });

    ac.appendChild(scrollWrap);
    ac.classList.add("show");
  }

  function highlight(text, q) {
    if (!q) return escHtml(text);
    const escaped = escHtml(text);
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "gi");
    return escaped.replace(re, m => `<mark>${m}</mark>`);
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function getMatches(q) {
    const lq = q.toLowerCase();
    const scored = DATA.map(d => {
      const title = d.title.toLowerCase();
      if (title.includes(lq))   return { d, score: 2 };
      return null;
    }).filter(Boolean);
    scored.sort((a,b) => b.score - a.score || b.d.date.localeCompare(a.d.date));
    return scored.slice(0, MAX).map(x => x.d);
  }

  function renderAC(q) {
    const matches = getMatches(q);
    acItems = matches;
    focusIdx = -1;
    ac.innerHTML = "";

    if (matches.length === 0) {
      ac.classList.remove("show");
      return;
    }

    matches.forEach((d, i) => {
      const item = document.createElement("div");
      item.className = "ac-item";
      item.setAttribute("role","option");
      const label = CAT_LABEL[d.category] || d.category;
      item.innerHTML = `
        <div class="ac-item-icon">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.6">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
        </div>
        <div class="ac-item-content">
          <div class="ac-item-title">${highlight(d.title, q)}</div>
          ${d.desc ? `<div class="ac-item-meta">${escHtml(d.desc.slice(0,50))}${d.desc.length>50?"…":""}</div>` : ""}
        </div>
        <span class="ac-item-badge">${label}</span>
      `;
      item.addEventListener("mousedown", e => {
        e.preventDefault();
        selectItem(d);
      });
      ac.appendChild(item);
    });

    const total = DATA.filter(d =>
      d.title.toLowerCase().includes(q.toLowerCase())
    ).length;
    if (total > 0) {
      const footer = document.createElement("div");
      footer.className = "ac-footer";
      footer.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
        </svg>
        <span><strong>"${escHtml(q)}"</strong> 전체 결과 ${total}개 보기</span>
      `;
      footer.addEventListener("mousedown", e => {
        e.preventDefault();
        saveHistory(q);
        closeAC();
        goList("", q);
      });
      ac.appendChild(footer);
    }

    ac.classList.add("show");
  }

  function selectItem(d) {
    saveHistory(d.title);
    closeAC();
    hs.value = d.title;
    hc.classList.add("show");
    S.chip = "전체"; S.q = ""; S.cat = d.category;
    document.body.className = "is-list";
    openDetail(d.id, "is-home");
  }

  function closeAC() {
    ac.classList.remove("show");
    acItems = [];
    focusIdx = -1;
  }

  function setFocus(idx) {
    const items = ac.querySelectorAll(".ac-item");
    items.forEach(el => el.classList.remove("is-focused"));
    if (idx >= 0 && idx < items.length) {
      items[idx].classList.add("is-focused");
      focusIdx = idx;
    } else {
      focusIdx = -1;
    }
  }

  // input 이벤트
  hs.addEventListener("input", () => {
    const v = hs.value.trim();
    hc.classList.toggle("show", !!v);
    if (v.length >= 1) {
      renderAC(v);
      if(typeof gtag!=="undefined"){
        gtag("event","search",{search_term:v,search_location:"home"});
      }
    } else {
      renderHistory();
    }
  });

  // 포커스 시 히스토리 표시
  hs.addEventListener("focus", () => {
    if (!hs.value.trim()) renderHistory();
  });

  // 키보드 네비게이션
  hs.addEventListener("keydown", e => {
    const items = ac.querySelectorAll(".ac-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!ac.classList.contains("show")) {
        if (hs.value.trim()) renderAC(hs.value.trim());
        else renderHistory();
        return;
      }
      setFocus(Math.min(focusIdx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocus(Math.max(focusIdx - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < acItems.length) {
        selectItem(acItems[focusIdx]);
      } else {
        const v = hs.value.trim();
        if (v) { saveHistory(v); closeAC(); goList("", v); }
      }
    } else if (e.key === "Escape") {
      closeAC();
    }
  });

  // 포커스 잃으면 닫기
  hs.addEventListener("blur", () => {
    setTimeout(closeAC, 150);
  });

  // clear 버튼
  hc.addEventListener("click", () => {
    hs.value = "";
    hc.classList.remove("show");
    closeAC();
    hs.focus();
  });
})();

// GNB 탭
document.querySelectorAll(".gnb-tab").forEach(tab=>{
  tab.addEventListener("click",()=>{S.chip="전체";S.model="전체";S.q="";if(typeof gtag!=="undefined"){gtag("event","select_category",{category_name:tab.dataset.cat});}goList(tab.dataset.cat,"");});
});

// ── 드로어 ──
(function(){
  const overlay   = document.getElementById("gnb-drawer-overlay");
  const drawer    = document.getElementById("gnb-drawer");
  const hamburger = document.getElementById("gnb-hamburger");
  const closeBtn  = document.getElementById("gnb-drawer-close");

  function openDrawer(){
    overlay.classList.add("open");
    drawer.classList.add("open");
    document.getElementById("gnb-inner").classList.add("drawer-open");
    hamburger.style.display = "none";
    closeBtn.style.display  = "flex";
    syncDrawerActive();
  }
  function closeDrawer(){
    overlay.classList.remove("open");
    drawer.classList.remove("open");
    document.getElementById("gnb-inner").classList.remove("drawer-open");
    hamburger.style.display = "";
    closeBtn.style.display  = "none";
  }
  function syncDrawerActive(){
    document.querySelectorAll(".gnb-drawer-item").forEach(el=>{
      el.classList.toggle("is-active", el.dataset.cat === S.cat);
    });
  }

  hamburger.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);

  document.querySelectorAll(".gnb-drawer-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      S.chip="전체"; S.model="전체"; S.q="";
      goList(item.dataset.cat, "");
      closeDrawer();
    });
  });

  const _origGoList = goList;
  window.goList = function(cat, q){
    _origGoList(cat, q);
    syncDrawerActive();
  };
})();

// GNB 로고
document.getElementById("gnb-logo").addEventListener("click",()=>{
  if(S.openId!==null){closeDetail();return;}
  goHome();
});

// 뒤로가기
document.getElementById("detail-back").addEventListener("click",()=>{
  if(typeof gtag!=="undefined"&&window._docOpenId){
    const d=DATA.find(x=>x.id===window._docOpenId);
    gtag("event","back_from_document",{document_id:window._docOpenId,document_title:d?d.title:"",prev_page:S.prevPage||"list"});
  }
  // 직전 화면(카테고리 목록 / 태그 목록 / 홈)으로 복귀 — 히스토리 일원화
  history.back();
});

// 태그 페이지 뒤로가기 → 직전 화면으로
document.getElementById("tag-back").addEventListener("click",()=>{
  history.back();
});

// Top 버튼
(function(){
  const btn = document.getElementById("top-btn");
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 300);
  }, {passive:true});
  btn.addEventListener("click", () => {
    window.scrollTo({top:0, behavior:"smooth"});
  });
})();

// 이미지 모달
function openImgModal(src){
  document.getElementById("img-modal-img").src=src;
  document.getElementById("img-modal").classList.add("show");
  document.body.style.overflow="hidden";
}
function closeImgModal(){
  document.getElementById("img-modal").classList.remove("show");
  document.body.style.overflow="";
}

// 오류 신고 폼 모달 (제출 → Web3Forms → young@meewang.kr 메일 수신)
// ▼▼▼ web3forms.com 에서 young@meewang.kr 로 발급받은 Access Key를 아래 따옴표 안에 붙여넣으세요 ▼▼▼
const REPORT_ACCESS_KEY = "6e75f25d-0509-49f8-9939-46805ef153d5";
// ▲▲▲ (이 한 줄만 바꾸면 됩니다) ▲▲▲
function openReportModal(){
  document.getElementById("report-text").value="";
  const st=document.getElementById("report-status"); st.textContent=""; st.className="rm-status";
  document.getElementById("report-send").disabled=false;
  document.getElementById("report-modal").classList.add("show");
  document.body.style.overflow="hidden";
  setTimeout(()=>document.getElementById("report-text").focus(),50);
}
function closeReportModal(){
  document.getElementById("report-modal").classList.remove("show");
  document.body.style.overflow="";
}
async function _sendReport(){
  const textEl=document.getElementById("report-text");
  const st=document.getElementById("report-status");
  const sendBtn=document.getElementById("report-send");
  const text=textEl.value.trim();
  if(!text){ st.className="rm-status err"; st.textContent="내용을 입력해주세요."; textEl.focus(); return; }
  const d=(typeof S!=="undefined" && S.openId!=null)?DATA.find(x=>x.id===S.openId):null;
  sendBtn.disabled=true; st.className="rm-status"; st.textContent="전송 중…";
  const subject="[AK Archive] 오류 신고"+(d?` - ${d.title}`:"");
  // JSON(UTF-8) 전송 — 한글 필드명이 깨지지 않도록 (multipart 대신)
  const payload={
    access_key: REPORT_ACCESS_KEY,
    subject: subject,
    from_name: "AK Archive 제보",
    "항목": d?`${d.title} (id ${d.id})`:"전체 사이트",
    "페이지": location.href,
    "내용": text
  };
  try{
    const res=await fetch("https://api.web3forms.com/submit",{
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok || (data.success!==undefined && String(data.success)!=="true")){
      throw new Error(data.message||("HTTP "+res.status));
    }
    st.className="rm-status ok"; st.textContent="전송되었습니다. 감사합니다!";
    textEl.value="";
    setTimeout(closeReportModal,1500);
  }catch(err){
    console.error("[report] 전송 실패:", err);
    // 실패 시 메일 작성으로 대체 (막다른 길 방지)
    const mail="mailto:young@meewang.kr?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent((d?`항목: ${d.title} (id ${d.id})\n`:"")+`페이지: ${location.href}\n\n${text}`);
    st.className="rm-status err";
    st.innerHTML=`전송이 안 됐어요. <a href="${mail}" style="color:#F09AA3;text-decoration:underline">메일로 보내기</a>`;
    sendBtn.disabled=false;
  }
}
(function(){
  const rb=document.getElementById("report-btn"); if(rb) rb.addEventListener("click",openReportModal);
  const sb=document.getElementById("report-send"); if(sb) sb.addEventListener("click",_sendReport);
})();

// ESC
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    const _rm=document.getElementById("report-modal");
    if(_rm && _rm.classList.contains("show")){closeReportModal();return;}
    if(document.getElementById("img-modal").classList.contains("show")){closeImgModal();return;}
    if(S.openId!==null) document.getElementById("detail-back").click();
    else if(document.body.classList.contains("is-tag")) document.getElementById("tag-back").click();
  }
});

/* =============================================
   SECTION: js-deeplink-router
   주소창 해시(#/doc/38 등)로 특정 항목 직접 진입/공유 지원
============================================= */
function routeFromHash() {
  const h = location.hash || "";
  // 상세: #/product/SP4000 (제품명) 또는 #/uxhistory/3 (번호) — 카테고리 범위로 조회
  const dm = h.match(/^#\/([^\/]+)\/(.+?)\/?$/);
  if (dm && SLUG_CAT[dm[1]]) {
    const cat = SLUG_CAT[dm[1]];
    const key = decodeURIComponent(dm[2]);
    let d = /^\d+$/.test(key) ? DATA.find(x => x.category === cat && String(x.id) === key) : null;
    if (!d) d = DATA.find(x => x.category === cat && x.title === key); // 제품명 키
    if (!d) return false;
    replaceHistory({page:"list", cat, q:""});
    _goList(cat, "", false);
    openDetail(d.id, "is-list");
    return true;
  }
  // 카테고리: #/product 처럼 단일 슬러그면 목록으로 (구 #/list/product 도 아래에서 호환 처리)
  const cm = h.match(/^#\/([^\/]+)\/?$/);
  if (cm && SLUG_CAT[cm[1]]) {
    const cat = SLUG_CAT[cm[1]];
    _goList(cat, "", false);
    replaceHistory({page:"list", cat, q:""});
    return true;
  }
  const m = h.match(/^#\/(doc|tag|list|search)\/(.*)$/);
  if (!m) return false;
  const kind = m[1];
  const val = decodeURIComponent(m[2]);

  if (kind === "doc") {
    const id = Number(val);
    const d = DATA.find(x => x.id === id);
    if (!d) return false;
    // 뒤로가기 시 해당 카테고리 목록으로 복귀하도록 목록을 먼저 깔고 상세를 push
    replaceHistory({page:"list", cat:d.category, q:""});
    _goList(d.category, "", false);
    openDetail(id, "is-list");
    return true;
  }
  if (kind === "tag") {
    _goTag(val, false);
    replaceHistory({page:"tag", tag:val});
    return true;
  }
  if (kind === "list") {
    const cat = slugToCat(val);
    _goList(cat, "", false);
    replaceHistory({page:"list", cat, q:""});
    return true;
  }
  if (kind === "search") {
    _goList("", val, false);
    replaceHistory({page:"list", cat:"", q:val});
    return true;
  }
  return false;
}
// 최초 진입 시 공유된 해시 링크가 있으면 해당 화면으로 라우팅
routeFromHash();
