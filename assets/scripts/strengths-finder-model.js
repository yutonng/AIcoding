const domainDefinitions = {
  Executing: {
    key: "Executing",
    label: "执行力",
    accent: "#7c4dff",
    soft: "#e7defe",
  },
  Influencing: {
    key: "Influencing",
    label: "影响力",
    accent: "#e3a51c",
    soft: "#f8ebc4",
  },
  RelationshipBuilding: {
    key: "RelationshipBuilding",
    label: "关系建立",
    accent: "#4b83d9",
    soft: "#d9e5fb",
  },
  StrategicThinking: {
    key: "StrategicThinking",
    label: "战略思维",
    accent: "#2eaf63",
    soft: "#d7f1e0",
  },
};

const themeDefinitions = [
  { key: "Achiever", displayName: "成就", domain: "Executing" },
  { key: "Arranger", displayName: "统筹", domain: "Executing" },
  { key: "Belief", displayName: "信仰", domain: "Executing" },
  { key: "Consistency", displayName: "公平", domain: "Executing" },
  { key: "Deliberative", displayName: "审慎", domain: "Executing" },
  { key: "Discipline", displayName: "纪律", domain: "Executing" },
  { key: "Focus", displayName: "专注", domain: "Executing" },
  { key: "Responsibility", displayName: "责任", domain: "Executing" },
  { key: "Restorative", displayName: "排难", domain: "Executing" },
  { key: "Activator", displayName: "行动", domain: "Influencing" },
  { key: "Command", displayName: "统率", domain: "Influencing" },
  { key: "Communication", displayName: "沟通", domain: "Influencing" },
  { key: "Competition", displayName: "竞争", domain: "Influencing" },
  { key: "Maximizer", displayName: "完美", domain: "Influencing" },
  { key: "SelfAssurance", displayName: "自信", domain: "Influencing" },
  { key: "Significance", displayName: "追求", domain: "Influencing" },
  { key: "Woo", displayName: "取悦", domain: "Influencing" },
  { key: "Adaptability", displayName: "适应", domain: "RelationshipBuilding" },
  { key: "Connectedness", displayName: "关联", domain: "RelationshipBuilding" },
  { key: "Developer", displayName: "伯乐", domain: "RelationshipBuilding" },
  { key: "Empathy", displayName: "体谅", domain: "RelationshipBuilding" },
  { key: "Harmony", displayName: "和谐", domain: "RelationshipBuilding" },
  { key: "Includer", displayName: "包容", domain: "RelationshipBuilding" },
  { key: "Individualization", displayName: "个别", domain: "RelationshipBuilding" },
  { key: "Positivity", displayName: "积极", domain: "RelationshipBuilding" },
  { key: "Relator", displayName: "交往", domain: "RelationshipBuilding" },
  { key: "Analytical", displayName: "分析", domain: "StrategicThinking" },
  { key: "Context", displayName: "回顾", domain: "StrategicThinking" },
  { key: "Futuristic", displayName: "前瞻", domain: "StrategicThinking" },
  { key: "Ideation", displayName: "理念", domain: "StrategicThinking" },
  { key: "Input", displayName: "搜集", domain: "StrategicThinking" },
  { key: "Intellection", displayName: "思维", domain: "StrategicThinking" },
  { key: "Learner", displayName: "学习", domain: "StrategicThinking" },
  { key: "Strategic", displayName: "战略", domain: "StrategicThinking" },
];

const themeKeywords = {
  Achiever: [["努力", 1.4], ["高效", 1.2], ["工作", 0.7], ["成就", 1.3], ["进步", 1.1], ["业绩", 1.2], ["持久", 1.1], ["任务", 0.6]],
  Arranger: [["统筹", 1.6], ["组织", 1.4], ["协调", 1.2], ["同时", 1.1], ["几件事", 1.1], ["安排", 1.2], ["张罗", 1.3], ["复杂事务", 1.2]],
  Belief: [["价值观", 1.6], ["信仰", 1.8], ["原则", 1.4], ["哲学", 1.3], ["意义", 1.1], ["正直", 1.2], ["生活有目的", 1.4]],
  Consistency: [["平等", 1.5], ["规则", 1.4], ["规矩", 1.3], ["公平", 1.7], ["制度", 1.2], ["统一", 1.1]],
  Deliberative: [["审慎", 1.8], ["确认无误", 1.6], ["谨慎", 1.4], ["风险", 1.2], ["压力", 0.6], ["确保", 0.8], ["慢", 0.8]],
  Discipline: [["纪律", 1.7], ["整洁", 1.4], ["井井有条", 1.4], ["按部就班", 1.2], ["规章制度", 1.4], ["检查", 1.2], ["清扫", 0.9]],
  Focus: [["专注", 1.6], ["目标", 1.3], ["集中", 1.2], ["眼前的事", 1.1], ["有始有终", 1.1], ["一次只做一件事", 1.5], ["长期", 0.8]],
  Responsibility: [["责任", 1.8], ["说到做到", 1.5], ["答应别人的事", 1.4], ["完成", 0.7], ["期限", 0.8], ["使命", 0.7]],
  Restorative: [["排难", 1.8], ["难题", 1.4], ["故障", 1.5], ["解决", 1.1], ["失败原因", 1.1], ["修复", 1.3], ["克服弱点", 1.2]],
  Activator: [["行动", 1.8], ["立刻", 1.4], ["马上", 1.3], ["付诸行动", 1.5], ["开始", 1.1], ["先做", 1.1], ["一马当先", 1.5]],
  Command: [["统率", 1.8], ["领导", 1.4], ["总裁", 1.4], ["威逼", 1.2], ["挑战别人", 1.1], ["控制", 0.8], ["强势", 1.0]],
  Communication: [["沟通", 1.6], ["交谈", 1.3], ["讲话", 1.2], ["讲故事", 1.5], ["表达", 1.0], ["谈话", 1.1], ["讲", 0.4]],
  Competition: [["竞争", 1.8], ["第一", 1.6], ["竞赛", 1.5], ["比较", 1.1], ["名列前茅", 1.3], ["胜", 0.8], ["竞争优势", 1.2]],
  Maximizer: [["完美", 1.7], ["最出色", 1.2], ["尽善尽美", 1.5], ["长处", 0.8], ["最擅长", 1.2], ["最好", 0.8]],
  SelfAssurance: [["自信", 1.8], ["能干", 1.1], ["机智", 1.1], ["心中有数", 1.1], ["我总能", 0.9], ["确信", 1.0]],
  Significance: [["追求", 1.8], ["崇拜", 1.4], ["重要", 1.1], ["别人怎么看", 1.2], ["大人物", 0.8], ["建树", 1.1], ["认可", 1.0]],
  Woo: [["取悦", 1.8], ["陌生人", 1.5], ["受欢迎", 1.2], ["喜欢我", 1.2], ["招待", 1.1], ["结识", 1.0], ["攀谈", 1.5]],
  Adaptability: [["适应", 1.7], ["顺其自然", 1.4], ["走一步看一步", 1.2], ["随着事情发生", 1.4], ["放松", 0.8], ["当日需求", 1.0]],
  Connectedness: [["关联", 1.8], ["全人类相连", 1.6], ["事出有因", 1.3], ["宏观世界", 1.1], ["巧合", 0.8], ["命运", 0.7]],
  Developer: [["伯乐", 1.8], ["发展", 1.2], ["推动别人成功", 1.5], ["使别人进步", 1.4], ["成长", 0.8], ["潜力", 1.1], ["树立榜样", 1.0]],
  Empathy: [["体谅", 1.8], ["情感", 1.0], ["设身处地", 1.6], ["感受", 1.2], ["沮丧", 0.7], ["理解", 1.0], ["内疚", 0.8]],
  Harmony: [["和谐", 1.8], ["平静", 1.2], ["和睦", 1.3], ["避免冲突", 1.1], ["随和", 1.0], ["不伤害", 0.9]],
  Includer: [["包容", 1.8], ["接受各种类型", 1.6], ["每个人", 1.0], ["不排斥", 1.4], ["所有人", 1.0], ["融入", 1.0]],
  Individualization: [["个别", 1.8], ["个性特点", 1.5], ["特点", 1.1], ["不同的人", 1.0], ["个别激励", 1.4], ["背景", 0.8]],
  Positivity: [["积极", 1.8], ["欢乐", 1.4], ["兴奋", 1.3], ["快乐", 1.2], ["愉快", 1.1], ["轻松", 0.9], ["激动不已", 1.1]],
  Relator: [["交往", 1.7], ["知己", 1.4], ["朋友", 1.0], ["一起", 0.7], ["合作伙伴", 0.9], ["亲密", 1.1], ["老朋友", 1.3]],
  Analytical: [["分析", 1.8], ["因果", 1.4], ["数据", 1.3], ["规律", 1.2], ["准确信息", 1.1], ["研究原因", 1.1], ["统计数字", 1.1]],
  Context: [["回顾", 1.8], ["过去", 1.3], ["历史", 1.5], ["小时候", 1.0], ["总结教训", 1.1], ["研究过去", 1.2]],
  Futuristic: [["前瞻", 1.8], ["未来", 1.5], ["展望", 1.3], ["远景", 1.2], ["50年后", 1.2], ["下一个", 0.9]],
  Ideation: [["理念", 1.8], ["创意", 1.4], ["独特的观点", 1.4], ["构思", 1.3], ["思想", 1.0], ["想象", 1.1], ["点子", 1.2]],
  Input: [["搜集", 1.8], ["收集", 1.3], ["专家", 1.1], ["调查", 1.0], ["广泛", 0.8], ["知识", 0.9], ["信息", 0.9]],
  Intellection: [["思维", 1.8], ["思考", 1.1], ["哲理", 1.1], ["独自思考", 1.4], ["反思", 1.3], ["大脑不停", 1.4], ["独处", 0.9]],
  Learner: [["学习", 1.8], ["求知欲", 1.4], ["书", 0.8], ["阅读", 1.1], ["了解新事物", 1.2], ["成长", 0.7], ["研究", 0.8]],
  Strategic: [["战略", 1.8], ["战略眼光", 1.5], ["应对", 1.1], ["未来可能发生", 1.1], ["形势", 0.9], ["路径", 0.8], ["策划", 1.0]],
};

const themeLookup = Object.fromEntries(themeDefinitions.map((theme) => [theme.key, theme]));

function normalizeText(text) {
  return String(text).replace(/[；;，。,、：:\s]/g, "");
}

function scoreThemeAgainstText(text, pairs) {
  const normalizedText = normalizeText(text);
  return pairs.reduce((sum, [keyword, weight]) => {
    return normalizedText.includes(normalizeText(keyword)) ? sum + weight : sum;
  }, 0);
}

function inferSignals(text) {
  const rawScores = themeDefinitions
    .map((theme) => ({
      theme: theme.key,
      score: scoreThemeAgainstText(text, themeKeywords[theme.key] || []),
    }))
    .filter((item) => item.score > 0);

  let signals = rawScores;

  if (signals.length === 0) {
    signals = [
      { theme: "Intellection", score: 1 },
      { theme: "Relator", score: 1 },
    ];
  }

  const topSignals = signals.sort((a, b) => b.score - a.score).slice(0, 4);
  const total = topSignals.reduce((sum, item) => sum + item.score, 0) || 1;

  return topSignals.map((item) => ({
    theme: item.theme,
    weight: Number((item.score / total).toFixed(4)),
  }));
}

function enrichQuestions(questions) {
  return questions.map((question) => ({
    ...question,
    leftSignals: inferSignals(question.leftText),
    rightSignals: inferSignals(question.rightText),
  }));
}

window.__STRENGTHS_FINDER_MODEL__ = {
  domainDefinitions,
  themeDefinitions,
  themeLookup,
  enrichQuestions,
};
