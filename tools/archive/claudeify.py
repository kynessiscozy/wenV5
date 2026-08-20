#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Claude 化 codemod：把写死的“深色玻璃”配色替换成 theme-claude.css 的语义令牌。

规则依据 CSS 属性上下文：
  color / fill / stroke(文字)   -> --c-text* 阶梯
  background / background-color -> --c-surface* 阶梯
  border / outline              -> --c-border* 阶梯
只处理白系（255,255,255 / 255,245,220）与 #fff，阴影内的白色保持不动。
"""
import re, sys, pathlib

TEXT = ['--c-text-4', '--c-text-3', '--c-text-2', '--c-text', '--c-text-hi']
SURF = ['--c-surface-2', '--c-surface-3', '--c-surface-4', '--c-surface']
BORD = ['--c-border', '--c-border-2', '--c-border-3']


def text_token(a):
    if a >= .86: return TEXT[4]
    if a >= .62: return TEXT[3]
    if a >= .44: return TEXT[2]
    if a >= .27: return TEXT[1]
    return TEXT[0]


def surf_token(a):
    if a >= .5:  return SURF[3]
    if a >= .12: return SURF[2]
    if a >= .05: return SURF[1]
    return SURF[0]


def bord_token(a):
    if a > .2:   return BORD[2]
    if a > .085: return BORD[1]
    return BORD[0]


WHITE_RE = re.compile(r'rgba\(\s*255\s*,\s*(?:255|245)\s*,\s*(?:255|220)\s*,\s*([0-9.]+)\s*\)')
HEXWHITE_RE = re.compile(r'#(?:fff|ffffff|FFF|FFFFFF|f5f4ee)\b')
PROP_RE = re.compile(r'([-a-zA-Z]+)\s*:\s*$')


def prop_before(text, idx):
    """回溯找到当前声明的属性名。"""
    seg = text[max(0, idx - 400):idx]
    # 截断到最近的分隔符之后，允许中间夹着 gradient(...) 等值片段
    cut = max(seg.rfind(';'), seg.rfind('{'), seg.rfind('}'), seg.rfind('\n'))
    decl = seg[cut + 1:]
    m = re.match(r'\s*([-a-zA-Z]+)\s*:', decl)
    return m.group(1).lower() if m else ''


def bucket(prop):
    if prop.startswith('border') or prop in ('outline', 'outline-color', 'caret-color'):
        return 'border'
    if prop.startswith('background') or prop == 'mask' or prop.startswith('-webkit-mask'):
        return 'surface'
    if prop in ('color', 'fill', 'stroke', 'text-decoration-color', 'accent-color', '-webkit-text-fill-color'):
        return 'text'
    if 'shadow' in prop or prop == 'filter':
        return 'skip'
    return 'skip'


def convert(css):
    out, last = [], 0
    for m in WHITE_RE.finditer(css):
        out.append(css[last:m.start()])
        alpha = float(m.group(1))
        b = bucket(prop_before(css, m.start()))
        if b == 'text':
            rep = f'var({text_token(alpha)})'
        elif b == 'surface':
            rep = f'var({surf_token(alpha)})'
        elif b == 'border':
            rep = f'var({bord_token(alpha)})'
        else:
            rep = m.group(0)
        out.append(rep)
        last = m.end()
    out.append(css[last:])
    css = ''.join(out)

    out, last = [], 0
    for m in HEXWHITE_RE.finditer(css):
        out.append(css[last:m.start()])
        b = bucket(prop_before(css, m.start()))
        if b == 'text':
            rep = 'var(--c-text-hi)'
        elif b == 'surface':
            rep = 'var(--c-surface)'
        elif b == 'border':
            rep = 'var(--c-border-3)'
        else:
            rep = m.group(0)
        out.append(rep)
        last = m.end()
    out.append(css[last:])
    return ''.join(out)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        f = pathlib.Path(p)
        src = f.read_text(encoding='utf-8')
        f.write_text(convert(src), encoding='utf-8')
        print('claudeified:', p)
