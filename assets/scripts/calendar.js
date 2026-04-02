const CALENDAR_YEAR = 2026;

const usRecordsInput = document.querySelector("#usRecordsInput");
const chinaRecordsInput = document.querySelector("#chinaRecordsInput");
const usPreviewList = document.querySelector("#usPreviewList");
const chinaPreviewList = document.querySelector("#chinaPreviewList");
const usPreviewCount = document.querySelector("#usPreviewCount");
const chinaPreviewCount = document.querySelector("#chinaPreviewCount");
const runAllOcrBtn = document.querySelector("#runAllOcrBtn");
const asOfDate = document.querySelector("#asOfDate");
const segmentList = document.querySelector("#segmentList");
const leaveStartInput = document.querySelector("#leaveStartInput");
const leaveEndInput = document.querySelector("#leaveEndInput");
const addLeaveBtn = document.querySelector("#addLeaveBtn");
const leaveList = document.querySelector("#leaveList");

const outputs = {
  daysElapsedDisplay: document.querySelector("#daysElapsedDisplay"),
  daysInUsDisplay: document.querySelector("#daysInUsDisplay"),
  daysInChinaDisplay: document.querySelector("#daysInChinaDisplay"),
  daysInOtherDisplay: document.querySelector("#daysInOtherDisplay"),
  businessDaysElapsedDisplay: document.querySelector("#businessDaysElapsedDisplay"),
  businessDaysInUsDisplay: document.querySelector("#businessDaysInUsDisplay"),
  businessDaysInChinaDisplay: document.querySelector("#businessDaysInChinaDisplay"),
  businessDaysInOtherDisplay: document.querySelector("#businessDaysInOtherDisplay"),
};

const uploads = {
  us: [],
  china: [],
};

const ocrResults = {
  us: [],
  china: [],
};

let staySegments = [];
let leaveRanges = [];

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function clampPeriodEnd() {
  const today = new Date();
  const yearStart = new Date(Date.UTC(CALENDAR_YEAR, 0, 1));
  const yearEnd = new Date(Date.UTC(CALENDAR_YEAR, 11, 31));
  const todayUtc = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

  if (todayUtc < yearStart) {
    return null;
  }

  return todayUtc > yearEnd ? yearEnd : todayUtc;
}

function nthWeekdayOfMonth(year, monthIndex, weekday, occurrence) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const offset = (7 + weekday - firstDay.getUTCDay()) % 7;
  return new Date(Date.UTC(year, monthIndex, 1 + offset + (occurrence - 1) * 7));
}

function lastWeekdayOfMonth(year, monthIndex, weekday) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const offset = (7 + lastDay.getUTCDay() - weekday) % 7;
  return new Date(Date.UTC(year, monthIndex, lastDay.getUTCDate() - offset));
}

function observedHoliday(date) {
  const weekday = date.getUTCDay();
  if (weekday === 6) {
    return addDays(date, -1);
  }
  if (weekday === 0) {
    return addDays(date, 1);
  }
  return date;
}

function getUsFederalHolidaySet(year) {
  const holidays = [
    observedHoliday(new Date(Date.UTC(year, 0, 1))),
    nthWeekdayOfMonth(year, 0, 1, 3),
    nthWeekdayOfMonth(year, 1, 1, 3),
    lastWeekdayOfMonth(year, 4, 1),
    observedHoliday(new Date(Date.UTC(year, 5, 19))),
    observedHoliday(new Date(Date.UTC(year, 6, 4))),
    nthWeekdayOfMonth(year, 8, 1, 1),
    nthWeekdayOfMonth(year, 9, 1, 2),
    observedHoliday(new Date(Date.UTC(year, 10, 11))),
    nthWeekdayOfMonth(year, 10, 4, 4),
    observedHoliday(new Date(Date.UTC(year, 11, 25))),
  ];

  return new Set(holidays.map(formatIsoDate));
}

function isUsBusinessDay(date, holidaySet) {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) {
    return false;
  }
  return !holidaySet.has(formatIsoDate(date));
}

function resolveLocationForDate(dateString, segments) {
  const hits = segments.filter((segment) => segment.start <= dateString && segment.end >= dateString);

  if (hits.some((segment) => segment.country === "US")) {
    return "US";
  }
  if (hits.some((segment) => segment.country === "CN")) {
    return "CN";
  }
  if (hits.some((segment) => segment.country === "OTHER")) {
    return "OTHER";
  }
  return "OTHER";
}

function calculateStats() {
  const periodStart = new Date(Date.UTC(CALENDAR_YEAR, 0, 1));
  const periodEnd = clampPeriodEnd();
  const holidaySet = getUsFederalHolidaySet(CALENDAR_YEAR);
  const leaveDateSet = buildLeaveDateSet();

  if (!periodEnd) {
    return {
      daysElapsed: 0,
      daysInUs: 0,
      daysInChina: 0,
      daysInOther: 0,
      businessDaysElapsed: 0,
      businessDaysInUs: 0,
      businessDaysInChina: 0,
      businessDaysInOther: 0,
    };
  }

  let cursor = new Date(periodStart);
  const totals = {
    daysElapsed: 0,
    daysInUs: 0,
    daysInChina: 0,
    daysInOther: 0,
    businessDaysElapsed: 0,
    businessDaysInUs: 0,
    businessDaysInChina: 0,
    businessDaysInOther: 0,
  };

  while (cursor <= periodEnd) {
    const dateString = formatIsoDate(cursor);
    const location = resolveLocationForDate(dateString, staySegments);

    totals.daysElapsed += 1;
    if (location === "US") {
      totals.daysInUs += 1;
    } else if (location === "CN") {
      totals.daysInChina += 1;
    } else {
      totals.daysInOther += 1;
    }

    if (isUsBusinessDay(cursor, holidaySet) && !leaveDateSet.has(dateString)) {
      totals.businessDaysElapsed += 1;
      if (location === "US") {
        totals.businessDaysInUs += 1;
      } else if (location === "CN") {
        totals.businessDaysInChina += 1;
      } else {
        totals.businessDaysInOther += 1;
      }
    }

    cursor = addDays(cursor, 1);
  }

  return totals;
}

function renderStats() {
  const stats = calculateStats();
  Object.entries(stats).forEach(([key, value]) => {
    outputs[`${key}Display`].textContent = String(value);
  });
}

function renderPreviewList(type) {
  const list = uploads[type];
  const root = type === "us" ? usPreviewList : chinaPreviewList;
  const count = type === "us" ? usPreviewCount : chinaPreviewCount;

  count.textContent = `${list.length} 个文件`;
  if (list.length === 0) {
    root.className = "preview-list empty-state";
    root.textContent = "还没有上传文件";
    return;
  }

  root.className = "preview-list";
  root.innerHTML = list
    .map(
      (file) => `
        <article class="preview-item">
          ${
            file.isPdf
              ? `<div class="preview-file">PDF 文件</div>`
              : `<img class="preview-image" src="${file.url}" alt="${file.name}" />`
          }
          <div class="preview-meta">${file.name}</div>
        </article>
      `,
    )
    .join("");
}

function updateUploads(type, fileList) {
  uploads[type].forEach((file) => URL.revokeObjectURL(file.url));
  uploads[type] = Array.from(fileList).map((file) => ({
    name: file.name,
    rawFile: file,
    isPdf: file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"),
    url: URL.createObjectURL(file),
  }));
  ocrResults[type] = [];
  recalculateSegments();
  renderPreviewList(type);
}

function countryMeta(country) {
  if (country === "US") {
    return { label: "美国", className: "us" };
  }
  if (country === "CN") {
    return { label: "中国", className: "cn" };
  }
  return { label: "其他国家", className: "other" };
}

function renderSegments() {
  if (staySegments.length === 0) {
    segmentList.className = "segment-list empty-state";
    segmentList.textContent = "还没有结构化停留区间";
    return;
  }

  segmentList.className = "segment-list";
  segmentList.innerHTML = staySegments
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((segment) => {
      const meta = countryMeta(segment.country);
      return `
        <article class="segment-item">
          <div>
            <strong>${segment.start} - ${segment.end}</strong>
            <div class="segment-meta">
              <span class="segment-pill ${meta.className}">${meta.label}</span>
              <span class="segment-pill">${segment.days} 天</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLeaveRanges() {
  if (leaveRanges.length === 0) {
    leaveList.className = "leave-list empty-state";
    leaveList.textContent = "还没有休假区间";
    return;
  }

  leaveList.className = "leave-list";
  leaveList.innerHTML = leaveRanges
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((range) => `
      <article class="leave-item">
        <div>
          <strong>${range.start} - ${range.end}</strong>
          <div class="leave-meta">
            <span class="segment-pill">${range.days} 天</span>
            <span class="segment-pill">工作日统计排除</span>
          </div>
        </div>
        <button class="ghost-btn" type="button" data-remove-leave-id="${range.id}">删除</button>
      </article>
    `)
    .join("");
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
}

async function callVolcengineOcr(file) {
  const base64 = await fileToBase64(file.rawFile);
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageBase64: base64,
      isPdf: file.isPdf,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error("OCR 返回内容不是合法 JSON。");
  }

  if (payload.code !== 10000) {
    throw new Error(payload.message || "OCR 识别失败。");
  }

  const extractedText = extractOcrText(payload);
  return {
    text: extractedText,
    lines: extractedText.split("\n").map((line) => line.trim()).filter(Boolean),
  };
}

function extractOcrText(payload) {
  const data = payload?.data;
  if (!data) {
    return "";
  }

  if (typeof data.markdown === "string" && data.markdown.trim()) {
    return data.markdown.trim();
  }

  if (typeof data.text === "string" && data.text.trim()) {
    return data.text.trim();
  }

  if (typeof data.content === "string" && data.content.trim()) {
    return data.content.trim();
  }

  if (Array.isArray(data.line_texts)) {
    return data.line_texts.filter(Boolean).join("\n");
  }

  if (Array.isArray(data.pages)) {
    const pageTexts = [];
    data.pages.forEach((page) => {
      if (typeof page?.markdown === "string" && page.markdown.trim()) {
        pageTexts.push(page.markdown.trim());
      } else if (typeof page?.text === "string" && page.text.trim()) {
        pageTexts.push(page.text.trim());
      } else if (Array.isArray(page?.line_texts)) {
        pageTexts.push(page.line_texts.filter(Boolean).join("\n"));
      }
    });
    return pageTexts.join("\n");
  }

  return JSON.stringify(data, null, 2);
}

function normalizeDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
    return null;
  }
  if (y !== CALENDAR_YEAR || m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function extractDatesFromLine(line) {
  const dates = [];
  const seen = new Set();
  const patterns = [
    /\b(2026)[\/.-](\d{1,2})[\/.-](\d{1,2})\b/g,
    /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](2026)\b/g,
  ];

  patterns.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(line))) {
      const normalized =
        index === 0
          ? normalizeDateParts(match[1], match[2], match[3])
          : normalizeDateParts(match[3], match[1], match[2]);
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        dates.push(normalized);
      }
    }
  });

  return dates.sort();
}

function recalculateSegments() {
  const borderEvents = dedupeEvents(
    [...ocrResults.us, ...ocrResults.china]
      .filter((item) => Array.isArray(item.events))
      .flatMap((item) => item.events),
  );

  const baseSegments = [
    ...buildSegmentsFromEvents(borderEvents, "US"),
    ...buildSegmentsFromEvents(borderEvents, "CN"),
  ];

  staySegments = buildContinuousSegments(baseSegments);
  renderSegments();
  renderStats();
}

async function runOcrFor(type) {
  const files = uploads[type];
  const errors = [];

  if (files.length === 0) {
    return errors;
  }

  ocrResults[type] = [];

  for (const file of files) {
    try {
      const result = await callVolcengineOcr(file);
      const events = extractEventsFromText(result.text, type, file.name);
      ocrResults[type].push({
        name: file.name,
        events,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "OCR 调用失败。";
      ocrResults[type].push({
        name: file.name,
        error: message,
      });
      errors.push(`${file.name}: ${message}`);
    }
    recalculateSegments();
  }

  return errors;
}

async function runAllOcr() {
  const hasUsFiles = uploads.us.length > 0;
  const hasChinaFiles = uploads.china.length > 0;

  if (!hasUsFiles && !hasChinaFiles) {
    window.alert("请先上传图片或 PDF。");
    return;
  }

  runAllOcrBtn.disabled = true;
  const originalText = runAllOcrBtn.textContent;
  runAllOcrBtn.textContent = "识别中...";

  try {
    const errors = [];

    if (hasUsFiles) {
      errors.push(...await runOcrFor("us"));
    } else {
      ocrResults.us = [];
    }

    if (hasChinaFiles) {
      errors.push(...await runOcrFor("china"));
    } else {
      ocrResults.china = [];
    }

    recalculateSegments();

    if (errors.length > 0) {
      window.alert(`识别完成，但有部分文件失败：\n${errors.join("\n")}`);
    } else if (staySegments.length === 0) {
      window.alert("识别完成，但没有抽取出可用的停留区间。");
    }
  } finally {
    runAllOcrBtn.disabled = false;
    runAllOcrBtn.textContent = originalText;
  }
}

function normalizeEvidence(line) {
  return line.replace(/\s+/g, " ").slice(0, 140);
}

function detectEventType(line, type) {
  const normalized = line.toLowerCase();

  if (type === "us") {
    if (normalized.includes("arrival")) {
      return "arrival";
    }
    if (normalized.includes("departure")) {
      return "departure";
    }
    return null;
  }

  if (line.includes("入境") || /入.{0,2}境/.test(line) || line.includes("抵境")) {
    return "arrival";
  }
  if (line.includes("出境") || line.includes("离境") || /出.{0,2}境/.test(line)) {
    return "departure";
  }
  return null;
}

function extractEventsFromText(text, type, fileName) {
  const country = type === "us" ? "US" : "CN";
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line, index) => {
      const eventType = detectEventType(line, type);
      const dates = extractDatesFromLine(line);
      if (!eventType || dates.length === 0) {
        return [];
      }

      return dates.map((date, dateIndex) => ({
        id: `${country}-${fileName}-${index}-${dateIndex}-${eventType}`,
        country,
        type: eventType,
        date,
        evidence: normalizeEvidence(line),
      }));
    })
    .filter((event) => event.date.startsWith(String(CALENDAR_YEAR)));
}

function dedupeEvents(events) {
  const deduped = new Map();
  events.forEach((event) => {
    const key = [event.country, event.date, event.type, event.evidence].join("|");
    if (!deduped.has(key)) {
      deduped.set(key, event);
    }
  });
  return Array.from(deduped.values()).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function buildSegmentsFromEvents(events, country) {
  const yearStart = `${CALENDAR_YEAR}-01-01`;
  const periodEnd = clampPeriodEnd();
  const countryEvents = events
    .filter((event) => event.country === country)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));

  const segments = [];
  let openArrival = null;

  countryEvents.forEach((event, index) => {
    if (event.type === "arrival") {
      if (!openArrival) {
        openArrival = event;
      }
      return;
    }

    if (openArrival) {
      segments.push({
        id: `${country}-${openArrival.date}-${event.date}-${index}`,
        country,
        start: openArrival.date,
        end: event.date,
      });
      openArrival = null;
      return;
    }

    if (index === 0) {
      segments.push({
        id: `${country}-${yearStart}-${event.date}-synthetic`,
        country,
        start: yearStart,
        end: event.date,
      });
    }
  });

  if (openArrival && periodEnd) {
    segments.push({
      id: `${country}-${openArrival.date}-${formatIsoDate(periodEnd)}-open`,
      country,
      start: openArrival.date,
      end: formatIsoDate(periodEnd),
    });
  }

  return segments;
}

function daysBetweenInclusive(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.floor((endDate - startDate) / 86400000) + 1;
}

function buildLeaveDateSet() {
  const dates = new Set();
  leaveRanges.forEach((range) => {
    let cursor = new Date(`${range.start}T00:00:00Z`);
    const end = new Date(`${range.end}T00:00:00Z`);
    while (cursor <= end) {
      dates.add(formatIsoDate(cursor));
      cursor = addDays(cursor, 1);
    }
  });
  return dates;
}

function upsertLeaveRange(start, end) {
  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  const id = `${normalizedStart}-${normalizedEnd}`;

  if (!leaveRanges.some((range) => range.id === id)) {
    leaveRanges = [
      ...leaveRanges,
      {
        id,
        start: normalizedStart,
        end: normalizedEnd,
        days: daysBetweenInclusive(normalizedStart, normalizedEnd),
      },
    ];
  }
}

function removeLeaveRange(id) {
  leaveRanges = leaveRanges.filter((range) => range.id !== id);
}

function buildContinuousSegments(baseSegments) {
  const periodEnd = clampPeriodEnd();
  if (!periodEnd) {
    return [];
  }

  const start = `${CALENDAR_YEAR}-01-01`;
  const end = formatIsoDate(periodEnd);
  const results = [];
  let currentCountry = null;
  let currentStart = null;
  let cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);

  while (cursor <= endDate) {
    const dateString = formatIsoDate(cursor);
    const country = resolveLocationForDate(dateString, baseSegments);

    if (!currentCountry) {
      currentCountry = country;
      currentStart = dateString;
    } else if (country !== currentCountry) {
      const previousDay = formatIsoDate(addDays(cursor, -1));
      results.push({
        id: `${currentCountry}-${currentStart}-${previousDay}`,
        country: currentCountry,
        start: currentStart,
        end: previousDay,
        days: daysBetweenInclusive(currentStart, previousDay),
      });
      currentCountry = country;
      currentStart = dateString;
    }

    cursor = addDays(cursor, 1);
  }

  if (currentCountry && currentStart) {
    results.push({
      id: `${currentCountry}-${currentStart}-${end}`,
      country: currentCountry,
      start: currentStart,
      end,
      days: daysBetweenInclusive(currentStart, end),
    });
  }

  return results;
}

usRecordsInput.addEventListener("change", (event) => {
  updateUploads("us", event.target.files);
});

chinaRecordsInput.addEventListener("change", (event) => {
  updateUploads("china", event.target.files);
});

runAllOcrBtn.addEventListener("click", () => {
  runAllOcr();
});

addLeaveBtn.addEventListener("click", () => {
  const start = leaveStartInput.value;
  const end = leaveEndInput.value;

  if (!start || !end) {
    window.alert("请先填写休假开始和结束日期。");
    return;
  }

  upsertLeaveRange(start, end);
  leaveStartInput.value = "";
  leaveEndInput.value = "";
  renderLeaveRanges();
  renderStats();
});

leaveList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const id = target.dataset.removeLeaveId;
  if (!id) {
    return;
  }

  removeLeaveRange(id);
  renderLeaveRanges();
  renderStats();
});

const periodEnd = clampPeriodEnd();
asOfDate.textContent = periodEnd ? `As of ${formatDate(periodEnd)}` : "As of not started";
renderPreviewList("us");
renderPreviewList("china");
renderLeaveRanges();
recalculateSegments();
