#!/usr/bin/env node
/*
 * Dark theme generator.
 *
 * The app uses thousands of hard-coded light colour utilities (bg-white,
 * text-slate-500, text-[#005931] ...). Instead of hand-editing every file,
 * this script scans src/, finds every colour utility that is actually used
 * (with its hover/focus/... variants) and writes a dark counterpart for each
 * one into src/styles/dark-theme.generated.css, scoped to `.dark` and to
 * screens only (printing always stays light).
 *
 * Rules (same hue, so status colours keep their meaning):
 *  - light backgrounds  -> dark surfaces tinted with the same hue
 *  - dark text          -> light text with the same hue
 *  - light borders      -> dark borders; very dark borders -> lighter
 *  - saturated / dark backgrounds (brand green buttons, yellow buttons) stay;
 *    dark text that sits on a bright kept background (yellow buttons) keeps
 *    its original colour.
 *
 * Run after adding new colours:   node scripts/build-dark-theme.mjs
 * CI / tests check it is current: node scripts/build-dark-theme.mjs --check
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import postcss from "postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "src/styles/dark-theme.generated.css");
const require = createRequire(import.meta.url);
const palette = require("tailwindcss/colors");

// ---------- colour maths ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb([h, s, l]) {
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map(v => Math.round(v * 255));
}
const luminance = rgb => {
  const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const css = (rgb, alpha) => alpha == null || alpha >= 1 ? `rgb(${rgb.join(" ")})` : `rgb(${rgb.join(" ")} / ${+alpha.toFixed(3)})`;

const NEUTRAL_HUE = 150; // brand-tinted neutral surfaces
const NEUTRALS = new Set(["white", "black", "slate", "gray", "zinc", "neutral", "stone"]);
const SURFACE = hslToRgb([NEUTRAL_HUE, 0.1, 0.1]); // == --card in .dark

/** Returns { mode: "map" | "keep", rgb } for a colour used as `role`. */
function darkFor(role, rgb, neutral, alpha) {
  const [h, s, l] = rgbToHsl(rgb);
  // Translucent white/black overlays sit on coloured or dark surfaces already (headers, chips): keep.
  if (alpha != null && alpha < 0.6 && (rgb.every(v => v === 255) || rgb.every(v => v === 0)) && role !== "text") return { mode: "keep", rgb };
  const gray = neutral || s < 0.15;
  if (role === "bg") {
    if (rgb.every(v => v === 255)) return { mode: "map", rgb: SURFACE };
    if (l >= 0.7) {
      const nl = gray ? 0.1 + (1 - l) * 0.45 : 0.13 + (1 - l) * 0.4;
      return { mode: "map", rgb: hslToRgb(gray ? [NEUTRAL_HUE, 0.08, nl] : [h, Math.min(s, 0.45) * 0.75, nl]) };
    }
    return { mode: "keep", rgb };
  }
  if (role === "text") {
    if (l <= 0.6) {
      // greys become near-white text; colours become their light "300" shade (still clearly that hue)
      return { mode: "map", rgb: gray ? hslToRgb([h, Math.min(s, 0.15), clamp(1.0 - l * 0.6, 0.66, 0.9)]) : hslToRgb([h, Math.min(s, 0.8), clamp(0.85 - l * 0.5, 0.64, 0.72)]) };
    }
    return { mode: "keep", rgb };
  }
  // border / ring / divide / outline
  if (rgb.every(v => v === 255)) return { mode: "map", rgb: hslToRgb([NEUTRAL_HUE, 0.08, 0.22]) };
  if (rgb.every(v => v === 0)) return { mode: "map", rgb: [255, 255, 255] };
  if (l >= 0.7) return { mode: "map", rgb: hslToRgb(gray ? [NEUTRAL_HUE, 0.08, 0.18 + (1 - l) * 0.4] : [h, Math.min(s, 0.45), 0.2 + (1 - l) * 0.4]) };
  if (l < 0.35) return { mode: "map", rgb: hslToRgb([h, gray ? Math.min(s, 0.15) : Math.min(s, 0.7), 0.45]) };
  return { mode: "keep", rgb };
}

// ---------- parsing ----------
const KNOWN_VARS = { "--brand-green": "hsl(153 100% 17.5%)", "--brand-yellow": "hsl(45 100% 56.3%)", "--primary": "hsl(159 98% 18%)" };
function parseColorValue(raw) {
  // palette e.g. "slate-500", "white"
  const m = raw.match(/^([a-z]+)(?:-(\d{2,3}))?$/);
  if (m && palette[m[1]] !== undefined) {
    const v = m[2] ? palette[m[1]]?.[m[2]] : palette[m[1]];
    if (typeof v !== "string" || !v.startsWith("#")) return null;
    return { rgb: hexToRgb(v), neutral: NEUTRALS.has(m[1]) };
  }
  const a = raw.match(/^\[(.+)\]$/);
  if (!a) return null;
  let v = a[1].replace(/_/g, " ");
  v = v.replace(/hsl\(var\((--[\w-]+)\)\)/, (s, name) => KNOWN_VARS[name] || s);
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return { rgb: hexToRgb(v), neutral: false };
  const hsl = v.match(/^hsla?\(\s*([\d.]+)[ ,]+([\d.]+)%[ ,]+([\d.]+)%/);
  if (hsl) return { rgb: hslToRgb([+hsl[1], +hsl[2] / 100, +hsl[3] / 100]), neutral: false };
  const rgb = v.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  if (rgb) return { rgb: [+rgb[1], +rgb[2], +rgb[3]], neutral: false };
  return null;
}

const UTIL = {
  bg: { role: "bg", decl: c => `background-color:${c}` },
  text: { role: "text", decl: c => `color:${c}` },
  placeholder: { role: "text", decl: c => `color:${c}`, pseudo: "::placeholder" },
  decoration: { role: "text", decl: c => `text-decoration-color:${c}` },
  caret: { role: "text", decl: c => `caret-color:${c}` },
  fill: { role: "text", decl: c => `fill:${c}` },
  stroke: { role: "text", decl: c => `stroke:${c}` },
  border: { role: "border", decl: c => `border-color:${c}` },
  "border-t": { role: "border", decl: c => `border-top-color:${c}` },
  "border-b": { role: "border", decl: c => `border-bottom-color:${c}` },
  "border-l": { role: "border", decl: c => `border-left-color:${c}` },
  "border-r": { role: "border", decl: c => `border-right-color:${c}` },
  "border-s": { role: "border", decl: c => `border-inline-start-color:${c}` },
  "border-e": { role: "border", decl: c => `border-inline-end-color:${c}` },
  "border-x": { role: "border", decl: c => `border-left-color:${c};border-right-color:${c}` },
  "border-y": { role: "border", decl: c => `border-top-color:${c};border-bottom-color:${c}` },
  divide: { role: "border", decl: c => `border-color:${c}`, child: " > :not([hidden]) ~ :not([hidden])" },
  ring: { role: "border", decl: c => `--tw-ring-color:${c}` },
  "ring-offset": { role: "border", decl: c => `--tw-ring-offset-color:${c}` },
  outline: { role: "border", decl: c => `outline-color:${c}` },
  from: { role: "bg", decl: c => `--tw-gradient-from:${c} var(--tw-gradient-from-position);--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from), var(--tw-gradient-to)` },
  via: { role: "bg", decl: c => `--tw-gradient-to:transparent var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from), ${c} var(--tw-gradient-via-position), var(--tw-gradient-to)` },
  to: { role: "bg", decl: c => `--tw-gradient-to:${c} var(--tw-gradient-to-position)` },
};
const UTIL_ORDER = Object.keys(UTIL);

const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const PSEUDO = {
  hover: ":hover", focus: ":focus", "focus-visible": ":focus-visible", "focus-within": ":focus-within",
  active: ":active", disabled: ":disabled", first: ":first-child", last: ":last-child", odd: ":nth-child(odd)",
  even: ":nth-child(even)", checked: ":checked", visited: ":visited",
};

const esc = s => s.replace(/[^a-zA-Z0-9_-]/g, ch => "\\" + ch);

/** -> { selector, media } or null when the variant chain is unsupported / intentional. */
function variantSelector(cls, variants, pseudoEl = "", child = "") {
  let pre = "", post = "", media = null;
  for (const v of variants) {
    if (v === "dark" || v === "print") return null;           // already intentional
    if (BREAKPOINTS[v]) { media = BREAKPOINTS[v]; continue; }
    if (PSEUDO[v]) { post += PSEUDO[v]; continue; }
    if (v === "placeholder") { pseudoEl = "::placeholder"; continue; }
    if (v === "before" || v === "after") { pseudoEl = "::" + v; continue; }
    let m = v.match(/^group-(hover|focus|focus-visible|focus-within|active)$/);
    if (m) { pre += `.group${PSEUDO[m[1]]} `; continue; }
    m = v.match(/^data-\[([\w-]+)=([\w-]+)\]$/);
    if (m) { post += `[data-${m[1]}="${m[2]}"]`; continue; }
    m = v.match(/^aria-(selected|checked|expanded|pressed|disabled)$/);
    if (m) { post += `[aria-${m[1]}="true"]`; continue; }
    return null;
  }
  return { selector: `.dark ${pre}.${esc(cls)}${post}${child}${pseudoEl}`, media };
}

// ---------- scan ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}
const COLOR_NAMES = "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const TOKEN = new RegExp(
  String.raw`(?<![\w\-\[:/.])((?:[a-z0-9\-]+(?:-\[[^\]\s]+\])?:)*)(` + UTIL_ORDER.slice().sort((a, b) => b.length - a.length).join("|") +
  String.raw`)-((?:` + COLOR_NAMES + String.raw`)(?:-\d{2,3})?|\[[^\]\s]+\])(?:\/(\d{1,3}|\[[\d.]+\]))?(?![\w\-\[])`, "g");

export function buildDarkCss() {
  const files = walk(join(root, "src"));
  const classes = new Map(); // className -> parsed
  const gradientClasses = new Map(); // bg-[linear-gradient(...)] -> gradient
  const brightBgLines = [];  // lines containing a kept, bright background
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      TOKEN.lastIndex = 0;
      let m;
      while ((m = TOKEN.exec(line))) {
        const [full, variantStr, util, value, alphaRaw] = m;
        if (classes.has(full)) continue;
        const color = parseColorValue(value);
        if (!color) {
          // Arbitrary gradient backgrounds: bg-[linear-gradient(180deg,#f1faf4_0px,#ffffff_96px)]
          if (util === "bg" && /^\[(?:linear|radial|conic)-gradient\(/.test(value) && !variantStr) gradientClasses.set(full, value.slice(1, -1).replace(/_/g, " "));
          continue;
        }
        const variants = variantStr ? variantStr.slice(0, -1).split(/:(?![^\[]*\])/) : [];
        const alpha = alphaRaw == null ? null : alphaRaw.startsWith("[") ? +alphaRaw.slice(1, -1) : +alphaRaw / 100;
        classes.set(full, { cls: full, variants, util, value, alpha, color });
      }
      if (/\bbg-(?:\[[^\]\s]+\]|[a-z]+-\d{2,3})/.test(line)) brightBgLines.push({ file, i, lines });
    });
  }

  const rules = { base: [], media: new Map() };
  const skipped = [];
  const mappedText = new Map();  // text class (no variants) -> original rgb
  const brightKept = new Set();  // bg class (no variants) that stays bright
  const push = (sel, decl) => {
    const target = sel.media ? (rules.media.get(sel.media) || rules.media.set(sel.media, []).get(sel.media)) : rules.base;
    target.push(`${sel.selector}{${decl}}`);
  };

  const sorted = [...classes.values()].sort((a, b) =>
    a.variants.length - b.variants.length || UTIL_ORDER.indexOf(a.util) - UTIL_ORDER.indexOf(b.util) || a.cls.localeCompare(b.cls));
  for (const [cls, gradient] of [...gradientClasses].sort()) {
    let changed = false;
    const value = gradient.replace(CSS_COLOR, token => {
      const c = parseCssColor(token);
      if (!c) return token;
      const [, sat] = rgbToHsl(c.rgb);
      const dark = darkFor("bg", c.rgb, sat < 0.12, c.alpha);
      if (dark.mode === "keep") return token;
      changed = true;
      return css(dark.rgb, c.alpha);
    });
    if (changed) rules.base.push(`.dark .${esc(cls)}{background-image:${value}}`);
  }
  for (const c of sorted) {
    const u = UTIL[c.util];
    const dark = darkFor(u.role, c.color.rgb, c.color.neutral, c.alpha);
    if (u.role === "bg" && c.util === "bg" && dark.mode === "keep" && luminance(c.color.rgb) > 0.35 && !c.variants.length) brightKept.add(c.cls);
    if (dark.mode === "keep") continue;
    if (u.role === "text" && c.util === "text" && !c.variants.length) mappedText.set(c.cls, c);
    const sel = variantSelector(c.cls, c.variants, u.pseudo || "", u.child || "");
    if (!sel) { skipped.push(c.cls); continue; }
    push(sel, u.decl(css(dark.rgb, c.alpha)));
  }

  // Dark text on bright kept backgrounds (yellow buttons...) keeps its colour.
  const protect = new Set();
  for (const { lines, i } of brightBgLines) {
    const here = lines[i];
    const bgs = [...brightKept].filter(b => new RegExp(`(?<![\\w\\-\\[:/])${b.replace(/[[\]#()./]/g, "\\$&")}(?![\\w\\-\\[])`).test(here));
    if (!bgs.length) continue;
    const window = lines.slice(i, i + 4).join(" ");
    for (const t of mappedText.keys()) {
      if (!new RegExp(`(?<![\\w\\-\\[:/])${t.replace(/[[\]#()./]/g, "\\$&")}(?![\\w\\-\\[])`).test(window)) continue;
      for (const b of bgs) protect.add(`${b}|${t}`);
    }
  }
  for (const pair of [...protect].sort()) {
    const [b, t] = pair.split("|");
    const c = mappedText.get(t);
    rules.base.push(`.dark .${esc(b)}.${esc(t)},.dark .${esc(b)} .${esc(t)}{color:${css(c.color.rgb, c.alpha)}}`);
  }

  let out = `/* GENERATED by scripts/build-dark-theme.mjs. Do not edit by hand; re-run the script. */\n`;
  out += `/* ${classes.size} colour utilities scanned, ${skipped.length} variants left as-is: ${skipped.slice(0, 40).join(" ")} */\n`;
  out += `@media screen {\n${rules.base.join("\n")}\n}\n`;
  for (const bp of [...rules.media.keys()].sort((a, b) => a - b)) out += `@media screen and (min-width:${bp}px) {\n${rules.media.get(bp).join("\n")}\n}\n`;
  const cssBlocks = buildCssFileOverrides(join(root, "src"));
  out += `/* ---- component CSS files: ${cssBlocks.count} declarations ---- */\n${cssBlocks.text}`;
  return { css: out, count: classes.size, skipped, cssDecls: cssBlocks.count };
}

// ---------- component CSS files (hard-coded colours outside Tailwind) ----------
const CSS_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(?:white|black)\b/g;
function parseCssColor(token) {
  if (token === "white") return { rgb: [255, 255, 255], alpha: null };
  if (token === "black") return { rgb: [0, 0, 0], alpha: null };
  if (token.startsWith("#")) {
    let h = token.slice(1);
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return null;
    const rgb = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : null;
    return { rgb, alpha };
  }
  const nums = token.match(/[\d.]+%?/g);
  if (!nums || nums.length < 3) return null;
  const rgb = nums.slice(0, 3).map(n => n.endsWith("%") ? Math.round(parseFloat(n) * 2.55) : Math.round(parseFloat(n)));
  const a = nums[3] != null ? (nums[3].endsWith("%") ? parseFloat(nums[3]) / 100 : parseFloat(nums[3])) : null;
  return { rgb, alpha: a };
}
function cssRole(prop) {
  if (/^(background|background-color|background-image|fill)$/.test(prop)) return "bg";
  if (/^(color|caret-color|-webkit-text-fill-color|text-decoration-color)$/.test(prop)) return "text";
  if (/^(border(-(top|right|bottom|left|inline-start|inline-end|block-start|block-end))?(-color)?|outline(-color)?|stroke)$/.test(prop)) return "border";
  return null;
}
function darkSelector(selector) {
  const sel = selector.trim();
  if (/^html\b/.test(sel)) return sel.replace(/^html/, "html.dark");
  if (/^:root\b/.test(sel)) return sel.replace(/^:root/, ":root.dark");
  return `.dark ${sel}`;
}
/** Dark counterparts for colour declarations in src/**\/*.css (same rules as the utilities above). */
function buildCssFileOverrides(srcDir) {
  const cssFiles = [];
  (function walkCss(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walkCss(p);
      else if (name.endsWith(".css") && !name.startsWith("dark-theme.") && name !== "fonts.css") cssFiles.push(p);
    }
  })(srcDir);
  cssFiles.sort();
  let text = "";
  let count = 0;
  for (const file of cssFiles) {
    let ast;
    try { ast = postcss.parse(readFileSync(file, "utf8")); } catch { continue; }
    const blocks = [];
    ast.walkRules(rule => {
      let media = null;
      for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
        if (parent.type === "atrule") {
          if (/keyframes$/.test(parent.name)) return;
          if (parent.name === "media") { if (/\bprint\b/.test(parent.params)) return; media = parent.params; }
          else if (parent.name !== "layer" && parent.name !== "supports") return;
        }
      }
      const decls = [];
      rule.each(node => {
        if (node.type !== "decl" || node.prop.startsWith("--")) return;
        const role = cssRole(node.prop);
        if (!role) return;
        let changed = false;
        const value = node.value.replace(CSS_COLOR, token => {
          const c = parseCssColor(token);
          if (!c) return token;
          const [, sat] = rgbToHsl(c.rgb);
          const dark = darkFor(role, c.rgb, sat < 0.12, c.alpha);
          if (dark.mode === "keep") return token;
          changed = true;
          return css(dark.rgb, c.alpha);
        });
        if (changed) decls.push(`${node.prop}:${value}${node.important ? " !important" : ""}`);
      });
      if (!decls.length) return;
      count += decls.length;
      blocks.push({ media, css: `${rule.selectors.map(darkSelector).join(",")}{${decls.join(";")}}` });
    });
    if (!blocks.length) continue;
    text += `/* ${file.slice(srcDir.length + 1).replace(/\\/g, "/")} */\n`;
    for (const block of blocks) {
      const media = block.media ? (block.media.trim().startsWith("(") ? block.media.trim() : `(${block.media.trim()})`) : null;
      text += media ? `@media screen and ${media} {\n${block.css}\n}\n` : `@media screen {\n${block.css}\n}\n`;
    }
  }
  return { text, count };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { css: out, count, skipped } = buildDarkCss();
  if (process.argv.includes("--check")) {
    const current = existsSync(OUT) ? readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== out) { console.error("dark-theme.generated.css is stale: run node scripts/build-dark-theme.mjs"); process.exit(1); }
    console.log("dark theme CSS is current");
  } else {
    writeFileSync(OUT, out);
    console.log(`wrote ${OUT} (${count} colour utilities, ${skipped.length} skipped, ${(out.length / 1024).toFixed(1)} KB)`);
  }
}
