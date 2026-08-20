#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""移除遗留的「玻璃质感强度」(data-glass) 样式规则 —— Claude 扁平设计不再需要。"""
import re, sys, pathlib


def strip(css):
    out, i, removed = [], 0, 0
    n = len(css)
    while i < n:
        # 找到下一条规则的起始（上一个 } 或 文件头之后）
        brace = css.find('{', i)
        if brace == -1:
            out.append(css[i:]); break
        # 选择器 = 从 i 到 brace（去掉前面已完结的规则文本）
        seg_start = i
        sel = css[seg_start:brace]
        # 只取最后一段（分号/大括号后的部分）作为选择器
        cut = max(sel.rfind('}'), sel.rfind(';'))
        prefix, selector = sel[:cut + 1], sel[cut + 1:]
        # 匹配大括号，找到规则结尾
        depth, j = 1, brace + 1
        while j < n and depth:
            if css[j] == '{': depth += 1
            elif css[j] == '}': depth -= 1
            j += 1
        if 'data-glass' in selector:
            out.append(prefix)
            removed += 1
        else:
            out.append(css[seg_start:j])
        i = j
    return ''.join(out), removed


if __name__ == '__main__':
    for p in sys.argv[1:]:
        f = pathlib.Path(p)
        css, k = strip(f.read_text(encoding='utf-8'))
        f.write_text(css, encoding='utf-8')
        print(f'stripped {k} data-glass rules from {p}')
