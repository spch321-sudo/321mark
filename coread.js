/* 321聖經講義 · 一起共讀（通用、獨立檔；index / sc / en 三頁共用）
   帶領者開房間 → 6 碼共讀碼／邀請連結／QR；加入者打開後，畫面跟著帶領者翻到同一頁、同一捲動位置、同一句。
   傳輸：peerjs.min.js（相容 PeerJS 介面的 Cloudflare 中繼站連線層）。
   同步內容：頁面 {tab,ch,sub}、捲動比例、朗讀／點的那一句（.mks[data-k]）。語言與字級各人自理。
   前綴由 <script data-pfx="gn321-"> 指定（每個 repo 不同，同一 repo 三頁共用）。
   不改動 App 既有函式；用 MutationObserver 監看 #view。ES5。 */
(function () {
  if (window.__coread321) return; window.__coread321 = 1;
  var SC = document.currentScript || (function () { var s = document.getElementsByTagName('script'); for (var i = s.length - 1; i >= 0; i--) if (/coread\.js/.test(s[i].src || '')) return s[i]; return null; })();
  var PFX = (SC && SC.getAttribute('data-pfx')) || 'bk321-';
  var SRC = (SC && SC.src) || '';
  var VQ = (SRC.match(/\?v=([^&#]*)/) || [])[1] || '1';
  var BASE = SRC ? SRC.replace(/[?#].*$/, '').replace(/[^\/]*$/, '') : '';
  var PEER_JS = [BASE + 'peerjs.min.js?v=' + VQ];
  var QR_JS = ['https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js', 'https://unpkg.com/qrcode-generator@1.4.4/qrcode.js', 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'];
  var SKEY = 'cr321:' + PFX, FOLLOW_COOL = 8000, CH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

  var TX = {
    zh: { title: '一起共讀', desc: '開一個共讀房間，把共讀碼或連結傳給弟兄姊妹。他們打開後，畫面會跟著你翻到同一頁、同一個位置；你朗讀或點一句，大家的畫面也會一起亮起來。', host: '開共讀房間（我來帶領）', join: '加入', codePH: '輸入 6 碼共讀碼', orJoin: '或加入別人的共讀', code: '共讀碼', people: '已有 {0} 人加入', waiting: '等待弟兄姊妹加入…', invite: '傳送邀請', copyLink: '複製連結', copied: '已複製', end: '結束共讀', leave: '離開共讀', inviteMsg: '📡 一起來共讀《{2}》！\n點連結加入：{0}\n或打開 App 按「📡」輸入共讀碼：{1}', following: '跟著帶領者共讀', paused: '你自己瀏覽中 · 點這裡回到帶領者', away: '帶領者在其他頁面（此頁不同步）', hostAway: '你在個人頁面 · 此頁不同步', connecting: '連線中…', hostChip: '共讀 {0} · {1} 人', ended: '共讀已結束', joined: '已加入共讀，畫面會跟著帶領者', loadErr: '共讀功能載入失敗，請確認網路後再試', badCode: '請輸入 6 碼共讀碼', notFound: '找不到這個共讀房間，請確認共讀碼，或請帶領者重新開房間', followOnly: '你正在跟著共讀', back2: '回到帶領者', tip: '提示：帶領者請保持 App 開著、螢幕不要關，大家才會一直同步。', qrTip: '用手機相機掃描加入', btn: '共讀', joinedOne: '有一位弟兄姊妹加入共讀', hostLeft: '帶領者暫時離線，正在重新連線…', scrT: '🖥 投影螢幕', scrD: '在連接投影機或電視的電腦／平板瀏覽器打開這個連結，畫面會變成大字、沒有按鈕、自動跟著我翻頁的投影畫面。', scrB: '複製投影連結', scrChk: '我是投影螢幕（大字、無按鈕）', close: '關閉' },
    zs: { title: '一起共读', desc: '开一个共读房间，把共读码或链接传给弟兄姊妹。他们打开后，画面会跟着你翻到同一页、同一个位置；你朗读或点一句，大家的画面也会一起亮起来。', host: '开共读房间（我来带领）', join: '加入', codePH: '输入 6 位共读码', orJoin: '或加入别人的共读', code: '共读码', people: '已有 {0} 人加入', waiting: '等待弟兄姊妹加入…', invite: '发送邀请', copyLink: '复制链接', copied: '已复制', end: '结束共读', leave: '离开共读', inviteMsg: '📡 一起来共读《{2}》！\n点链接加入：{0}\n或打开 App 按「📡」输入共读码：{1}', following: '跟着带领者共读', paused: '你自己浏览中 · 点这里回到带领者', away: '带领者在其他页面（此页不同步）', hostAway: '你在个人页面 · 此页不同步', connecting: '连线中…', hostChip: '共读 {0} · {1} 人', ended: '共读已结束', joined: '已加入共读，画面会跟着带领者', loadErr: '共读功能载入失败，请确认网络后再试', badCode: '请输入 6 位共读码', notFound: '找不到这个共读房间，请确认共读码，或请带领者重新开房间', followOnly: '你正在跟着共读', back2: '回到带领者', tip: '提示：带领者请保持 App 开着、屏幕不要关，大家才会一直同步。', qrTip: '用手机相机扫描加入', btn: '共读', joinedOne: '有一位弟兄姊妹加入共读', hostLeft: '带领者暂时离线，正在重新连线…', scrT: '🖥 投影荧幕', scrD: '在连接投影机或电视的电脑／平板浏览器打开这个链接，画面会变成大字、没有按钮、自动跟着我翻页的投影画面。', scrB: '复制投影链接', scrChk: '我是投影荧幕（大字、无按钮）', close: '关闭' },
    en: { title: 'Read together', desc: 'Open a reading room and send the room code or link to others. When they open it, their screens follow you to the same page and position; when you read aloud or tap a sentence, it lights up on everyone’s screen.', host: 'Open a room (I’ll lead)', join: 'Join', codePH: 'Enter the 6-character room code', orJoin: 'Or join someone else’s room', code: 'Room code', people: '{0} joined', waiting: 'Waiting for others to join…', invite: 'Send invite', copyLink: 'Copy link', copied: 'Copied', end: 'End session', leave: 'Leave', inviteMsg: '📡 Come read “{2}” with me!\nTap to join: {0}\nOr open the app, tap “📡” and enter code {1}', following: 'Following the leader', paused: 'You’re browsing · tap to return to the leader', away: 'Leader is on another page (not synced)', hostAway: 'You’re on a personal page · not synced', connecting: 'Connecting…', hostChip: 'Room {0} · {1}', ended: 'Reading session ended', joined: 'Joined — your screen will follow the leader', loadErr: 'Could not load reading-together. Check your connection and try again.', badCode: 'Please enter the 6-character room code', notFound: 'Room not found. Check the code, or ask the leader to open a new room.', followOnly: 'You are following', back2: 'Back to leader', tip: 'Tip: the leader should keep the app open with the screen on so everyone stays in sync.', qrTip: 'Scan with a phone camera to join', btn: 'Together', joinedOne: 'Someone joined the room', hostLeft: 'The leader is offline for a moment — reconnecting…', scrT: '🖥 Projector screen', scrD: 'Open this link in the browser of the computer or tablet connected to the projector or TV: it becomes a big-text screen with no buttons that follows me page by page.', scrB: 'Copy projector link', scrChk: 'I am the projector screen (big text, no buttons)', close: 'Close' }
  };
  function lg() {
    var l = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (/^en/.test(l)) return 'en';
    if (/hans|zh-cn|zh-sg/.test(l)) return 'zs';
    try { if (typeof S !== 'undefined' && S && S.set && S.set.sc) return 'zs'; } catch (e) { }
    return 'zh';
  }
  function X(k) { var s = (TX[lg()] || TX.zh)[k]; if (s == null) s = TX.zh[k] || k; for (var i = 1; i < arguments.length; i++) s = s.split('{' + (i - 1) + '}').join(arguments[i]); return s; }
  function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ss(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function $(id) { return document.getElementById(id); }
  function appName() { var t = $('ttl'); var s = (t && t.textContent) || document.title || ''; return String(s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }

  var loaded = {};
  function loadJs(urls, test, cb) {
    if (test()) { cb(true); return; } var i = 0;
    (function nx() {
      if (i >= urls.length) { cb(false); return; } var u = urls[i++];
      if (loaded[u]) { setTimeout(function () { cb(test()); }, 0); return; }
      var s = document.createElement('script'); s.src = u; s.async = true;
      s.onload = function () { loaded[u] = 1; if (test()) cb(true); else nx(); }; s.onerror = function () { nx(); };
      document.head.appendChild(s);
    })();
  }
  function toast(m) {
    var t = $('crtoast'); if (!t) { t = document.createElement('div'); t.id = 'crtoast'; document.body.appendChild(t); }
    t.textContent = m; t.className = 'on'; clearTimeout(toast.t); toast.t = setTimeout(function () { t.className = ''; }, 2400);
  }
  function copyText(s, ok) {
    function done() { toast(ok || X('copied')); }
    function fb() { try { var a = document.createElement('textarea'); a.value = s; a.style.cssText = 'position:fixed;left:-999px;top:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); document.body.removeChild(a); done(); } catch (e) { window.prompt('', s); } }
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(s).then(done, fb); return; } } catch (e) { }
    fb();
  }
  function setScr(on) {
    var c = document.documentElement.className.replace(/\s*cr-scr\b/g, '');
    document.documentElement.className = c + (on ? ' cr-scr' : '');
  }

  /* ---------- 目前頁面（取自 App 的全域狀態 R） ---------- */
  function pageNow() {
    var r; try { r = (typeof R !== 'undefined') ? R : null; } catch (e) { r = null; }
    if (!r || !r.tab) return null;
    if (r.tab === 'me') return null;                                         // 個人分頁
    if (document.querySelector('#gxs.on, .xz.on, #full.on')) return null;   // 美圖工作室、小智、全螢幕
    return { tab: r.tab, ch: r.ch || 0, sub: r.sub || '' };
  }
  function pgKey(p) { return p ? p.tab + '|' + (p.ch || 0) + '|' + (p.sub || '') : ''; }
  function viewEl() { return $('view') || document.body; }
  function maxScroll() { var d = document.documentElement; return Math.max(0, Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0) - (window.innerHeight || d.clientHeight || 600)); }
  function scrollF() { var m = maxScroll(); return m > 0 ? Math.round(Math.min(1, Math.max(0, (window.pageYOffset || document.documentElement.scrollTop || 0) / m)) * 1000) / 1000 : 0; }
  function cands() { return viewEl().querySelectorAll('.mks[data-k]'); }

  /* 把元素換成「該頁第幾個可朗讀句子」 */
  function descr(el) {
    if (!el) return null; var v = viewEl(), s = null;
    if (el.matches && el.matches('.mks[data-k]')) s = el;
    else if (el.querySelector) s = el.querySelector('.mks[data-k]');
    if (!s && el.closest) s = el.closest('.mks[data-k]');
    if (s) { var L = cands(), i = 0; for (; i < L.length; i++) if (L[i] === s) break; if (i < L.length) return { key: s.getAttribute('data-k'), i: i, n: L.length }; }
    var n = el; while (n && n !== v && n !== document.body) { if (n.id) return { id: n.id }; n = n.parentNode; }
    return null;
  }
  function locate(m) {
    if (!m) return null;
    if (m.key != null || m.i != null) {
      var L = cands(), i;
      if (m.key != null) for (i = 0; i < L.length; i++) if (L[i].getAttribute('data-k') === m.key) return L[i];
      if (L.length && m.i != null) { if (m.n === L.length) return L[Math.min(m.i, L.length - 1)]; return L[Math.min(L.length - 1, Math.round(m.n > 1 ? m.i / (m.n - 1) * (L.length - 1) : 0))]; }
    }
    if (m.id) return $(m.id);
    return null;
  }

  /* ---------- 狀態 ---------- */
  var C = { role: '', code: '', scr: false, peer: null, conns: [], host: null, last: null, retry: 0, rt: null, manualAt: 0, status: '', want: null, free: false, navUntil: 0, ptEl: null, lastKey: '', lastRx: 0, misses: 0, first: false, mkAt: 0, mkSig: '', hostMk: null };
  function newCode() { var c = ''; for (var i = 0; i < 6; i++) c += CH.charAt(Math.floor(Math.random() * CH.length)); return c; }
  function live() { var o = []; for (var i = 0; i < C.conns.length; i++) if (C.conns[i].open) o.push(C.conns[i]); return o; }
  function joinUrl(code, scr) { return location.origin + location.pathname + '?join=' + code + (scr ? '&screen=1' : ''); }
  function save() { ss(SKEY, C.role ? { r: C.role, c: C.code, s: C.scr ? 1 : 0 } : null); }

  /* ---------- 帶領者 ---------- */
  function host(code, quiet) {
    loadJs(PEER_JS, function () { return !!window.Peer; }, function (ok) {
      if (!ok) { toast(X('loadErr')); return; }
      teardown(); C.role = 'host'; C.code = code || newCode(); C.scr = false; setScr(false); C.status = 'connecting'; save(); chip();
      var p = C.peer = new Peer(PFX + C.code, { debug: 0 });
      p.on('open', function () { C.retry = 0; C.status = 'ok'; chip(); if (!quiet) panel(); snap(); });
      p.on('connection', function (c) {
        C.conns.push(c);
        c.on('open', function () { chip(); toast(X('joinedOne')); paintCount(); snap(c); });
        c.on('data', function (m) { if (m && m.t === 'hi') snap(c); });
        c.on('close', function () { drop(c); }); c.on('error', function () { drop(c); });
      });
      p.on('disconnected', function () { if (C.role === 'host' && !p.destroyed) setTimeout(function () { try { p.reconnect(); } catch (e) { } }, 1500); });
      p.on('error', function (e) {
        if (C.role !== 'host') return;
        if (e && e.type === 'unavailable-id') { if (C.retry++ < 5) { C.status = 'connecting'; chip(); clearTimeout(C.rt); C.rt = setTimeout(function () { host(C.code, true); }, 3000); } else { toast(X('loadErr')); endNow(true); } return; }
        if (e && (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error' || e.type === 'socket-closed')) { clearTimeout(C.rt); C.rt = setTimeout(function () { if (C.role === 'host') host(C.code, true); }, 4000); }
      });
    });
  }
  function drop(c) { var o = []; for (var i = 0; i < C.conns.length; i++) if (C.conns[i] !== c) o.push(C.conns[i]); C.conns = o; chip(); paintCount(); }
  function sendAll(m, only) { if (only) { try { only.send(m); } catch (e) { } return; } var cs = live(); for (var i = 0; i < cs.length; i++) try { cs[i].send(m); } catch (e) { } }
  /* 全量狀態（加入時、每次換頁／重畫後） */
  function snap(only) {
    if (C.role !== 'host') return;
    var pg = pageNow();
    var m = { t: 'st', ts: Date.now(), pg: pg, f: pg ? scrollF() : 0, mk: pg ? C.hostMk : null };
    C.last = m; sendAll(m, only && only.send ? only : null);
    chip();
  }
  var posT = null;
  function sendPos() {
    if (C.role !== 'host') return; if (!pageNow()) return;
    if (Date.now() - C.mkAt < 2500) return;      // 朗讀中以「那一句」為準，不另傳捲動
    var m = { t: 'pos', ts: Date.now(), f: scrollF() };
    if (C.last) C.last.f = m.f; sendAll(m);
  }
  window.addEventListener('scroll', function () { if (C.role === 'host' && !posT) posT = setTimeout(function () { posT = null; sendPos(); }, 220); }, { passive: true });
  function sendMk(kind, d) {
    if (C.role !== 'host' || !d) return;
    C.hostMk = { k: kind, key: d.key, i: d.i, n: d.n, id: d.id, at: Date.now() };
    var m = { t: 'mk', ts: Date.now(), k: kind, key: d.key, i: d.i, n: d.n, id: d.id };
    if (C.last) C.last.mk = C.hostMk; sendAll(m);
  }
  /* 朗讀走到哪一句（.spk-now）：輪詢，不碰既有朗讀程式 */
  setInterval(function () {
    if (C.role !== 'host' || !pageNow()) return;
    var el = viewEl().querySelector('.spk-now'); if (!el) { C.mkSig = ''; return; }
    var d = descr(el); if (!d) return; var sig = (d.key || d.id) + '';
    C.mkAt = Date.now();
    if (sig !== C.mkSig) { C.mkSig = sig; sendMk('tts', d); }
  }, 400);
  /* 點一句 */
  document.addEventListener('click', function (e) {
    if (C.role !== 'host') return; var t = e.target, s = t && t.closest ? t.closest('.mks[data-k]') : null; if (!s || !viewEl().contains(s)) return;
    var d = descr(s); if (d) { C.mkAt = Date.now(); sendMk('pt', d); }
  }, true);

  /* ---------- 跟隨者 ---------- */
  function join(code, scr) {
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length !== 6) { toast(X('badCode')); return; }
    if (scr) { window.CR_SCREEN = true; setScr(true); }
    loadJs(PEER_JS, function () { return !!window.Peer; }, function (ok) {
      if (!ok) { toast(X('loadErr')); return; }
      teardown(); C.role = 'follow'; C.code = code; C.scr = !!scr; C.status = 'connecting'; C.first = true; C.misses = 0; save(); chip(); closePanel();
      var p = C.peer = new Peer({ debug: 0 });
      p.on('open', function () { dial(); });
      p.on('disconnected', function () { if (C.role === 'follow' && !p.destroyed) setTimeout(function () { try { p.reconnect(); } catch (e) { } }, 1500); });
      p.on('error', function (e) {
        if (C.role !== 'follow') return;
        if (e && e.type === 'peer-unavailable') { C.misses++; if (C.first && C.misses >= 3) { toast(X('notFound')); leave(true); return; } C.status = 'connecting'; chip(); redial(4000); return; }
        redial(4000);
      });
    });
  }
  function redial(ms) { clearTimeout(C.rt); C.rt = setTimeout(function () { if (C.role === 'follow') dial(); }, ms || 3000); }
  function dial() {
    var p = C.peer; if (!p || p.destroyed || C.role !== 'follow') return;
    if (p.disconnected) { try { p.reconnect(); } catch (e) { } redial(3000); return; }
    try { if (C.host) C.host.close(); } catch (e) { }
    var c = C.host = p.connect(PFX + C.code, { reliable: true });
    var to = setTimeout(function () { if (!c.open && C.role === 'follow' && C.host === c) { try { c.close(); } catch (e) { } redial(1000); } }, 12000);
    c.on('open', function () { clearTimeout(to); C.misses = 0; C.lastRx = Date.now(); C.status = 'ok'; if (C.first) { C.first = false; if (!C.scr) toast(X('joined')); } chip(); try { c.send({ t: 'hi' }); } catch (e) { } });
    c.on('data', function (m) {
      C.lastRx = Date.now(); if (C.status !== 'ok') { C.status = 'ok'; chip(); } if (!m) return;
      if (m.t === 'st') onSt(m); else if (m.t === 'pos') onPos(m); else if (m.t === 'mk') onMk(m); else if (m.t === 'end') leave();
    });
    c.on('close', function () { clearTimeout(to); if (C.role === 'follow' && C.host === c) { C.status = 'lost'; chip(); redial(2500); } });
    c.on('error', function () { });
  }
  function stopTts() { try { if (typeof TTS321 !== 'undefined' && TTS321.isOn && TTS321.isOn()) { if (typeof stopSpeak === 'function') stopSpeak(); else if (TTS321.stop) TTS321.stop(); } } catch (e) { } }
  function onSt(m) {
    var nk = pgKey(m.pg), changed = nk !== C.lastKey;
    C.want = { pg: m.pg, f: m.f || 0, mk: m.mk || null };
    if (changed) { C.lastKey = nk; C.free = false; C.manualAt = 0; }
    if (!m.pg || C.free) { chip(); return; }
    ensurePage(changed);
  }
  function onPos(m) { if (!C.want || !C.want.pg) return; C.want.f = m.f || 0; if (C.free || Date.now() - C.manualAt < FOLLOW_COOL || !samePage()) return; scrollToF(C.want.f); }
  function onMk(m) {
    if (!C.want) C.want = { pg: pageNow(), f: 0 };
    C.want.mk = { k: m.k, key: m.key, i: m.i, n: m.n, id: m.id, at: Date.now() };
    if (C.free || !C.want.pg || !samePage()) return;
    markNow(false);
  }
  function samePage() { var c = pageNow(); return !!c && !!C.want && !!C.want.pg && pgKey(c) === pgKey(C.want.pg); }
  function ensurePage(force) {
    var w = C.want; if (!w || !w.pg || C.role !== 'follow') return;
    if (!samePage()) {
      stopTts(); C.navUntil = Date.now() + 450;
      try { go(w.pg.tab, w.pg.ch, w.pg.sub); } catch (e) { return; }
      setTimeout(function () { applyPos(true); }, 60); setTimeout(function () { if (!C.free) applyPos(true); }, 700);
      return;
    }
    applyPos(force);
  }
  function scrollToF(f) { var top = Math.round(maxScroll() * (f || 0)); try { window.scrollTo({ top: top, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, top); } }
  function applyPos(force) {
    var w = C.want; if (!w || !w.pg || C.free || !samePage()) return;
    if (!force && Date.now() - C.manualAt < FOLLOW_COOL) { chip(); return; }
    if (w.mk && (w.mk.k === 'tts' || Date.now() - (w.mk.at || 0) < 4000)) { if (markNow(force)) { chip(); return; } }
    scrollToF(w.f); chip();
  }
  function clearPt() { var o = document.querySelectorAll('.cr-pt'); for (var i = 0; i < o.length; i++) o[i].className = String(o[i].className).replace(/\s*cr-pt\b/g, ''); }
  function markNow(force) {
    var w = C.want; if (!w || !w.mk) return false; var e = locate(w.mk); clearPt(); if (!e) return false;
    e.className += ' cr-pt'; C.ptEl = e;
    if (w.mk.k === 'pt') { clearTimeout(C.ptT); C.ptT = setTimeout(function () { if (C.ptEl === e) { clearPt(); C.ptEl = null; } }, 4200); }
    if (force || Date.now() - C.manualAt > FOLLOW_COOL) { try { e.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (x) { e.scrollIntoView(); } }
    return true;
  }
  function backToLeader() {
    C.free = false; C.manualAt = 0; closePanel();
    if (C.want && C.want.pg) { if (!samePage()) ensurePage(true); else applyPos(true); }
    chip();
  }
  function userMove() { if (C.role === 'follow' && !C.scr) { C.manualAt = Date.now(); chip(); } }
  var evs = ['touchmove', 'wheel', 'keydown', 'mousedown'];
  for (var ei = 0; ei < evs.length; ei++) window.addEventListener(evs[ei], userMove, { passive: true });

  /* ---------- #view 重畫鉤子（MutationObserver，debounce 150ms） ---------- */
  var obsT = null;
  function onView() {
    if (C.role === 'host') { snap(); return; }
    if (C.role !== 'follow') return;
    var w = C.want; if (!w || !w.pg) { chip(); return; }
    if (samePage()) { C.free = false; applyPos(false); }
    else if (Date.now() < C.navUntil) { }
    else C.free = true;       // 加入者自己換頁：先不拉回，等帶領者換頁或按「回到帶領者」
    chip();
  }
  function watch() {
    var v = $('view'); if (!v || !window.MutationObserver) return false;
    try { new MutationObserver(function () { clearTimeout(obsT); obsT = setTimeout(onView, 150); }).observe(v, { childList: true }); } catch (e) { return false; }
    return true;
  }

  /* 心跳 */
  setInterval(function () {
    if (C.role === 'host') sendAll({ t: 'hb' });
    else if (C.role === 'follow' && C.host && C.lastRx && Date.now() - C.lastRx > 15000) { C.lastRx = 0; C.status = 'lost'; chip(); dial(); }
  }, 5000);
  window.addEventListener('pagehide', function () { if (C.role === 'host') sendAll({ t: 'hb' }); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (C.role === 'follow' && C.status !== 'ok') dial();
    if (C.role === 'host' && C.peer && C.peer.disconnected) try { C.peer.reconnect(); } catch (e) { }
  });

  /* ---------- 結束 ---------- */
  function teardown() { clearTimeout(C.rt); try { if (C.peer) C.peer.destroy(); } catch (e) { } C.peer = null; C.conns = []; C.host = null; C.want = null; C.free = false; C.lastKey = ''; C.hostMk = null; clearPt(); }
  function end() { var n = live().length; sendAll({ t: 'end' }); setTimeout(function () { endNow(); }, n ? 300 : 0); }
  function endNow(quiet) { teardown(); C.role = ''; C.code = ''; C.last = null; save(); chip(); closePanel(); if (!quiet) toast(X('ended')); }
  function leave(quiet) { teardown(); C.role = ''; C.code = ''; save(); setScr(false); chip(); closePanel(); if (!quiet) toast(X('ended')); }

  /* ---------- 畫面 ---------- */
  function chip() {
    var el = $('crchip'), top = $('crTop');
    if (top) top.className = String(top.className).replace(/\s*cr-on\b/g, '') + (C.role ? ' cr-on' : '');
    if (!C.role || C.scr) { if (el) el.parentNode.removeChild(el); return; }
    if (!el) { el = document.createElement('button'); el.id = 'crchip'; el.type = 'button'; el.onclick = function () { if (C.role === 'follow' && (C.free || (C.manualAt && Date.now() - C.manualAt < FOLLOW_COOL))) { backToLeader(); return; } panel(); }; document.body.appendChild(el); }
    var t, cls = '';
    if (C.role === 'host') { if (C.status === 'ok') t = pageNow() ? X('hostChip', C.code, live().length) : X('hostAway'); else { t = X('connecting'); cls = ' wait'; } }
    else if (C.status !== 'ok') { t = C.status === 'lost' ? X('hostLeft') : X('connecting'); cls = ' wait'; }
    else if (C.want && !C.want.pg) { t = X('away'); cls = ' wait'; }
    else if (C.free || (C.manualAt && Date.now() - C.manualAt < FOLLOW_COOL)) { t = X('paused'); cls = ' off'; }
    else t = X('following');
    el.className = 'crchip' + cls; el.innerHTML = '<span class="dot"></span>📡 ' + E(t);
  }
  setInterval(function () { if (C.role === 'follow' && C.manualAt) chip(); }, 2000);
  function qrInto(id, text) {
    loadJs(QR_JS, function () { return typeof window.qrcode === 'function'; }, function (ok) {
      var box = $(id); if (!box || !ok) { if (box) box.style.display = 'none'; return; }
      try { var q = qrcode(0, 'M'); q.addData(text); q.make(); box.innerHTML = q.createImgTag(5, 10); } catch (e) { box.style.display = 'none'; }
    });
  }
  function paintCount() { var e = $('crcount'); if (e) { var n = live().length; e.textContent = n ? X('people', n) : X('waiting'); } }
  function closePanel() { var p = $('crpanel'); if (p && p.parentNode) p.parentNode.removeChild(p); }
  function panel() {
    closePanel();
    var h = '<div class="cr-h">📡 ' + E(X('title')) + '</div>';
    if (C.role === 'host') {
      h += '<div class="cr-k">' + E(X('code')) + '</div><div class="cr-code">' + E(C.code.slice(0, 3) + ' ' + C.code.slice(3)) + '</div>' +
        '<div class="cr-qr" id="crqr"></div><div class="cr-s">' + E(X('qrTip')) + '</div>' +
        '<div class="cr-count" id="crcount"></div>' +
        '<div class="cr-acts"><button class="cr-b pri" data-a="invite">↗ ' + E(X('invite')) + '</button><button class="cr-b" data-a="copy">⧉ ' + E(X('copyLink')) + '</button></div>' +
        '<div class="cr-scr"><b>' + E(X('scrT')) + '</b><p class="cr-s">' + E(X('scrD')) + '</p><button class="cr-b" data-a="copyscr">' + E(X('scrB')) + '</button></div>' +
        '<p class="cr-s">' + E(X('tip')) + '</p>' +
        '<div class="cr-acts"><button class="cr-b" data-a="end">■ ' + E(X('end')) + '</button><button class="cr-b" data-a="close">' + E(X('close')) + '</button></div>';
    } else if (C.role === 'follow') {
      h += '<div class="cr-k">' + E(X('followOnly')) + '</div><div class="cr-code">' + E(C.code.slice(0, 3) + ' ' + C.code.slice(3)) + '</div>' +
        '<div class="cr-acts"><button class="cr-b pri" data-a="back">' + E(X('back2')) + '</button><button class="cr-b" data-a="leave">' + E(X('leave')) + '</button></div>' +
        '<div class="cr-acts"><button class="cr-b" data-a="close">' + E(X('close')) + '</button></div>';
    } else {
      h += '<p class="cr-desc">' + E(X('desc')) + '</p><button class="cr-b pri big" data-a="host">📡 ' + E(X('host')) + '</button>' +
        '<div class="cr-k" style="margin-top:16px">' + E(X('orJoin')) + '</div>' +
        '<div class="cr-join"><input id="crin" type="text" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="' + E(X('codePH')) + '"><button class="cr-b pri" data-a="join">' + E(X('join')) + '</button></div>' +
        '<label class="cr-chk"><input type="checkbox" id="crscrchk"> ' + E(X('scrChk')) + '</label>' +
        '<div class="cr-acts"><button class="cr-b" data-a="close">' + E(X('close')) + '</button></div>';
    }
    var m = document.createElement('div'); m.id = 'crpanel'; m.innerHTML = '<div class="cr-in">' + h + '</div>';
    m.addEventListener('click', function (e) {
      var n = e.target; if (n === m) { closePanel(); return; }
      while (n && n !== m && !(n.getAttribute && n.getAttribute('data-a'))) n = n.parentNode; if (!n || n === m) return;
      var a = n.getAttribute('data-a');
      if (a === 'host') { closePanel(); host(); }
      else if (a === 'join') { var i = $('crin'), c = $('crscrchk'); join(i ? i.value : '', c && c.checked); }
      else if (a === 'invite') { var msg = X('inviteMsg', joinUrl(C.code), C.code, appName()); if (navigator.share) { navigator.share({ text: msg }).then(null, function () { }); } else copyText(msg); }
      else if (a === 'copy') copyText(joinUrl(C.code));
      else if (a === 'copyscr') copyText(joinUrl(C.code, true));
      else if (a === 'end') end();
      else if (a === 'leave') leave();
      else if (a === 'back') backToLeader();
      else if (a === 'close') closePanel();
    });
    document.body.appendChild(m);
    var inp = $('crin'); if (inp) inp.onkeydown = function (e) { if (e.keyCode === 13) { var c = $('crscrchk'); join(inp.value, c && c.checked); } };
    if (C.role === 'host') { paintCount(); qrInto('crqr', joinUrl(C.code)); }
  }

  /* ---------- 樣式與頂端按鈕 ---------- */
  function css() {
    var s = document.createElement('style'); s.id = 'crcss';
    s.textContent = '#crchip{position:fixed;right:10px;top:calc(58px + env(safe-area-inset-top,0px));z-index:60;border:0;border-radius:999px;padding:7px 14px 7px 10px;font:inherit;font-size:13px;background:var(--pine,#1F4D3D);color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.22);max-width:82vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}' +
      '.crchip .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#5BD38A;margin-right:6px;vertical-align:1px;animation:crp 1.6s infinite}' +
      '.crchip.wait .dot{background:#F2C14E}.crchip.off{background:var(--brass,#9C6B18)}.crchip.off .dot{background:#fff;animation:none}' +
      '@keyframes crp{0%,100%{opacity:1}50%{opacity:.35}}' +
      '#crTop{font-size:17px}#crTop.cr-on{box-shadow:inset 0 0 0 2px #5BD38A;border-radius:50%}' +
      '.cr-pt{outline:3px solid #C9962B!important;outline-offset:2px;background:rgba(214,162,80,.30)!important;border-radius:4px;animation:crpt 1.2s ease-in-out 3}' +
      '@keyframes crpt{0%,100%{outline-color:rgba(201,150,43,.35)}50%{outline-color:#C9962B}}' +
      '#crpanel{position:fixed;inset:0;z-index:2000;background:rgba(10,16,14,.45);display:flex;align-items:flex-end;justify-content:center;font-family:inherit}' +
      '#crpanel .cr-in{background:var(--paper,#fff);color:var(--ink,#12181B);width:100%;max-width:520px;max-height:90vh;overflow:auto;border-radius:20px 20px 0 0;padding:16px 18px calc(24px + env(safe-area-inset-bottom,0px));box-sizing:border-box;font-size:15px;line-height:1.55}' +
      '.cr-h{font-weight:800;font-size:19px;margin-bottom:8px;text-align:center}.cr-desc{margin:0 0 12px;line-height:1.7}' +
      '.cr-k{font-size:13px;color:var(--dusk,#54636B);text-align:center;margin-top:6px}.cr-code{font-size:36px;font-weight:800;letter-spacing:.12em;text-align:center;color:var(--pine,#1F4D3D);margin:2px 0 8px;font-variant-numeric:tabular-nums}' +
      '.cr-qr{display:flex;justify-content:center;margin:4px 0}.cr-qr img{width:180px;height:180px;image-rendering:pixelated;background:#fff;border-radius:10px;padding:4px}' +
      '.cr-s{font-size:12.5px;color:var(--dusk,#54636B);text-align:center;margin:4px 0;line-height:1.6}.cr-count{text-align:center;font-weight:700;margin:10px 0 4px}' +
      '.cr-acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:12px 0 4px}.cr-scr{margin:12px 0 6px;padding:10px;border:1px solid var(--line,#D6DAD2);border-radius:12px;text-align:center}' +
      '.cr-b{font:inherit;font-size:15px;padding:10px 16px;border-radius:12px;border:1px solid var(--line,#D6DAD2);background:var(--card,#fff);color:inherit;cursor:pointer}.cr-b.pri{background:var(--pine,#1F4D3D);color:#fff;border-color:transparent}.cr-b.big{display:block;width:100%;padding:13px;font-weight:700}' +
      '.cr-join{display:flex;gap:8px;margin-top:6px}.cr-join input{flex:1;min-width:0;font:inherit;font-size:18px;letter-spacing:.1em;padding:10px 12px;border:1px solid var(--line,#D6DAD2);border-radius:12px;background:var(--card,#fff);color:inherit;text-align:center;text-transform:uppercase}' +
      '.cr-chk{display:block;margin:10px 0 0;font-size:13px;color:var(--dusk,#54636B);text-align:center}' +
      '#crtoast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:#12181B;color:#fff;padding:9px 16px;border-radius:999px;font-size:13.5px;z-index:2100;opacity:0;transition:.2s;pointer-events:none;max-width:88vw;text-align:center}#crtoast.on{opacity:1}' +
      'html.cr-scr #crchip,html.cr-scr #crTop,html.cr-scr #crpanel{display:none!important}';
    document.head.appendChild(s);
  }
  function topBtn() {
    if ($('crTop')) return; var bar = document.querySelector('header.top .bar'); if (!bar) return;
    var b = document.createElement('button'); b.className = 'ico'; b.id = 'crTop'; b.type = 'button'; b.textContent = '📡'; b.setAttribute('aria-label', X('btn'));
    b.onclick = function () { panel(); };
    var sp = $('spk'); if (sp && sp.parentNode === bar) bar.insertBefore(b, sp); else bar.appendChild(b);
  }

  window.CR321 = { host: host, join: join, end: end, leave: leave, panel: panel, state: C, page: pageNow };

  /* ---------- 啟動 ---------- */
  function boot() {
    css(); topBtn(); watch(); chip();
    var q = location.search, jm = q.match(/[?&]join=([A-Za-z0-9]{6})/), scr = /[?&]screen=1/.test(q);
    if (jm) {
      try { var u = q.replace(/([?&])(join|screen)=[^&]*/g, '$1').replace(/&&+/g, '&').replace(/\?&/, '?').replace(/[?&]+$/, ''); history.replaceState(null, '', location.pathname + u + location.hash); } catch (e) { }
      if (scr) setScr(true);
      setTimeout(function () { join(jm[1], scr); }, 600);
      return;
    }
    var k = ss(SKEY);
    if (k && k.c) { if (k.s) { window.CR_SCREEN = true; setScr(true); } setTimeout(function () { if (k.r === 'host') host(k.c, true); else join(k.c, k.s); }, 600); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
