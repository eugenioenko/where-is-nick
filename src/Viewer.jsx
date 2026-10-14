import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Icon from "./Icon.jsx";
import { clamp } from "./utils.js";

export default function Viewer({
  round,
  review,
  foundTargets = [],
  wallyHits = [],
  disabled = false,
  onGuess,
  onReady,
  editing = false,
  drawMode = false,
  onTarget,
  selectedTarget = null,
}) {
  const viewport = useRef(null);
  const imageRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const selection = useRef(null);
  const moved = useRef(false);
  const viewRef = useRef({ scale: 1, x: 0, y: 0 });
  const sizeRef = useRef({ vw: 0, vh: 0, w: 0, h: 0 });
  const [view, setView] = useState(viewRef.current);
  const [size, setSize] = useState(sizeRef.current);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [draft, setDraft] = useState(null);
  const [keyboard, setKeyboard] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const apply = useCallback((next) => {
    const { vw, vh, w, h } = sizeRef.current;
    const scale = clamp(next.scale, 1, 6);
    const x =
      w * scale <= vw ? (vw - w * scale) / 2 : clamp(next.x, vw - w * scale, 0);
    const y =
      h * scale <= vh ? (vh - h * scale) / 2 : clamp(next.y, vh - h * scale, 0);
    viewRef.current = { scale, x, y };
    setView(viewRef.current);
  }, []);

  useLayoutEffect(() => {
    const resize = () => {
      const { width: vw, height: vh } =
        viewport.current.getBoundingClientRect();
      const fit = Math.min(vw / round.width, vh / round.height);
      sizeRef.current = { vw, vh, w: round.width * fit, h: round.height * fit };
      setSize(sizeRef.current);
      apply({ scale: 1, x: 0, y: 0 });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, [round.width, round.height, apply]);

  useEffect(() => {
    let canceled = false;
    setReady(false);
    setError(false);
    onReady?.(false);
    const img = new Image();
    let timeout;
    let resolveDelay;
    const delay = new Promise((resolve) => {
      resolveDelay = resolve;
      timeout = setTimeout(resolve, 650);
    });
    const loaded = new Promise((resolve, reject) => {
      img.onload = () => img.decode().then(resolve, reject);
      img.onerror = () => reject(new Error("Image could not load"));
    });
    img.src = round.image;
    Promise.all([loaded, delay])
      .then(() => {
        if (!canceled) {
          setReady(true);
          onReady?.(true);
        }
      })
      .catch(() => {
        if (!canceled) setError(true);
      });
    return () => {
      canceled = true;
      clearTimeout(timeout);
      resolveDelay();
      img.onload = null;
      img.onerror = null;
    };
  }, [round.image, retry, onReady]);

  const zoom = useCallback(
    (scale, anchor) => {
      const current = viewRef.current;
      const p = anchor ?? {
        x: sizeRef.current.vw / 2,
        y: sizeRef.current.vh / 2,
      };
      const next = clamp(scale, 1, 6);
      apply({
        scale: next,
        x: p.x - ((p.x - current.x) * next) / current.scale,
        y: p.y - ((p.y - current.y) * next) / current.scale,
      });
    },
    [apply],
  );

  useEffect(() => {
    const el = viewport.current;
    const wheel = (e) => {
      if (!ready || disabled) return;
      e.preventDefault();
      const bounds = el.getBoundingClientRect();
      zoom(viewRef.current.scale * Math.exp(-e.deltaY * 0.002), {
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom, ready, disabled]);

  useEffect(() => {
    if (!feedback) return;
    const id = setTimeout(() => setFeedback(null), 950);
    return () => clearTimeout(id);
  }, [feedback]);

  const imagePoint = (clientX, clientY) => {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };
  const guess = (x, y) => {
    if (!ready || disabled || editing) return;
    const point = imagePoint(x, y);
    if (!point || point.x < 0 || point.x > 100 || point.y < 0 || point.y > 100)
      return;
    const contains = (target) =>
      point.x >= target.x &&
      point.x <= target.x + target.width &&
      point.y >= target.y &&
      point.y <= target.y + target.height;
    const wallyIndex = (round.wallyTargets ?? []).findIndex(contains);
    if (wallyIndex >= 0) {
      const box = viewport.current.getBoundingClientRect();
      setFeedback({
        x: x - box.left,
        y: y - box.top,
        correct: false,
        key: performance.now(),
      });
      onGuess?.(wallyIndex, "wally");
      return;
    }
    const matches = round.targets.flatMap((target, index) => {
      const marker = review
        ? viewport.current
            .querySelector(`[data-target-index="${index}"]>span`)
            ?.getBoundingClientRect()
        : null;
      const tappedMarker =
        marker &&
        x >= marker.left &&
        x <= marker.right &&
        y >= marker.top &&
        y <= marker.bottom;
      return tappedMarker || contains(target) ? [index] : [];
    });
    const targetIndex =
      matches.find((index) => !foundTargets.includes(index)) ??
      matches[0] ??
      -1;
    const correct = targetIndex >= 0;
    if (foundTargets.includes(targetIndex)) {
      onGuess?.(targetIndex);
      return;
    }
    const box = viewport.current.getBoundingClientRect();
    setFeedback({
      x: x - box.left,
      y: y - box.top,
      correct,
      key: performance.now(),
    });
    onGuess?.(targetIndex);
  };
  const setGesture = () => {
    const values = [...pointers.current.values()];
    if (values.length >= 2) {
      const [a, b] = values;
      const bounds = viewport.current.getBoundingClientRect();
      const middle = {
        x: (a.x + b.x) / 2 - bounds.left,
        y: (a.y + b.y) / 2 - bounds.top,
      };
      gesture.current = {
        type: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        middle,
        view: { ...viewRef.current },
      };
    } else if (values.length === 1) {
      gesture.current = {
        type: "drag",
        start: values[0],
        view: { ...viewRef.current },
      };
    } else gesture.current = null;
  };
  const pointerDown = (e) => {
    if (!ready || disabled || e.button > 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setKeyboard(false);
    if (editing && drawMode) {
      const point = imagePoint(e.clientX, e.clientY);
      if (!point) return;
      selection.current = {
        x: clamp(point.x, 0, 100),
        y: clamp(point.y, 0, 100),
      };
      setDraft(null);
      return;
    }
    if (!pointers.current.size) moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size > 1) moved.current = true;
    setGesture();
    setDragging(true);
  };
  const pointerMove = (e) => {
    if (selection.current) {
      const p = imagePoint(e.clientX, e.clientY);
      if (!p) return;
      const x = clamp(p.x, 0, 100),
        y = clamp(p.y, 0, 100);
      const a = selection.current;
      setDraft({
        x: Math.min(a.x, x),
        y: Math.min(a.y, y),
        width: Math.abs(x - a.x),
        height: Math.abs(y - a.y),
      });
      return;
    }
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.type === "pinch") {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const bounds = viewport.current.getBoundingClientRect();
      const scale = clamp(
        (g.view.scale * Math.hypot(a.x - b.x, a.y - b.y)) /
          Math.max(g.distance, 1),
        1,
        6,
      );
      const x = (a.x + b.x) / 2 - bounds.left,
        y = (a.y + b.y) / 2 - bounds.top;
      apply({
        scale,
        x: x - ((g.middle.x - g.view.x) * scale) / g.view.scale,
        y: y - ((g.middle.y - g.view.y) * scale) / g.view.scale,
      });
    } else {
      const dx = e.clientX - g.start.x,
        dy = e.clientY - g.start.y;
      if (Math.hypot(dx, dy) > 6) moved.current = true;
      if (moved.current)
        apply({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    }
  };
  const pointerUp = (e) => {
    if (selection.current) {
      if (draft?.width >= 0.3 && draft?.height >= 0.3)
        onTarget?.(
          Object.fromEntries(
            Object.entries(draft).map(([key, n]) => [key, +n.toFixed(2)]),
          ),
        );
      selection.current = null;
      setDraft(null);
      return;
    }
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (!moved.current && e.type !== "pointercancel")
      guess(e.clientX, e.clientY);
    setGesture();
    if (!pointers.current.size) setDragging(false);
  };
  const keyDown = (e) => {
    if (!ready || disabled || editing) return;
    const move = {
      ArrowLeft: [45, 0],
      ArrowRight: [-45, 0],
      ArrowUp: [0, 45],
      ArrowDown: [0, -45],
    }[e.key];
    if (move) {
      e.preventDefault();
      setKeyboard(true);
      apply({
        ...viewRef.current,
        x: viewRef.current.x + move[0],
        y: viewRef.current.y + move[1],
      });
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      setKeyboard(true);
      zoom(viewRef.current.scale * 1.3);
    } else if (e.key === "-") {
      e.preventDefault();
      zoom(viewRef.current.scale / 1.3);
    } else if (e.key === "0") {
      e.preventDefault();
      apply({ scale: 1, x: 0, y: 0 });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setKeyboard(true);
      const box = viewport.current.getBoundingClientRect();
      guess(box.left + box.width / 2, box.top + box.height / 2);
    }
  };
  const targetStyle = (target) => ({
    left: `${target.x}%`,
    top: `${target.y}%`,
    width: `${target.width}%`,
    height: `${target.height}%`,
  });

  return (
    <div className="viewer-shell">
      <div
        ref={viewport}
        className={`viewer ${dragging ? "dragging" : ""} ${drawMode ? "drawing" : ""}`}
        data-testid="viewer"
        tabIndex={ready && !disabled ? 0 : -1}
        role="application"
        aria-label="Search scene. Drag to pan, scroll or pinch to zoom. Keyboard: plus and minus to zoom, arrows to move, Enter to guess at the center."
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onKeyDown={keyDown}
      >
        {ready && (
          <div
            className="image-layer"
            style={{
              width: size.w,
              height: size.h,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            }}
          >
            <img
              ref={imageRef}
              src={round.image}
              alt={`${round.title}: a densely illustrated crowd hiding Nick`}
              draggable="false"
              data-testid="scene-image"
            />
            {round.targets.map(
              (target, index) =>
                (review || foundTargets.includes(index) || editing) && (
                  <div
                    key={index}
                    className={`target ${review ? "target-review" : ""} ${foundTargets.includes(index) ? "target-found" : ""} ${editing ? "target-editor" : ""} ${editing && selectedTarget === index ? "target-selected" : ""}`}
                    style={targetStyle(target)}
                    data-testid="target-marker"
                    data-target-index={index}
                  >
                    <span>
                      {foundTargets.includes(index) ? (
                        <Icon name="check" size={16} />
                      ) : editing ? (
                        "TARGET"
                      ) : (
                        "N"
                      )}
                    </span>
                  </div>
                ),
            )}
            {(round.wallyTargets ?? []).map(
              (target, index) =>
                (review || editing || wallyHits.includes(index)) && (
                  <div
                    key={`wally-${index}`}
                    className={`target target-wally ${wallyHits.includes(index) ? "target-wally-hit" : ""}`}
                    style={targetStyle(target)}
                    data-testid="wally-marker"
                    data-wally-index={index}
                  >
                    <span>
                      {wallyHits.includes(index) ? (
                        <Icon name="close" size={14} />
                      ) : (
                        "W"
                      )}
                    </span>
                  </div>
                ),
            )}
            {draft && (
              <div
                className="target target-editor"
                style={targetStyle(draft)}
              />
            )}
          </div>
        )}
        {!ready && (
          <div className="scene-loader" role="status">
            {error ? (
              <>
                <span className="loader-icon">
                  <Icon name="flag" size={32} />
                </span>
                <h3>This scene took a wrong turn.</h3>
                <p>Check your connection and give it another go.</p>
                <button
                  className="btn primary compact"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Try again <Icon name="reset" />
                </button>
              </>
            ) : (
              <>
                <span className="loader-icon">
                  <Icon name="search" size={38} />
                </span>
                <span className="eyebrow">SETTING THE SCENE</span>
                <h3>{round.title}</h3>
                <div className="loading-track">
                  <span />
                </div>
                <p>Nick’s finding a hiding place…</p>
              </>
            )}
          </div>
        )}
        {keyboard && <span className="keyboard-crosshair" aria-hidden="true" />}
        {feedback && (
          <span
            key={feedback.key}
            className={`tap-feedback ${feedback.correct ? "correct" : "incorrect"}`}
            style={{ left: feedback.x, top: feedback.y }}
          >
            <Icon name={feedback.correct ? "check" : "close"} size={22} />
          </span>
        )}
      </div>
      <div className="viewer-caption">
        <span>
          <Icon name="hand" size={15} /> Drag to explore <i /> Scroll or pinch
          to zoom
        </span>
        <span className="zoom-tools">
          <button
            aria-label="Zoom out"
            disabled={!ready || disabled || view.scale <= 1}
            onClick={() => zoom(viewRef.current.scale / 1.35)}
          >
            <Icon name="minus" size={17} />
          </button>
          <output aria-label="Zoom level">
            {Math.round(view.scale * 100)}%
          </output>
          <button
            aria-label="Zoom in"
            disabled={!ready || disabled || view.scale >= 6}
            onClick={() => zoom(viewRef.current.scale * 1.35)}
          >
            <Icon name="plus" size={17} />
          </button>
          <button
            aria-label="Reset view"
            disabled={!ready || disabled}
            onClick={() => apply({ scale: 1, x: 0, y: 0 })}
          >
            <Icon name="fullscreen" size={17} />
          </button>
        </span>
      </div>
    </div>
  );
}
