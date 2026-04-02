const features = [
  {
    slug: "tax_calculation",
    title: "Tax_calculation",
    description: "中国与美国加州税负对比、预缴税结算与中国补税测算。",
    status: "Available",
    href: "./features/tax_calculation/index.html",
    tags: ["Tax", "Calculator", "CN / US"],
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
