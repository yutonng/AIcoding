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
  { value: -2, label: "强烈同意" },
  { value: -1, label: "同意" },
  { value: 0, label: "中性" },
  { value: 1, label: "同意" },
  { value: 2, label: "强烈同意" },
];

const progressBadge = document.querySelector("#progressBadge");
const questionTitle = document.querySelector("#questionTitle");
const leftPrompt = document.querySelector("#leftPrompt");
const rightPrompt = document.querySelector("#rightPrompt");
const optionsList = document.querySelector("#optionsList");
const finishEarlyBtn = document.querySelector("#finishEarlyBtn");
const debugToggleBtn = document.querySelector("#debugToggleBtn");
const debugMenu = document.querySelector("#debugMenu");
const quizPanel = document.querySelector("#quizPanel");
const resultPanel = document.querySelector("#resultPanel");
const progressFill = document.querySelector("#progressFill");
const domainBoards = document.querySelector("#domainBoards");
const domainDistributionBar = document.querySelector("#domainDistributionBar");
const domainDistributionLegend = document.querySelector("#domainDistributionLegend");
const fixedOrderBtn = document.querySelector("#fixedOrderBtn");
const rankOrderBtn = document.querySelector("#rankOrderBtn");
const restartBtn = document.querySelector("#restartBtn");
const topFiveList = document.querySelector("#topFiveList");

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
        <button class="option-button option-${String(option.value).replace("-", "n")}" type="button" data-value="${option.value}">
          <span class="option-copy">${option.label}</span>
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

function renderTopFive(ranking) {
  if (!topFiveList) {
    return;
  }

  const topThemes = ranking.slice(0, 5);
  topFiveList.innerHTML = topThemes
    .map((theme) => {
      const domain = domainDefinitions[theme.domain] || { accent: "#1f1d1a", label: theme.domain };
      return `
        <article class="top-five-card" style="--accent:${domain.accent};">
          <span class="top-five-rank">#${theme.rank}</span>
          <strong class="top-five-name">${theme.displayName}</strong>
          <span class="top-five-domain">${domain.label}</span>
        </article>
      `;
    })
    .join("");
}

function renderDomainBoards(ranking) {
  if (!domainBoards) {
    return;
  }

  if (matrixDisplayMode === "rank") {
    const maxScore = ranking[0]?.score || 1;
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
      const value = Number(((maxScore / tickCount) * (tickCount - index)).toFixed(1));
      return {
        value,
        ratio: (index / tickCount) * 100,
      };
    });
    const domainOrder = ["Executing", "Influencing", "RelationshipBuilding", "StrategicThinking"];
    domainBoards.className = "domain-boards rank-chart";
    domainBoards.innerHTML = `
      <section class="rank-chart-panel">
        <div class="rank-chart-legend">
          ${domainOrder
            .map((domainKey) => {
              const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a", label: domainKey };
              return `
                <span class="rank-chart-legend-item">
                  <i class="rank-chart-legend-dot" style="--accent:${domain.accent};"></i>
                  <span>${domain.label}</span>
                </span>
              `;
            })
            .join("")}
        </div>
        <div class="rank-chart-frame">
          <div class="rank-chart-yaxis">
            ${ticks
              .map(
                (tick) => `
                  <span class="rank-chart-yaxis-label">${tick.value}</span>
                `,
              )
              .join("")}
          </div>
          <div class="rank-chart-plot">
            <div class="rank-chart-grid">
              ${ticks
                .map(
                  (tick) => `
                    <span class="rank-chart-grid-line" style="top:${tick.ratio}%"></span>
                  `,
                )
                .join("")}
            </div>
            <div class="rank-chart-groups">
              ${domainOrder
                .map((domainKey) => {
                  const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a", label: domainKey };
                  const themes = ranking.filter((theme) => theme.domain === domainKey);
                  return `
                    <section class="rank-chart-group" style="--accent:${domain.accent}; --group-size:${themes.length};">
                      <div class="rank-chart-columns rank-chart-columns-${domainKey}">
                        ${themes
                          .map((theme) => {
                            const height = `${Math.max((theme.score / maxScore) * 100, 8).toFixed(2)}%`;
                            return `
                              <article class="rank-column" title="${theme.displayName} · ${domain.label} · ${theme.score}">
                                <div class="rank-column-value">${theme.score}</div>
                                <div class="rank-column-track">
                                  <div class="rank-column-fill" style="height:${height};"></div>
                                </div>
                                <div class="rank-column-meta">
                                  <span class="rank-column-rank">${theme.rank}</span>
                                  <strong class="rank-column-name">${theme.displayName}</strong>
                                </div>
                              </article>
                            `;
                          })
                          .join("")}
                      </div>
                      <div class="rank-chart-group-label">${domain.label}</div>
                    </section>
                  `;
                })
                .join("")}
            </div>
          </div>
        </div>
      </section>
    `;
    return;
  }

  const domainOrder = ["Executing", "Influencing", "RelationshipBuilding", "StrategicThinking"];
  const rankingMap = Object.fromEntries(ranking.map((theme) => [theme.key, theme]));
  domainBoards.className = "domain-boards report-style";

  domainBoards.innerHTML = domainOrder
    .map((domainKey) => {
      const domain = domainDefinitions[domainKey] || { accent: "#1f1d1a", soft: "#f3efe7", label: domainKey };
      const themes = (domainThemeOrder[domainKey] || []).map((themeKey) => rankingMap[themeKey]).filter(Boolean);
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

function setDebugMenu(open) {
  if (!debugMenu || !debugToggleBtn) {
    return;
  }

  debugMenu.classList.toggle("hidden", !open);
  debugToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
}

function showResults() {
  const ranking = calculateThemeRanking();

  if (ranking.length > 0) {
    renderDomainDistribution(ranking);
    renderTopFive(ranking);
    renderDomainBoards(ranking);
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

if (debugToggleBtn) {
  debugToggleBtn.addEventListener("click", () => {
    const isHidden = !debugMenu || debugMenu.classList.contains("hidden");
    setDebugMenu(isHidden);
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
