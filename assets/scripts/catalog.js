const features = [
  {
    slug: "book_digest",
    title: "Book Digest",
    description: "3 分钟读完一本著作；",
    href: "./features/book_digest/index.html",
  },
  {
    slug: "tax_calculation",
    title: "Tax_calculation",
    description: "中国与美国加州税负对比、预缴税结算与中国补税测算。",
    href: "./features/tax_calculation/index.html",
  },
  {
    slug: "Calendar",
    title: "Calendar",
    description: "上传中美出入境记录，识别停留国家区间并统计自然日与工作日。",
    href: "./features/Calendar/index.html",
  },
  {
    slug: "strengths_finder",
    title: "Strengths Finder",
    description: "180 道题逐题作答，生成 34 个主题在四大维度中的排序与分布。",
    href: "./features/strengths_finder/index.html",
  },
];

const catalogRoot = document.querySelector("#featureCatalog");

if (catalogRoot) {
  catalogRoot.innerHTML = features
    .map(
      (feature) => `
        <a class="feature-card panel" href="${feature.href}">
          <h3>${feature.title}</h3>
          <p>${feature.description}</p>
        </a>
      `,
    )
    .join("");
}
