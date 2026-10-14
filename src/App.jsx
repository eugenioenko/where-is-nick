import { useCallback, useEffect, useRef, useState } from "react";
import { gameConfig as config } from "./game-config.js";
import targetConfig from "./targets.json";
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
            <strong>Find Nick in every scene.</strong> Click or tap when you
            spot him. Drag to look around; scroll or pinch to zoom.
          </span>
        </p>
        <p>
          <b>02</b>
          <span>
            <strong>Make your guesses count.</strong> Each find earns{" "}
            {config.pointsPerFind} points. Wrong guesses cost{" "}
            {config.wrongGuessPenalty}; a hint costs {config.hintPenalty}. A
            round never drops below zero.
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
      {config.practiceMode && (
        <p className="practice-note">
          <Icon name="flag" size={16} /> Practice edition: click the orange N
          markers. Nick’s real hiding places are coming soon.
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
            <span /> THE FAREWELL EDITION <span className="edition-line" />
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
            Give Nick a send-off worth searching for.
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
            <h2>A few stops before he goes.</h2>
          </div>
          <span className="strip-note">
            ONE NICK IN EVERY SCENE <Icon name="flag" size={17} />
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
  const [index, setIndex] = useState(0),
    [targets, setTargets] = useState(targetConfig.targets),
    [draw, setDraw] = useState(true);
  const round = {
    ...config.rounds[index],
    target: targets[config.rounds[index].id],
  };
  return (
    <main className="setup-main">
      <div className="page-heading">
        <div>
          <span className="eyebrow">HOST’S DESK</span>
          <h1>Set Nick’s hiding places.</h1>
          <p>Choose a scene, zoom in, then draw a rectangle around Nick.</p>
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
            onChange={(e) => setIndex(Number(e.target.value))}
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
          onClick={() =>
            downloadFile(
              "targets.json",
              new Blob(
                [
                  JSON.stringify({ practiceMode: false, targets }, null, 2) +
                    "\n",
                ],
                { type: "application/json" },
              ),
            )
          }
        >
          Download targets <Icon name="download" />
        </button>
      </div>
      <Viewer
        key={round.id}
        round={round}
        editing
        drawMode={draw}
        onTarget={(target) =>
          setTargets((previous) => ({ ...previous, [round.id]: target }))
        }
      />
      <div className="setup-result">
        <code>{JSON.stringify(round.target)}</code>
        <p>
          Download after setting all five scenes. Replace{" "}
          <code>src/targets.json</code> with the downloaded file, then rebuild.
          The orange practice markers will disappear.
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
    [found, setFound] = useState(false);
  const [misses, setMisses] = useState(0),
    [hinted, setHinted] = useState(false),
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
  const clock = useClock(
    stage === "play" &&
      ready &&
      !found &&
      !paused &&
      !hidden &&
      !rules &&
      !restart,
  );
  const score = history.reduce((total, round) => total + round.points, 0);
  const round = config.rounds[index];
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
          : type === "hint"
            ? [440, 554]
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
    setFound(false);
    setReady(false);
    setMisses(0);
    setHinted(false);
    setHistory([]);
    setRoundStart(0);
    setPaused(false);
    setStage("play");
  };
  const guess = (correct) => {
    if (found || paused || hidden || rules || restart) return;
    if (correct) {
      const now = clock.read();
      setFound(true);
      playSound("found");
      setHistory((previous) => [
        ...previous,
        {
          id: round.id,
          title: round.title,
          points: roundPoints(misses, hinted, config),
          time: now - roundStart,
          misses,
          hinted,
        },
      ]);
      setTotalTime(now);
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
    if (index === config.rounds.length - 1) {
      setStage("result");
      return;
    }
    setRoundStart(clock.read());
    setIndex((n) => n + 1);
    setFound(false);
    setReady(false);
    setMisses(0);
    setHinted(false);
    setToast("");
  };
  const hint = () => {
    if (hinted || !ready || found) return;
    setHinted(true);
    playSound("hint");
    setToast("Look inside the violet circle. He’s in there somewhere!");
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
    ctx.fillText("THE FAREWELL EDITION", 600, 130);
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
    ctx.fillText("Officially an excellent Nick finder.", 600, 750);
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
      `${history.length} / ${config.rounds.length} Nicks found`,
      600,
      1225,
    );
    ctx.font = "28px sans-serif";
    ctx.fillText("Here’s to your next adventure, Nick.", 600, 1310);
    if (config.practiceMode) {
      ctx.fillStyle = "#6e658f";
      ctx.font = "22px sans-serif";
      ctx.fillText("PRACTICE EDITION", 600, 1400);
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
          <span className="header-edition">A LITTLE FAREWELL ADVENTURE</span>
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
                    {!ready || found || paused || hidden || rules || restart
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
                className={`progress-step ${i < index || (i === index && found) ? "complete" : ""} ${i === index ? "current" : ""}`}
              >
                <span>
                  {i < index || (i === index && found) ? (
                    <Icon name="check" size={14} />
                  ) : (
                    `0${i + 1}`
                  )}
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
                practice={config.practiceMode}
                found={found}
                hinted={hinted}
                disabled={paused || rules || restart || hidden}
                onGuess={guess}
                onReady={onReady}
              />
              {config.practiceMode && (
                <div className="practice-banner">
                  <Icon name="flag" size={15} />
                  <span>
                    Practice edition — find the orange <b>N</b> marker.
                  </span>
                </div>
              )}
            </div>
            <aside className={`detective-card ${found ? "found-card" : ""}`}>
              <span className="eyebrow">
                {found ? "CASE CLOSED" : "YOUR MISSION"}
              </span>
              <div className="nick-token">
                {found ? (
                  <Icon name="check" size={45} />
                ) : (
                  <>
                    <span>N</span>
                    <i>?</i>
                  </>
                )}
              </div>
              <h2>{found ? "There he is!" : "Find our guy."}</h2>
              <p>
                {found
                  ? [
                      "Nick can run, but he can’t hide.",
                      "Even space couldn’t keep him away.",
                      "You’ve got an eye for this.",
                      "Found him just in time for dessert.",
                      "Five scenes. Five finds. What a send-off.",
                    ][index]
                  : "Somewhere in this crowd, Nick is waiting to be found."}
              </p>
              {found ? (
                <>
                  <div className="found-points">
                    +{history.at(-1)?.points ?? 0}
                    <span>POINTS IN THE BAG</span>
                  </div>
                  <button
                    autoFocus
                    className="btn primary next-button"
                    onClick={next}
                  >
                    {index === config.rounds.length - 1
                      ? "See my results"
                      : "Next scene"}
                    <Icon name="arrow" />
                  </button>
                  <span className="round-time">
                    <Icon name="clock" size={14} /> Found in{" "}
                    {formatTime(history.at(-1)?.time ?? 0)}
                  </span>
                </>
              ) : (
                <>
                  <div className="mission-divider" />
                  <div className="potential-points">
                    <Icon name="star" size={16} />
                    <span>
                      This find is worth{" "}
                      <b>{roundPoints(misses, hinted, config)} points</b>
                    </span>
                  </div>
                  <button
                    className="btn hint-button"
                    disabled={!ready || hinted}
                    onClick={hint}
                  >
                    <Icon name="hint" />
                    {hinted ? "Hint revealed" : "A little nudge"}
                    <span>{hinted ? "✓" : `−${config.hintPenalty}`}</span>
                  </button>
                  <span className="hint-note">
                    {hinted
                      ? "Look inside the violet circle."
                      : "A hint narrows down the search."}
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
                </>
              )}
            </aside>
          </div>
          {found && <Confetti key={round.id} />}
        </main>
      )}
      {stage === "result" && (
        <main className="result-main">
          <Confetti big />
          <div className="result-intro">
            <span className="eyebrow">THE SEARCH IS OVER</span>
            <h1>
              You found Nick.
              <br />
              <span>Now send him off.</span>
            </h1>
            <p>One last little adventure, before his next big one.</p>
          </div>
          <div className="result-card" data-testid="result-card">
            <span className="result-ribbon">OFFICIAL NICK FINDER</span>
            <div className="result-medal">
              <Icon name="star" size={44} />
              <span>✦</span>
              <i>✦</i>
            </div>
            <span className="eyebrow">CERTIFIED DETECTIVE</span>
            <h2>{username}</h2>
            <p>
              {score >= 450
                ? "Sharp eyes. Legendary send-off."
                : score >= 300
                  ? "A little persistence goes a long way."
                  : "You made it. That’s what friends do."}
            </p>
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
              {history.length} of {config.rounds.length} Nicks found{" "}
              <span>•</span> {history.reduce((n, r) => n + r.misses, 0)} wrong{" "}
              {history.reduce((n, r) => n + r.misses, 0) === 1
                ? "guess"
                : "guesses"}
            </div>
            {config.practiceMode && (
              <span className="result-practice">PRACTICE EDITION</span>
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
          who’ll miss him.
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
