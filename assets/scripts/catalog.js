const features = [
  {
    slug: "book_digest",
    title: "Book Digest",
    description: "把一本书压缩成 3 分钟手机翻页阅读，并配套后台审核与 JSON 导出流程。",
    status: "Available",
    href: "./features/book_digest/index.html",
    tags: ["Books", "Reader", "Editor"],
  },
  {
    slug: "tax_calculation",
    title: "Tax_calculation",
    description: "中国与美国加州税负对比、预缴税结算与中国补税测算。",
    status: "Available",
    href: "./features/tax_calculation/index.html",
    tags: ["Tax", "Calculator", "CN / US"],
  },
  {
    slug: "Calendar",
    title: "Calendar",
    description: "上传中美出入境记录，识别停留国家区间并统计自然日与工作日。",
    status: "Available",
    href: "./features/Calendar/index.html",
    tags: ["Calendar", "Travel", "OCR"],
  },
  {
    slug: "strengths_finder",
    title: "Strengths Finder",
    description: "180 道题逐题作答，生成 34 个主题在四大维度中的排序与分布。",
    status: "Available",
    href: "./features/strengths_finder/index.html",
    tags: ["Assessment", "Strengths", "Ranking"],
  },
];

const catalogRoot = document.querySelector("#featureCatalog");

if (catalogRoot) {
  catalogRoot.innerHTML = features
    .map(
      (feature) => `
        <a class="feature-card panel" href="${feature.href}">
          <div class="feature-card-head">
            <span class="feature-status">${feature.status}</span>
          </div>
          <h3>${feature.title}</h3>
          <p>${feature.description}</p>
          <div class="feature-tags">
            ${feature.tags.map((tag) => `<span>${tag}</span>`).join("")}
          </div>
        </a>
      `,
    )
    .join("");
}
