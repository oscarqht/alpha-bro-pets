import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  LoaderCircle,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Share2,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { ProjectIconPicker } from "./components/ProjectIconPicker";
import { ProjectIcon } from "./components/ProjectIcon";
import {
  formatProjectIconId,
  getProjectIcon,
  isValidProjectIcon,
  PROJECT_AVATAR_SHAPES,
  PROJECT_ICON_EXPRESSIONS,
  PROJECT_ICON_PALETTE,
} from "./utils/projectIcons";
import {
  buildPetHash,
  getPetIconFromHash,
} from "./utils/petHash";
import {
  createPetSheet,
  createPetGif,
  createPetSheet3D,
  createPetGif3D,
  DEFAULT_POV,
  PetPreview,
  PetCanvas3D,
  PET_STATES,
  type PetState,
  type CameraPOV,
  type PetCanvas3DHandle,
} from "./pet";
import { useRef } from "react";

const INITIAL = formatProjectIconId({
  shapeId: "cloud",
  expressionId: "toon-flat",
  color: "#FFC20E",
});
const STORAGE_KEY = "raft-pet-studio:v1";

function loadSaved(): { icon: string; name: string } {
  // Check URL hash first (allows sharing URLs like #shape=triangle&eyes=toon&color=FFC20E)
  if (typeof window !== "undefined" && window.location.hash) {
    const fromHash = getPetIconFromHash(window.location.hash, INITIAL);
    if (fromHash) {
      let petName = fromHash.name;
      if (!petName) {
        try {
          const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
          if (saved && typeof saved.name === "string") {
            petName = saved.name.slice(0, 40);
          }
        } catch {
          /* Storage blocked */
        }
      }
      return { icon: fromHash.icon, name: petName || "Sunny" };
    }
  }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (
      saved &&
      isValidProjectIcon(saved.icon) &&
      typeof saved.name === "string"
    ) {
      return { icon: saved.icon, name: saved.name.slice(0, 40) };
    }
  } catch {
    /* A blocked storage API must not prevent creating a pet. */
  }
  return { icon: INITIAL, name: "Sunny" };
}
function getStateDuration(stateId: PetState): number {
  const def = PET_STATES.find((s) => s.id === stateId);
  return def ? def.durations.reduce((sum, d) => sum + d, 0) : 1000;
}

const keepOpen = () => {};

export default function App() {
  const [saved] = useState(loadSaved);
  const [icon, setIcon] = useState(saved.icon);
  const [name, setName] = useState(saved.name);
  const [state, setState] = useState<PetState>("idle");
  const [autoLoop, setAutoLoop] = useState(false);
  const [viewMode, setViewMode] = useState<"2d" | "3d" | "furry">("3d");
  const [paused, setPaused] = useState(false);
  const [exporting, setExporting] = useState<"png" | "gif" | null>(null);
  const [gifProgress, setGifProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const canvas3DRef = useRef<PetCanvas3DHandle>(null);
  const currentPovRef = useRef<CameraPOV>(DEFAULT_POV);
  const avatar = getProjectIcon(icon);

  // Auto loop through all animations infinitely when enabled
  useEffect(() => {
    if (!autoLoop || paused) return;

    const duration = getStateDuration(state);
    const timer = setTimeout(() => {
      setState((prevState) => {
        const currentIndex = PET_STATES.findIndex((s) => s.id === prevState);
        const nextIndex = (currentIndex + 1) % PET_STATES.length;
        return PET_STATES[nextIndex].id;
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [autoLoop, paused, state]);

  // Sync current avatar shape, eyes, and color to the URL hash and localStorage
  useEffect(() => {
    const currentAvatar = getProjectIcon(icon);
    const hash = buildPetHash(currentAvatar);
    if (typeof window !== "undefined" && window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ icon, name }));
    } catch {
      /* Private browsing can disable storage. */
    }
  }, [icon, name]);

  // Listen for browser navigation or manual address bar hash changes
  useEffect(() => {
    function handleHashChange() {
      const fromHash = getPetIconFromHash(window.location.hash, icon);
      if (fromHash && fromHash.icon !== icon) {
        setIcon(fromHash.icon);
        if (fromHash.name) setName(fromHash.name);
      }
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [icon]);

  function randomize() {
    const pick = <T,>(items: readonly T[]) =>
      items[Math.floor(Math.random() * items.length)];
    setIcon(
      formatProjectIconId({
        shapeId: pick(PROJECT_AVATAR_SHAPES).id,
        expressionId: pick(PROJECT_ICON_EXPRESSIONS).id,
        color: pick(PROJECT_ICON_PALETTE).hex,
      }),
    );
    setNotice("A new little personality.");
  }

  async function exportPet(format: "png" | "gif" = "png") {
    if (exporting) return;
    setExporting(format);
    setGifProgress(0);
    setError("");
    setNotice("");
    try {
      const is3D = viewMode === "3d" || viewMode === "furry";
      const isFurry = viewMode === "furry";
      const pov = canvas3DRef.current?.getPOV() ?? currentPovRef.current;
      const furSettings = canvas3DRef.current?.getFurSettings();
      const blob = format === "gif"
        ? (is3D
            ? await createPetGif3D(icon, state, pov, setGifProgress, isFurry, furSettings)
            : await createPetGif(icon, state, setGifProgress))
        : (is3D
            ? await createPetSheet3D(icon, pov, "v1", setGifProgress, isFurry, furSettings)
            : await createPetSheet(icon));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const baseName =
        name && name.trim().toLowerCase() !== "sunny" && name.trim()
          ? name.trim()
          : (avatar.shapeLabel ? `${avatar.shapeLabel.toLowerCase()}-pet` : "sunny");
      const filename =
        baseName
          .replace(/[^a-z0-9_-]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50) || "my-pet";
      const suffix = isFurry ? "-furry" : is3D ? "-3d" : "";
      link.download = format === "gif"
        ? `${filename.toLowerCase()}-${state}${suffix}.gif`
        : `${filename.toLowerCase()}-chatgpt-pet${suffix}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice(
        format === "gif"
          ? (isFurry
              ? "Furry GIF exported! A soft, fluffy loop captured from your current angle."
              : is3D
              ? "3D GIF exported! A smooth, transparent loop captured from your current angle."
              : "GIF exported! A smooth, transparent loop of your selected move.")
          : (isFurry
              ? "Furry Pet exported! All 9 animations covered in thick soft fur from your current angle. Ready for ChatGPT."
              : is3D
              ? "3D Pet exported! All 9 animations captured from your current angle. Ready for ChatGPT."
              : "Pet exported! Your PNG is ready to upload to ChatGPT.")
      );
      if (format === "png") setShowHelp(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not export your pet. Please try again.",
      );
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="Alpha Bro Pets / from Raft home">
          <span className="brand-icon">
            <ProjectIcon icon={INITIAL} className="w-8 h-8" />
          </span>
          Alpha Bro Pets<span className="byline">/ from Raft</span>
        </a>
        <a
          className="quiet-link"
          href="https://learn.chatgpt.com/docs/pets"
          target="_blank"
          rel="noreferrer"
        >
          <CircleHelp aria-hidden="true" size={16} />
          About ChatGPT pets
          <ArrowRight aria-hidden="true" size={14} />
        </a>
      </header>
      <main>
        <section className="intro">
          <div className="eyebrow">
            <span /> SMALL FRIEND. BIG PERSONALITY.
          </div>
          <h1>
            A little more <span>you.</span>
          </h1>
          <p>Pick a shape. Find a face. Meet your new ChatGPT companion.</p>
        </section>
        <div className="studio-layout">
          <section className="builder-panel" aria-labelledby="builder-title">
            <div className="panel-heading">
              <div>
                <span className="step-number">01</span>
                <h2 id="builder-title">Make it yours</h2>
              </div>
              <button className="text-button" onClick={randomize}>
                <Shuffle aria-hidden="true" size={15} />
                Surprise me
              </button>
            </div>
            <div className="selector-space">
              <ProjectIconPicker
                selectedIcon={icon}
                onSelectIcon={(next) => {
                  setIcon(next);
                  setNotice("");
                }}
                onClose={keepOpen}
                className="studio-picker"
              />
            </div>
            <div className="selection-summary">
              <span
                className="color-dot"
                style={{ background: avatar.color }}
              />
              <span>{avatar.shapeLabel}</span>
              <span className="summary-divider">/</span>
              <span>
                {
                  PROJECT_ICON_EXPRESSIONS.find(
                    (e) => e.id === avatar.expressionId,
                  )?.label
                }
              </span>
              <button
                className="icon-button"
                aria-label="Copy share link"
                title="Copy link with selected shape, eyes, and color"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    setNotice("Share link copied! Anyone opening this URL gets this exact pet.");
                  } catch {
                    setNotice("URL ready to copy from your browser address bar.");
                  }
                }}
              >
                <Share2 aria-hidden="true" size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Reset avatar"
                title="Reset avatar"
                onClick={() => {
                  setIcon(INITIAL);
                  setNotice("Avatar reset to Sunny’s original look.");
                }}
              >
                <RotateCcw aria-hidden="true" size={15} />
              </button>
            </div>
            <div className="builder-hint">
              Explore the faces above. Use the arrows to find your shape.
            </div>
          </section>
          <section className="preview-panel" aria-labelledby="preview-title">
            <div className="panel-heading">
              <div>
                <span className="step-number">02</span>
                <h2 id="preview-title">Bring it to life</h2>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div className="mode-toggle" role="group" aria-label="Preview dimension mode">
                  <button
                    type="button"
                    className={`mode-toggle-btn ${viewMode === "2d" ? "active" : ""}`}
                    onClick={() => setViewMode("2d")}
                    aria-pressed={viewMode === "2d"}
                  >
                    2D
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${viewMode === "3d" ? "active" : ""}`}
                    onClick={() => setViewMode("3d")}
                    aria-pressed={viewMode === "3d"}
                  >
                    3D
                  </button>
                  <button
                    type="button"
                    className={`mode-toggle-btn ${viewMode === "furry" ? "active" : ""}`}
                    onClick={() => setViewMode("furry")}
                    aria-pressed={viewMode === "furry"}
                  >
                    <Sparkles size={11} className={viewMode === "furry" ? "text-amber-500" : ""} />
                    Furry
                  </button>
                </div>
                <span className="live-label">
                  <span />
                  LIVE PREVIEW
                </span>
              </div>
            </div>
            <div className="pet-stage">
              {viewMode === "2d" ? (
                <>
                  <div className="stage-orbit orbit-one" />
                  <div className="stage-orbit orbit-two" />
                  <span className="stage-spark spark-one">✳</span>
                  <span className="stage-spark spark-two">+</span>
                  <PetPreview
                    icon={icon}
                    state={state}
                    paused={paused}
                    className="pet-canvas"
                  />
                </>
              ) : (
                <div className="pet-canvas-3d-wrapper">
                  <PetCanvas3D
                    ref={canvas3DRef}
                    icon={icon}
                    state={state}
                    paused={paused}
                    furry={viewMode === "furry"}
                    onPovChange={(pov) => {
                      currentPovRef.current = pov;
                    }}
                  />
                </div>
              )}
              <button
                className="playback-button"
                onClick={() => setPaused(!paused)}
                aria-label={paused ? "Play animation" : "Pause animation"}
              >
                {paused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
              </button>
            </div>
            <div className="motion-picker">
              <label htmlFor="pet-motion">Try a little move</label>
              <div className="motion-actions">
                <button
                  type="button"
                  className={`auto-loop-toggle ${autoLoop ? "active" : ""}`}
                  onClick={() => setAutoLoop(!autoLoop)}
                  aria-pressed={autoLoop}
                  title={
                    autoLoop
                      ? "Auto loop: ON (plays selected move, then auto selects next, loops infinitely)"
                      : "Auto loop: OFF (click to auto cycle through all animations)"
                  }
                  aria-label="Auto loop through all animations"
                >
                  <Repeat aria-hidden="true" size={13} />
                  <span>Auto</span>
                </button>
                <div className="select-wrap">
                  <select
                    id="pet-motion"
                    value={state}
                    onChange={(e) => setState(e.target.value as PetState)}
                  >
                    {PET_STATES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden="true" size={15} />
                </div>
                <button
                  className="gif-button"
                  disabled={!!exporting}
                  onClick={() => exportPet("gif")}
                  aria-label={
                    exporting === "gif"
                      ? `Creating ${viewMode === "furry" ? "Furry " : viewMode === "3d" ? "3D " : ""}GIF, ${gifProgress}%`
                      : `Export selected move as ${viewMode === "furry" ? "Furry " : viewMode === "3d" ? "3D " : ""}GIF`
                  }
                  title={
                    exporting === "gif"
                      ? `Creating ${viewMode === "furry" ? "Furry " : viewMode === "3d" ? "3D " : ""}GIF… ${gifProgress}%`
                      : (viewMode === "furry"
                          ? "Export selected move with soft fur (current POV) · Transparent · Loops forever"
                          : viewMode === "3d"
                          ? "Export selected move in 3D (current POV) · Transparent · Loops forever"
                          : "Export selected move · Transparent · 50 fps · Loops forever")
                  }
                >
                  {exporting === "gif" && <LoaderCircle aria-hidden="true" className="spin" size={12} />}
                  GIF{viewMode === "furry" ? " Furry" : viewMode === "3d" ? " 3D" : ""}
                </button>
              </div>
            </div>
          </section>
        </div>
        <section className="export-panel" aria-labelledby="export-title">
          <div className="export-copy">
            <div className="export-icon">
              <Sparkles aria-hidden="true" size={22} />
            </div>
            <div>
              <h2 id="export-title">
                {viewMode === "furry"
                  ? "Ready for a fluffy home?"
                  : viewMode === "3d"
                  ? "Ready for a 3D home?"
                  : "Ready for a new home?"}
              </h2>
              <p>
                {viewMode === "furry"
                  ? "All 9 animations covered in thick soft fur from your current angle. One transparent PNG."
                  : viewMode === "3d"
                  ? "All 9 animations captured in 3D from your current angle. One transparent PNG."
                  : "All 9 animations. One transparent PNG. Made for ChatGPT."}
              </p>
            </div>
          </div>
          <button
            className="export-button"
            disabled={!!exporting}
            onClick={() => exportPet("png")}
          >
            {exporting === "png" ? (
              <LoaderCircle aria-hidden="true" className="spin" size={18} />
            ) : (
              <ArrowDownToLine aria-hidden="true" size={18} />
            )}
            {exporting === "png"
              ? (viewMode !== "2d" && gifProgress > 0
                  ? `Creating ${viewMode === "furry" ? "Furry" : "3D"} pet… ${gifProgress}%`
                  : "Creating your pet…")
              : (viewMode === "furry"
                  ? "Export ChatGPT pet (Furry)"
                  : viewMode === "3d"
                  ? "Export ChatGPT pet (3D)"
                  : "Export ChatGPT pet")}
          </button>
        </section>
        <div className="feedback" role="status" aria-live="polite">
          {notice && (
            <>
              <Check aria-hidden="true" size={15} />
              {notice}
            </>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <section className="import-help">
          <button
            className="help-toggle"
            aria-expanded={showHelp}
            onClick={() => setShowHelp(!showHelp)}
          >
            <CircleHelp aria-hidden="true" size={15} />
            How do I add my pet to ChatGPT?
            <ChevronDown aria-hidden="true" size={14} className={showHelp ? "flipped" : ""} />
          </button>
          {showHelp && (
            <div className="help-content">
              <ol>
                <li>Export your pet and keep the downloaded PNG.</li>
                <li>
                  In ChatGPT, open{" "}
                  <strong>Settings → Personalization → Pet → Select pet</strong>
                  .
                </li>
                <li>
                  Choose <strong>Upload pet</strong> and select your PNG.
                </li>
              </ol>
              <p>
                Pet availability depends on your ChatGPT app and account.{" "}
                <a
                  href="https://learn.chatgpt.com/docs/pets"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the official guide ↗
                </a>
              </p>
            </div>
          )}
        </section>
      </main>
      <footer>
        <span>Little characters, lifted from Raft.</span>
        <span>
          Made in your browser <span className="footer-dot">·</span> No account
          needed
        </span>
      </footer>
    </div>
  );
}
