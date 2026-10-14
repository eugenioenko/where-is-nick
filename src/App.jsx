import { useCallback, useEffect, useRef, useState } from "react";
import { gameConfig as config } from "./game-config.js";
import Viewer from "./Viewer.jsx";
import Icon from "./Icon.jsx";
import {
  downloadFile,
  formatTime,
  roundPoints,
  safeRead,
  safeWrite,
} from "./utils.js";

function useClock(running) {
  const accumulated = useRef(0),
    segment = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const read = useCallback(
    () =>
      accumulated.current +
      (segment.current === null ? 0 : performance.now() - segment.current),
    [],
  );
  const reset = useCallback(() => {
    accumulated.current = 0;
    segment.current = null;
    setElapsed(0);
  }, []);
  useEffect(() => {
    if (!running) return;
    segment.current = performance.now();
    const id = setInterval(() => setElapsed(read()), 100);
    return () => {
      accumulated.current = read();
      segment.current = null;
      setElapsed(accumulated.current);
      clearInterval(id);
    };
  }, [running, read]);
  return { elapsed, read, reset };
}

function Confetti({ big = false }) {
  return (
    <div className={`confetti ${big ? "confetti-big" : ""}`} aria-hidden="true">
      {Array.from({ length: big ? 55 : 25 }, (_, i) => (
        <i
          key={i}
          style={{
            "--x": `${(i * 73 + 11) % 100}%`,
            "--r": `${(i * 37) % 360}deg`,
            "--delay": `${(i % 7) * 0.08}s`,
            "--color": ["#ed542c", "#8174c9", "#e4bd45", "#80a994", "#f2a3ba"][
              i % 5
            ],
          }}
        />
      ))}
    </div>
  );
}

function Modal({ children, onClose, label }) {
  const box = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () =>
      [
        ...box.current.querySelectorAll(
          'button, input, a[href], [tabindex="0"]',
        ),
      ].filter((el) => !el.disabled);
    const first = box.current.querySelector("[autofocus]") ?? focusable()[0];
    first?.focus();
    const key = (e) => {
      if (e.key === "Escape") closeRef.current?.();
      if (e.key === "Tab") {
        const elements = focusable(),
          firstEl = elements[0],
          last = elements.at(-1);
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          firstEl?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={box}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        {onClose && (
          <button
            className="icon-button modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function Rules() {
  return (
    <>
      <span className="eyebrow">YOUR VERY IMPORTANT BRIEFING</span>
      <h2>
        A little looking.
        <br />A lot of fun.
      </h2>
      <div className="rule-list">
        <p>
          <b>01</b>
          <span>
            <strong>Find Nick in the crowd.</strong> There may be more than
            one. We won’t tell you how many. Keep searching or move to the next
            scene whenever you’re ready, even if you haven’t found anyone yet.
          </span>
        </p>
        <p>
          <b>02</b>
          <span>
            <strong>Make your guesses count.</strong> Each find earns{" "}
            {config.pointsPerFind} points. Wrong guesses cost{" "}
            {config.wrongGuessPenalty}; finding Wally costs{" "}
            {config.wallyPenalty}. Your total never goes below zero. Clicking an
            already marked character doesn’t count again. Find every Nick with
            no mistakes for a Perfect! bonus of {config.perfectBonus} points.
          </span>
        </p>
        <p>
          <b>03</b>
          <span>
            <strong>Keep an eye on the clock.</strong> Lower time wins a tied
            score. Loading, breaks, and hidden tabs don’t count.
          </span>
        </p>
      </div>
      <p className="small-note">
        Keyboard explorer? Tab to the scene, zoom with + / −, move with the
        arrows, and press Enter to guess at the center. Press 0 to reset.
      </p>
      {config.reviewMode && (
        <p className="review-note">
          <Icon name="flag" size={16} /> Location review: magenta marks Nick;
          cyan marks Wally.
        </p>
      )}
    </>
  );
}

function Home({ onStart, onRules }) {
  return (
    <>
      <main className="home-main">
        <div className="hero-copy">
          <div className="edition">
            <span /> THE NEXT CHAPTER <span className="edition-line" />
          </div>
          <h1>
            Where
            <br />
            is{" "}
            <span className="nick-word">
              Nick
              <svg
                viewBox="0 0 250 22"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M3 13Q92-3 245 9M18 20Q125 6 222 17" />
              </svg>
            </span>
            <span className="question">?</span>
          </h1>
          <p className="hero-description">
            Five crowded worlds. One familiar face.
            <br />
            Join Nick on his next adventure.
          </p>
          <button className="btn primary start-button" onClick={onStart}>
            Let’s find Nick <Icon name="arrow" size={24} />
          </button>
          <div className="hero-details">
            <span>
              <Icon name="search" size={16} /> {config.rounds.length} scenes
            </span>
            <span>
              <Icon name="clock" size={16} /> One little adventure
            </span>
          </div>
          <button className="text-button how-link" onClick={onRules}>
            How to play <span>↗</span>
          </button>
        </div>
        <div className="hero-art">
          <div className="hero-image-wrap">
            <img
              src={config.rounds[3].image}
              alt="An enormous illustrated crowd, ready for a game of hide and seek"
            />
            <span className="photo-label">
              <span /> SOMEWHERE IN HERE…
            </span>
            <div
              className="hero-lens"
              aria-hidden="true"
              style={{ backgroundImage: `url(${config.rounds[3].image})` }}
            >
              <span>
                N<span>?</span>
              </span>
            </div>
            <div className="hero-image-footer">
              <span>A familiar face in an unfamiliar place.</span>
              <Icon name="search" size={20} />
            </div>
          </div>
          <span className="luck-sticker" aria-hidden="true">
            GOOD LUCK,
            <br />
            <strong>DETECTIVE!</strong>
            <span>✦</span>
          </span>
          <span className="art-spark spark-one" aria-hidden="true">
            ✳
          </span>
          <span className="art-spark spark-two" aria-hidden="true">
            ✦
          </span>
          <span className="handwritten">
            He’s around here somewhere.
            <svg viewBox="0 0 110 50" aria-hidden="true">
              <path d="M5 3q85-8 75 35m-13-6 13 10 13-12" />
            </svg>
          </span>
        </div>
      </main>
      <section className="adventure-strip" aria-label="The five scenes">
        <div className="strip-heading">
          <div>
            <span className="eyebrow">THE ITINERARY</span>
            <h2>A few stops along the way.</h2>
          </div>
          <span className="strip-note">
            LOOK CLOSELY. THEN LOOK AGAIN. <Icon name="flag" size={17} />
          </span>
        </div>
        <div className="scene-previews">
          {config.rounds.map((round, i) => (
            <div className="scene-preview" key={round.id}>
              <div className="scene-thumb">
                <img src={round.image} alt="" loading="lazy" />
                <span>0{i + 1}</span>
              </div>
              <h3>{round.title}</h3>
              <span>
                {i === config.rounds.length - 1
                  ? "The grand finale"
                  : "A new place to get lost"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function TargetEditor({ onExit }) {
  const [index, setIndex] = useState(0);
  const [targets, setTargets] = useState(() =>
    Object.fromEntries(config.rounds.map((round) => [round.id, round.targets])),
  );
  const [draw, setDraw] = useState(true);
  const [selected, setSelected] = useState(0);
  const round = {
    ...config.rounds[index],
    targets: targets[config.rounds[index].id],
  };
  const updateTarget = (target) => {
    const at = selected ?? round.targets.length;
    setTargets((previous) => ({
      ...previous,
      [round.id]:
        selected === null
          ? [...previous[round.id], target]
          : previous[round.id].map((rectangle, i) =>
              i === selected ? target : rectangle,
            ),
    }));
    setSelected(at);
  };
  const removeTarget = () => {
    if (selected === null || round.targets.length <= 1) return;
    setTargets((previous) => ({
      ...previous,
      [round.id]: previous[round.id].filter((_, i) => i !== selected),
    }));
    setSelected(0);
  };
  return (
    <main className="setup-main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">HOST’S DESK</span>
          <h1>Set Nick’s hiding places.</h1>
          <p>
            Add a rectangle for every Nick. Players won’t see how many are
            hidden.
          </p>
        </div>
        <button className="btn secondary compact" onClick={onExit}>
          Back to game <Icon name="arrow" />
        </button>
      </div>
      <div className="setup-toolbar">
        <label>
          Scene{" "}
          <select
            value={index}
            onChange={(e) => {
              setIndex(Number(e.target.value));
              setSelected(0);
            }}
          >
            {config.rounds.map((r, i) => (
              <option key={r.id} value={i}>
                {i + 1}. {r.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`btn compact ${draw ? "primary" : "secondary"}`}
          onClick={() => setDraw(!draw)}
        >
          {draw ? "Drawing target" : "Pan & zoom"}{" "}
          <Icon name={draw ? "search" : "hand"} />
        </button>
        <button
          className="btn secondary compact"
          onClick={() => {
            setSelected(null);
            setDraw(true);
          }}
        >
          Add Nick <Icon name="plus" />
        </button>
        <button
          className="btn secondary compact"
          disabled={selected === null || round.targets.length <= 1}
          onClick={removeTarget}
        >
          Remove selected <Icon name="close" />
        </button>
        <button
          className="btn secondary compact"
          onClick={() =>
            downloadFile(
              "targets.json",
              new Blob(
                [
                  JSON.stringify(
                    {
                      reviewMode: false,
                      targets,
                      wally: Object.fromEntries(
                        config.rounds.map((round) => [
                          round.id,
                          round.wallyTargets,
                        ]),
                      ),
                    },
                    null,
                    2,
                  ) + "\n",
                ],
                { type: "application/json" },
              ),
            )
          }
        >
          Download targets <Icon name="download" />
        </button>
      </div>
      <div className="target-picker" aria-label="Host target selection">
        {round.targets.map((_, i) => (
          <button
            key={i}
            className={selected === i ? "selected" : ""}
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
          >
            Nick {i + 1}
          </button>
        ))}
        {selected === null && (
          <span>Draw a rectangle to add another Nick.</span>
        )}
      </div>
      <Viewer
        key={round.id}
        round={round}
        editing
        drawMode={draw}
        selectedTarget={selected}
        onTarget={updateTarget}
      />
      <div className="setup-result">
        <code>
          {selected === null
            ? "Draw a new hiding place."
            : JSON.stringify(round.targets[selected])}
        </code>
        <p>
          Choose a Nick to redraw or remove its rectangle. Add every hiding
          place, then download and replace <code>src/targets.json</code>. The
          exported file hides the review overlays and preserves Wally’s
          location.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  const [stage, setStage] = useState(
    new URLSearchParams(location.search).has("setup") ? "setup" : "home",
  );
  const [username, setUsername] = useState(safeRead("nick-player", ""));
  const [nameDraft, setNameDraft] = useState(username),
    [nameError, setNameError] = useState("");
  const [index, setIndex] = useState(0),
    [ready, setReady] = useState(false),
    [foundTargets, setFoundTargets] = useState([]);
  const [misses, setMisses] = useState(0),
    [wallyHits, setWallyHits] = useState([]),
    [history, setHistory] = useState([]);
  const [paused, setPaused] = useState(false),
    [hidden, setHidden] = useState(document.hidden),
    [rules, setRules] = useState(false),
    [restart, setRestart] = useState(false);
  const [sound, setSound] = useState(
      safeRead("nick-sound", "false") === "true",
    ),
    [toast, setToast] = useState("");
  const [roundStart, setRoundStart] = useState(0),
    [totalTime, setTotalTime] = useState(0);
  const audio = useRef(null);
  const foundRef = useRef([]);
  const wallyRef = useRef([]);
  const round = config.rounds[index];
  const clock = useClock(
    stage === "play" && ready && !paused && !hidden && !rules && !restart,
  );
  const currentRoundPoints = roundPoints(
    foundTargets.length,
    misses,
    wallyHits.length,
    config,
  );
  const baseScore = Math.max(
    0,
    history.reduce((total, round) => total + round.points, 0) +
      (stage === "play" ? currentRoundPoints : 0),
  );
  const totalFound = history.reduce(
    (total, round) => total + round.foundCount,
    0,
  );
  const perfect =
    stage === "result" &&
    history.length === config.rounds.length &&
    history.every(
      (entry, i) =>
        entry.id === config.rounds[i].id &&
        entry.foundCount === config.rounds[i].targets.length &&
        entry.misses === 0 &&
        entry.wallyCount === 0,
    );
  const perfectBonus = perfect ? config.perfectBonus : 0;
  const score = baseScore + perfectBonus;
  const totalWally = history.reduce(
    (total, entry) => total + entry.wallyCount,
    0,
  );
  const scoreRatio = totalFound
    ? baseScore / (totalFound * config.pointsPerFind)
    : 0;
  const onReady = useCallback((value) => setReady(value), []);
  useEffect(() => {
    if (stage !== "name") window.scrollTo({ top: 0, behavior: "instant" });
  }, [stage, index]);
  useEffect(() => {
    const handler = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
  useEffect(() => {
    if (index + 1 < config.rounds.length && stage === "play") {
      const img = new Image();
      img.src = config.rounds[index + 1].image;
    }
  }, [index, stage]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);
  const playSound = (type) => {
    if (!sound) return;
    try {
      audio.current ??= new (
        window.AudioContext || window.webkitAudioContext
      )();
      const ctx = audio.current;
      ctx.resume();
      const notes =
        type === "found"
          ? [523, 659, 784, 1047]
          : type === "wally"
            ? [220, 164, 110]
            : [170, 130];
      notes.forEach((freq, i) => {
        const oscillator = ctx.createOscillator(),
          gain = ctx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = freq;
        const at = ctx.currentTime + i * 0.09;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.08, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.17);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.2);
      });
    } catch {
      /* Audio is optional on unsupported browsers. */
    }
  };
  const start = (e) => {
    e.preventDefault();
    const name = nameDraft.trim();
    if (!name) {
      setNameError("Give your detective a name first.");
      return;
    }
    setUsername(name);
    safeWrite("nick-player", name);
    setNameError("");
    clock.reset();
    setIndex(0);
    foundRef.current = [];
    setFoundTargets([]);
    setReady(false);
    setMisses(0);
    wallyRef.current = [];
    setWallyHits([]);
    setHistory([]);
    setRoundStart(0);
    setPaused(false);
    setStage("play");
  };
  const guess = (targetIndex, kind = "nick") => {
    if (paused || hidden || rules || restart) return;
    if (kind === "wally") {
      if (wallyRef.current.includes(targetIndex)) {
        setToast("Wally’s already been spotted. Keep looking for Nick!");
        return;
      }
      const hits = [...wallyRef.current, targetIndex];
      wallyRef.current = hits;
      setWallyHits(hits);
      playSound("wally");
      setToast(`That’s Wally! −${config.wallyPenalty} points.`);
      return;
    }
    if (targetIndex >= 0) {
      if (foundRef.current.includes(targetIndex)) {
        setToast("You’ve already found this Nick. Keep looking!");
        return;
      }
      const nextFound = [...foundRef.current, targetIndex];
      foundRef.current = nextFound;
      setFoundTargets(nextFound);
      playSound("found");
      setToast("Found him! Keep looking, or head to the next scene.");
    } else {
      setMisses((n) => n + 1);
      setToast(
        [
          "Close… in spirit. Keep looking!",
          "That’s a lovely stranger. Try again!",
          "Nick’s being sneaky. You’ve got this.",
        ][misses % 3],
      );
      playSound("miss");
    }
  };
  const next = () => {
    const now = clock.read();
    setHistory((previous) => [
      ...previous,
      {
        id: round.id,
        title: round.title,
        points: currentRoundPoints,
        time: now - roundStart,
        misses,
        wallyCount: wallyHits.length,
        foundCount: foundTargets.length,
      },
    ]);
    setTotalTime(now);
    setToast("");
    if (index === config.rounds.length - 1) {
      setStage("result");
      return;
    }
    setRoundStart(now);
    setIndex((n) => n + 1);
    foundRef.current = [];
    setFoundTargets([]);
    setReady(false);
    setMisses(0);
    wallyRef.current = [];
    setWallyHits([]);
  };
  const saveCard = async () => {
    await document.fonts.ready;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f7f3eb";
    ctx.fillRect(0, 0, 1200, 1500);
    ctx.fillStyle = "#ed542c";
    ctx.fillRect(0, 0, 1200, 24);
    ctx.textAlign = "center";
    ctx.fillStyle = "#6e658f";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(
      perfect ? "PERFECT SEARCH!" : "THE NEXT CHAPTER",
      600,
      130,
    );
    ctx.fillStyle = "#25271f";
    ctx.font = 'bold 90px "Bricolage Grotesque", sans-serif';
    ctx.fillText("Where is Nick?", 600, 265);
    ctx.fillStyle = "#eee7fc";
    ctx.beginPath();
    ctx.arc(600, 470, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#7460b4";
    ctx.font = "bold 125px sans-serif";
    ctx.fillText("★", 600, 510);
    ctx.fillStyle = "#25271f";
    ctx.font = 'bold 62px "Bricolage Grotesque", sans-serif';
    let size = 62;
    while (ctx.measureText(username).width > 980 && size > 24) {
      ctx.font = `bold ${--size}px "Bricolage Grotesque", sans-serif`;
    }
    ctx.fillText(username, 600, 685);
    ctx.font = "32px sans-serif";
    ctx.fillText(
      perfect
        ? "Every Nick. No mistakes. A perfect search."
        : "An official member of Nick’s search party.",
      600,
      750,
    );
    if (perfect) {
      ctx.fillStyle = "#97702a";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(`PERFECT! +${perfectBonus} BONUS POINTS`, 600, 820);
    }
    ctx.fillStyle = "#ed542c";
    ctx.font = "bold 112px sans-serif";
    ctx.fillText(`${score}`, 330, 985);
    ctx.fillStyle = "#7460b4";
    ctx.fillText(formatTime(totalTime), 870, 985);
    ctx.fillStyle = "#6e7063";
    ctx.font = "24px sans-serif";
    ctx.fillText("POINTS", 330, 1038);
    ctx.fillText("SEARCH TIME", 870, 1038);
    ctx.strokeStyle = "#dad5c9";
    ctx.beginPath();
    ctx.moveTo(100, 1120);
    ctx.lineTo(1100, 1120);
    ctx.stroke();
    ctx.fillStyle = "#25271f";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(
      `${totalFound} Nicks found · ${history.length} scenes explored`,
      600,
      1225,
    );
    ctx.font = "28px sans-serif";
    ctx.fillText("Here’s to your next adventure, Nick.", 600, 1310);
    if (config.reviewMode) {
      ctx.fillStyle = "#6e658f";
      ctx.font = "22px sans-serif";
      ctx.fillText("LOCATION REVIEW", 600, 1400);
    }
    canvas.toBlob((blob) => {
      if (blob)
        downloadFile(
          `where-is-nick-${username.replace(/[^a-z0-9_-]/gi, "").slice(0, 30) || "detective"}.png`,
          blob,
        );
    }, "image/png");
  };
  const exitSetup = () => {
    historyReplace();
    setStage("home");
  };
  const historyReplace = () => {
    window.history.replaceState(null, "", location.pathname);
  };
  return (
    <div className={`app stage-${stage}`}>
      <header className="site-header">
        <button
          className="brand"
          onClick={() =>
            stage === "play"
              ? setRestart(true)
              : stage === "setup"
                ? exitSetup()
                : setStage("home")
          }
          aria-label="Where is Nick? Home"
        >
          <span className="brand-icon">
            <Icon name="search" size={20} />
          </span>
          where is nick<span className="brand-question">?</span>
        </button>
        <div className="header-right">
          <button
            className={`icon-button sound-button ${sound ? "sound-on" : ""}`}
            aria-label={sound ? "Mute sound" : "Enable sound"}
            aria-pressed={sound}
            onClick={() => {
              setSound(!sound);
              safeWrite("nick-sound", String(!sound));
            }}
          >
            <Icon name={sound ? "volume" : "mute"} />
          </button>
        </div>
      </header>
      {stage === "home" || stage === "name" ? (
        <Home
          onStart={() => {
            setNameDraft(username);
            setStage("name");
          }}
          onRules={() => setRules(true)}
        />
      ) : null}
      {stage === "play" && (
        <main className="game-main">
          <div className="game-top">
            <div>
              <span className="eyebrow">
                THE SEARCH IS ON <span className="heading-dot">•</span>{" "}
                {username}
              </span>
              <h1>
                {round.title}
                <span className="tiny-star">✦</span>
              </h1>
              <p>{round.subtitle}</p>
            </div>
            <div className="game-stats">
              <div className="stat">
                <Icon name="star" />
                <span>
                  <small>SCORE</small>
                  <strong data-testid="score">
                    {score.toString().padStart(3, "0")}
                  </strong>
                </span>
              </div>
              <div className="stat">
                <Icon name="clock" />
                <span>
                  <small>
                    {!ready || paused || hidden || rules || restart
                      ? "TIME · PAUSED"
                      : "SEARCH TIME"}
                  </small>
                  <strong data-testid="timer">
                    {formatTime(clock.elapsed)}
                  </strong>
                </span>
              </div>
              <button
                className="icon-button pause-button"
                aria-label="Pause game"
                onClick={() => setPaused(true)}
              >
                <Icon name="pause" />
              </button>
            </div>
          </div>
          <div
            className="round-progress"
            aria-label={`Scene ${index + 1} of ${config.rounds.length}`}
          >
            {config.rounds.map((r, i) => (
              <div
                key={r.id}
                className={`progress-step ${i < index ? "complete" : ""} ${i === index ? "current" : ""}`}
              >
                <span>
                  {i < index ? <Icon name="check" size={14} /> : `0${i + 1}`}
                </span>
                <p>{r.title}</p>
              </div>
            ))}
          </div>
          <div className="play-layout">
            <div className="scene-column">
              <Viewer
                key={round.id}
                round={round}
                review={config.reviewMode}
                foundTargets={foundTargets}
                wallyHits={wallyHits}
                disabled={paused || rules || restart || hidden}
                onGuess={guess}
                onReady={onReady}
              />
              {config.reviewMode && (
                <div className="review-banner">
                  <Icon name="flag" size={15} />
                  <span>
                    Location review:{" "}
                    <b className="legend-nick">magenta: Nick</b> ·{" "}
                    <b className="legend-wally">cyan: Wally</b>.
                  </span>
                </div>
              )}
            </div>
            <aside className="detective-card">
              <span className="eyebrow">YOUR MISSION</span>
              <div className="nick-token">
                <span>N</span>
                <i>?</i>
              </div>
              <h2>{foundTargets.length ? "Nice find!" : "Find our guy."}</h2>
              <p>
                {foundTargets.length
                  ? "Keep looking, or move on when you’re ready. There’s no telling how many Nicks are here."
                  : "Look closely. Nick may be hiding in more than one place."}
              </p>
              <div className="mission-divider" />
              <div className="potential-points">
                <Icon name="star" size={16} />
                <span>
                  Each new Nick earns <b>{config.pointsPerFind} points</b>
                </span>
              </div>
              <button className="btn primary next-button" onClick={next}>
                {index === config.rounds.length - 1
                  ? "See my results"
                  : "Next scene"}
                <Icon name="arrow" />
              </button>
              <span className="support-note">
                Move on whenever you’re ready.
              </span>
              <div className="field-note">
                <span>NOTE TO SELF</span>
                <p>
                  “He’s definitely here.
                  <br />
                  Probably.”
                </p>
                <span className="field-star">✳</span>
              </div>
            </aside>
          </div>
          {foundTargets.length > 0 && (
            <Confetti key={`${round.id}-${foundTargets.length}`} />
          )}
        </main>
      )}
      {stage === "result" && (
        <main className="result-main">
          <Confetti big />
          <div className="result-intro">
            <span className="eyebrow">
              {perfect ? "A PERFECT START" : "THE SEARCH IS OVER"}
            </span>
            <h1>
              {perfect ? "Perfect search!" : "Your search is over."}
              <br />
              <span>Nick’s adventure begins.</span>
            </h1>
            <p>New places. New possibilities. Same Nick.</p>
          </div>
          <div
            className={`result-card ${perfect ? "perfect-card" : ""}`}
            data-testid="result-card"
          >
            <span className="result-ribbon">
              {perfect ? "PERFECT NICK FINDER" : "OFFICIAL SEARCH PARTY"}
            </span>
            <div className="result-medal">
              <Icon name="star" size={44} />
              <span>✦</span>
              <i>✦</i>
            </div>
            <span className="eyebrow">CERTIFIED DETECTIVE</span>
            <h2>{username}</h2>
            <p>
              {perfect
                ? "Every Nick found. Not a single mistake."
                : scoreRatio >= 0.9
                  ? "Sharp eyes. A brilliant beginning."
                  : scoreRatio >= 0.6
                    ? "A little persistence goes a long way."
                    : "You made it. That’s what friends do."}
            </p>
            {perfect && (
              <div className="perfect-banner" data-testid="perfect-bonus">
                <Icon name="star" size={18} />
                <span>
                  <strong>PERFECT!</strong> +{perfectBonus} bonus points
                </span>
              </div>
            )}
            <div className="result-stats">
              <div>
                <strong data-testid="final-score">{score}</strong>
                <span>TOTAL POINTS</span>
              </div>
              <div>
                <strong data-testid="final-time">
                  {formatTime(totalTime)}
                </strong>
                <span>SEARCH TIME</span>
              </div>
            </div>
            <div className="result-finds">
              <Icon name="check" size={17} />
              {totalFound} Nicks found <span>•</span> {history.length} scenes
              explored <span>•</span>{" "}
              {history.reduce((n, r) => n + r.misses, 0)} wrong{" "}
              {history.reduce((n, r) => n + r.misses, 0) === 1
                ? "guess"
                : "guesses"}
            </div>
            {totalWally > 0 && (
              <p className="result-wally" data-testid="wally-total">
                {totalWally} Wally spotted · −{totalWally * config.wallyPenalty}{" "}
                points
              </p>
            )}
            {config.reviewMode && (
              <span className="result-review">LOCATION REVIEW</span>
            )}
            <div className="result-signoff">
              Here’s to your next adventure, Nick. <span>↗</span>
            </div>
          </div>
          <div className="result-actions">
            <button className="btn primary" onClick={saveCard}>
              Save my card <Icon name="download" />
            </button>
            <button
              className="btn secondary"
              onClick={() => {
                setNameDraft(username);
                setStage("name");
              }}
            >
              One more search <Icon name="reset" />
            </button>
          </div>
          <details className="round-recap">
            <summary>
              Your search, scene by scene <span>↓</span>
            </summary>
            {history.map((r, i) => (
              <div key={r.id}>
                <span>
                  0{i + 1} <b>{r.title}</b>
                </span>
                <span>
                  {r.points} pts <i>·</i> {formatTime(r.time)}
                </span>
              </div>
            ))}
          </details>
        </main>
      )}
      {stage === "setup" && <TargetEditor onExit={exitSetup} />}
      <footer className="site-footer">
        <span>
          Made for Nick. <span className="footer-heart">♥</span> And everyone
          cheering him on.
        </span>
        <button className="text-button" onClick={() => setRules(true)}>
          How to play <Icon name="arrow" size={14} />
        </button>
      </footer>
      {stage === "name" && (
        <Modal label="Name your detective" onClose={() => setStage("home")}>
          <span className="modal-symbol">
            <Icon name="search" size={34} />
          </span>
          <span className="eyebrow">EVERY GOOD DETECTIVE HAS A NAME</span>
          <h2>Who’s looking?</h2>
          <p>We’ll put your name on your final scorecard.</p>
          <form onSubmit={start}>
            <label htmlFor="player-name">Your name</label>
            <input
              id="player-name"
              name="username"
              autoFocus
              autoComplete="nickname"
              maxLength={30}
              placeholder="Detective extraordinaire"
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameError("");
              }}
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            {nameError && (
              <p className="form-error" id="name-error">
                {nameError}
              </p>
            )}
            <button className="btn primary" type="submit">
              Start the search <Icon name="arrow" />
            </button>
          </form>
          <p className="small-note">
            {config.rounds.length} scenes. {config.pointsPerFind} points per
            find. Ready when you are.
          </p>
        </Modal>
      )}
      {rules && (
        <Modal label="How to play" onClose={() => setRules(false)}>
          <Rules />
          <button className="btn primary" onClick={() => setRules(false)}>
            Got it. Let’s look. <Icon name="check" />
          </button>
        </Modal>
      )}
      {paused && stage === "play" && (
        <Modal label="Game paused" onClose={() => setPaused(false)}>
          <span className="modal-symbol">
            <Icon name="pause" size={32} />
          </span>
          <span className="eyebrow">A LITTLE BREATHER</span>
          <h2>Nick can wait.</h2>
          <p>
            Your timer is paused. Grab a drink, say hello, then come back to the
            hunt.
          </p>
          <button className="btn primary" onClick={() => setPaused(false)}>
            Back to the search <Icon name="play" />
          </button>
        </Modal>
      )}
      {restart && (
        <Modal label="Leave this search?" onClose={() => setRestart(false)}>
          <span className="eyebrow">LEAVE THIS SEARCH?</span>
          <h2>Start a fresh case?</h2>
          <p>Your current score and time will be cleared.</p>
          <button
            className="btn primary"
            onClick={() => {
              setRestart(false);
              setStage("home");
            }}
          >
            Back to the beginning <Icon name="reset" />
          </button>
          <button className="btn secondary" onClick={() => setRestart(false)}>
            Keep looking
          </button>
        </Modal>
      )}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast" key={toast}>
            <Icon name="search" size={18} />
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
