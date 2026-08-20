#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
移除遗留的「暗色霓虹」阴影。

旧设计用大面积深黑投影（rgba(0,0,0,.6~.95)）营造玻璃悬浮感，
在 Claude 的浅色纸面上会变成脏灰色光晕。这里把 box-shadow 声明中
的深黑阴影替换为 none，由 claude-ui.css 统一定义克制的层级阴影。
保留 inset 高光会一并去掉（扁平设计不需要）。
"""
import re, sys, pathlib

DECL = re.compile(r'(?<![-\w])box-shadow\s*:\s*([^;}]*)', re.I)
DARK = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)')


def is_heavy(value):
    if value.strip().lower() in ('none', 'inherit', 'initial', 'unset'):
        return False
    for m in DARK.finditer(value):
        r, g, b = int(m.group(1)), int(m.group(2)), int(m.group(3))
        a = float(m.group(4)) if m.group(4) else 1.0
        if (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.3 and a >= 0.25:
            return True
    return False


def convert(css):
    out, last, n = [], 0, 0
    for m in DECL.finditer(css):
        out.append(css[last:m.start()])
        val = m.group(1)
        if is_heavy(val):
            imp = '!important' if '!important' in val else ''
            out.append('box-shadow:none' + imp)
            n += 1
        else:
            out.append(m.group(0))
        last = m.end()
    out.append(css[last:])
    return ''.join(out), n


if __name__ == '__main__':
    for p in sys.argv[1:]:
        f = pathlib.Path(p)
        css, k = convert(f.read_text(encoding='utf-8'))
        f.write_text(css, encoding='utf-8')
        print(f'neutralised {k} heavy shadows in {p}')
