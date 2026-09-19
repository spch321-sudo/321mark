/* ===== 321聖經講義　通用引擎（書卷由 BOOK 決定） ===== */
const D = JSON.parse(document.getElementById('DATA').textContent);
const BOOK = JSON.parse(document.getElementById('BOOK').textContent);
const $ = s => document.querySelector(s);
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CH = D.ch, BLK = D.blk;
/* 每一節 → 所屬的解經段落 */
const VMAP = {};
Object.keys(BLK).forEach(c => BLK[c].forEach((b, i) => {
  b.ch = +c; b.i = i;
  b.ref = c + ':' + (b.a === b.z ? b.a : b.a + '–' + b.z);
  for (let v = b.a; v <= b.z; v++) VMAP[c + ':' + v] = b;
}));
const byCh = {}; Object.keys(BLK).forEach(c => byCh[+c] = BLK[c]);
const cuvOf = ref => { const [c, v] = ref.split(':'); const t = D.txt[c]; return t ? (t[+v - 1] || '') : ''; };
const blkCuv = b => { const t = D.txt[b.ch] || []; let h = '';
  for (let v = b.a; v <= b.z; v++) h += `<p><b>${v}</b>　${esc(t[v - 1] || '')}</p>`; return h; };
const KEY = 'r321.' + BOOK.id + '.v1';
const DAY = 864e5, GAPS = [0, 1, 3, 7, 16, 35, 75];

let S = load();
function load(){
  try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && o.v === 1) return o; } catch(e){}
  return { v:1, last:1, steps:{}, notes:{}, prac:{}, mem:{}, set:{ fs:1, grk:1, dark:0, role:'' }, seen:{} };
}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch(e){} };
function toast(t){ const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1700); }
const meta = n => CH[n - 1];

/* ===== 進度 ===== */
const STEPS = [
  ['資訊','讀完本章卡片'], ['啟示','讀經文，寫下你看見的一件事'], ['信服','記住本章金句'],
  ['實踐','選一項本週操練'], ['檢討','第七天回填：做了嗎'], ['修正','回到哪一節重讀'],
  ['反覆','複習通過三次'], ['繁殖','講給一位課外的人聽'],
];
const stepsOf = n => S.steps[n] || [];
function toggleStep(n, i){
  const a = stepsOf(n), k = a.indexOf(i);
  if (k >= 0) a.splice(k, 1); else a.push(i);
  S.steps[n] = a; save(); render();
}
const doneCh = () => CH.filter(c => stepsOf(c.n).length === 8).length;
const startedCh = () => CH.filter(c => stepsOf(c.n).length > 0).length;

/* ===== 複習 ===== */
function memAdd(n){ if (S.mem[n]) return false; S.mem[n] = { box:0, due:Date.now(), hit:0 }; save(); return true; }
function memGrade(n, ok){
  const r = S.mem[n]; if (!r) return;
  r.box = ok ? Math.min(GAPS.length - 1, r.box + 1) : 0;
  r.hit = (r.hit || 0) + (ok ? 1 : 0);
  r.due = Date.now() + (ok ? GAPS[r.box] : 0.4) * DAY;
  save();
}
const due = () => Object.keys(S.mem).filter(n => S.mem[n].due <= Date.now()).map(Number);
function blank(t, seed){
  const ch = [...t], idx = [];
  ch.forEach((c, i) => { if (/[\u4e00-\u9fa5]/.test(c)) idx.push(i); });
  let r = seed; const rnd = () => (r = (r * 1103515245 + 12345) % 2147483648) / 2147483648;
  const n = Math.max(1, Math.round(idx.length * 0.3)), pick = new Set();
  let guard = 0;
  while (pick.size < n && guard++ < 999) pick.add(idx[Math.floor(rnd() * idx.length)]);
  return ch.map((c, i) => pick.has(i) ? '<i>○</i>' : esc(c)).join('');
}

/* ===== 朗讀 ===== */
let VOICE = null;
function say(t){
  if (!window.speechSynthesis) return toast('這台裝置不支援朗讀');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(t).replace(/<[^>]+>/g, ''));
  u.lang = 'zh-TW'; u.rate = 0.94;
  const vs = speechSynthesis.getVoices();
  const v = vs.find(x => /zh[-_]TW|zh[-_]HK|cmn/i.test(x.lang)) || vs.find(x => /^zh/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
const plain = el => (el || $('#view')).innerText.slice(0, 3000);

/* ===== 路由 ===== */
let R = { tab:'today', ch:0, sub:'' };
function go(tab, ch, sub){ R = { tab, ch: ch || 0, sub: sub || '' }; if (ch) { S.last = ch; save(); } render(); window.scrollTo(0, 0); }
document.addEventListener('click', e => {
  const b = e.target.closest('nav.tabs button'); if (!b) return;
  go(b.dataset.t);
});
$('#back').onclick = () => { if (R.ch) go(R.tab === 'text' ? 'text' : 'course'); else go('today'); };
$('#spk').onclick = () => { if (SPK.on) return stopSpeak(); speak(plain(), $('#ttl').textContent); };
$('#spk').onlongpress = null;
(function(){ let t; const b = $('#spk');
  const st = () => { t = setTimeout(() => { voiceSheet(); t = null; }, 550); };
  const cl = () => { if (t){ clearTimeout(t); t = null; } };
  b.style.webkitTouchCallout = 'none'; b.style.webkitUserSelect = 'none'; b.style.userSelect = 'none';
  b.addEventListener('contextmenu', e => e.preventDefault());
  b.addEventListener('touchstart', st, { passive:true });
  b.addEventListener('touchend', cl); b.addEventListener('touchmove', cl);
  b.addEventListener('mousedown', st); b.addEventListener('mouseup', cl);
})();
$('#fsz').onclick = () => { S.set.fs = (S.set.fs + 1) % 5; save(); applyFS(); toast('字級 ' + (S.set.fs + 1) + ' / 5'); };
function applyFS(){ document.documentElement.style.setProperty('--fs', [15, 17, 19, 22, 25][S.set.fs] + 'px'); }
function applyDark(){ document.documentElement.setAttribute('data-dark', S.set.dark ? '1' : '0'); }

/* ===== 地形圖 ===== */
function terrain(cur){
  const P = D.terrain.points, W = 320, H = 96, pad = 14;
  const x = c => pad + (c - 1) / 15 * (W - pad * 2);
  const y = v => 10 + v / 100 * (H - 26);
  let d = `M ${x(1)} ${y(40)}`;
  P.forEach(p => { d += ` L ${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`; });
  d += ` L ${x(16)} ${y(30)}`;
  const labs = P.filter(p => p[4]).map(p => {
    const yy = p[4] === 'bot' ? y(p[1]) + 11 : y(p[1]) - 6;
    return `<text class="tlab ${p[4] === 'top' ? 'hi' : ''}" x="${x(p[0]).toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="middle">${esc(p[3])}</text>`;
  }).join('');
  const dots = P.map(p => `<circle class="tdot ${p[4] === 'bot' ? 'low' : ''}" cx="${x(p[0]).toFixed(1)}" cy="${y(p[1]).toFixed(1)}" r="${p[4] ? 3.2 : 2.2}"/>`).join('');
  const now = cur ? `<circle class="tnow" cx="${x(cur).toFixed(1)}" cy="${y(50)}" r="6"/>` : '';
  return `<div class="terrain"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(BOOK.name)}全書地形圖">
    <path class="tpath" d="${d}"/>${dots}${labs}${now}</svg>
    <p class="xs muted center" style="margin:2px 0 6px">兩個最低點 · 兩個「如今」 · 一個「所以」</p></div>`;
}

/* ===== 今日 ===== */
function vToday(){
  setTitle(BOOK.app, true);
  const n = S.last || 1, m = meta(n), st = stepsOf(n);
  const nx = st.length < 8 ? STEPS[st.length] : null;
  const dl = due();
  let h = `<div class="sect">
    <p class="eyebrow">今日</p>
    <h2 class="big">一封寫給你的信。</h2>
    ${terrain(n)}
    <div style="height:14px"></div>
    <button class="bigbtn" onclick="go('course',${n})">
      <small>${st.length ? '接著讀' : '從第一章開始'}</small>
      <b>第${n}章　${esc(m.t)}</b>
      <small style="margin-top:9px">${nx ? '下一步 · ' + (st.length + 1) + ' ' + nx[0] + '｜' + nx[1] : '八步已走完　願你繼續繁殖'}</small>
    </button>
  </div>`;

  if (dl.length) h += `<div class="card" style="border-color:var(--brass)">
    <p class="eyebrow" style="color:var(--brass)">今天要複習</p>
    <p style="margin:0 0 10px">有 <b>${dl.length}</b> 節金句等你</p>
    <button class="btn pri" onclick="go('tools',0,'review')">開始複習</button></div>`;

  const p = S.prac[n] || {};
  const items = practiceItems(n);
  const dn = items.filter((_, i) => p[i]).length;
  h += `<div class="card">
    <p class="eyebrow">本週操練 · 第${n}章</p>
    <p class="q">${esc(meta(n).prac.main)}</p>
    <p class="sm muted" style="margin:6px 0 0">已完成 ${dn} / ${items.length}　<a href="#" onclick="go('course',${n},'prac');return false">去打卡</a></p></div>`;

  h += `<div class="card"><p class="eyebrow">進度</p>
    <p style="margin:0">已開始 <b>${startedCh()}</b> 章　·　走完八步 <b>${doneCh()}</b> 章　·　共 ${BOOK.ch} 章</p></div>`;

  h += `<div class="foot">全書${BOOK.chword}章 ${BOOK.verses} 節經文、${Object.keys(BLK).reduce((a,c)=>a+BLK[c].length,0)} 段逐節解經、${BOOK.ch} 篇講章逐字稿，全部收錄。<br>
    內容出自${BOOK.src}。經文引用《${BOOK.bible}》。</div>`;
  return h;
}
const practiceItems = n => [meta(n).prac.main].concat(meta(n).prac.items);

/* ===== 經文 ===== */
function vText(){
  setTitle('經文', false);
  if (!R.ch){
    let h = `<div class="sect"><p class="eyebrow">${esc(BOOK.name)}</p><h2 class="big">從第一章讀到第${BOOK.chword}章。</h2>
      <p class="sm muted">點任何一節，該節的解經就會打開。</p>
      <div class="row" style="margin:14px 0">`;
    for (let i = 1; i <= BOOK.ch; i++){
      const n = (D.txt[i] || []).length;
      h += `<button class="pill on" onclick="go('text',${i})">${i}　${n}節</button>`;
    }
    h += `</div><p class="xs muted">全書${BOOK.chword}章 ${BOOK.verses} 節，逐節解經 ${Object.keys(BLK).reduce((a,c)=>a+BLK[c].length,0)} 段，全部收錄。</p></div>`;
    return h;
  }
  const n = R.ch, m = meta(n);
  setTitle(BOOK.name + ' ' + n, false);
  let h = `<div class="sect"><p class="eyebrow">第 ${n} 章　${esc(m.arc)}</p>
    <h2 class="big">${esc(m.t)}</h2><p class="sm muted">${esc(m.sub)}</p></div>`;
  const full = D.txt[n] || [];
  h += `<div class="mkhint">💡 <b>點一下經文</b>畫線，<b>再點一下</b>寫下領受；點左邊的<b>節號</b>看解經。</div>`;
  h += '<div style="margin-bottom:10px">';
  full.forEach((t, i) => {
    const vn = i + 1, ref = n + ':' + vn, b = VMAP[ref];
    const first = b && b.a === vn;
    const cls = b ? (b.star ? 'vs star has' : 'vs has') : 'vs';
    const note = (BOOK.id === 'romans' && n === 16 && vn === 24) ? '<span class="flag" style="color:var(--dusk)">※ 較早抄本無此節</span>' : '';
    const tag = first && b.z > b.a ? `<span class="flag" style="color:var(--dusk)">解經　${b.a}–${b.z}節</span>` : '';
    const t2 = D.txt[n][i];
    const sents = splitHTML(esc(t2));
    let vb = '', notes = '';
    sents.forEach((sv, si) => {
      const mk = 'v|' + ref + (sents.length > 1 ? '|' + si : ''), on = mkHas(mk);
      vb += `<span class="mks${on ? ' hl' : ''}" onclick="event.stopPropagation();mkTap('${mk}',this)">${sv}</span>`;
      if (on && mkNote(mk)) notes += `<div class="mknote" style="margin-left:29px">
        <b>領受</b>　${esc(mkNote(mk))}
        <button class="mkask" onclick="askXz(mkText('${mk}'),'領受：${escA(mkNote(mk))}')">✨ 問小智</button></div>`;
    });
    h += `<div class="${cls}" data-v="${ref}">
      <span class="vn" ${b ? `onclick="openV('${ref}')"` : ''}>${vn}</span>
      <span class="vt">${vb}${note}${tag}</span></div>` + notes;
  });
  h += '</div>';
  h += `<div class="hr"></div><button class="btn" onclick="go('course',${n})">看第 ${n} 章講義 ›</button>`;
  return h;
}

/* ===== 節解經（六層）===== */
let OPENL = { 1:1, 2:0, 3:1, 4:0, 5:0, 6:1 };
function openV(ref){
  const v = VMAP[ref]; if (!v) return;
  const rr = v.ch + ':' + (v.a === v.z ? v.a : v.a + '–' + v.z);
  const L = (i, name, body, cls) => {
    const on = OPENL[i] && !(i === 2 && !S.set.grk) && !(i === 4 && !S.set.grk);
    return `<div class="layer"><div class="lh" onclick="tglL(${i},'${ref}')">
      <span class="n">${['','①','②','③','④','⑤','⑥'][i]}</span><span>${name}</span>
      <span class="caret">${on ? '▾' : '▸'}</span></div>
      ${on ? `<div class="lb ${cls || ''}">${body}</div>` : ''}</div>`;
  };
  let h = `<h4>${esc(BOOK.name)} ${esc(rr)}</h4>
    <p class="xs muted" style="margin:0 0 10px">${v.star ? '★ 重點段落　' : ''}第 ${v.ch} 章</p>
    ${L(1, '和合本', blkCuv(v))}
    ${S.set.grk && v.grk ? L(2, '原文', v.grk, 'grk') : ''}
    ${v.lit ? L(3, '直譯', tagParas(v.lit, 'x|' + v.ch + ':' + v.a + '|lit'), 'lit') : ''}
    ${S.set.grk && v.key ? L(4, '關鍵字', v.key) : ''}
    ${v.gram ? L(5, '文法解析', tagParas(v.gram, 'x|' + v.ch + ':' + v.a + '|gram')) : ''}
    ${v.exp ? L(6, '經文解釋', tagParas(v.exp, 'x|' + v.ch + ':' + v.a + '|exp')) : ''}`;
  const iss = (D.issues || []).filter(x => (x.ch || []).includes(v.ch));
  if (iss.length){ h += `<div class="hr"></div>`;
    iss.forEach(x => h += `<button class="btn" style="margin:0 6px 6px 0" onclick="openIssue('${x.id}')">⚖ ${esc(x.t)} ›</button>`); }
  const prev = BLK[v.ch][v.i - 1], next = BLK[v.ch][v.i + 1];
  h += `<div class="hr"></div><div class="row">
    ${prev ? `<button class="btn" onclick="openV('${v.ch}:${prev.a}')">‹ 上一段</button>` : ''}
    ${next ? `<button class="btn" onclick="openV('${v.ch}:${next.a}')">下一段 ›</button>` : ''}
    <button class="btn" onclick="sayV('${ref}')">🔊 朗讀</button>
    <button class="btn" onclick="askXz(blkPlain('${ref}'))">✨ 問小智</button>
    <button class="btn" onclick="go('course',${v.ch})">整章講義</button></div>`;
  sheet(h);
}
function blkPlain(ref){ const v = VMAP[ref]; if (!v) return '';
  const t = D.txt[v.ch] || []; let c = '';
  for (let i = v.a; i <= v.z; i++) c += (t[i - 1] || '') + ' ';
  return c + '\n' + (v.lit || '').replace(/<[^>]+>/g, ' ') + '\n' + (v.exp || '').replace(/<[^>]+>/g, ' '); }
function sayV(ref){ const v = VMAP[ref]; if (!v) return;
  speak(blkPlain(ref), '羅 ' + v.ch + ':' + v.a); }
function sayMV(n){ const m = meta(n); speak(m.mv.t + '。' + m.mv.r, '本章金句'); }
function tglL(i, ref){ OPENL[i] = OPENL[i] ? 0 : 1; openV(ref); }

/* ===== 課程 ===== */
function vCourse(){
  if (!R.ch){
    setTitle('課程', false);
    let h = `<div class="sect"><p class="eyebrow">十六講</p><h2 class="big">一章一講，走完全卷。</h2></div>`;
    CH.forEach(c => {
      const st = stepsOf(c.n).length;
      h += `<button class="chrow" onclick="go('course',${c.n})">
        <span class="chn">${String(c.n).padStart(2, '0')}</span>
        <span style="flex:1"><b>${esc(c.t)}</b><span class="s">${esc(c.sub)}</span>
        ${st ? `<span class="done">● ${st}/8 步</span>` : ''}</span></button>`;
    });
    return h;
  }
  const n = R.ch, m = meta(n);
  setTitle(BOOK.name + ' ' + n + ' 章', false);
  const tabs = [['card','卡片'],['core','核心'],['group','小組'],['serm','講章'],['prac','操練'],['safe','把關']];
  const cur = R.sub || 'card';
  let h = `<div class="sect"><p class="eyebrow">第 ${n} 章 · ${esc(m.arc)}　${esc(m.lv)}級</p>
    <h2 class="big">${esc(m.t)}</h2><p class="sm muted" style="margin:-8px 0 14px">${esc(m.sub)}</p>
    <div class="row">${tabs.map(t => `<button class="pill ${cur === t[0] ? 'on' : ''}" onclick="go('course',${n},'${t[0]}')">${t[1]}</button>`).join('')}</div></div>`;
  h += ({ card:cCard, core:cCore, group:cGroup, serm:cSerm, prac:cPrac, safe:cSafe }[cur])(n, m);
  h += `<div class="hr"></div><div class="row">
    ${n > 1 ? `<button class="btn" onclick="go('course',${n - 1})">‹ 第${n - 1}章</button>` : ''}
    ${n < BOOK.ch ? `<button class="btn" onclick="go('course',${n + 1})">第${n + 1}章 ›</button>` : ''}
    <button class="btn" onclick="go('text',${n})">看經文</button></div>`;
  return h;
}

function cCard(n, m){
  let h = `<div class="card"><p class="eyebrow">核心問題</p><p class="q">${esc(m.q)}</p></div>
  <div class="card" style="border-color:var(--pine)"><p class="eyebrow" style="color:var(--pine)">一句話核心真理</p>
    <p style="font-family:var(--serif);font-size:20px;line-height:1.75;margin:0">${esc(m.truth)}</p></div>
  <div class="card"><p class="eyebrow">三句話</p>${m.card.map((x, i) => {
      const k = 'c|' + n + ':0|card|' + i, on = mkHas(k);
      return `<p class="mkp${on ? ' hl' : ''}" style="margin:0 0 10px" onclick="mkTap('${k}',this)">· ${esc(x)}</p>`
        + (on && mkNote(k) ? `<div class="mknote"><b>領受</b>　${esc(mkNote(k))}</div>` : '');
    }).join('')}</div>
  <div class="card" style="background:var(--pine);color:#fff;border:0">
    <p class="eyebrow" style="color:#fff;opacity:.8">本章金句</p>
    <p style="font-family:var(--serif);font-size:19px;line-height:1.8;margin:0 0 6px">「${esc(m.mv.t)}」</p>
    <p class="sm" style="margin:0;opacity:.85">${esc(m.mv.r)}</p>
    <div style="margin-top:12px"><button class="btn" onclick="addMem(${n})">加入複習</button>
    <button class="btn" onclick="sayMV(${n})">🔊</button></div></div>`;
  h += `<h3 class="sec">八大步驟</h3><div class="card">`;
  STEPS.forEach((s, i) => {
    const on = stepsOf(n).includes(i);
    h += `<div class="chk ${on ? 'on' : ''}" onclick="toggleStep(${n},${i})">
      <span class="box">${on ? '✓' : ''}</span><span class="t"><b>${i + 1} ${s[0]}</b>　<span class="muted sm">${s[1]}</span></span></div>`;
  });
  h += `</div>`;
  h += `<h3 class="sec">我的筆記</h3><textarea class="note" id="nt" placeholder="這一章，神對你說了什麼？">${esc(S.notes[n] || '')}</textarea>
    <div style="margin-top:8px"><button class="btn" onclick="S.notes[${n}]=$('#nt').value;save();toast('筆記已存')">儲存筆記</button></div>`;
  return h;
}
function addMem(n){ toast(memAdd(n) ? '已加入複習' : '這一節已經在複習清單裡'); }

function cCore(n, m){
  let h = `<h3 class="sec">全章結構</h3><div class="card">`;
  m.sec.forEach((s, i) => h += `<p style="margin:0 0 8px"><span class="chn" style="min-width:auto">${i + 1}</span>　<b>${esc(s[0])}</b>　${esc(s[1])}</p>`);
  h += `</div>`;
  const list = byCh[n] || [];
  h += `<h3 class="sec">逐節解經　${list.length} 段</h3>`;
  list.forEach(v => { const t = D.txt[n] || [];
    h += `<button class="chrow" onclick="openV('${n}:${v.a}')">
      <span class="chn">${v.a === v.z ? v.a : v.a + '–' + v.z}</span>
      <span style="flex:1"><b style="font-size:15px;font-weight:400;line-height:1.7">${v.star ? '★ ' : ''}${esc((t[v.a - 1] || '').slice(0, 38))}…</b></span></button>`; });
  h += `<h3 class="sec">321 落點</h3><div class="card">
    <p style="margin:0 0 10px"><b>「有己」在本章的形狀</b><br>${esc(m.self)}</p>
    <p style="margin:0 0 10px"><b>讓耶穌作王</b><br>${esc(m.t321.k)}</p>
    <p style="margin:0 0 10px"><b>讓耶穌得榮耀</b><br>${esc(m.t321.g)}</p>
    <p style="margin:0"><b>建立屬神的體系</b><br>${esc(m.t321.p)}</p></div>`;
  return h;
}

function cGroup(n, m){
  let h = `<div class="card"><p class="eyebrow">小組流程 · 約 60–75 分鐘</p>
    <p class="sm" style="margin:0 0 12px">① 破冰 10 分　② 經文共讀 15 分　③ 五題討論 30 分　④ 操練與代禱 15 分</p>
    <button class="btn pri" onclick="fOpen('live',${n})">▶ 開始帶組（全螢幕）</button></div>`;
  m.grp.forEach((q, i) => {
    h += `<div class="card"><p class="eyebrow">第 ${i + 1} 題${i === 2 ? ' · 最深的一題' : ''}</p>
      <p class="q">${esc(q)}</p>
      ${i === 2 ? '<div class="tip">💡 組長先說自己的。不要追問細節；若有人哭，停下來為他禱告，不要接著問下一題。</div>' : ''}
      ${i === 4 ? '<div class="tip">💡 請小組成員在第七天問他一次。</div>' : ''}</div>`;
  });
  return h;
}

function cSerm(n, m){
  let h = `<div class="card"><p class="eyebrow">講章</p>
    <p style="font-family:var(--serif);font-size:24px;margin:0">《${esc(m.t)}》</p>
    <p class="sm muted" style="margin:4px 0 0">副題：${esc(m.sub)}</p></div>
  <div class="card"><p class="eyebrow">講章主旨</p><p class="q" style="margin:0">${esc(m.truth)}</p></div>
  <div class="card" style="border-color:var(--pine)">
    <p class="eyebrow" style="color:var(--pine)">講台提詞機</p>
    <p class="sm" style="margin:0 0 12px">${D.serm[n] ? '逐字稿已收錄　·　' + D.serm[n].blocks.length + ' 段　·　約 ' + D.serm[n].min + ' 分鐘' : '本章尚未收錄逐字稿，將以三大段大綱提詞'}</p>
    <button class="btn pri" onclick="fOpen('tele',${n})">▶ 上台（深色大字）</button></div>`;
  m.serm.pts.forEach(p => {
    h += `<div class="card"><p class="eyebrow">${esc(p[1])}</p>
      <p style="font-family:var(--serif);font-size:19px;margin:0 0 8px">${esc(p[0])}</p>
      <p class="sm" style="margin:0">${esc(p[2])}</p></div>`;
  });
  h += `<div class="card" style="border-color:var(--clay)">
    <p class="eyebrow" style="color:var(--clay)">上台前</p>
    <p class="sm" style="margin:0 0 10px">這一章有 ${m.safe.length} 條最容易失守的地方。</p>
    <button class="btn" onclick="go('course',${n},'safe')">去看把關清單 ›</button></div>`;
  return h;
}

function cPrac(n, m){
  const items = practiceItems(n), p = S.prac[n] || (S.prac[n] = {});
  let h = `<div class="card" style="border-color:var(--brass)">
    <p class="eyebrow" style="color:var(--brass)">本週主操練 · 只選一項</p>
    <p class="q" style="margin:0">${esc(items[0])}</p></div><div class="card">`;
  items.forEach((t, i) => {
    if (!i) return;
    h += `<div class="chk ${p[i] ? 'on' : ''}" onclick="tglP(${n},${i})">
      <span class="box">${p[i] ? '✓' : ''}</span><span class="t">${esc(t)}</span></div>`;
  });
  h += `</div>
  <div class="card"><p class="eyebrow">第七天</p>
    <p class="sm" style="margin:0 0 8px">請一位屬靈同伴，在第七天問你一次。</p>
    <input class="note" style="min-height:0;height:44px" id="pal" placeholder="他的名字" value="${esc((S.prac[n] || {}).pal || '')}">
    <div style="margin-top:8px"><button class="btn" onclick="S.prac[${n}].pal=$('#pal').value;save();toast('已記下')">記下</button></div></div>
  <p class="xs muted">這裡不記連續天數，也沒有排行榜。這一章不是要你贏，是要你被改變。</p>`;
  return h;
}
function tglP(n, i){ const p = S.prac[n] = S.prac[n] || {}; p[i] = !p[i]; save(); render(); }

function cSafe(n, m){
  let h = `<div class="card" style="border-color:var(--clay)">
    <p class="eyebrow" style="color:var(--clay)">講台安全檢查 · 第 ${n} 章</p>
    <p class="sm" style="margin:0">上台前三分鐘，掃一遍。</p></div><div class="card">`;
  m.safe.forEach((s, i) => {
    const k = 'sf' + n + '_' + i, on = S.seen[k];
    h += `<div class="chk ${on ? 'on' : ''}" onclick="S.seen['${k}']=!S.seen['${k}'];save();render()">
      <span class="box">${on ? '✓' : ''}</span><span class="t">${esc(s)}</span></div>`;
  });
  h += `</div><div class="card"><p class="eyebrow">鐵律</p>
    <p style="font-family:var(--serif);font-size:18px;margin:0">不確定就不要用。</p>
    <p class="sm muted" style="margin:8px 0 0">一個講員如果為了效果，把「可能」講成「就是」——他用一則故事，換掉了會眾對他的信任。</p></div>`;
  return h;
}

/* ===== 工具 ===== */
function vTools(){
  setTitle('工具', false);
  if (R.sub === 'tracks') return vTracks();
  if (R.sub === 'issues') return vIssues();
  if (R.sub === 'review') return vReview();
  if (R.sub === 'map') return `<div class="sect"><p class="eyebrow">全書地形圖</p>
    <h2 class="big">兩個最低點，兩個「如今」。</h2>${terrain(S.last)}
    <div class="card"><p style="margin:0 0 10px"><b>3:20</b> 每一張嘴被封住　→　<b>3:21「但如今」</b>　解決<b>稱義</b></p>
    <p style="margin:0 0 10px"><b>7:24</b> 我真是苦啊　→　<b>8:1「如今」</b>　解決<b>定罪與能力</b></p>
    <p style="margin:0"><b>11:33–36</b> 深哉（頌讚）　→　<b>12:1「所以」</b>　轉向<b>生活</b></p></div>
    <div class="card"><p class="eyebrow">首尾呼應</p>
    <table><tr><th>開頭</th><th>結尾</th></tr>
    <tr><td>1:5 叫人信服真道</td><td>16:26 使他們信服真道</td></tr>
    <tr><td>1:11 使你們可以堅固</td><td>16:25 惟有神能堅固你們的心</td></tr>
    <tr><td>1:2 藉眾先知在聖經上所應許的</td><td>16:26 藉眾先知的書指示</td></tr></table></div>`;
  const dl = due().length;
  return `<div class="sect"><p class="eyebrow">工具</p><h2 class="big">六樣東西，幫你讀懂。</h2></div>
  <button class="chrow" onclick="go('tools',0,'search')"><span class="chn">尋</span>
    <span style="flex:1"><b>搜尋</b><span class="s">經節、原文、關鍵字，一次找完</span></span></button>
  <button class="chrow" onclick="go('tools',0,'tracks')"><span class="chn">原</span>
    <span style="flex:1"><b>原文軌跡</b><span class="s">看一個希臘字，怎麼走完全書　·　${D.tracks.length} 條</span></span></button>
  <button class="chrow" onclick="go('tools',0,'issues')"><span class="chn">⚖</span>
    <span style="flex:1"><b>爭議地圖</b><span class="s">會吵架的地方，這裡有一張安全的地圖　·　${D.issues.length} 組</span></span></button>
  <button class="chrow" onclick="go('tools',0,'map')"><span class="chn">圖</span>
    <span style="flex:1"><b>全書地形圖</b><span class="s">兩個最低點、兩個「如今」、一個「所以」</span></span></button>
  <button class="chrow" onclick="go('tools',0,'review')"><span class="chn">憶</span>
    <span style="flex:1"><b>金句複習</b><span class="s">${dl ? '今天有 ' + dl + ' 節到期' : '目前沒有到期的'}　·　共 ' + Object.keys(S.mem).length + ' 節</span></span></button>
  <button class="chrow" onclick="go('tools',0,'safeall')"><span class="chn">✓</span>
    <span style="flex:1"><b>講台把關總覽</b><span class="s">全書${BOOK.chword}章的失守清單，一次看完</span></span></button>`;
}

function vTracks(){
  setTitle('原文軌跡', false);
  let h = `<div class="sect"><p class="eyebrow">原文軌跡</p>
    <h2 class="big">看一個字，走完${BOOK.chword}章。</h2>
    <p class="sm muted">${esc(BOOK.author)}是刻意重複用字的。同一個字在不同章出現，往往就是他的論證。</p></div>`;
  D.tracks.forEach(t => {
    h += `<div class="track">
      <p class="gk">${esc(t.gk)}</p>
      <p class="sm muted" style="margin:2px 0 0">${esc(t.tr)}　·　${esc(t.gl)}　·　${esc(t.code)}</p>
      ${t.root ? `<p class="xs muted" style="margin:4px 0 0">字根：${esc(t.root)}</p>` : ''}
      <div class="stops">${t.stops.map(s => `<div class="stop ${s[2]}">
        <span class="d"></span><span class="r">${esc(s[0])}</span>
        <span style="flex:1">${esc(s[1])}${VMAP['' + s[0]] ? ` <a href="#" onclick="openV('${s[0]}');return false;" class="xs">看</a>` : ''}</span></div>`).join('')}</div>
      <div class="insight">${esc(t.ins)}</div>
      <p class="xs" style="margin:10px 0 0"><span class="lv g">🟢 可上台</span>同字／同字根，可查證</p></div>`;
  });
  return h;
}

function vIssues(){
  setTitle('爭議地圖', false);
  let h = `<div class="sect"><p class="eyebrow">爭議地圖</p>
    <h2 class="big">這裡沒有「正確答案」四個字。</h2>
    <p class="sm muted">每一張卡片先給你「兩邊都同意的」，再列立場與根據，最後給一句可以在台上說的話。</p></div>`;
  D.issues.forEach(i => h += `<button class="chrow" onclick="openIssue('${i.id}')">
    <span class="chn">⚖</span><span style="flex:1"><b>${esc(i.t)}</b><span class="s">${esc(BOOK.abbr)} ${esc(i.r)}　·　${i.pos.length} 種主要立場</span></span></button>`);
  return h;
}
function openIssue(id){
  const i = D.issues.find(x => x.id === id); if (!i) return;
  let h = `<h4>⚖ ${esc(i.t)}</h4><p class="xs muted" style="margin:0 0 12px">${esc(BOOK.name)} ${esc(i.r)}</p>
    <p class="eyebrow">為什麼會有爭議</p><p class="sm">${esc(i.why)}</p>
    <p class="eyebrow" style="margin-top:16px">主要立場</p>`;
  i.pos.forEach(p => h += `<div class="pos"><b>${esc(p[0])}</b>　<span class="xs muted">${esc(p[1])}</span>
    <p style="margin:6px 0 0">${esc(p[2])}</p></div>`);
  h += `<div class="consensus"><b>兩邊都同意的</b>${i.con.map(c => `<p style="margin:6px 0 0">· ${esc(c)}</p>`).join('')}</div>
    <p class="eyebrow">建議的說法</p><div class="say">「${esc(i.say)}」</div>
    <p class="eyebrow" style="margin-top:16px">牧養提醒</p><p class="sm">${esc(i.care)}</p>
    <div class="hr"></div><p class="xs muted">本 App 不裁決這個爭議。請在聖經面前，自己判斷。</p>`;
  sheet(h);
}

function vSafeAll(){
  setTitle('講台把關', false);
  let h = `<div class="sect"><p class="eyebrow">講台把關總覽</p><h2 class="big">不確定就不要用。</h2></div>`;
  CH.forEach(c => {
    h += `<div class="card"><p class="eyebrow">第 ${c.n} 章　${esc(c.t)}</p>`;
    c.safe.forEach(s => h += `<p class="sm" style="margin:0 0 8px">· ${esc(s)}</p>`);
    h += `</div>`;
  });
  return h;
}

function vReview(){
  setTitle('金句複習', false);
  const dl = due();
  if (!Object.keys(S.mem).length)
    return `<div class="sect"><p class="eyebrow">金句複習</p><h2 class="big">還沒有加入任何一節。</h2>
      <p class="sm muted">到任何一章的「卡片」頁，點「加入複習」。</p>
      <button class="btn pri" style="margin-top:12px" onclick="go('course')">去課程</button></div>`;
  if (!dl.length)
    return `<div class="sect"><p class="eyebrow">金句複習</p><h2 class="big">今天沒有到期的。</h2>
      <p class="sm muted">共 ${Object.keys(S.mem).length} 節在複習中。<br>間隔複習的重點不是每天做，是<b>在快忘記的時候</b>再看一次。</p></div>`;
  const n = dl[0], m = meta(n), seed = Math.floor(Date.now() / DAY) + n;
  return `<div class="sect"><p class="eyebrow">複習　剩 ${dl.length} 節</p>
    <div class="card" style="border-color:var(--brass)">
      <p class="blank" style="font-family:var(--serif);font-size:21px;line-height:2;margin:0">${blank(m.mv.t, seed)}</p>
      <p class="sm muted" style="margin:10px 0 0">${esc(m.mv.r)}　·　第${n}章</p></div>
    <div class="row" style="margin-top:14px">
      <button class="btn" onclick="showAns(${n})">看答案</button>
      <button class="btn" onclick="sayMV(${n})">🔊 朗讀</button></div>
    <div class="row" style="margin-top:22px">
      <button class="btn pri" style="flex:1" onclick="memGrade(${n},1);render()">記得</button>
      <button class="btn" style="flex:1" onclick="memGrade(${n},0);render()">忘了</button></div>`;
}
function showAns(n){ const m = meta(n); sheet(`<h4>${esc(m.mv.r)}</h4><p style="font-family:var(--serif);font-size:20px;line-height:1.9">「${esc(m.mv.t)}」</p>`); }

/* ===== 我的 ===== */
function vMe(){
  setTitle('我的', false);
  const st = S.set;
  return `<div class="sect"><p class="eyebrow">我的</p><h2 class="big">進度與設定。</h2></div>
  <div class="card"><p class="eyebrow">進度</p>
    <p style="margin:0 0 6px">已開始 <b>${startedCh()}</b> 章　·　走完八步 <b>${doneCh()}</b> 章</p>
    <p class="sm muted" style="margin:0">複習中 ${Object.keys(S.mem).length} 節　·　筆記 ${Object.keys(S.notes).filter(k => S.notes[k]).length} 則</p></div>
  <button class="chrow" onclick="go('me',0,'marks')"><span class="chn">✍</span>
    <span style="flex:1"><b>我的畫線與領受</b><span class="s">${Object.keys(S.mk).length} 處畫線　·　${Object.keys(S.mk).filter(k=>mkNote(k)).length} 則領受</span></span></button>
  <button class="chrow" onclick="go('me',0,'sage')"><span class="chn">✨</span>
    <span style="flex:1"><b>小智收藏</b><span class="s">${S.xz.length} 則收藏</span></span></button>
  ${vLang()}
  <div class="card"><p class="eyebrow">朗讀聲音</p>
    <div class="vrow">${Object.keys(TTS_VOICES).map(k => `
      <button class="vpill ${S.set.voice === k && S.set.human ? 'on' : ''}" onclick="pickVoice('${k}')">
        <b>${TTS_VOICES[k].label}</b><span>${TTS_VOICES[k].desc}</span></button>`).join('')}</div>
    <div class="chk ${S.set.human ? 'on' : ''}" style="margin-top:12px" onclick="S.set.human=S.set.human?0:1;save();render()">
      <span class="box">${S.set.human ? '✓' : ''}</span>
      <span class="t">使用真人語音<br><span class="xs muted">關閉則使用裝置內建語音（離線可用）</span></span></div>
    <p class="eyebrow" style="margin-top:14px">語速</p><div class="row">
      ${[[-2,'慢'],[-1,'稍慢'],[0,'正常'],[1,'稍快'],[2,'快']].map(r =>
        `<button class="pill ${S.set.rate == r[0] ? 'on' : ''}" onclick="S.set.rate=${r[0]};save();render()">${r[1]}</button>`).join('')}
    </div>
    <div class="hr"></div>
    <button class="btn" onclick="voiceSheet()">更多設定</button></div>
  <div class="card"><p class="eyebrow">閱讀</p>
    <div class="chk ${st.grk ? 'on' : ''}" onclick="S.set.grk=S.set.grk?0:1;save();render()">
      <span class="box">${st.grk ? '✓' : ''}</span><span class="t">顯示希臘文原文<br><span class="xs muted">關掉之後，仍然讀得懂全書</span></span></div>
    <div class="chk ${st.dark ? 'on' : ''}" onclick="S.set.dark=S.set.dark?0:1;save();applyDark();render()">
      <span class="box">${st.dark ? '✓' : ''}</span><span class="t">深色模式</span></div>
    <div class="chk" onclick="S.set.fs=(S.set.fs+1)%5;save();applyFS();render()">
      <span class="box">Ａ</span><span class="t">字級　${st.fs + 1} / 5<br><span class="xs muted">點一下加大</span></span></div></div>
  <div class="card"><p class="eyebrow">資料</p>
    <p class="sm muted" style="margin:0 0 10px">你的筆記、進度與打卡，只存在這台裝置上。</p>
    <div class="row"><button class="btn" onclick="exportData()">匯出我的資料</button>
    <button class="btn" onclick="if(confirm('確定要清除全部進度與筆記嗎？此動作無法復原。')){localStorage.removeItem(KEY);S=load();render();toast('已清除')}">清除全部</button></div></div>
  <div class="card"><p class="eyebrow">身分</p>
    <p class="sm muted" style="margin:0 0 10px">目前：${ {read:'我自己讀', group:'我要帶小組', preach:'我要講道'}[st.role] || '未設定' }</p>
    <button class="btn" onclick="S.set.role='';save();render()">重新選擇</button></div>
  <div class="card"><p class="eyebrow">關於</p>
    <p class="sm" style="margin:0 0 8px"><b>${esc(BOOK.app)}</b>　v2.0</p>
    <p class="sm muted" style="margin:0 0 8px">講義內容出自${BOOK.src}${BOOK.chword}章。經文引用《${BOOK.bible}》。</p>
    <p class="sm" style="margin:0;font-family:var(--serif)">若有一天你在聖經裡看見與本課不同的亮光，<b>請跟隨聖經，不要跟隨我們。</b></p></div>
  <div class="foot">國度321空中團契<br>願榮耀因耶穌基督歸與獨一全智的神，直到永遠。阿們。</div>`;
}
function exportData(){
  const b = new Blob([JSON.stringify(S, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = BOOK.app + '_我的資料.json'; a.click();
  toast('已匯出');
}

/* ===== 抽屜 ===== */
function sheet(html){ $('#sbody').innerHTML = html; $('#sheet').classList.add('on'); }
$('#sheet').onclick = e => { if (e.target.id === 'sheet') $('#sheet').classList.remove('on'); };

/* ═══════════════════════════════════════════════════
   321聖經講義 · 擴充模組
   ① 真人語音（Azure TTS Worker ＋ IndexedDB 永久快取）
   ② 重點畫線 ＋ 寫下領受
   ③ 小智 AI（陪讀、解經、禱告）
   ═══════════════════════════════════════════════════ */

/* ── 服務端點（可在「我的」裡修改）── */
const SVC = {
  xz:  'https://xiaozhi-proxy.spch321.workers.dev',
  tts: 'https://azure-tts.spch321.workers.dev',
  model: 'claude-sonnet-4-6',
};
const TTS_VOICES = {
  yunfan:   { name:'zh-CN-Yunfan:DragonHDLatestNeural',   label:'雲帆', desc:'高清男聲' },
  xiaochen: { name:'zh-CN-Xiaochen:DragonHDLatestNeural', label:'曉辰', desc:'高清女聲' },
  yunjhe:   { name:'zh-TW-YunJheNeural',                  label:'雲哲', desc:'溫潤男聲' },
};
const TTS_SIL = { s:140, c:140, e:260 };

S.set.voice = S.set.voice || 'yunfan';
S.set.rate  = S.set.rate  || 0;      // -3 ~ +3
S.set.human = (S.set.human === undefined) ? 1 : S.set.human;
S.mk = S.mk || {};
S.xz = S.xz || [];                    // 小智收藏                    // 畫線與領受


/* ═══════ 語言切換 ═══════ */
/* 三個版本平放在同一個資料夾，用檔名互連 —— 網站放在哪一層都不受影響 */
const LANGS = [
  { k:'tc', label:'繁體中文', sub:'和合本', file:'index.html' },
  { k:'sc', label:'简体中文', sub:'和合本', file:'sc.html'    },
];
const LANG_NOW = 'tc';
function goLang(k){
  const l = LANGS.find(x => x.k === k); if (!l) return;
  toast('切換中…');
  fetch(l.file, { method:'HEAD' })
    .then(r => { if (r.ok) location.href = l.file; else toast('這個網站上找不到該版本'); })
    .catch(() => { location.href = l.file; });
}
function vLang(){
  try { if (!/^https?:/.test(location.protocol)) return ''; } catch(e){ return ''; }
  return `<div class="card"><p class="eyebrow">語言</p>
    <div class="vrow">${LANGS.map(l => l.k === LANG_NOW
      ? `<span class="vpill on"><b>${l.label}</b><span>${l.sub}</span></span>`
      : `<button class="vpill" onclick="goLang('${l.k}')"><b>${l.label}</b><span>${l.sub}</span></button>`).join('')}</div>
    <p class="xs muted" style="margin:10px 0 0">進度、畫線與領受各語言版本分開儲存。</p></div>`;
}

/* ═══════ ① 真人語音 ═══════ */
const TTS_DB = 'r321_tts';
function ttsDB(cb){
  try {
    if (!window.indexedDB) return cb(null);
    const r = indexedDB.open(TTS_DB, 1);
    r.onupgradeneeded = () => { try { if (!r.result.objectStoreNames.contains('a')) r.result.createObjectStore('a'); } catch(e){} };
    r.onsuccess = () => cb(r.result);
    r.onerror = () => cb(null);
  } catch(e){ cb(null); }
}
function ttsGet(k, cb){
  ttsDB(db => { if (!db) return cb(null);
    try { const q = db.transaction('a').objectStore('a').get(k);
      q.onsuccess = () => cb(q.result || null); q.onerror = () => cb(null);
    } catch(e){ cb(null); } });
}
function ttsPut(k, blob){
  ttsDB(db => { if (!db) return;
    try { db.transaction('a', 'readwrite').objectStore('a').put(blob, k); } catch(e){} });
}
async function ttsClear(){
  return new Promise(res => ttsDB(db => { if (!db) return res();
    try { const t = db.transaction('a', 'readwrite'); t.objectStore('a').clear(); t.oncomplete = () => res(); t.onerror = () => res(); }
    catch(e){ res(); } }));
}

const voiceName = () => (TTS_VOICES[S.set.voice] || TTS_VOICES.yunfan).name;
const rateAttr  = () => (S.set.rate >= 0 ? '+' : '') + (S.set.rate * 5) + '%';

/* 朗讀前的文字整理 */
function sanitize(t){
  t = String(t || '').replace(/<[^>]+>/g, ' ');
  t = t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '和').replace(/&lt;|&gt;/g, ' ');
  t = t.replace(/\*\*/g, '').replace(/[《》「」『』【】]/g, '');
  t = t.replace(/^[ \t]*#{1,6}[ \t]*/gm, '').replace(/^[ \t]*>[ \t]?/gm, '');
  t = t.replace(/★|⚠|✓|❌|🟢|🟡|🔴|📋|📖|⚖|▸|▾|·/g, ' ');
  // 經節寫法口語化：8:28 → 八章二十八節
  t = t.replace(/(\d{1,3}):(\d{1,3})(?:[–-](\d{1,3}))?/g, (m, a, b, c) =>
    cnNum(a) + '章' + cnNum(b) + (c ? '到' + cnNum(c) : '') + '節');
  t = t.replace(/321/g, '三二一').replace(/920/g, '九二零').replace(/235/g, '二三五');
  t = t.replace(/[：]/g, '，');
  // 希臘文原文不朗讀（會念得很怪）
  t = t.replace(/[\u0370-\u03FF\u1F00-\u1FFF][\u0370-\u03FF\u1F00-\u1FFF\s,.·'’]*/g, ' ');
  return t.replace(/\s{2,}/g, ' ').trim();
}
function cnNum(n){
  n = parseInt(n, 10); const d = '零一二三四五六七八九';
  if (n < 10) return d[n];
  if (n < 20) return '十' + (n % 10 ? d[n % 10] : '');
  if (n < 100) return d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : '');
  return String(n);
}
function ttsChunks(t){
  t = sanitize(t); if (!t) return [];
  const out = []; let buf = '';
  for (const ch of t){ buf += ch; if ('。！？；\n'.includes(ch) && buf.length >= 110){ out.push(buf); buf = ''; } }
  if (buf.trim()) out.push(buf);
  const fin = [];
  out.forEach(s => { while (s.length > 300){ fin.push(s.slice(0, 300)); s = s.slice(300); } if (s) fin.push(s); });
  return fin.length ? fin : [t];
}
async function ttsFetch(piece){
  const key = voiceName() + '|' + rateAttr() + '|' + piece;
  const cached = await new Promise(r => ttsGet(key, r));
  if (cached) return cached;
  const res = await fetch(SVC.tts, { method:'POST', headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify({ voice:voiceName(), rate:rateAttr(), sil:TTS_SIL.s, silc:TTS_SIL.c, sile:TTS_SIL.e, text:piece }) });
  if (!res.ok) throw new Error('TTS ' + res.status);
  const blob = await res.blob();
  ttsPut(key, blob);
  return blob;
}

let AU = null, SPK = { on:false, pause:false, tok:0, list:[], i:0, title:'' };
function audioEl(){
  if (!AU){ AU = new Audio(); AU.preload = 'auto'; AU.setAttribute('playsinline',''); }
  return AU;
}
async function speak(text, title){
  if (!S.set.human) return sayNative(text);
  const chunks = ttsChunks(text);
  if (!chunks.length) return;
  const my = ++SPK.tok;
  SPK = { on:true, pause:false, tok:my, list:chunks, i:0, title:title || '朗讀中' };
  drawBar();
  const a = audioEl(); a.pause();
  try {
    toast('正在準備語音…');
    const blobs = [];
    const CONC = 6;
    let next = 0, fail = false;
    await new Promise(res => {
      let running = 0, done = 0;
      const pump = () => {
        if (my !== SPK.tok) return res();
        while (running < CONC && next < chunks.length){
          const k = next++; running++;
          ttsFetch(chunks[k]).then(b => { blobs[k] = b; }, () => { fail = true; })
            .then(() => { running--; done++;
              if (done === chunks.length) res(); else pump(); });
        }
      };
      pump();
    });
    if (my !== SPK.tok) return;
    if (fail || blobs.filter(Boolean).length === 0) throw new Error('fetch failed');
    const url = URL.createObjectURL(new Blob(blobs.filter(Boolean), { type:'audio/mpeg' }));
    a.src = url;
    a.onended = () => { if (my === SPK.tok) stopSpeak(); };
    a.onerror = () => { if (my === SPK.tok){ stopSpeak(); sayNative(text); } };
    await a.play();
    drawBar();
  } catch(e){
    if (my !== SPK.tok) return;
    stopSpeak();
    toast('真人語音連不上，改用裝置語音');
    sayNative(text);
  }
}
function sayNative(t){
  if (!window.speechSynthesis) return toast('這台裝置不支援朗讀');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(sanitize(t));
  u.lang = 'zh-TW'; u.rate = 0.94 + S.set.rate * 0.05;
  const vs = speechSynthesis.getVoices();
  const v = vs.find(x => /zh[-_]TW|zh[-_]HK|cmn/i.test(x.lang)) || vs.find(x => /^zh/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}
function stopSpeak(){
  SPK.tok++; SPK.on = false; SPK.pause = false;
  try { audioEl().pause(); } catch(e){}
  try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch(e){}
  drawBar();
}
function togglePause(){
  const a = audioEl();
  if (SPK.pause){ a.play(); SPK.pause = false; } else { a.pause(); SPK.pause = true; }
  drawBar();
}
function drawBar(){
  let el = $('#spkbar');
  if (!SPK.on){ if (el) el.remove(); return; }
  if (!el){
    el = document.createElement('div'); el.id = 'spkbar'; el.className = 'spkbar';
    document.body.appendChild(el);
  }
  el.innerHTML = `<span class="dot"></span><b>${esc(SPK.title)}</b>
    <button onclick="togglePause()">${SPK.pause ? '▶' : '⏸'}</button>
    <button onclick="stopSpeak()">✕</button>`;
}

/* ═══════ ② 畫線與領受 ═══════ */
/* key 格式：  v|8:1        一節經文
              x|8:1|exp|3   某段解經的第 3 段            */
const mkHas = k => Object.prototype.hasOwnProperty.call(S.mk, k);
const mkNote = k => (S.mk[k] && S.mk[k].n) || '';
function mkTap(k, el){
  if (mkHas(k)) return mkSheet(k);
  S.mk[k] = { n:'', at:Date.now() }; save();
  if (el && el.classList) el.classList.add('hl'); else render();
  toast('已畫線　·　再點一下寫領受');
}
function mkSheet(k){
  const cur = mkNote(k), src = mkText(k);
  sheet(`<h4>✍️ 寫下你的領受</h4>
    <div class="mkq">${esc(src).slice(0, 300)}</div>
    <textarea class="note" id="mkin" placeholder="聖靈在這句話上對你說了什麼？">${esc(cur)}</textarea>
    <div class="row" style="margin-top:10px">
      <button class="btn pri" onclick="mkSave('${k}')">儲存</button>
      <button class="btn" onclick="askXz(mkText('${k}'), '領受：' + (document.getElementById('mkin')||{}).value)">✨ 問小智</button>
      <button class="btn" onclick="mkDel('${k}')">取消畫線</button>
    </div>`);
  setTimeout(() => { const i = $('#mkin'); if (i) i.focus(); }, 60);
}
function mkSave(k){
  const v = ($('#mkin') || {}).value || '';
  S.mk[k] = { n:v.trim(), at:Date.now() }; save();
  $('#sheet').classList.remove('on'); render(); toast('領受已存');
}
function mkDel(k){ delete S.mk[k]; save(); $('#sheet').classList.remove('on'); render(); toast('已取消畫線'); }
function mkText(k){
  const p = k.split('|');
  if (p[0] === 'v'){
    const [c, v] = p[1].split(':'); const full = (D.txt[c] || [])[+v - 1] || '';
    if (p.length < 3) return full;
    const s = splitHTML(esc(full))[+p[2]] || '';
    return s.replace(/<[^>]+>/g, '').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').trim();
  }
  if (p[0] === 'c'){
    const m = meta(+p[1].split(':')[0]) || {};
    return (m.card || [])[+p[3]] || '';
  }
  const b = VMAP[p[1]]; if (!b) return '';
  const s = sentsOf(b[p[2]] || '')[+p[3]] || '';
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}
/* 依句號切句；HTML 標籤不會被切斷，句末的引號跟著前一句走 */
const EN_SENT = false;
function splitHTML(html){
  const out = []; let cur = '', depth = 0, inTag = false, tag = '';
  for (let i = 0; i < html.length; i++){
    const ch = html[i];
    if (!inTag && ch === '<'){ inTag = true; tag = '<'; cur += ch; continue; }
    if (inTag){
      cur += ch; tag += ch;
      if (ch === '>'){
        inTag = false;
        if (/^<\//.test(tag)) depth--;
        else if (!/\/>$/.test(tag) && !/^<(br|img|hr|input|wbr)\b/i.test(tag)) depth++;
      }
      continue;
    }
    cur += ch;
    if (depth !== 0) continue;                       // 標籤內不切
    let brk = '。！？'.includes(ch);
    if (!brk && EN_SENT && '.!?'.includes(ch)){      // 英文：句點後須接空白
      const nx = html[i + 1];
      brk = (nx === undefined || nx === ' ' || nx === '\n') && !/\b[A-Z]$/.test(cur.slice(-2, -1));
    }
    if (!brk) continue;
    while (i + 1 < html.length && '」』）”"\''.includes(html[i + 1])){ i++; cur += html[i]; }
    while (i + 1 < html.length && html[i + 1] === ' '){ i++; cur += html[i]; }
    out.push(cur); cur = '';
  }
  if (cur.replace(/<[^>]*>|\s|&nbsp;/g, '').length) out.push(cur);
  else if (cur && out.length) out[out.length - 1] += cur;
  return out.length ? out : [html];
}
/* 取出某一層的所有句子（順序與畫面完全一致）*/
function sentsOf(html){
  const out = [];
  String(html || '').replace(/<p>([\s\S]*?)<\/p>/g, (m, inner) => { splitHTML(inner).forEach(t => out.push(t)); return m; });
  return out;
}
/* 把解經 HTML 的每一句變成可點的句子 */
function tagParas(html, kp){
  if (!html) return '';
  let i = -1;
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (m, inner) => {
    const body = splitHTML(inner).map(t => {
      i++; const k = kp + '|' + i, on = mkHas(k);
      const note = on && mkNote(k)
        ? `<span class="mknote"><b>領受</b>　${esc(mkNote(k))}
           <button class="mkask" onclick="event.stopPropagation();askXz(mkText('${k}'),'領受：${escA(mkNote(k))}')">✨ 問小智</button></span>` : '';
      return `<span class="mks${on ? ' hl' : ''}" onclick="event.stopPropagation();mkTap('${k}',this)">${t}</span>` + note;
    }).join('');
    return `<p class="mkw">${body}</p>`;
  });
}
const escA = s => String(s || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/\n/g, ' ').slice(0, 200);

/* 我的畫線與領受 */
function vMarks(){
  setTitle('我的畫線與領受', false);
  const keys = Object.keys(S.mk);
  if (!keys.length) return `<div class="sect"><p class="eyebrow">我的畫線與領受</p>
    <h2 class="big">還沒有畫線。</h2>
    <p class="sm muted">讀經文或解經時，<b>點一下</b>那一句就會畫線；<b>再點一下</b>可以寫下領受。</p>
    <button class="btn pri" style="margin-top:12px" onclick="go('text')">去讀經文</button></div>`;
  const byCh2 = {};
  keys.forEach(k => { const ref = k.split('|')[1] || ''; const c = +ref.split(':')[0] || 0;
    (byCh2[c] = byCh2[c] || []).push(k); });
  let h = `<div class="sect"><p class="eyebrow">我的畫線與領受</p>
    <h2 class="big">${keys.length} 處畫線　·　${keys.filter(k => mkNote(k)).length} 則領受</h2></div>`;
  Object.keys(byCh2).map(Number).sort((a, b) => a - b).forEach(c => {
    h += `<h3 class="sec">${esc(BOOK.name)} ${c}　${esc((meta(c) || {}).t || '')}</h3>`;
    byCh2[c].sort((a, b) => {
      const va = +(a.split('|')[1] || '0:0').split(':')[1], vb = +(b.split('|')[1] || '0:0').split(':')[1];
      return va - vb;
    }).forEach(k => {
      const ref = k.split('|')[1], kind = k.split('|')[0] === 'v' ? '經文' : '解經';
      h += `<div class="card" style="padding:13px">
        <p class="xs muted" style="margin:0 0 6px">${esc(ref)}　·　${kind}</p>
        <p class="hlq" onclick="openV('${ref}')">${esc(mkText(k)).slice(0, 160)}</p>
        ${mkNote(k) ? `<div class="mknote" style="margin-top:8px"><b>領受</b>　${esc(mkNote(k))}</div>` : ''}
        <div class="row" style="margin-top:9px">
          <button class="btn xs2" onclick="mkSheet('${k}')">${mkNote(k) ? '修改領受' : '寫領受'}</button>
          <button class="btn xs2" onclick="askXz(mkText('${k}'),'${mkNote(k) ? '領受：' + escA(mkNote(k)) : ''}')">✨ 問小智</button>
        </div></div>`;
    });
  });
  h += `<div class="hr"></div><button class="btn" onclick="exportMarks()">匯出畫線與領受</button>`;
  return h;
}
function exportMarks(){
  let t = '# 我的畫線與領受｜' + BOOK.app + '·' + BOOK.name + '\n\n';
  Object.keys(S.mk).sort().forEach(k => {
    t += `## ${BOOK.name} ${k.split('|')[1]}\n\n> ${mkText(k)}\n\n`;
    if (mkNote(k)) t += `**領受：**${mkNote(k)}\n\n`;
  });
  const b = new Blob([t], { type:'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = '我的畫線與領受.md'; a.click();
  toast('已匯出');
}

/* ═══════ ③ 小智 ═══════ */
let XZ = { open:false, msgs:[], busy:false };
function xzSystem(){
  let ctx = '';
  const n = R.ch || S.last;
  const m = meta(n);
  if (m){
    ctx = `\n\n【對方正在讀${BOOK.name}第${n}章】\n`
      + `本章講題：《${m.t}》——${m.sub}\n`
      + `核心問題：${m.q}\n`
      + `一句話核心真理：${m.truth}\n`
      + `本章金句：「${m.mv.t}」（${m.mv.r}）\n`
      + `「有己」在本章的形狀：${m.self}\n`
      + `321落點：讓耶穌作王——${m.t321.k}；讓耶穌得榮耀——${m.t321.g}；建立屬神體系——${m.t321.p}\n`;
    if (R.tab === 'text' || R.tab === 'course'){
      const bs = (BLK[n] || []).slice(0, 40).map(b =>
        `${n}:${b.a}${b.z > b.a ? '–' + b.z : ''}　${((D.txt[n] || [])[b.a - 1] || '').slice(0, 50)}`).join('\n');
      ctx += `\n本章的解經段落：\n${bs}\n`;
    }
    ctx += `\n請優先根據${BOOK.name}本文與上列材料回答；若${BOOK.name}沒有處理這個問題，請明說。`;
  }
  return [
    `你是「小智」，是「${BOOK.app}」app 裡的陪讀小幫手，屬於國度321空中團契。像一位陪讀的屬靈朋友：謙卑、溫暖、滿有盼望與愛心。`,
    '',
    '【界線（最重要）】',
    '1. 你不是聖靈，也不能代替神；你絕不取代真實的牧者、屬靈父母與屬靈同伴。',
    '2. 你總是把人引向耶穌、聖經、禱告與聖靈的引導，並鼓勵他與真實的屬靈群體連結。',
    '3. 鼓勵對方親自禱告、親自查考聖經，而不是依賴你。',
    '',
    `【${BOOK.name}專屬的四條規矩】`,
    `一、經文優先：回答任何問題，先回到${BOOK.name}本文。若${BOOK.name}沒有直接處理，明說「${BOOK.name}沒有直接處理這個」。`,
    '二、原文誠實：提到希臘文時，要說明這是「同字／同字根／語態」這類可查證的事實，還是「一種可能的理解」。若你沒有把握，就不要提原文。',
    '三、爭議不裁決：遇到羅七章的「我」是誰、預定與揀選、以色列全家得救、順服掌權者的界線、可爭議之事的界線、非比與猶尼亞、守日這七類問題，一律先講「兩邊都同意的」，再列主要立場與各自根據，最後說「敬虔的學者對此有不同理解」。絕不說「聖經明明說」來壓下另一方。',
    '四、講台責任：若對方說要拿去講道，回答結尾要提醒他哪些可以上台、哪些需要加平衡句；並附上一句「不確定就不要用」。',
    '',
    '【321 理念，是你一切回應的根基】',
    '三個基礎：耶穌是我的榜樣、聖經是我的準則、聖靈是我的引導。',
    '兩個核心：讓耶穌作王、讓耶穌得到一切的榮耀。一個目的：建立屬神的體系。',
    '核心生命：無己（不再是我，乃是基督在我裡面活）、謙卑勝過驕傲、先生命再關係後事工。',
    '',
    '【風格】',
    '一律用繁體中文。引用聖經一律用《和合本》，只在你有把握時引用，絕不杜撰經文或出處；不確定就如實說明。',
    '深入淺出、善用比喻、條理清晰、溫暖有盼望。回應精簡（通常二、三段內），不長篇大論。',
    '',
    '【回答格式（回答會被朗讀出來）】',
    '1. 用自然、口語、可以順暢朗讀的文字。',
    '2. 不要使用表格，不要用直線分隔欄位。',
    '3. 不要使用 Markdown：不用井號標題、不用星號粗體、不用大於號引言、不用條列符號。',
    `4. 引用經文時把章節寫成可朗讀的形式，例如「${BOOK.name}八章一節」。`,
    '5. 段落簡短，多用句號分句。',
    '',
    '【安全】',
    '只在信仰、聖經、屬靈成長、品格與生活應用、為人禱告、鼓勵造就的範圍內服事。',
    '遇到醫療、法律、心理危機或自我傷害等情況，溫柔表達關心，鼓勵尋求專業協助與信任的人、牧者，不假裝專業、不下診斷。',
    '不論斷人、不捲入政治、不評斷特定教會或人物。凡遇當代政治或宗派爭議的經文，絕不倒向任何一方。',
    ctx,
  ].join('\n');
}
function xzQuicks(){
  const n = R.ch || S.last;
  const base = [`${BOOK.name}第${n}章的重點是什麼？`, `這一章要我怎麼活？`, `請用這一章為我簡短禱告`];
  const sp = {
    7:['第七章的「我」是重生前還是重生後？', '我也這樣掙扎，這正常嗎？'],
    8:['「萬事互相效力」常被怎麼用錯？', '「阿爸」是什麼意思？'],
    9:['神真的恨以掃嗎？', '預定論我該怎麼理解？'],
    11:['「以色列全家都要得救」是什麼意思？'],
    13:['那面對不公義的政權呢？'],
    14:['什麼算是「可爭議的事」？'],
    16:['非比是女執事嗎？'],
  }[n] || [];
  return base.concat(sp).slice(0, 5);
}
function xzOpen(){ XZ.open = true; drawXz(); }
function xzClose(){ XZ.open = false; const el = $('#xz'); if (el) el.classList.remove('on'); }
function askXz(quote, note){
  XZ.open = true;
  const q = `我在${BOOK.name}讀到這一句：\n「${String(quote || '').slice(0, 300)}」\n${note ? note + '\n' : ''}請幫我更明白這句話，並幫助我活出來。`;
  XZ.msgs.push({ role:'user', text:q });
  drawXz(); xzCall();
}
function xzSend(){
  const i = $('#xzin'); if (!i || !i.value.trim() || XZ.busy) return;
  XZ.msgs.push({ role:'user', text:i.value.trim() }); i.value = '';
  drawXz(); xzCall();
}
async function xzCall(){
  XZ.busy = true; drawXz();
  if (navigator.onLine === false){
    XZ.msgs.push({ role:'assistant', text:'目前沒有網路，小智暫時陪不了你。\n別忘了——最好的同伴是聖靈與神的話，你隨時可以直接向主傾心吐意。' });
    XZ.busy = false; return drawXz();
  }
  const ctrl = window.AbortController ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => { try { ctrl.abort(); } catch(e){} }, 40000) : null;
  try {
    const res = await fetch(SVC.xz, { method:'POST', headers:{ 'Content-Type':'application/json' },
      signal: ctrl ? ctrl.signal : undefined,
      body: JSON.stringify({ model:SVC.model, max_tokens:1000, system:xzSystem(),
        messages: XZ.msgs.slice(-12).map(m => ({ role:m.role, content:m.text })) }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    let t = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!t) t = '小智一時想不出合適的話，但神的話永不落空。要不要換個方式再問一次？';
    XZ.msgs.push({ role:'assistant', text:t });
  } catch(e){
    XZ.msgs.push({ role:'assistant', text:(e && e.name === 'AbortError' ? '小智等候得有點久，先暫停一下。' : '小智暫時連不上線，請稍後再試。')
      + '\n別忘了——最好的同伴是聖靈與神的話，你隨時可以直接向主傾心吐意。' });
  } finally { if (timer) clearTimeout(timer); }
  XZ.busy = false; drawXz();
}
function drawXz(){
  let el = $('#xz');
  if (!el){ el = document.createElement('div'); el.id = 'xz'; el.className = 'xz'; document.body.appendChild(el); }
  el.classList.toggle('on', XZ.open);
  if (!XZ.open) return;
  const body = XZ.msgs.length
    ? XZ.msgs.map((m, i) => {
        if (m.role !== 'assistant')
          return `<div class="xzm user">${esc(m.text).split('\n').join('<br>')}</div>`;
        const long = m.text.length > 240;
        const col = long && m.col !== false;
        const sav = xzSavedIdx(i) >= 0;
        return `<div class="xzm assistant">
          <div class="xzt ${col ? 'clip' : ''}">${esc(m.text).split('\n').join('<br>')}</div>
          ${long ? `<button class="xzmore" onclick="XZ.msgs[${i}].col=${col ? 'false' : 'true'};drawXz()">${col ? '展開 ▾' : '收合 ▴'}</button>` : ''}
          <div class="xzact">
            <button onclick="speak(XZ.msgs[${i}].text,'小智')">🔊</button>
            <button class="${sav ? 'on' : ''}" onclick="xzSave(${i})">${sav ? '★ 已收藏' : '☆ 收藏'}</button>
            <button onclick="xzDel(${i})">刪除</button>
          </div></div>`;
      }).join('')
    : `<div class="xzhi"><b>我是小智。</b><br>陪你讀${esc(BOOK.name)}的小幫手。<br>
       <span class="xs muted">我不是聖靈，也不能代替你的牧者——有疑問，還是要回到聖經，並找真實的屬靈同伴談。</span></div>`;
  const quicks = XZ.msgs.length ? '' :
    `<div class="xzq">${xzQuicks().map(q => `<button onclick="xzPick('${escA(q)}')">${esc(q)}</button>`).join('')}</div>`;
  el.innerHTML = `<div class="xzmask" onclick="xzClose()"></div>
    <div class="xzcard">
      <div class="xzh"><b>✨ 小智</b>
        <span class="xs muted" style="flex:1">陪讀 · 解經 · 禱告</span>
        ${XZ.msgs.length ? '<button class="ico" onclick="XZ.msgs=[];drawXz()">清空</button>' : ''}
        <button class="ico" onclick="xzClose()">✕</button></div>
      <div class="xzb" id="xzb">${body}${quicks}${XZ.busy ? '<div class="xzm assistant xzwait">小智正在想…</div>' : ''}</div>
      <div class="xzf">
        <input id="xzin" placeholder="問小智…" onkeydown="if(event.key==='Enter')xzSend()">
        <button class="btn pri" onclick="xzSend()">送出</button></div></div>`;
  setTimeout(() => { const b = $('#xzb'); if (b) b.scrollTop = b.scrollHeight; }, 30);
}
function xzSavedIdx(i){
  const a = XZ.msgs[i]; if (!a) return -1;
  return S.xz.findIndex(x => x.a === a.text);
}
function xzSave(i){
  const a = XZ.msgs[i]; if (!a) return;
  const k = xzSavedIdx(i);
  if (k >= 0){ S.xz.splice(k, 1); save(); drawXz(); return toast('已取消收藏'); }
  let q = '';
  for (let p = i - 1; p >= 0; p--) if (XZ.msgs[p].role === 'user'){ q = XZ.msgs[p].text; break; }
  S.xz.unshift({ q, a:a.text, ch:(R.ch || S.last || 0), at:Date.now() });
  save(); drawXz(); toast('已加入收藏');
}
function xzDel(i){
  XZ.msgs.splice(i, 1);
  if (i > 0 && XZ.msgs[i - 1] && XZ.msgs[i - 1].role === 'user') XZ.msgs.splice(i - 1, 1);
  save(); drawXz(); toast('已刪除');
}
function vXzSaved(){
  setTitle('小智收藏', false);
  if (!S.xz.length) return `<div class="sect"><p class="eyebrow">小智收藏</p>
    <h2 class="big">還沒有收藏任何回答。</h2><p class="sm muted">小智回答底下按「收藏」，就會存到這裡。</p>
    <button class="btn pri" style="margin-top:12px" onclick="xzOpen()">✨ 問小智</button></div>`;
  let h = `<div class="sect"><p class="eyebrow">小智收藏</p>
    <h2 class="big">${S.xz.length} 則收藏</h2></div>`;
  S.xz.forEach((x, i) => {
    h += `<div class="card" style="padding:14px">
      <p class="xs muted" style="margin:0 0 7px">${x.ch ? '第 ' + x.ch + ' 章　·　' : ''}${new Date(x.at).toLocaleDateString()}</p>
      ${x.q ? `<p class="mkq">${esc(x.q).slice(0, 120)}</p>` : ''}
      <p class="xzsv">${esc(x.a).split('\n').join('<br>')}</p>
      <div class="row" style="margin-top:10px">
        <button class="btn xs2" onclick="speak(S.xz[${i}].a,'小智')">🔊</button>
        <button class="btn xs2" onclick="xzPick(S.xz[${i}].q || S.xz[${i}].a.slice(0,60))">再問一次</button>
        <button class="btn xs2" onclick="xzDrop(${i})">刪除</button>
      </div></div>`;
  });
  h += `<div class="hr"></div><button class="btn" onclick="xzExport()">匯出收藏</button>`;
  return h;
}
function xzDrop(i){ if (!confirm('確定要刪除這則收藏嗎？')) return; S.xz.splice(i, 1); save(); render(); toast('已刪除'); }
function xzExport(){
  let t = '# 小智收藏\n\n';
  S.xz.forEach(x => {
    t += `## ${new Date(x.at).toLocaleDateString()}${x.ch ? '　第 ' + x.ch + ' 章' : ''}\n\n`;
    if (x.q) t += `**Q:** ${x.q}\n\n`;
    t += `${x.a}\n\n---\n\n`;
  });
  const b = new Blob([t], { type:'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = 'sage-saved.md'; a.click();
}
function xzPick(q){ XZ.msgs.push({ role:'user', text:q }); drawXz(); xzCall(); }

function pickVoice(k){
  S.set.voice = k; S.set.human = 1; save(); render();
  speak('願恩惠平安歸與你們。', '試聽');
}

/* ═══════ 朗讀聲音設定面板 ═══════ */
function voiceSheet(){
  let h = `<h4>朗讀聲音</h4>
    <div class="chk ${S.set.human ? 'on' : ''}" onclick="S.set.human=S.set.human?0:1;save();voiceSheet()">
      <span class="box">${S.set.human ? '✓' : ''}</span>
      <span class="t">使用真人語音<br><span class="xs muted">關閉則使用裝置內建語音（離線可用）</span></span></div>
    <p class="eyebrow" style="margin-top:16px">聲音</p><div class="row">`;
  Object.keys(TTS_VOICES).forEach(k => {
    h += `<button class="pill ${S.set.voice === k ? 'on' : ''}" onclick="pickVoice('${k}');voiceSheet()">
      ${TTS_VOICES[k].label}<span class="xs">　${TTS_VOICES[k].desc}</span></button>`;
  });
  h += `</div><p class="eyebrow" style="margin-top:16px">語速</p><div class="row">`;
  [['-2','慢'],['-1','稍慢'],['0','正常'],['1','稍快'],['2','快']].forEach(r => {
    h += `<button class="pill ${S.set.rate == r[0] ? 'on' : ''}" onclick="S.set.rate=${r[0]};save();voiceSheet()">${r[1]}</button>`;
  });
  h += `</div>
    <div class="hr"></div>
    <p class="sm muted">語音檔會存在這台裝置上，同一段第二次聽就不必再連線。</p>
    <button class="btn" onclick="ttsClear().then(()=>toast('語音快取已清除'))">清除語音快取</button>`;
  sheet(h);
}


/* ===== 渲染 ===== */
function setTitle(t, showBrand){
  $('#ttl').textContent = t;
  const b = $('#brand'); if (b) b.classList.toggle('hide', !showBrand);
}
function render(){
  try { window.__booted = true; } catch(e){}
  const v = { today:vToday, text:vText, course:vCourse, tools:vTools, me:vMe };
  let h;
  if (!S.set.role) h = vRole();
  else if (R.tab === 'tools' && R.sub === 'safeall') h = vSafeAll();
  else if (R.tab === 'tools' && R.sub === 'search') h = vSearch();
  else if (R.tab === 'me' && R.sub === 'marks') h = vMarks();
  else if (R.tab === 'me' && R.sub === 'sage') h = vXzSaved();
  else h = v[R.tab]();
  $('#view').innerHTML = h;
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === R.tab));
  $('#back').classList.toggle('hide', !(R.ch || R.sub));
  bindSearch();
}
applyFS(); applyDark();
$('#xzfab').onclick = xzOpen;
(function(){ const f = $('#xzfab');
  const upd = () => { const hide = (F !== null) || XZ.open; f.style.display = hide ? 'none' : 'grid'; };
  const _fo = fOpen, _fc = fClose, _dx = drawXz;
  window.fOpen = (m, n) => { _fo(m, n); upd(); };
  window.fClose = () => { _fc(); upd(); };
  window.drawXz = () => { _dx(); upd(); };
})();
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => {};
render();

/* ===== 全螢幕模式：講台提詞機 ＋ 小組帶領 ===== */
let F = null, FT = null, WAKE = null;
function fOpen(mode, n){
  F = { mode, n, i:0, run:true, left:0, tele:mode === 'tele' };
  document.documentElement.setAttribute('data-tele', F.tele ? '1' : '0');
  if (mode === 'tele'){
    const s = D.serm[n];
    F.pages = s ? telePages(s.blocks) : outlinePages(n);
    F.total = (s ? s.min : 35) * 60;
    F.left = F.total;
    $('#ftitle').textContent = '《' + meta(n).t + '》';
  } else {
    F.pages = livePages(n);
    F.total = F.pages.reduce((a, p) => a + p.sec, 0);
    F.left = F.pages[0].sec;
    $('#ftitle').textContent = '第' + n + '章 · 小組';
  }
  $('#full').classList.add('on');
  keepAwake(true);
  fDraw(); fTick();
}
function fClose(){
  F = null; clearInterval(FT); FT = null;
  document.documentElement.setAttribute('data-tele', '0');
  $('#full').classList.remove('on'); keepAwake(false);
}
async function keepAwake(on){
  try {
    if (on && navigator.wakeLock) WAKE = await navigator.wakeLock.request('screen');
    else if (WAKE) { WAKE.release(); WAKE = null; }
  } catch(e){}
}
function telePages(bl){
  const pages = []; let cur = [];
  const push = () => { if (cur.length){ pages.push(cur); cur = []; } };
  bl.forEach(b => {
    if (b[0] === 'h'){ push(); cur = [b]; return; }
    if (b[0] === 'w'){ cur.push(b); push(); return; }   // 稿中的停頓 ＝ 換頁
    cur.push(b);
    const chars = cur.reduce((a, x) => a + (typeof x[1] === 'string' ? x[1].length : 0), 0);
    if (cur.length >= 6 || chars > 190) push();
  });
  push();
  return pages.map(p => ({ blocks:p }));
}
function outlinePages(n){
  const m = meta(n), ps = [{ blocks:[['h','《' + m.t + '》'], ['p', m.sub], ['q', m.mv.t + '　' + m.mv.r]] }];
  m.serm.pts.forEach(p => ps.push({ blocks:[['h', p[0]], ['p', '經文　' + p[1]], ['p', p[2]]] }));
  ps.push({ blocks:[['h','結論'], ['p', m.truth]] });
  return ps;
}
function livePages(n){
  const m = meta(n), ps = [];
  ps.push({ sec:600, ttl:'① 破冰　10 分鐘', q:m.grp[0], tip:'讓每個人都說一句。組長先說自己的。' });
  ps.push({ sec:900, ttl:'② 經文共讀　15 分鐘', q:'「' + m.mv.t + '」　' + m.mv.r,
            tip:'逐人讀本章核心經文。讀完，先安靜三十秒，不急著解釋。' });
  m.grp.slice(1).forEach((q, i) => ps.push({
    sec:450, ttl:'③ 討論　第 ' + (i + 2) + ' 題', q,
    tip: i === 1 ? '這是最深的一題。組長先說自己的。不要追問細節；若有人哭，停下來為他禱告，不要接著問下一題。'
       : i === 3 ? '請小組成員在第七天問他一次。' : '' }));
  ps.push({ sec:900, ttl:'④ 操練與代禱　15 分鐘', q:m.prac.main,
            tip:'一人只選一項。彼此指定第七天要問的同伴，然後為彼此禱告。' });
  return ps;
}
function fDraw(){
  if (!F) return;
  const p = F.pages[F.i], b = $('#fbody');
  if (F.tele){
    b.className = 'fbody tele';
    b.innerHTML = p.blocks.map(x =>
      x[0] === 'h' ? `<h5>${esc(x[1])}</h5>` :
      x[0] === 'q' ? `<p class="qq">${esc(x[1])}</p>` :
      x[0] === 'w' ? `<p class="pause">停　<b>${x[1]}</b>　秒</p>` :
      `<p>${esc(x[1])}</p>`).join('');
  } else {
    b.className = 'fbody live';
    b.innerHTML = `<h5>${esc(p.ttl)}</h5><p class="qq">${esc(p.q)}</p>` +
      (p.tip ? `<div class="tipbox"><b>💡 帶領提醒</b><br>${esc(p.tip)}</div>` : '');
    F.left = p.sec;
  }
  b.scrollTop = 0;
  $('#frail').style.width = ((F.i + 1) / F.pages.length * 100) + '%';
  $('#fplay').textContent = F.run ? '暫停' : '繼續';
  fClock();
}
function fClock(){
  const s = Math.max(0, Math.round(F.left)), over = F.left < 0;
  const t = (over ? '-' : '') + String(Math.floor(Math.abs(F.left) / 60)).padStart(2, '0') + ':' +
            String(Math.floor(Math.abs(F.left) % 60)).padStart(2, '0');
  const c = $('#fclock'); c.textContent = t; c.classList.toggle('over', F.left < 0);
}
function fTick(){
  clearInterval(FT);
  FT = setInterval(() => { if (!F) return clearInterval(FT); if (F.run) F.left--; fClock(); }, 1000);
}
function fGo(d){
  if (!F) return;
  const i = F.i + d;
  if (i < 0) return;
  if (i >= F.pages.length){ toast('已經是最後一段'); return; }
  F.i = i; fDraw();
}
$('#fx').onclick = () => { if (confirm('結束這個模式嗎？')) fClose(); };
$('#fprev').onclick = () => fGo(-1);
$('#fnext').onclick = () => fGo(1);
$('#fplay').onclick = () => { F.run = !F.run; $('#fplay').textContent = F.run ? '暫停' : '繼續'; };
$('#fA').onclick = () => { S.set.fs = (S.set.fs + 1) % 5; save(); applyFS(); };
document.addEventListener('keydown', e => {
  if (!F) return;
  if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); fGo(1); }
  if (e.key === 'ArrowLeft') fGo(-1);
  if (e.key === 'Escape') fClose();
});

/* ===== 搜尋 ===== */
function vSearch(){
  setTitle('搜尋', false);
  const q = (R.q || '').trim();
  let h = `<div class="sect"><p class="eyebrow">搜尋</p>
    <input class="sbox" id="sq" placeholder="經節、原文、關鍵字…（例：8:28、無己、οἰκέω）" value="${esc(q)}">
    <p class="xs muted" style="margin:8px 0 0">搜尋全書${BOOK.chword}章講義、重點節解經、原文軌跡與爭議地圖。</p></div>`;
  if (q.length >= 1){
    const hit = (t) => t && t.indexOf(q) >= 0;
    const mk = (t) => esc(t).split(esc(q)).join('<mark>' + esc(q) + '</mark>');
    let r = '';
    // 經節
    const vs = [];
    Object.keys(D.txt).forEach(c => (D.txt[c] || []).forEach((t, i) => {
      const ref = c + ':' + (i + 1);
      if (hit(t) || hit(ref)) vs.push([ref, t]);
    }));
    const ex = [];
    Object.keys(BLK).forEach(c => BLK[c].forEach(b => {
      if (hit(b.exp) || hit(b.gram) || hit(b.grk) || hit(b.key) || hit(b.lit)) ex.push(b);
    }));
    if (vs.length){ r += `<h3 class="sec">經文　${vs.length}</h3>`;
      vs.slice(0, 15).forEach(v => r += `<button class="chrow" onclick="openV('${v[0]}')">
        <span class="chn">${esc(v[0])}</span><span style="flex:1"><b style="font-weight:400;font-size:15px;line-height:1.7">${mk(v[1])}</b></span></button>`);
      if (vs.length > 15) r += `<p class="xs muted">（只顯示前 15 筆）</p>`; }
    const my = Object.keys(S.mk).filter(k => hit(mkText(k)) || hit(mkNote(k)));
    if (my.length){ r += `<h3 class="sec">我的畫線　${my.length}</h3>`;
      my.slice(0, 10).forEach(k => r += `<button class="chrow" onclick="mkSheet('${k}')">
        <span class="chn">✍</span><span style="flex:1"><b style="font-weight:400;font-size:15px;line-height:1.7">${mk(mkText(k).slice(0, 40))}…</b>
        ${mkNote(k) ? `<span class="s">${mk(mkNote(k).slice(0, 30))}</span>` : ''}</span></button>`); }
    if (ex.length){ r += `<h3 class="sec">解經　${ex.length}</h3>`;
      ex.slice(0, 12).forEach(b => r += `<button class="chrow" onclick="openV('${b.ch}:${b.a}')">
        <span class="chn">${b.ch}:${b.a === b.z ? b.a : b.a + '–' + b.z}</span>
        <span style="flex:1"><b style="font-weight:400;font-size:15px;line-height:1.7">${mk(((D.txt[b.ch] || [])[b.a - 1] || '').slice(0, 38))}…</b></span></button>`);
      if (ex.length > 12) r += `<p class="xs muted">（只顯示前 12 筆）</p>`; }
    // 章
    const chs = CH.filter(c => hit(c.t) || hit(c.sub) || hit(c.truth) || hit(c.self) ||
      c.card.some(hit) || c.grp.some(hit) || c.safe.some(hit) || hit(c.mv.t));
    if (chs.length){ r += `<h3 class="sec">講義　${chs.length}</h3>`;
      chs.forEach(c => r += `<button class="chrow" onclick="go('course',${c.n})">
        <span class="chn">${String(c.n).padStart(2,'0')}</span>
        <span style="flex:1"><b>${mk(c.t)}</b><span class="s">${mk(c.truth)}</span></span></button>`); }
    // 軌跡
    const tk = D.tracks.filter(t => hit(t.gk) || hit(t.gl) || hit(t.tr) || hit(t.ins) || hit(t.head));
    if (tk.length){ r += `<h3 class="sec">原文軌跡　${tk.length}</h3>`;
      tk.forEach(t => r += `<button class="chrow" onclick="go('tools',0,'tracks')">
        <span class="chn">原</span><span style="flex:1"><b>${mk(t.gk)}</b><span class="s">${mk(t.gl)}　·　${mk(t.ins)}</span></span></button>`); }
    // 爭議
    const is = D.issues.filter(i => hit(i.t) || hit(i.why) || hit(i.say));
    if (is.length){ r += `<h3 class="sec">爭議　${is.length}</h3>`;
      is.forEach(i => r += `<button class="chrow" onclick="openIssue('${i.id}')">
        <span class="chn">⚖</span><span style="flex:1"><b>${mk(i.t)}</b><span class="s">${esc(BOOK.abbr)} ${esc(i.r)}</span></span></button>`); }
    h += r || `<p class="sm muted" style="margin-top:18px">找不到「${esc(q)}」。試試經節（8:28）、原文（οἰκέω）或關鍵字（無己、接納、扛）。</p>`;
  }
  return h;
}
function bindSearch(){
  const el = $('#sq'); if (!el) return;
  el.oninput = () => { R.q = el.value; const p = el.selectionStart; render(); const e2 = $('#sq'); if (e2){ e2.focus(); try { e2.setSelectionRange(p, p); } catch(x){} } };
}

/* ===== 首次啟動：身分 ===== */
function vRole(){
  setTitle(BOOK.app, true);
  return `<div class="sect"><p class="eyebrow">開始之前</p>
    <h2 class="big">你主要怎麼使用這本講義？</h2>
    <p class="sm muted">這只影響預設的入口。任何功能都不上鎖，隨時可以在「我的」裡改。</p></div>
  <button class="chrow" onclick="setRole('read')"><span class="chn">①</span>
    <span style="flex:1"><b>我自己讀</b><span class="s">從卡片開始，希臘文先關起來</span></span></button>
  <button class="chrow" onclick="setRole('group')"><span class="chn">②</span>
    <span style="flex:1"><b>我要帶小組</b><span class="s">進入小組頁與帶領模式</span></span></button>
  <button class="chrow" onclick="setRole('preach')"><span class="chn">③</span>
    <span style="flex:1"><b>我要講道</b><span class="s">顯示原文、講章與講台把關</span></span></button>`;
}
function setRole(r){
  S.set.role = r;
  if (r === 'read') S.set.grk = 0;
  if (r === 'preach') S.set.grk = 1;
  save(); go(r === 'read' ? 'today' : 'course');
  toast('設定好了，隨時可在「我的」更改');
}

/* ===== 品牌：圖示、manifest、啟動畫面 ===== */
(function brand(){
 try {
  const icon = document.querySelector('link[rel="apple-touch-icon"]');
  const src = (icon && icon.getAttribute) ? icon.getAttribute('href') : '';
  const b = $('#brand'), sp = $('#splashIcon');
  if (b && src) b.src = src;
  if (sp && src) sp.src = src;

  // manifest（動態產生，讓「加到主畫面」用正確的名稱與圖示）
  try {
    const el192 = document.querySelector('link[sizes="192x192"]');
    const i192 = (el192 && el192.getAttribute) ? el192.getAttribute('href') : '';
    const mf = {
      name: BOOK.app,
      short_name: BOOK.short || BOOK.app,
      description: BOOK.desc,
      start_url: '.', scope: '.', display: 'standalone',
      orientation: 'portrait', background_color: '#12305E', theme_color: BOOK.hue,
      lang: 'zh-Hant',
      icons: [
        { src: './icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: i192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: src,  sizes: '180x180', type: 'image/png', purpose: 'any' },
      ],
    };
    const el = $('#MF');
    if (el) el.href = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: 'application/manifest+json' }));
  } catch(e){}

  if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
    navigator.serviceWorker.register(BOOK.sw).catch(() => {});

  // 啟動畫面：至少停留一會兒，讓 logo 被看見
  const s = $('#splash');
  if (s){
    const off = () => { s.classList.add('gone'); setTimeout(() => { try { s.remove(); } catch(e){} }, 500); };
    setTimeout(off, 1100);
    if (s.addEventListener) s.addEventListener('click', off);
  }
 } catch(e){}
})();
