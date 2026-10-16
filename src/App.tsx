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
  RotateCcw,
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
import { createPetSheet, PetPreview, PET_STATES, type PetState } from "./pet";

const INITIAL = formatProjectIconId({
  shapeId: "cloud",
  expressionId: "toon-flat",
  color: "#FFC20E",
});
const STORAGE_KEY = "raft-pet-studio:v1";
function loadSaved(): { icon: string; name: string } {
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
const keepOpen = () => {};

export default function App() {
  const [saved] = useState(loadSaved);
  const [icon, setIcon] = useState(saved.icon);
  const [name, setName] = useState(saved.name);
  const [state, setState] = useState<PetState>("idle");
  const [paused, setPaused] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const avatar = getProjectIcon(icon);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ icon, name }));
    } catch {
      /* Private browsing can disable storage. */
    }
  }, [icon, name]);

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

  async function exportPet() {
    if (exporting) return;
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const blob = await createPetSheet(icon);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const filename =
        name
          .trim()
          .replace(/[^a-z0-9_-]+/gi, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 50) || "my-pet";
      link.download = `${filename.toLowerCase()}-chatgpt-pet.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setNotice("Pet exported! Your PNG is ready to upload to ChatGPT.");
      setShowHelp(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not export your pet. Please try again.",
      );
    } finally {
      setExporting(false);
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
              <span className="live-label">
                <span />
                LIVE PREVIEW
              </span>
            </div>
            <div className="pet-stage">
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
              <div className="pet-nameplate">
                {name.trim() || "Your little friend"}
              </div>
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
            </div>
            <div className="name-field">
              <label htmlFor="pet-name">What should we call them?</label>
              <input
                id="pet-name"
                maxLength={40}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNotice("");
                }}
                placeholder="Your pet’s name"
                autoComplete="off"
              />
              <span>A name for your download. Personality comes included.</span>
            </div>
          </section>
        </div>
        <section className="export-panel" aria-labelledby="export-title">
          <div className="export-copy">
            <div className="export-icon">
              <Sparkles aria-hidden="true" size={22} />
            </div>
            <div>
              <h2 id="export-title">Ready for a new home?</h2>
              <p>All 9 animations. One transparent PNG. Made for ChatGPT.</p>
            </div>
          </div>
          <button
            className="export-button"
            disabled={exporting}
            onClick={exportPet}
          >
            {exporting ? (
              <LoaderCircle aria-hidden="true" className="spin" size={18} />
            ) : (
              <ArrowDownToLine aria-hidden="true" size={18} />
            )}
            {exporting ? "Creating your pet…" : "Export ChatGPT pet"}
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
