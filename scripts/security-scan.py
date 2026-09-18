#!/usr/bin/env python3
"""Dependency-free security + structure scanner for the vmax-new-unlock static web app.

Scans .js / .html / .css for XSS/injection sinks, inline event handlers, inline
styles, inline scripts, external resources, a missing Content-Security-Policy and
obvious secrets. Exits 1 on any finding (blocks the commit / fails CI). No third-
party dependencies - runs on plain Python 3.

Used by the pre-commit git hook (.githooks/pre-commit) and the CI workflow
(.github/workflows/ci.yml). The shipped app stays pure vanilla JS with zero
runtime dependencies; this is a dev/CI tool only.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE_DIRS = {".git", "node_modules", "firmware", ".github", "scripts"}
CODE_EXT = {".js", ".html", ".htm", ".css"}
ALL_TEXT = CODE_EXT | {".md", ".svg", ".json", ".txt"}

# (compiled regex, message, set-of-extensions-it-applies-to)
RULES = [
    # --- JavaScript injection / DOM-XSS sinks ---
    (r"\beval\s*\(",                       "eval() - code-injection sink",                 {".js", ".html"}),
    (r"\bnew\s+Function\s*\(",             "new Function() - code-injection sink",         {".js", ".html"}),
    (r"\.innerHTML\b",                     "innerHTML - DOM-XSS sink (use textContent)",   {".js", ".html"}),
    (r"\.outerHTML\s*=",                   "outerHTML assignment - DOM-XSS sink",          {".js", ".html"}),
    (r"\binsertAdjacentHTML\s*\(",         "insertAdjacentHTML - DOM-XSS sink",            {".js", ".html"}),
    (r"document\.write(ln)?\s*\(",         "document.write - XSS sink",                    {".js", ".html"}),
    (r"\b(setTimeout|setInterval)\s*\(\s*['\"`]", "timer with a string arg - implicit eval", {".js", ".html"}),
    (r"\.setAttribute\s*\(\s*['\"]on",     "setAttribute of an on* event handler",         {".js", ".html"}),
    (r"javascript:",                       "javascript: URI",                              {".js", ".html", ".css"}),
    # --- HTML structure / security ---
    (r"[\s\"']on[a-z]+\s*=",               "inline event handler (use addEventListener)",  {".html", ".htm"}),
    (r"\sstyle\s*=",                       "inline style attribute (use styles.css)",      {".html", ".htm"}),
    (r"<script(?![^>]*\ssrc=)[^>]*>\s*\S", "inline <script> (use an external .js)",        {".html", ".htm"}),
    (r"\bsrc\s*=\s*['\"](https?:)?//",     "external resource in src= (self-host it)",     {".html", ".htm"}),
    (r"<link\b[^>]*\bhref\s*=\s*['\"](https?:)?//", "external stylesheet/link resource (self-host it)", {".html", ".htm"}),
    # --- CSS ---
    (r"expression\s*\(",                   "CSS expression() - legacy IE XSS",             {".css", ".html"}),
    (r"^\s*@import",                       "CSS @import (inline the styles)",              {".css"}),
    (r"url\(\s*['\"]?\s*(https?:|//)",     "external url() in CSS",                        {".css", ".html"}),
    # --- secrets (all text files) ---
    (r"AKIA[0-9A-Z]{16}",                  "possible AWS access key",                      ALL_TEXT),
    (r"gh[pousr]_[A-Za-z0-9]{30,}",        "possible GitHub token",                        ALL_TEXT),
    (r"-----BEGIN[ A-Z]*PRIVATE KEY-----", "private key material",                         ALL_TEXT),
    (r"eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.", "possible JWT",                       ALL_TEXT),
]
COMPILED = [(re.compile(rx, re.IGNORECASE), msg, exts) for rx, msg, exts in RULES]

# target=_blank without rel=noopener (reverse tabnabbing) - checked per-line, tag-aware.
ALLOW = re.compile(r"scan-ok:\s*\S")
BLANK = re.compile(r"target\s*=\s*['\"]_blank['\"]", re.IGNORECASE)
NOOPENER = re.compile(r"rel\s*=\s*['\"][^'\"]*noopener", re.IGNORECASE)

# --- innerHTML concatenation check ------------------------------------------
# The line-level scan-ok marker above only proves a human looked at the LINE; it
# cannot prove every piece of a "a" + b + "c" concatenation feeding innerHTML is
# actually safe, and a real bug (CodeQL js/xss-through-dom) shipped exactly that
# way on tr-fw: three escHtml() calls and one bare, unescaped variable on one
# scan-ok'd line. This second pass parses each innerHTML assignment's right-hand
# side for real and requires every '+'-joined piece to be a string literal or an
# escHtml(...) call, independent of any scan-ok comment. A single-expression
# assignment with no '+' (e.g. "x.innerHTML = trustedVar;") is intentionally left
# to the line-level scan-ok rule above, since verifying an arbitrary source
# expression is safe needs a human, not a regex; concatenation is the one shape
# where every piece can be checked mechanically.
INNERHTML_ASSIGN = re.compile(r"\.innerHTML\s*=(?!=)")
STRING_LITERAL = re.compile(r'^(["\'])(?:\\.|(?!\1).)*\1$', re.DOTALL)
ESCHTML_CALL = re.compile(r"^escHtml\s*\(")


def _find_stmt_end(text, start):
    """From start, scan for the top-level ';' that ends this statement,
    tracking string/backtick state, () [] {} nesting and // comments."""
    i, n = start, len(text)
    depth = 0
    in_str = None
    while i < n:
        c = text[i]
        if in_str:
            if c == "\\":
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "\"'`":
            in_str = c
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            nl = text.find("\n", i)
            i = n if nl == -1 else nl
            continue
        if c in "([{":
            depth += 1
        elif c in ")]}":
            depth -= 1
        elif c == ";" and depth == 0:
            return i
        i += 1
    return -1


def _strip_line_comments(text):
    """Remove // ... to end-of-line, string/backtick-aware, keep newlines."""
    out, i, n = [], 0, len(text)
    in_str = None
    while i < n:
        c = text[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(text[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "\"'`":
            in_str = c
            out.append(c)
            i += 1
            continue
        if c == "/" and i + 1 < n and text[i + 1] == "/":
            nl = text.find("\n", i)
            i = n if nl == -1 else nl
            continue
        out.append(c)
        i += 1
    return "".join(out)


def _split_top_level_plus(expr):
    """Split expr on '+' that sits outside strings/backticks and () [] {}."""
    parts, buf = [], []
    depth = 0
    in_str = None
    i, n = 0, len(expr)
    while i < n:
        c = expr[i]
        if in_str:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(expr[i + 1])
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "\"'`":
            in_str = c
            buf.append(c)
            i += 1
            continue
        if c in "([{":
            depth += 1
            buf.append(c)
        elif c in ")]}":
            depth -= 1
            buf.append(c)
        elif c == "+" and depth == 0:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(c)
        i += 1
    parts.append("".join(buf))
    return [p.strip() for p in parts]


def _is_safe_operand(op):
    if not op:
        return True
    if STRING_LITERAL.match(op):
        return True
    if ESCHTML_CALL.match(op) and op.endswith(")"):
        return True
    return False


def check_innerhtml_concat(path, text, findings):
    ext = os.path.splitext(path)[1].lower()
    if ext not in {".js", ".html", ".htm"}:
        return
    for m in INNERHTML_ASSIGN.finditer(text):
        end = _find_stmt_end(text, m.end())
        if end == -1:
            continue
        expr = _strip_line_comments(text[m.end():end])
        parts = _split_top_level_plus(expr)
        if len(parts) < 2:
            continue  # single source expression: governed by the scan-ok rule above
        line_no = text.count("\n", 0, m.start()) + 1
        for part in parts:
            if not _is_safe_operand(part):
                snippet = part if len(part) <= 60 else part[:57] + "..."
                findings.append((path, line_no,
                    "innerHTML concatenation has an operand that is neither a string "
                    "literal nor escHtml(...): `%s` (CodeQL js/xss-through-dom shape; "
                    "not silenced by scan-ok, escape it or make it a literal)" % snippet))


def scan_file(path, findings):
    ext = os.path.splitext(path)[1].lower()
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()
    except Exception as e:
        findings.append((path, 0, "could not read: %s" % e))
        return
    text = "".join(lines)

    for i, line in enumerate(lines, 1):
        # A sink that is meant to be there carries its reason on the same line as
        # "scan-ok: <why>". Without a reason the marker does not count, so the
        # exception cannot be waved through silently.
        allowed = ALLOW.search(line)
        for rx, msg, exts in COMPILED:
            if ext in exts and rx.search(line) and not allowed:
                findings.append((path, i, msg))
        if ext in {".html", ".htm"} and BLANK.search(line) and not NOOPENER.search(line):
            findings.append((path, i, "target=_blank without rel=noopener"))

    # Every HTML page must ship a Content-Security-Policy meta tag.
    if ext in {".html", ".htm"} and "content-security-policy" not in text.lower():
        findings.append((path, 0, "missing Content-Security-Policy meta tag"))

    check_innerhtml_concat(path, text, findings)


def main():
    findings = []
    scanned = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for name in filenames:
            ext = os.path.splitext(name)[1].lower()
            if ext in ALL_TEXT:
                scan_file(os.path.join(dirpath, name), findings)
                scanned += 1

    if findings:
        print("SECURITY SCAN: %d finding(s)\n" % len(findings))
        for path, line, msg in findings:
            rel = os.path.relpath(path, ROOT).replace("\\", "/")
            loc = "%s:%d" % (rel, line) if line else rel
            print("  [FAIL] %-40s %s" % (loc, msg))
        print("\nCommit blocked. Fix the findings above (or justify + adjust scripts/security-scan.py).")
        return 1

    print("SECURITY SCAN: OK - %d files, no findings." % scanned)
    return 0


if __name__ == "__main__":
    sys.exit(main())
