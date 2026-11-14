const HUMAN = 1;
const AI = -1;
const STARTING_POINTS = [
  -2, 0, 0, 0, 0, 5, 0, 3, 0, 0, 0, -5,
  5, 0, 0, 0, -3, 0, -5, 0, 0, 0, 0, 2,
];

const TOP_LEFT_POINTS = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT_POINTS = [19, 20, 21, 22, 23, 24];
const BOTTOM_LEFT_POINTS = [12, 11, 10, 9, 8, 7];
const BOTTOM_RIGHT_POINTS = [6, 5, 4, 3, 2, 1];
const DIE_PIP_LAYOUTS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};
const STORAGE_KEY = "slackgammon-state-v1";

const boardFrameEl = document.querySelector(".board-frame");
const boardEl = document.getElementById("board");
const topLeftPointsEl = document.getElementById("top-left-points");
const topRightPointsEl = document.getElementById("top-right-points");
const bottomLeftPointsEl = document.getElementById("bottom-left-points");
const bottomRightPointsEl = document.getElementById("bottom-right-points");
const humanBarSlot = document.getElementById("human-bar-slot");
const aiBarSlot = document.getElementById("ai-bar-slot");
const humanOffTray = document.getElementById("human-off-tray");
const aiOffTray = document.getElementById("ai-off-tray");
const difficultySlider = document.getElementById("difficulty-slider");
const difficultyOutput = document.getElementById("difficulty-output");
const autoRollCheckbox = document.getElementById("auto-roll-checkbox");
const quickMoveCheckbox = document.getElementById("quick-move-checkbox");
const targetScoreInput = document.getElementById("target-score-input");
const crawfordCheckbox = document.getElementById("crawford-checkbox");
const newGameButton = document.getElementById("new-game-button");
const diceTray = document.getElementById("dice-tray");
const cubeButton = document.getElementById("cube-button");
const humanMatchScore = document.getElementById("human-match-score");
const aiMatchScore = document.getElementById("ai-match-score");
const matchTargetDisplay = document.getElementById("match-target-display");
const matchResult = document.getElementById("match-result");
const dieTemplate = document.getElementById("die-template");

const ui = {
  selectedFrom: null,
  sourceMoves: [],
};
let activePointerDrag = null;
let ignoreNextBoardClick = false;
let gameEpoch = 0;

const state = loadPersistedState();

buildBoard();
bindEvents();
render();
resumePersistedTurn();
registerServiceWorker();

function createInitialState() {
  return {
    points: [...STARTING_POINTS],
    bar: { [HUMAN]: 0, [AI]: 0 },
    off: { [HUMAN]: 0, [AI]: 0 },
    turn: HUMAN,
    dice: [],
    lastRoll: [],
    turnSequences: [],
    status: "Roll to begin. You play the bright checkers from right to left in Slackgammon.",
    winner: null,
    busy: false,
    difficulty: 65,
    autoRoll: false,
    quickMove: false,
    matchScore: { [HUMAN]: 0, [AI]: 0 },
    targetScore: 7,
    crawfordEnabled: false,
    crawfordGame: false,
    crawfordUsed: false,
    cubeValue: 1,
    matchWinner: null,
  };
}

function loadPersistedState() {
  const fallback = createInitialState();
  if (!window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const loaded = {
      ...fallback,
      points: Array.isArray(parsed.points) && parsed.points.length === 24 ? [...parsed.points] : fallback.points,
      bar: {
        [HUMAN]: Number(parsed.bar?.[HUMAN]) || 0,
        [AI]: Number(parsed.bar?.[AI]) || 0,
      },
      off: {
        [HUMAN]: Number(parsed.off?.[HUMAN]) || 0,
        [AI]: Number(parsed.off?.[AI]) || 0,
      },
      turn: parsed.turn === AI ? AI : HUMAN,
      dice: Array.isArray(parsed.dice) ? parsed.dice.filter(isValidDie) : [],
      lastRoll: Array.isArray(parsed.lastRoll) ? parsed.lastRoll.filter(isValidDie) : [],
      status: typeof parsed.status === "string" ? parsed.status : fallback.status,
      winner: parsed.winner === HUMAN || parsed.winner === AI ? parsed.winner : null,
      busy: false,
      difficulty: Number.isFinite(parsed.difficulty) ? clamp(parsed.difficulty, 0, 100) : fallback.difficulty,
      autoRoll: parsed.autoRoll === true,
      quickMove: parsed.quickMove === true,
      matchScore: {
        [HUMAN]: Number.isFinite(parsed.matchScore?.[HUMAN]) ? Math.max(0, Math.floor(parsed.matchScore[HUMAN])) : 0,
        [AI]: Number.isFinite(parsed.matchScore?.[AI]) ? Math.max(0, Math.floor(parsed.matchScore[AI])) : 0,
      },
      targetScore: Number.isInteger(parsed.targetScore) ? clamp(parsed.targetScore, 1, 99) : fallback.targetScore,
      crawfordEnabled: parsed.crawfordEnabled === true,
      crawfordGame: parsed.crawfordGame === true,
      crawfordUsed: parsed.crawfordUsed === true,
      cubeValue: Number.isInteger(parsed.cubeValue) && parsed.cubeValue > 0 ? Math.min(64, parsed.cubeValue) : 1,
      matchWinner: parsed.matchWinner === HUMAN || parsed.matchWinner === AI ? parsed.matchWinner : null,
      turnSequences: [],
    };

    if (loaded.dice.length > 0) {
      loaded.turnSequences = getTurnSequences(loaded, loaded.turn);
    }

    return loaded;
  } catch {
    return fallback;
  }
}

function persistState() {
  if (!window.localStorage) {
    return;
  }

  const snapshot = {
    points: state.points,
    bar: state.bar,
    off: state.off,
    turn: state.turn,
    dice: state.dice,
    lastRoll: state.lastRoll,
    status: state.status,
    winner: state.winner,
    difficulty: state.difficulty,
    autoRoll: state.autoRoll,
    quickMove: state.quickMove,
    matchScore: state.matchScore,
    targetScore: state.targetScore,
    crawfordEnabled: state.crawfordEnabled,
    crawfordGame: state.crawfordGame,
    crawfordUsed: state.crawfordUsed,
    cubeValue: state.cubeValue,
    matchWinner: state.matchWinner,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures and keep the game playable.
  }
}

function resumePersistedTurn() {
  if (state.winner || state.dice.length === 0) {
    return;
  }

  resetSelection();

  if (state.turn === HUMAN) {
    if (!hasPendingMoves(state.turnSequences)) {
      endTurn("No legal move available. Turn passes to the engine.");
      return;
    }
    state.status = "Game restored. Choose a glowing checker, then choose a destination.";
    render();
    return;
  }

  state.status = "Game restored. Engine is resuming its turn...";
  render();
  queueAiTurn();
}

function buildBoard() {
  renderPointRow(topLeftPointsEl, TOP_LEFT_POINTS, "top");
  renderPointRow(topRightPointsEl, TOP_RIGHT_POINTS, "top");
  renderPointRow(bottomLeftPointsEl, BOTTOM_LEFT_POINTS, "bottom");
  renderPointRow(bottomRightPointsEl, BOTTOM_RIGHT_POINTS, "bottom");
}

function renderPointRow(container, points, orientation) {
  container.innerHTML = "";
  points.forEach((point, index) => {
    const pointEl = document.createElement("button");
    pointEl.type = "button";
    pointEl.className = `point ${orientation} ${index % 2 === 0 ? "warm" : "cool"}`;
    pointEl.dataset.point = String(point);
    pointEl.setAttribute("aria-label", `Point ${point}`);
    pointEl.innerHTML = '<div class="checker-stack"></div>';
    container.append(pointEl);
  });
}

function bindEvents() {
  diceTray.addEventListener("click", (event) => {
    event.stopPropagation();
    handleRollClick();
  });
  difficultySlider.addEventListener("input", () => {
    state.difficulty = Number(difficultySlider.value);
    difficultyOutput.value = `${state.difficulty}%`;
    render();
  });
  autoRollCheckbox.addEventListener("change", () => {
    state.autoRoll = autoRollCheckbox.checked;
    render();
  });
  quickMoveCheckbox.addEventListener("change", () => {
    state.quickMove = quickMoveCheckbox.checked;
    render();
  });
  targetScoreInput.addEventListener("change", () => {
    const target = Number.parseInt(targetScoreInput.value, 10);
    state.targetScore = Number.isFinite(target) ? clamp(target, 1, 99) : state.targetScore;
    render();
  });
  crawfordCheckbox.addEventListener("change", () => {
    state.crawfordEnabled = crawfordCheckbox.checked;
    render();
  });
  newGameButton.addEventListener("click", () => {
    gameEpoch += 1;
    const settings = {
      autoRoll: state.autoRoll,
      quickMove: state.quickMove,
      difficulty: state.difficulty,
      targetScore: state.targetScore,
      crawfordEnabled: state.crawfordEnabled,
    };
    Object.assign(state, createInitialState(), settings);
    resetSelection();
    activePointerDrag = null;
    render();
  });
  cubeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (cubeButton.disabled) {
      return;
    }
    state.cubeValue = Math.min(64, state.cubeValue * 2);
    render();
  });

  boardFrameEl.addEventListener("pointerdown", handleCheckerPointerDown);
  boardFrameEl.addEventListener("pointermove", handleCheckerPointerMove);
  boardFrameEl.addEventListener("pointerup", handleCheckerPointerUp);
  boardFrameEl.addEventListener("pointercancel", cancelCheckerPointerDrag);
  boardFrameEl.addEventListener("contextmenu", (event) => {
    const isDouble = state.lastRoll.length === 2 && state.lastRoll[0] === state.lastRoll[1];
    if (state.quickMove || isDouble) {
      event.preventDefault();
    }
  });

  boardFrameEl.addEventListener("click", (event) => {
    if (ignoreNextBoardClick) {
      ignoreNextBoardClick = false;
      event.preventDefault();
      return;
    }

    const checker = event.target.closest(".checker.human");
    if (checker) {
      const sourcePoint = checker.closest(".point");
      const source = sourcePoint?.dataset.point ?? (checker.closest("#human-bar-slot") ? "bar" : null);
      if (source !== null && tryQuickMoveFromSource(source, event.button)) {
        event.preventDefault();
        return;
      }
    }

    const pointEl = event.target.closest(".point");
    if (pointEl) {
      handlePointClick(Number(pointEl.dataset.point));
      return;
    }

    if (event.target.closest(".bar-slot")?.querySelector("#human-bar-slot")) {
      handleHumanBarClick();
      return;
    }

    if (event.target.closest(".off-tray")?.querySelector("#human-off-tray")) {
      handleHumanOffClick();
      return;
    }

    handleBoardDeselect();
  });
}

function handleCheckerPointerDown(event) {
  const checker = event.target.closest(".checker.human");
  if (!checker || state.busy || state.turn !== HUMAN || state.dice.length === 0 || state.winner) {
    return;
  }

  const pointEl = checker.closest(".point");
  const source = pointEl?.dataset.point ?? (checker.closest("#human-bar-slot") ? "bar" : null);
  if (source === null || !getFirstMoves().some((move) => String(move.from) === String(source))) {
    return;
  }

  event.preventDefault();
  boardFrameEl.setPointerCapture(event.pointerId);
  activePointerDrag = {
    pointerId: event.pointerId,
    source,
    checker,
    startX: event.clientX,
    startY: event.clientY,
    dragging: false,
    ghost: null,
  };
}

function handleCheckerPointerMove(event) {
  const drag = activePointerDrag;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  if (!drag.dragging && distance < 8) {
    return;
  }

  event.preventDefault();
  if (!drag.dragging) {
    drag.dragging = true;
    drag.ghost = drag.checker.cloneNode(true);
    drag.ghost.classList.remove("selectable", "selected");
    drag.ghost.classList.add("drag-ghost");
    document.body.append(drag.ghost);
    ui.selectedFrom = null;
    ui.sourceMoves = [];
    handlePointClick(drag.source === "bar" ? "bar" : Number(drag.source));
  }

  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;
}

function handleCheckerPointerUp(event) {
  const drag = activePointerDrag;
  if (!drag || drag.pointerId !== event.pointerId) {
    return;
  }

  event.preventDefault();
  if (drag.dragging) {
    const move = findDragMove(event.clientX, event.clientY);
    if (move) {
      applyHumanMove(move);
    }
  } else {
    const autoMoved = tryQuickMoveFromSource(drag.source, event.button);
    if (!autoMoved) {
      handlePointClick(drag.source === "bar" ? "bar" : Number(drag.source));
    }
  }

  finishCheckerPointerDrag();
  ignoreNextBoardClick = true;
  window.setTimeout(() => { ignoreNextBoardClick = false; }, 0);
}

function tryQuickMoveFromSource(source, mouseButton = 0) {
  if (state.busy || state.turn !== HUMAN || state.dice.length === 0 || state.winner) {
    return false;
  }

  const isDouble = state.lastRoll.length === 2 && state.lastRoll[0] === state.lastRoll[1];
  if (!state.quickMove && !isDouble) {
    return false;
  }

  const dieIndex = !isDouble && mouseButton === 2 ? 1 : 0;
  const dieValue = state.lastRoll[dieIndex];
  const move = getFirstMoves().find(
    (candidate) => String(candidate.from) === String(source) && candidate.die === dieValue,
  );
  if (!move) {
    return false;
  }

  applyHumanMove(move);
  return true;
}

function findDragMove(x, y) {
  const target = document.elementFromPoint(x, y);
  const pointEl = target?.closest(".point");
  if (pointEl) {
    const point = Number(pointEl.dataset.point);
    return ui.sourceMoves.find((move) => move.to === point) ?? null;
  }

  const offTray = target?.closest(".off-tray");
  if (offTray?.querySelector("#human-off-tray")) {
    return ui.sourceMoves.find((move) => move.to === "off") ?? null;
  }

  const boardRect = boardEl.getBoundingClientRect();
  const droppedOutsideBoard = x < boardRect.left || x > boardRect.right || y < boardRect.top || y > boardRect.bottom;
  return droppedOutsideBoard ? ui.sourceMoves.find((move) => move.to === "off") ?? null : null;
}

function cancelCheckerPointerDrag(event) {
  if (activePointerDrag?.pointerId === event.pointerId) {
    finishCheckerPointerDrag();
  }
}

function finishCheckerPointerDrag() {
  activePointerDrag?.ghost?.remove();
  activePointerDrag = null;
}

function handleRollClick() {
  if (state.busy) {
    return;
  }

  if (state.winner) {
    gameEpoch += 1;
    const isNewMatch = state.matchWinner !== null;
    const matchScore = isNewMatch ? { [HUMAN]: 0, [AI]: 0 } : { ...state.matchScore };
    const crawfordUsed = isNewMatch ? false : state.crawfordUsed;
    const crawfordGame =
      !isNewMatch &&
      state.crawfordEnabled &&
      !crawfordUsed &&
      state.targetScore > 1 &&
      (matchScore[HUMAN] === state.targetScore - 1 || matchScore[AI] === state.targetScore - 1);
    Object.assign(state, createInitialState(), {
      autoRoll: state.autoRoll,
      quickMove: state.quickMove,
      difficulty: state.difficulty,
      matchScore,
      targetScore: state.targetScore,
      crawfordEnabled: state.crawfordEnabled,
      crawfordGame,
      crawfordUsed,
    });
    resetSelection();
  }

  if (state.dice.length > 0) {
    state.status = "Finish the current turn before rolling again.";
    render();
    return;
  }

  state.lastRoll = rollDice();
  state.dice = expandDice(state.lastRoll);
  state.turnSequences = getTurnSequences(state, state.turn);
  resetSelection();

  if (state.turn === HUMAN) {
    if (!hasPendingMoves(state.turnSequences)) {
      endTurn("No legal move available. Turn passes to the engine.");
      return;
    }
    state.status = "Choose a glowing checker, then choose a destination.";
    render();
    return;
  }

  state.status = "Engine is rolling through its options...";
  render();
  queueAiTurn();
}

function handlePointClick(point) {
  if (state.busy || state.turn !== HUMAN || state.dice.length === 0 || state.winner) {
    return;
  }

  const directMove = ui.sourceMoves.find(
    (move) => String(move.from) === ui.selectedFrom && move.to === point,
  );
  if (directMove) {
    applyHumanMove(directMove);
    return;
  }

  const possible = getFirstMoves().filter((move) => move.from === point);
  if (possible.length > 0) {
    ui.selectedFrom = String(point);
    ui.sourceMoves = possible;
    state.status = `Using die ${possible.map((move) => move.die).join(" or ")}, choose a destination.`;
    render();
  }
}

function handleHumanBarClick() {
  if (state.busy || state.turn !== HUMAN || state.bar[HUMAN] === 0 || state.dice.length === 0) {
    return;
  }

  const possible = getFirstMoves().filter((move) => move.from === "bar");
  if (possible.length > 0) {
    ui.selectedFrom = "bar";
    ui.sourceMoves = possible;
    state.status = `Re-enter from the bar using ${possible.map((move) => move.die).join(" or ")}.`;
    render();
  }
}

function handleHumanOffClick() {
  if (state.busy || state.turn !== HUMAN || state.dice.length === 0) {
    return;
  }

  const move = ui.sourceMoves.find(
    (candidate) => String(candidate.from) === ui.selectedFrom && candidate.to === "off",
  );
  if (move) {
    applyHumanMove(move);
  }
}

function handleBoardDeselect() {
  if (state.busy || state.turn !== HUMAN || state.dice.length === 0 || !ui.selectedFrom) {
    return;
  }

  resetSelection();
  state.status = "Selection cleared. Choose a glowing checker, then choose a destination.";
  render();
}

function applyHumanMove(move) {
  applyMoveToState(state, HUMAN, move);
  removeDie(move.die);
  advanceTurnSequences(move);
  resetSelection();

  if (state.off[HUMAN] >= 15) {
    finishGame(HUMAN);
    return;
  }

  if (state.dice.length === 0 || !hasPendingMoves(state.turnSequences)) {
    endTurn("Engine turn.");
    return;
  }

  state.status = "Nice. Continue using the remaining dice.";
  render();
}

function finishGame(winner) {
  const loser = -winner;
  let multiplier = 1;
  if (state.off[loser] === 0) {
    multiplier = 2;
    const loserInWinnerHome = winner === HUMAN
      ? state.points.slice(0, 6).some((point) => point < 0)
      : state.points.slice(18, 24).some((point) => point > 0);
    if (state.bar[loser] > 0 || loserInWinnerHome) {
      multiplier = 3;
    }
  }

  state.matchScore[winner] += state.cubeValue * multiplier;
  state.winner = winner;
  state.matchWinner = state.matchScore[winner] >= state.targetScore ? winner : null;
  if (state.crawfordGame) {
    state.crawfordUsed = true;
  }
  state.status = winner === HUMAN ? "You win." : "Engine wins.";
  render();
}

function endTurn(message) {
  state.dice = [];
  state.lastRoll = [];
  state.turnSequences = [];
  resetSelection();
  state.turn *= -1;
  state.status = message;
  render();

  if (state.turn === AI && !state.winner) {
    const epoch = gameEpoch;
    window.setTimeout(() => {
      if (epoch === gameEpoch) handleRollClick();
    }, 650);
  } else if (state.turn === HUMAN && state.autoRoll && !state.winner) {
    const epoch = gameEpoch;
    window.setTimeout(() => {
      if (epoch === gameEpoch && state.turn === HUMAN && !state.busy && !state.winner && state.dice.length === 0) {
        handleRollClick();
      }
    }, 350);
  }
}

function queueAiTurn() {
  state.busy = true;
  render();
  const epoch = gameEpoch;
  window.setTimeout(() => {
    if (epoch === gameEpoch) playAiTurn(epoch);
  }, 500);
}

function playAiTurn(epoch = gameEpoch) {
  if (epoch !== gameEpoch) return;
  if (state.turn !== AI || state.winner) {
    state.busy = false;
    render();
    return;
  }

  const sequences = hasPendingMoves(state.turnSequences) ? state.turnSequences : getTurnSequences(state, AI);
  if (!hasPendingMoves(sequences)) {
    state.busy = false;
    endTurn("Engine had no legal move. Your turn.");
    return;
  }

  const choice = chooseAiSequence(state, sequences, state.difficulty);
  let stepIndex = 0;

  const step = () => {
    if (epoch !== gameEpoch) return;
    const move = choice[stepIndex];
    if (!move) {
      state.busy = false;
      if (state.off[AI] >= 15) {
        finishGame(AI);
        return;
      }
      endTurn("Your turn.");
      return;
    }

    applyMoveToState(state, AI, move);
    removeDie(move.die);
    advanceTurnSequences(move);
    state.status = describeAiMove(move);
    render();
    stepIndex += 1;
    window.setTimeout(step, 420);
  };

  step();
}

function describeAiMove(move) {
  const source = move.from === "bar" ? "the bar" : `point ${move.from}`;
  const target = move.to === "off" ? "bear off" : `point ${move.to}`;
  return `Engine moves from ${source} to ${target}${move.hit ? " and hits your blot." : "."}`;
}

function getFirstMoves() {
  const unique = new Map();
  state.turnSequences.forEach((sequence) => {
    const move = sequence[0];
    if (!move) {
      return;
    }
    unique.set(`${move.from}:${move.to}:${move.die}`, move);
  });
  return [...unique.values()];
}

function resetSelection() {
  ui.selectedFrom = null;
  ui.sourceMoves = [];
}

function render() {
  difficultyOutput.value = `${state.difficulty}%`;
  difficultySlider.value = String(state.difficulty);
  autoRollCheckbox.checked = state.autoRoll;
  quickMoveCheckbox.checked = state.quickMove;
  targetScoreInput.value = String(state.targetScore);
  crawfordCheckbox.checked = state.crawfordEnabled;
  humanMatchScore.textContent = String(state.matchScore[HUMAN]);
  aiMatchScore.textContent = String(state.matchScore[AI]);
  matchTargetDisplay.textContent = String(state.targetScore);
  matchResult.hidden = state.matchWinner === null;
  matchResult.textContent = state.matchWinner === HUMAN ? "You win the match" : "Engine wins the match";
  cubeButton.textContent = String(state.cubeValue);
  const cubeAtLimit = state.cubeValue >= 64;
  cubeButton.disabled = state.winner !== null || state.crawfordGame || state.matchWinner !== null || cubeAtLimit;
  const cubeUnavailableLabel = state.crawfordGame
    ? "Doubling cube unavailable in Crawford game"
    : cubeAtLimit ? "Doubling cube maximum is 64" : `Double the cube to ${state.cubeValue * 2}`;
  cubeButton.setAttribute("aria-label", cubeUnavailableLabel);
  cubeButton.title = cubeUnavailableLabel;
  diceTray.disabled = state.busy || (!state.winner && (state.turn !== HUMAN || state.dice.length > 0));
  diceTray.classList.toggle("engine-roll", !state.winner && state.turn === AI);
  diceTray.classList.toggle("player-roll", Boolean(state.winner) || state.turn === HUMAN);
  diceTray.classList.toggle(
    "ready-to-roll",
    !state.busy &&
      (state.winner || (state.dice.length === 0 && state.turn === HUMAN && !state.autoRoll)),
  );
  const diceValues = state.lastRoll.length === 2 ? state.lastRoll.join(" and ") : "six and six";
  const diceLabel = state.winner
    ? state.matchWinner ? "Roll to start a new match" : "Roll to start a new game"
    : state.lastRoll.length === 2
      ? `${state.turn === AI ? "Computer's dice show" : "Your dice show"} ${diceValues}`
      : state.turn === AI ? "Computer dice" : "Roll your dice";
  diceTray.setAttribute("aria-label", diceLabel);
  renderDice();
  renderPoints();
  renderSpecialStacks();
  persistState();
}

function renderDice() {
  diceTray.innerHTML = "";
  const isIdle = state.winner !== null || state.lastRoll.length !== 2;
  const rolledDice = isIdle ? [6, 6] : state.lastRoll;
  const isDouble = !isIdle && state.lastRoll[0] === state.lastRoll[1];
  const pool = [...state.dice];
  rolledDice.forEach((value) => {
    const dieEl = dieTemplate.content.firstElementChild.cloneNode(true);
    const index = pool.indexOf(value);
    if (!isIdle && index === -1) {
      dieEl.classList.add("used");
    } else if (!isIdle && !isDouble) {
      pool.splice(index, 1);
    }
    DIE_PIP_LAYOUTS[value].forEach(([row, column]) => {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.style.gridRow = String(row);
      pip.style.gridColumn = String(column);
      dieEl.append(pip);
    });
    diceTray.append(dieEl);
  });
}

function renderPoints() {
  const firstMoves = getFirstMoves();
  const sourceSet = new Set(firstMoves.map((move) => String(move.from)));
  const targetSet = new Set(
    ui.sourceMoves
      .filter((move) => String(move.from) === ui.selectedFrom)
      .map((move) => String(move.to)),
  );

  document.querySelectorAll(".point").forEach((pointEl) => {
    const point = Number(pointEl.dataset.point);
    const stack = pointEl.querySelector(".checker-stack");
    stack.innerHTML = "";
    pointEl.classList.remove("interactive", "move-target");

    const count = state.points[point - 1];
    const owner = Math.sign(count);
    const amount = Math.abs(count);
    for (let index = 0; index < amount; index += 1) {
      const checker = document.createElement("div");
      checker.className = `checker ${owner === HUMAN ? "human" : "ai"}`;
      if (owner === HUMAN && state.turn === HUMAN && sourceSet.has(String(point)) && index === amount - 1) {
        checker.classList.add("selectable");
        if (ui.selectedFrom === String(point)) {
          checker.classList.add("selected");
        }
      }
      stack.append(checker);
    }

    if (sourceSet.has(String(point)) && state.turn === HUMAN) {
      pointEl.classList.add("interactive");
    }
    if (targetSet.has(String(point))) {
      pointEl.classList.add("interactive", "move-target");
    }
  });

  const humanBarWrap = humanBarSlot.parentElement;
  const humanOffWrap = humanOffTray.parentElement;
  const barSelectable = sourceSet.has("bar");
  humanBarWrap.classList.toggle("interactive", barSelectable);
  if (ui.selectedFrom === "bar") {
    humanBarWrap.classList.add("interactive");
  }
  humanBarWrap.classList.remove("move-target");
  humanOffWrap.classList.toggle("interactive", targetSet.has("off"));
  humanOffWrap.classList.toggle("move-target", targetSet.has("off"));
}

function renderSpecialStacks() {
  const humanCanEnter =
    state.turn === HUMAN &&
    !state.busy &&
    !state.winner &&
    state.dice.length > 0 &&
    getFirstMoves().some((move) => move.from === "bar");
  renderStack(humanBarSlot, state.bar[HUMAN], "human", humanCanEnter);
  renderStack(aiBarSlot, state.bar[AI], "ai");
  renderStack(humanOffTray, state.off[HUMAN], "human");
  renderStack(aiOffTray, state.off[AI], "ai");
}

function renderStack(container, count, className, selectable = false) {
  container.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    const checker = document.createElement("div");
    checker.className = `checker ${className}`;
    if (selectable && index === count - 1) {
      checker.classList.add("selectable");
    }
    container.append(checker);
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

function rollDice() {
  return [secureDie(), secureDie()];
}

function secureDie() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    const max = 0xffffffff;
    const limit = max - ((max + 1) % 6);
    let value = max;
    while (value >= limit) {
      window.crypto.getRandomValues(values);
      value = values[0];
    }
    return (value % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

function randomFraction() {
  if (window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }
  return Math.random();
}

function expandDice([first, second]) {
  return first === second ? [first, first, first, first] : [first, second];
}

function cloneGameState(game) {
  return {
    points: [...game.points],
    bar: { [HUMAN]: game.bar[HUMAN], [AI]: game.bar[AI] },
    off: { [HUMAN]: game.off[HUMAN], [AI]: game.off[AI] },
    turn: game.turn,
    dice: [...game.dice],
    lastRoll: [...game.lastRoll],
    turnSequences: [],
    status: game.status,
    winner: game.winner,
    busy: false,
    difficulty: game.difficulty,
  };
}

function getTurnSequences(game, player) {
  const raw = collectSequences(cloneGameState(game), player, [...game.dice]);
  const maxMoves = raw.reduce((best, sequence) => Math.max(best, sequence.length), 0);
  if (maxMoves === 0) {
    return [];
  }
  let filtered = raw.filter((sequence) => sequence.length === maxMoves);
  if (maxMoves === 1 && game.dice.length === 2 && game.dice[0] !== game.dice[1]) {
    const highDie = Math.max(...game.dice);
    const highOnly = filtered.filter((sequence) => sequence[0]?.die === highDie);
    if (highOnly.length > 0) {
      filtered = highOnly;
    }
  }
  return dedupeSequences(filtered);
}

function collectSequences(game, player, remainingDice) {
  const sequences = [];
  let foundMove = false;
  const seenValues = new Set();

  for (let index = 0; index < remainingDice.length; index += 1) {
    const die = remainingDice[index];
    if (seenValues.has(die)) {
      continue;
    }
    seenValues.add(die);
    const moves = getLegalSingleMoves(game, player, die);
    if (moves.length === 0) {
      continue;
    }
    foundMove = true;
    moves.forEach((move) => {
      const nextGame = cloneGameState(game);
      applyMoveToState(nextGame, player, move);
      const nextDice = remainingDice.filter((_, dieIndex) => dieIndex !== index);
      collectSequences(nextGame, player, nextDice).forEach((tail) => {
        sequences.push([move, ...tail]);
      });
    });
  }

  return foundMove ? sequences : [[]];
}

function dedupeSequences(sequences) {
  const unique = new Map();
  sequences.forEach((sequence) => {
    const key = sequence.map((move) => `${move.from}:${move.to}:${move.die}`).join("|");
    unique.set(key, sequence);
  });
  return [...unique.values()];
}

function getLegalSingleMoves(game, player, die) {
  const moves = [];
  if (game.bar[player] > 0) {
    const barMove = getBarMove(game, player, die);
    return barMove ? [barMove] : [];
  }

  for (let point = 1; point <= 24; point += 1) {
    if (Math.sign(game.points[point - 1]) !== player) {
      continue;
    }
    const move = getPointMove(game, player, point, die);
    if (move) {
      moves.push(move);
    }
  }
  return moves;
}

function getBarMove(game, player, die) {
  const target = player === HUMAN ? 25 - die : die;
  if (isBlocked(game, player, target)) {
    return null;
  }
  return {
    from: "bar",
    to: target,
    die,
    hit: game.points[target - 1] === -player,
  };
}

function getPointMove(game, player, point, die) {
  const destination = player === HUMAN ? point - die : point + die;
  if (destination >= 1 && destination <= 24) {
    if (isBlocked(game, player, destination)) {
      return null;
    }
    return {
      from: point,
      to: destination,
      die,
      hit: game.points[destination - 1] === -player,
    };
  }

  if (!canBearOff(game, player)) {
    return null;
  }

  if (player === HUMAN) {
    if (destination === 0) {
      return { from: point, to: "off", die, hit: false };
    }
    if (destination < 0 && !hasHigherChecker(game, player, point)) {
      return { from: point, to: "off", die, hit: false };
    }
    return null;
  }

  if (destination === 25) {
    return { from: point, to: "off", die, hit: false };
  }
  if (destination > 25 && !hasHigherChecker(game, player, point)) {
    return { from: point, to: "off", die, hit: false };
  }
  return null;
}

function isBlocked(game, player, point) {
  return Math.sign(game.points[point - 1]) === -player && Math.abs(game.points[point - 1]) >= 2;
}

function canBearOff(game, player) {
  if (game.bar[player] > 0) {
    return false;
  }
  if (player === HUMAN) {
    for (let point = 7; point <= 24; point += 1) {
      if (game.points[point - 1] > 0) {
        return false;
      }
    }
    return true;
  }
  for (let point = 1; point <= 18; point += 1) {
    if (game.points[point - 1] < 0) {
      return false;
    }
  }
  return true;
}

function hasHigherChecker(game, player, point) {
  if (player === HUMAN) {
    for (let current = point + 1; current <= 6; current += 1) {
      if (game.points[current - 1] > 0) {
        return true;
      }
    }
    return false;
  }
  for (let current = point - 1; current >= 19; current -= 1) {
    if (game.points[current - 1] < 0) {
      return true;
    }
  }
  return false;
}

function applyMoveToState(game, player, move) {
  if (move.from === "bar") {
    game.bar[player] -= 1;
  } else {
    game.points[move.from - 1] -= player;
  }

  if (move.to === "off") {
    game.off[player] += 1;
    return;
  }

  if (Math.sign(game.points[move.to - 1]) === -player && Math.abs(game.points[move.to - 1]) === 1) {
    game.points[move.to - 1] = 0;
    game.bar[-player] += 1;
  }
  game.points[move.to - 1] += player;
}

function removeDie(die) {
  const index = state.dice.indexOf(die);
  if (index !== -1) {
    state.dice.splice(index, 1);
  }
}

function advanceTurnSequences(move) {
  const next = [];
  state.turnSequences.forEach((sequence) => {
    const first = sequence[0];
    if (first && movesEqual(first, move)) {
      const remainder = sequence.slice(1);
      if (remainder.length > 0) {
        next.push(remainder);
      }
    }
  });
  state.turnSequences = dedupeSequences(next);
}

function hasPendingMoves(sequences) {
  return sequences.some((sequence) => sequence.length > 0);
}

function movesEqual(left, right) {
  return left.from === right.from && left.to === right.to && left.die === right.die;
}

function chooseAiSequence(game, sequences, difficulty) {
  if (difficulty <= 10) {
    return sequences[Math.floor(randomFraction() * sequences.length)];
  }

  const scored = sequences.map((sequence) => {
    const next = cloneGameState(game);
    sequence.forEach((move) => applyMoveToState(next, AI, move));
    return {
      sequence,
      score: evaluatePosition(next, difficulty),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const chaos = (100 - difficulty) / 100;
  const topWindow = Math.min(
    scored.length,
    Math.max(1, Math.round(1 + chaos * Math.max(2, scored.length * 0.35))),
  );
  return scored[Math.floor(randomFraction() * topWindow)].sequence;
}

function evaluatePosition(game, difficulty) {
  const aiPips = pipCount(game, AI);
  const humanPips = pipCount(game, HUMAN);
  const aiBlots = countBlots(game, AI);
  const humanBlots = countBlots(game, HUMAN);
  const aiHome = countMadePoints(game, AI, 19, 24);
  const humanHome = countMadePoints(game, HUMAN, 1, 6);
  const aiPrime = longestPrime(game, AI);
  const humanPrime = longestPrime(game, HUMAN);
  const anchorScore = countAnchors(game, AI) - countAnchors(game, HUMAN);
  const exposureGap = countExposedToHit(game, AI) - countExposedToHit(game, HUMAN);

  let score =
    (game.off[AI] - game.off[HUMAN]) * 140 +
    (game.bar[HUMAN] - game.bar[AI]) * 36 +
    (humanPips - aiPips) * 0.42 +
    (humanBlots - aiBlots) * 8 +
    (aiHome - humanHome) * 9 +
    (aiPrime - humanPrime) * 11 +
    anchorScore * 5 -
    exposureGap * 4;

  if (difficulty >= 80) {
    score += evaluateRaceAdvantage(game) * 0.6;
  }

  score += (randomFraction() - 0.5) * (100 - difficulty) * 1.8;
  return score;
}

function evaluateRaceAdvantage(game) {
  return (
    countCheckersInZone(game, AI, 19, 24) * 8 -
    countCheckersInZone(game, HUMAN, 1, 6) * 8 +
    countCheckersInZone(game, AI, 13, 18) * 2 -
    countCheckersInZone(game, HUMAN, 7, 12) * 2
  );
}

function pipCount(game, player) {
  let total = game.bar[player] * 25;
  for (let point = 1; point <= 24; point += 1) {
    const count = player === HUMAN ? Math.max(game.points[point - 1], 0) : Math.max(-game.points[point - 1], 0);
    if (count === 0) {
      continue;
    }
    const distance = player === HUMAN ? point : 25 - point;
    total += count * distance;
  }
  return total;
}

function countBlots(game, player) {
  let total = 0;
  for (let point = 1; point <= 24; point += 1) {
    const count = player === HUMAN ? game.points[point - 1] : -game.points[point - 1];
    if (count === 1) {
      total += 1;
    }
  }
  return total;
}

function countMadePoints(game, player, start, end) {
  let total = 0;
  for (let point = start; point <= end; point += 1) {
    const count = player === HUMAN ? game.points[point - 1] : -game.points[point - 1];
    if (count >= 2) {
      total += 1;
    }
  }
  return total;
}

function longestPrime(game, player) {
  let best = 0;
  let current = 0;
  for (let point = 1; point <= 24; point += 1) {
    const count = player === HUMAN ? game.points[point - 1] : -game.points[point - 1];
    if (count >= 2) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function countAnchors(game, player) {
  return player === AI ? countMadePoints(game, AI, 1, 6) : countMadePoints(game, HUMAN, 19, 24);
}

function countExposedToHit(game, player) {
  let exposed = 0;
  for (let point = 1; point <= 24; point += 1) {
    const count = player === HUMAN ? game.points[point - 1] : -game.points[point - 1];
    if (count !== 1) {
      continue;
    }
    if (canBeHitFromBehind(game, player, point)) {
      exposed += 1;
    }
  }
  return exposed;
}

function canBeHitFromBehind(game, player, point) {
  if (player === HUMAN) {
    for (let current = Math.max(1, point - 6); current < point; current += 1) {
      if (game.points[current - 1] < 0) {
        return true;
      }
    }
    return false;
  }
  for (let current = point + 1; current <= Math.min(24, point + 6); current += 1) {
    if (game.points[current - 1] > 0) {
      return true;
    }
  }
  return false;
}

function countCheckersInZone(game, player, start, end) {
  let total = 0;
  for (let point = start; point <= end; point += 1) {
    total += player === HUMAN ? Math.max(game.points[point - 1], 0) : Math.max(-game.points[point - 1], 0);
  }
  return total;
}

function isValidDie(value) {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
