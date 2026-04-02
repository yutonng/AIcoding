const rawQuestions = Array.isArray(window.__STRENGTHS_FINDER_QUESTIONS__)
  ? window.__STRENGTHS_FINDER_QUESTIONS__
  : [];
const model = window.__STRENGTHS_FINDER_MODEL__ || {};

let questions = rawQuestions;
let themeDefinitions = [];
let domainDefinitions = {};

try {
  questions = typeof model.enrichQuestions === "function" ? model.enrichQuestions(rawQuestions) : rawQuestions;
  themeDefinitions = Array.isArray(model.themeDefinitions) ? model.themeDefinitions : [];
  domainDefinitions = model.domainDefinitions || {};
} catch (error) {
  console.error("Strengths Finder model failed, falling back to raw questions.", error);
  questions = rawQuestions;
  themeDefinitions = [];
  domainDefinitions = {};
}

const optionDefinitions = [
  { value: -2, label: "左侧的描述完全符合自己" },
  { value: -1, label: "左侧的描述更符合自己" },
  { value: 0, label: "中性" },
  { value: 1, label: "右侧的描述更符合自己" },
  { value: 2, label: "右侧的描述完全符合自己" },
];

const introPanel = document.querySelector(".intro-panel");
const progressBadge = document.querySelector("#progressBadge");
const questionTitle = document.querySelector("#questionTitle");
const leftPrompt = document.querySelector("#leftPrompt");
const rightPrompt = document.querySelector("#rightPrompt");
const optionsList = document.querySelector("#optionsList");
const finishEarlyBtn = document.querySelector("#finishEarlyBtn");
const quizPanel = document.querySelector("#quizPanel");
const resultPanel = document.querySelector("#resultPanel");
const progressFill = document.querySelector("#progressFill");
const domainBoards = document.querySelector("#domainBoards");
const domainDistributionBar = document.querySelector("#domainDistributionBar");
const domainDistributionLegend = document.querySelector("#domainDistributionLegend");
const fixedOrderBtn = document.querySelector("#fixedOrderBtn");
const rankOrderBtn = document.querySelector("#rankOrderBtn");
const restartBtn = document.querySelector("#restartBtn");

const domainThemeOrder = {
  Executing: ["Achiever", "Arranger", "Belief", "Deliberative", "Discipline", "Consistency", "Focus", "Responsibility", "Restorative"],
  Influencing: ["Activator", "Command", "Communication", "Competition", "Maximizer", "SelfAssurance", "Significance", "Woo"],
  RelationshipBuilding: ["Adaptability", "Connectedness", "Developer", "Empathy", "Harmony", "Includer", "Individualization", "Positivity", "Relator"],
  StrategicThinking: ["Analytical", "Context", "Futuristic", "Ideation", "Input", "Intellection", "Learner", "Strategic"],
};

let answers = [];
let currentIndex = 0;
let autoFilledCount = 0;
let matrixDisplayMode = "fixed";

function randomChoice(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const buffer = new Uint32Array(1);
    window.crypto.getRandomValues(buffer);
    return items[buffer[0] % items.length];
  }

  return items[Math.floor(Math.random() * items.length)];
}

function createEmptyState() {
  answers = questions.map(() => null);
  currentIndex = 0;
  autoFilledCount = 0;
}

function answeredCount() {
  return answers.filter((answer) => answer !== null).length;
}

function progressRatio() {
  if (questions.length === 0) {
    return 0;
  }
  return answeredCount() / questions.length;
}

function updateProgress() {
  if (progressBadge) {
    progressBadge.textContent = `${answeredCount()} / ${questions.length}`;
  }

  if (progressFill) {
    progressFill.style.width = `${progressRatio() * 100}%`;
  }
}

function renderQuestion() {
  const question = questions[currentIndex];
  if (!question) {
    if (questionTitle) {
      questionTitle.textContent = "题库加载失败";
    }
    if (leftPrompt) {
      leftPrompt.textContent = "当前没有可显示的题目，请刷新页面后重试。";
    }
    if (rightPrompt) {
      rightPrompt.textContent = "如果问题持续存在，我可以继续帮你排查。";
    }
    if (optionsList) {
      optionsList.innerHTML = "";
    }
    return;
  }

  if (questionTitle) {
    questionTitle.textContent = `第 ${question.id} 题`;
  }
  if (leftPrompt) {
    leftPrompt.textContent = question.leftText;
  }
  if (rightPrompt) {
    rightPrompt.textContent = question.rightText;
  }
  if (!optionsList) {
    return;
  }

  optionsList.innerHTML = optionDefinitions
    .map(
      (option) => `
        <button class="option-button" type="button" data-value="${option.value}">
          <span class="option-score">${option.value === 0 ? "·" : option.value < 0 ? `L${Math.abs(option.value)}` : `R${option.value}`}</span>
          <span>${option.label}</span>
        </button>
      `,
    )
    .join("");
}

function createEmptyThemeScores() {
  return Object.fromEntries(themeDefinitions.map((theme) => [theme.key, 0]));
}

function addSignals(scoreMap, signals, factor) {
  signals.forEach((signal) => {
    scoreMap[signal.theme] += signal.weight * factor;
  });
}

function calculateThemeRanking() {
  if (themeDefinitions.length === 0) {
    return [];
  }

  const scoreMap = createEmptyThemeScores();

  questions.forEach((question, index) => {
    const answer = answers[index];
    if (answer === null) {
      return;
    }

    if (answer < 0) {
      addSignals(scoreMap, question.leftSignals || [], Math.abs(answer));
      return;
    }

    if (answer > 0) {
      addSignals(scoreMap, question.rightSignals || [], Math.abs(answer));
      return;
    }

    addSignals(scoreMap, question.leftSignals || [], 0.35);
    addSignals(scoreMap, question.rightSignals || [], 0.35);
  });

  return themeDefinitions
    .map((theme) => ({
      ...theme,
      score: Number((scoreMap[theme.key] || 0).toFixed(2)),
    }))
    .sort((a, b) => b.score - a.score)
    .map((theme, index) => ({
      ...theme,
      rank: index + 1,
    }));
}

function getIntensityClass(rank) {
  if (rank <= 3) {
    return "tier-1";
  }
  if (rank <= 6) {
    return "tier-2";
  }
  if (rank <= 10) {
    return "tier-3";
  }
  if (rank <= 15) {
    return "tier-4";
  }
  if (rank <= 21) {
    return "tier-5";
  }
  if (rank <= 27) {
    return "tier-6";
  }
  return "tier-7";
}

function renderDomainDistribution(ranking) {
  if (!domainDistributionBar || !domainDistributionLegend) {
    return;
  }

  const domainOrder = ["RelationshipBuilding", "StrategicThinking", "Executing", "Influencing"];
  const totals = Object.fromEntries(domainOrder.map((key) => [key, 0]));

  ranking.forEach((theme) => {
    totals[theme.domain] += theme.score;
  });

  const totalScore = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;

  domainDistributionBar.innerHTML = domainOrder
    .map((domainKey) => {
      const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a" };
      const width = ((totals[domainKey] / totalScore) * 100).toFixed(2);
      return `<div class="distribution-segment" style="--accent:${domain.accent}; width:${width}%"></div>`;
    })
    .join("");

  domainDistributionLegend.innerHTML = domainOrder
    .map((domainKey) => {
      const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a", label: domainKey };
      const width = ((totals[domainKey] / totalScore) * 100).toFixed(2);
      return `
        <div class="distribution-legend-item" style="--accent:${domain.accent}; width:${width}%">
          <span class="distribution-label">${domain.label}</span>
          <span class="distribution-value">${width}%</span>
        </div>
      `;
    })
    .join("");
}

function renderDomainBoards(ranking) {
  if (!domainBoards) {
    return;
  }

  const domainOrder = ["Executing", "Influencing", "RelationshipBuilding", "StrategicThinking"];
  const rankingMap = Object.fromEntries(ranking.map((theme) => [theme.key, theme]));

  domainBoards.innerHTML = domainOrder
    .map((domainKey) => {
      const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a", soft: "#f3efe7", label: domainKey };
      const themes =
        matrixDisplayMode === "rank"
          ? ranking.filter((theme) => theme.domain === domainKey)
          : (domainThemeOrder[domainKey] || []).map((themeKey) => rankingMap[themeKey]).filter(Boolean);
      const cards = themes
        .map(
          (theme) => `
            <article class="theme-tile ${getIntensityClass(theme.rank)}" style="--accent:${domain.accent}; --soft:${domain.soft};">
              <span class="theme-rank">${theme.rank}</span>
              <strong>${theme.displayName}</strong>
            </article>
          `,
        )
        .join("");

      return `
        <section class="domain-board">
          <div class="domain-board-head" style="--accent:${domain.accent};">
            <h4>${domain.label}</h4>
          </div>
          <div class="theme-tile-grid">
            ${cards}
          </div>
        </section>
      `;
    })
    .join("");
}

function showResults() {
  const ranking = calculateThemeRanking();

  if (ranking.length > 0) {
    renderDomainDistribution(ranking);
    renderDomainBoards(ranking);
  }

  if (introPanel) {
    introPanel.classList.add("hidden");
  }
  if (quizPanel) {
    quizPanel.classList.add("hidden");
  }
  if (resultPanel) {
    resultPanel.classList.remove("hidden");
  }
}

function goToNextQuestion() {
  if (currentIndex >= questions.length - 1) {
    showResults();
    return;
  }

  currentIndex += 1;
  updateProgress();
  renderQuestion();
}

function answerQuestion(score) {
  answers[currentIndex] = score;
  updateProgress();
  goToNextQuestion();
}

function finishEarly() {
  answers = answers.map((answer) => {
    if (answer !== null) {
      return answer;
    }
    autoFilledCount += 1;
    return randomChoice([-2, -1, 0, 1, 2]);
  });

  updateProgress();
  showResults();
}

function restartQuiz() {
  createEmptyState();
  matrixDisplayMode = "fixed";
  updateMatrixModeButtons();
  if (introPanel) {
    introPanel.classList.remove("hidden");
  }
  if (resultPanel) {
    resultPanel.classList.add("hidden");
  }
  if (quizPanel) {
    quizPanel.classList.remove("hidden");
  }
  updateProgress();
  renderQuestion();
}

if (optionsList) {
  optionsList.addEventListener("click", (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest("[data-value]") : null;
    if (!target) {
      return;
    }

    const score = Number(target.getAttribute("data-value"));
    if (!Number.isInteger(score)) {
      return;
    }

    answerQuestion(score);
  });
}

if (finishEarlyBtn) {
  finishEarlyBtn.addEventListener("click", () => {
    finishEarly();
  });
}

if (restartBtn) {
  restartBtn.addEventListener("click", () => {
    restartQuiz();
  });
}

function updateMatrixModeButtons() {
  if (fixedOrderBtn) {
    fixedOrderBtn.classList.toggle("active", matrixDisplayMode === "fixed");
  }
  if (rankOrderBtn) {
    rankOrderBtn.classList.toggle("active", matrixDisplayMode === "rank");
  }
}

if (fixedOrderBtn) {
  fixedOrderBtn.addEventListener("click", () => {
    matrixDisplayMode = "fixed";
    updateMatrixModeButtons();
    if (!resultPanel || resultPanel.classList.contains("hidden")) {
      return;
    }
    renderDomainBoards(calculateThemeRanking());
  });
}

if (rankOrderBtn) {
  rankOrderBtn.addEventListener("click", () => {
    matrixDisplayMode = "rank";
    updateMatrixModeButtons();
    if (!resultPanel || resultPanel.classList.contains("hidden")) {
      return;
    }
    renderDomainBoards(calculateThemeRanking());
  });
}

updateMatrixModeButtons();
createEmptyState();
updateProgress();
renderQuestion();
