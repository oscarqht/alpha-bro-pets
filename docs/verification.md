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

## Smooth preview verification

Measured fresh canvas image changes through `requestAnimationFrame` on 2026-10-16. Before the fix, idle produced 157 browser samples over 1303.7 ms but only 6 visible canvas changes (about 4.6 per second). After interpolation, Chromium idle produced 104.4 visible changes per second; all nine states measured 80.6–119.6 changes per second in 650 ms windows. The test machine supplied about 120 browser samples per second, so these measurements describe this display/browser cadence rather than a guaranteed frame rate on every device. WebKit supplied about 60 samples per second and idle produced 58 changes over 1114 ms (52.1 per second).

Pause froze the exact canvas image, play resumed changes, and changing the reduced-motion preference dynamically froze it again. Switching state and shape remained functional. Both browser export buttons downloaded valid PNGs, independently checked for exact dimensions, populated/empty cells and padding; mobile had no horizontal overflow. All 14 shape exports from the current renderer were byte-for-byte identical to exports made by the pre-change Git HEAD renderer using the same icon inputs in WebKit.

Chromium measured FCP/LCP 132 ms, CLS 0.001, INP 32 ms, and worst long-animation-frame blocking duration 0 ms. WebKit measured FCP/LCP 110 ms, CLS 0. Browser consoles were clear. The Chromium accessibility audit retained the previously documented 78 IBM manual/hidden/tool findings; the final WebKit audit returned no violations. Both Expect sessions were closed. Evidence files use the `fps-` prefix in `tests/evidence`.
