# Browser verification

Verified 2026-10-16 against the local Vite server using the Expect MCP server (isolated stdio client; no global MCP configuration changes).

- Chromium: selected expression and carousel shape, preset and custom color, Unicode/script-like pet name, refresh persistence, randomize, reset, keyboard End, mouse wheel, all nine animated states, pause/resume, and reduced-motion behavior.
- Responsive checks: 375×812, 768×1024, 1280×800, 1440×900, with no horizontal overflow. Mobile arrow hit targets measured 26.32 px after scaling.
- WebKit: selected shape, expression, and color; changed animation; downloaded the real PNG through the export button. No browser console errors.
- PNG verification: all 14 shapes produced 1536×1872 atlases with 57 populated cells, 15 fully transparent unused cells, no alpha touching any cell boundary, and each file below 255 KB. Actual UI downloads were independently checked using Pillow in both browsers.
- Chromium performance: FCP/LCP 120 ms, CLS 0.001, TTFB 3 ms. WebKit: FCP/LCP 88 ms, CLS 0, TTFB 3 ms. These are local development measurements, not production benchmarks.

The Expect accessibility audit reported no axe violations. Its IBM engine retained manual-review items (visible icon-button labels, focus styling, color cues, and gradient contrast), hidden custom-color label checks, and findings in Expect's own overlay. Its raw output is not zero: the final WebKit audit lists 78 entries. Confirmed text contrast, accessible names, and mobile target-size failures were fixed and checked again. Radio checked state, labels, keyboard navigation and focus styles were inspected; color is accompanied by selection state, shape and expression labels.

Screenshots and raw audit/performance evidence are in `tests/evidence`. Screenshot capture hid only the Expect tool overlay outside the application root.

Actual import into a signed-in ChatGPT account was not tested. Export validation establishes the PNG format and animation atlas, not account availability or server acceptance.

To inspect another downloaded sprite sheet (requires Python Pillow):

```sh
python3 tests/inspect-pet-png.py /absolute/path/to/download.png
```
