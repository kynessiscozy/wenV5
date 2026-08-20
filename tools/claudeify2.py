#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
第二轮 codemod：清理残留的“暗色底”写死颜色。

第一轮只处理白系；本轮处理任意 **低明度** 颜色（rgba/hex/hsla-with-low-L）
出现在 background / border / color 上下文中的情况，映射到语义令牌。
不动：阴影、渐变里的强调色、五行语义色、已经是 var() 的值。
"""
import re, sys, pathlib
from claudeify import prop_before, bucket

SURF = ['--c-surface-2', '--c-surface-3', '--c-surface-4', '--c-surface', '--c-bg']


def lum(r, g, b):
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255


def surf_for(alpha):
    if alpha >= .92: return '--c-surface'
    if alpha >= .5:  return '--c-surface'
    if alpha >= .18: return '--c-surface-4'
    if alpha >= .07: return '--c-surface-3'
    return '--c-surface-2'


def text_for(alpha):
    if alpha >= .86: return '--c-text'
    if alpha >= .6:  return '--c-text-2'
    if alpha >= .35: return '--c-text-3'
    return '--c-text-4'


def bord_for(alpha):
    if alpha > .2:   return '--c-border-3'
    if alpha > .085: return '--c-border-2'
    return '--c-border'


RGBA = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+)\s*)?\)')
HEX = re.compile(r'#([0-9a-fA-F]{6})\b')
# hsla(var(--accent-h), X%, L%, A) —— L 很低即“暗底”
HSLA_DARK = re.compile(r'hsla\(var\(--accent-h\)\s*,\s*(\d+)%\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)\s*\)')


def repl_factory(css):
    def run(pattern, get_rgba):
        out, last = [], 0
        for m in pattern.finditer(css):
            out.append(css[last:m.start()])
            rep = m.group(0)
            parsed = get_rgba(m)
            if parsed:
                r, g, b, a = parsed
                if lum(r, g, b) < 0.34:                     # 只处理暗色
                    kind = bucket(prop_before(css, m.start()))
                    if kind == 'surface':
                        rep = f'var({surf_for(a)})'
                    elif kind == 'text':
                        rep = f'var({text_for(a)})'
                    elif kind == 'border':
                        rep = f'var({bord_for(a)})'
            out.append(rep)
            last = m.end()
        out.append(css[last:])
        return ''.join(out)
    return run


def convert(css):
    run = repl_factory(css)
    css = run(RGBA, lambda m: (int(m.group(1)), int(m.group(2)), int(m.group(3)),
                               float(m.group(4)) if m.group(4) else 1.0))
    run = repl_factory(css)
    css = run(HEX, lambda m: (int(m.group(1)[0:2], 16), int(m.group(1)[2:4], 16),
                              int(m.group(1)[4:6], 16), 1.0))

    # hsla(var(--accent-h), s%, l%, a)：l <= 20% 视为暗底
    out, last = [], 0
    for m in HSLA_DARK.finditer(css):
        out.append(css[last:m.start()])
        rep = m.group(0)
        L, A = float(m.group(2)), float(m.group(3))
        if L <= 20:
            kind = bucket(prop_before(css, m.start()))
            if kind == 'surface':
                rep = f'var({surf_for(A)})'
            elif kind == 'text':
                rep = f'var({text_for(A)})'
            elif kind == 'border':
                rep = f'var({bord_for(A)})'
        out.append(rep)
        last = m.end()
    out.append(css[last:])
    return ''.join(out)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        f = pathlib.Path(p)
        f.write_text(convert(f.read_text(encoding='utf-8')), encoding='utf-8')
        print('pass2:', p)
