# -*- coding: utf-8 -*-
"""
md2data.py —— 把 16 份《馬可福音解經與講章》markdown 轉成 App 用的 data.json。

來源格式：每章一個 .md，含二十二個部分與四個附錄，結構在 16 章之間完全一致。
對應關係：
    第四部分  逐節原文解經   → txt（逐節經文）、blk（六層）
    第十八部分 完整講章逐字稿 → serm.blocks
    第十七部分 題目與三大段   → ch[].t / sub / serm.pts
    第一部分  全章鳥瞰       → ch[].q / truth / mv
    第三部分  全章文學結構   → ch[].sec
    第十五部分 容易誤解的經文 → ch[].safe
    第二十部分 生命應用       → ch[].prac
    第二十一部分 321生命亮光  → ch[].t321 / card
    附錄C     小組五題＋金句卡 → ch[].grp

用法：  python3 tools/md2data.py <來源目錄> <輸出 data.json>
"""
import os, re, sys, json, html

CN = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,
      '九':9,'十':10,'十一':11,'十二':12,'十三':13,'十四':14,'十五':15,'十六':16}
VERSES = {1:45,2:28,3:35,4:41,5:43,6:56,7:37,8:38,9:50,10:52,
          11:33,12:44,13:37,14:72,15:47,16:20}


# ── markdown → HTML ────────────────────────────────────
def esc(s):
    return html.escape(s, quote=False)


def inline(s):
    """行內語法：粗體、斜體、行內碼。"""
    s = esc(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'`([^`]+?)`', r'<code>\1</code>', s)
    return s


def md2html(text):
    """把一段 markdown 轉成 App 用的 HTML（段落、引用、表格、清單）。"""
    lines = text.split('\n')
    out, i = [], 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()

        if not s:
            i += 1
            continue

        # 表格
        if s.startswith('|') and i + 1 < len(lines) and re.match(r'^\|[\s:\-|]+\|$', lines[i+1].strip()):
            head = [c.strip() for c in s.strip('|').split('|')]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')])
                i += 1
            t = '<table><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr>'
            for r in rows:
                t += '<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>'
            out.append(t + '</table>')
            continue

        # 引用
        if s.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip().lstrip('>').strip())
                i += 1
            body = '<br/>\n'.join(inline(x) for x in buf if x)
            out.append(f'<blockquote>\n<p>{body}</p>\n</blockquote>')
            continue

        # 清單
        if re.match(r'^[-*]\s+', s):
            buf = []
            while i < len(lines) and re.match(r'^[-*]\s+', lines[i].strip()):
                buf.append(re.sub(r'^[-*]\s+', '', lines[i].strip()))
                i += 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in buf) + '</ul>')
            continue

        # 小標題
        if s.startswith('#'):
            lvl = len(s) - len(s.lstrip('#'))
            txt = s.lstrip('#').strip()
            out.append(f'<p><strong>{inline(txt)}</strong></p>' if lvl >= 4
                       else f'<p><strong>{inline(txt)}</strong></p>')
            i += 1
            continue

        # 分隔線
        if re.match(r'^-{3,}$', s):
            i += 1
            continue

        # 段落
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(
                r'^([-*]\s|>|\||#|-{3,})', lines[i].strip()):
            buf.append(lines[i].strip())
            i += 1
        if buf:
            out.append('<p>' + inline(' '.join(buf)) + '</p>')
    return '\n'.join(out)


# ── 取出各部分 ─────────────────────────────────────────
def part(src, name):
    """取出 `# <name>…` 到下一個一級標題之間的內容。"""
    m = re.search(rf'^# {re.escape(name)}[^\n]*\n(.*?)(?=^# |\Z)', src, re.S | re.M)
    return m.group(1).strip() if m else ''


def sub(block, name):
    """取出 `## <name>` 或 `### <name>` 小節。"""
    m = re.search(rf'^#{{2,3}} {re.escape(name)}[^\n]*\n(.*?)(?=^#{{1,3}} |\Z)', block, re.S | re.M)
    return m.group(1).strip() if m else ''


def plain(h):
    """HTML → 純文字（給不吃 HTML 的欄位用）。"""
    t = re.sub(r'<br\s*/?>', '\n', h)
    t = re.sub(r'</p>|</blockquote>', '\n', t)
    t = re.sub(r'<[^>]+>', '', t)
    return html.unescape(re.sub(r'\n{3,}', '\n\n', t)).strip()


# ── 逐節經文 ───────────────────────────────────────────
def parse_verses(quote, a, z):
    """把一段 `> N「…」` 的引用拆成 {節: 經文}。"""
    lines = [l.strip().lstrip('>').strip() for l in quote.split('\n') if l.strip().startswith('>')]
    body = '\n'.join(lines)
    hits = list(re.finditer(r'(?:^|\n)\s*(\d+)\s*', body))
    res = {}
    if a == z or not hits:
        res[a] = re.sub(r'\s+', '', body).strip('「」')
        return res
    for k, m in enumerate(hits):
        n = int(m.group(1))
        if not (a <= n <= z):
            continue
        end = hits[k+1].start() if k + 1 < len(hits) else len(body)
        res[n] = re.sub(r'\s+', '', body[m.end():end]).strip('「」')
    return res


# ── 單章 ───────────────────────────────────────────────
def parse_chapter(path, ch):
    src = open(path, encoding='utf-8').read()
    nv = VERSES[ch]

    # ① 逐節解經 → blk + txt
    p4 = part(src, '第四部分')
    chunks = re.split(r'^## 第(\d+)(?:[–—\-](\d+))?節[^\n]*$', p4, flags=re.M)
    blk, txt = [], {}
    for i in range(1, len(chunks), 3):
        a = int(chunks[i]); z = int(chunks[i+1]) if chunks[i+1] else a
        body = chunks[i+2]
        star = 1 if '★' in p4[:p4.find(body)].rsplit('\n', 2)[-2:][0] else 0
        get = lambda n: sub(body, n)
        quote = get('一、和合本經文')
        txt.update(parse_verses(quote, a, z))
        blk.append(dict(
            a=a, z=z, star=star,
            grk=md2html(get('二、原文')),
            lit=md2html(get('三、直譯')),
            key=md2html(get('四、關鍵字原文字義')),
            gram=md2html(get('五、文法解析') + '\n\n' + get('六、句法結構')),
            exp=md2html(get('七、經文解釋')),
        ))

    verses = [txt.get(n, '') for n in range(1, nv + 1)]

    # ② 講章
    p18 = part(src, '第十八部分')
    title = ''
    m = re.search(r'^## 《(.+?)》', p18, re.M)
    if m: title = m.group(1)
    subtitle = ''
    m = re.search(r'^### 副題：(.+)$', p18, re.M)
    if m: subtitle = m.group(1).strip()
    minutes = 35
    m = re.search(r'預估時長：(\d+)', p18)
    if m: minutes = int(m.group(1))
    sblocks = []
    for m in re.finditer(r'^### (.+?)$\n(.*?)(?=^### |\Z)', p18, re.S | re.M):
        head, body = m.group(1).strip(), m.group(2).strip()
        if head.startswith('副題') or head.startswith('經文'):
            continue
        sblocks.append({'h': head, 'b': md2html(body)})

    # ③ 三大段大綱
    p17 = part(src, '第十七部分')
    pts = []
    for m in re.finditer(r'^### [一二三]、(.+?)$\n(.*?)(?=^### |\Z)', p17, re.S | re.M):
        h = m.group(1).strip(); body = m.group(2)
        ref = ''
        mm = re.search(r'\*\*經文：\*\*\s*(.+)', body)
        if mm: ref = mm.group(1).strip()
        core = ''
        mm = re.search(r'\*\*核心真理：\*\*\s*\n?(.+)', body)
        if mm: core = mm.group(1).strip()
        pts.append([h, ref, core])

    # ④ 文學結構 → sec
    p3 = part(src, '第三部分')
    sec = []
    for m in re.finditer(r'\|\s*(?:第[一二三四五六七八九十]+段)?\s*\|?\s*(\d+:\d+[–—\-]?\d*)\s*\|\s*([^|]+?)\s*\|', p3):
        sec.append([m.group(1).replace('–', '--').replace('—', '--'), re.sub(r'\*\*', '', m.group(2)).strip()])
    if not sec:
        for m in re.finditer(r'^[-*]\s*\*\*(\d+:\d+[–—\-]?\d*)\*\*[：:　\s]*(.+)$', p3, re.M):
            sec.append([m.group(1).replace('–', '--').replace('—', '--'), re.sub(r'\*\*', '', m.group(2)).strip()])

    # ⑤ 全章鳥瞰 → q / truth / mv
    p1 = part(src, '第一部分')
    q = plain(md2html(sub(p1, '5. 本章主要面對什麼問題')))[:400]
    truth = plain(md2html(sub(p1, '7. 一句話總結全章')))[:300]
    mvq = sub(p1, '8. 全章核心經文')
    mv = {'t': '', 'r': ''}
    mm = re.search(r'「(.+?)」\s*[（(](.+?)[)）]', plain(md2html(mvq)))
    if mm:
        mv = {'t': mm.group(1), 'r': mm.group(2)}

    # ⑥ 小組五題
    apc = part(src, '附錄C')
    grp = []
    for m in re.finditer(r'\*\*第(.+?)題(?:[（(](.+?)[)）])?\*\*\s*\n((?:>.*\n?)+)', apc):
        body = plain(md2html(m.group(3)))
        tag = f'【{m.group(1)}、{m.group(2)}】' if m.group(2) else f'【第{m.group(1)}題】'
        grp.append(tag + body.split('💡')[0].strip())

    # 金句卡
    card = []
    mc = re.search(r'## 金句卡\s*\n(.*?)(?=\n## |\Z)', apc, re.S)
    if mc:
        card = [x for x in [plain(md2html(mc.group(1)))] if x]

    # ⑦ 生命應用
    p20 = part(src, '第二十部分')
    items = [plain(md2html(x)) for x in re.findall(r'^### (?:對.+?)$\n(.*?)(?=^### |\Z)', p20, re.S | re.M)]
    heads = re.findall(r'^### (對.+?)$', p20, re.M)
    prac = {'main': (items[0][:60] if items else ''),
            'items': [f'{h}：{t[:60]}' for h, t in zip(heads, items)]}

    # ⑧ 321 亮光
    p21 = part(src, '第二十一部分')
    def pick(label):
        m = re.search(rf'\*\*{label}：\*\*\s*\n((?:>.*\n?)+)', p21)
        return plain(md2html(m.group(1)))[:400] if m else ''
    t321 = {'k': pick('耶穌是我的榜樣'),
            'g': pick('讓耶穌作王') or pick('聖經是我的準則'),
            'p': pick('建立屬神的體系') or pick('聖靈是我的引導')}

    # ⑨ 講台把關
    p15 = part(src, '第十五部分')
    safe = []
    for m in re.finditer(r'^## [一二三四五六七八九十]+、(.+?)$\n(.*?)(?=^## |\Z)', p15, re.S | re.M):
        safe.append(m.group(1).strip())
        body = plain(md2html(m.group(2)))
        mm = re.search(r'經文真正意思：\s*(.+?)(?:\n\n|理由：|$)', body, re.S)
        safe.append((mm.group(1) if mm else body).strip()[:400])

    meta = dict(n=ch, t=title or f'第{ch}章', sub=subtitle, lv='A', arc='',
                q=q, truth=truth, mv=mv, card=card, sec=sec,
                serm={'pts': pts}, self='', t321=t321, grp=grp,
                prac=prac, safe=safe)
    return meta, verses, blk, {'min': minutes, 'blocks': sblocks}


def main():
    srcdir, outpath = sys.argv[1], sys.argv[2]
    CHW = {v: k for k, v in CN.items()}
    D = {'ch': [], 'txt': {}, 'blk': {}, 'serm': {},
         'issues': [], 'terrain': {'points': []}, 'tracks': []}
    for ch in range(1, 17):
        f = os.path.join(srcdir, f'馬可福音第{CHW[ch]}章_解經與講章.md')
        assert os.path.exists(f), f'找不到 {f}'
        meta, verses, blk, serm = parse_chapter(f, ch)
        D['ch'].append(meta)
        D['txt'][str(ch)] = verses
        D['blk'][str(ch)] = blk
        D['serm'][str(ch)] = serm
        empty = sum(1 for v in verses if not v)
        print(f'  第{ch:2d}章　{len(blk):2d} 段　{len(verses)} 節'
              f'（缺 {empty}）　講章 {len(serm["blocks"])} 塊　'
              f'大綱 {len(meta["serm"]["pts"])}　小組 {len(meta["grp"])}')
    json.dump(D, open(outpath, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'\n已寫入 {outpath}　{os.path.getsize(outpath)/1024/1024:.2f} MB')


if __name__ == '__main__':
    main()
