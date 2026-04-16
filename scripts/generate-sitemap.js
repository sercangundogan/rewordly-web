const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rewordly.store";

/** Paths to include in sitemap (no auth / app-shell URLs — those are noindex targets). */
const STATIC_PATHS = [
  "",
  "/blog",
  "/cookies",
  "/terms",
  "/legal",
  "/privacy",
];

function getBlogSlugs() {
  const blogDir = path.join(process.cwd(), "content", "blog");
  if (!fs.existsSync(blogDir)) return [];
  return fs
    .readdirSync(blogDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

function escapeXml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlElement(loc, lastmod = null, changefreq = "weekly", priority = "0.8") {
  const lastmodTag = lastmod
    ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>`
    : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>${escapeXml(changefreq)}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function generateSitemap() {
  const today = new Date().toISOString().split("T")[0];
  const urls = [];

  for (const p of STATIC_PATHS) {
    const loc = p === "" ? BASE_URL : `${BASE_URL}${p}`;
    let priority = "0.8";
    let changefreq = "weekly";
    if (p === "") {
      priority = "1.0";
    } else if (p === "/blog") {
      priority = "0.9";
    } else if (p === "/privacy" || p === "/terms") {
      priority = "0.4";
      changefreq = "yearly";
    } else if (p === "/cookies" || p === "/legal") {
      priority = "0.3";
      changefreq = "yearly";
    }
    urls.push(urlElement(loc, today, changefreq, priority));
  }

  const slugs = getBlogSlugs();
  for (const slug of slugs) {
    urls.push(
      urlElement(`${BASE_URL}/blog/${slug}`, today, "monthly", "0.8")
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  const outPath = path.join(process.cwd(), "public", "sitemap.xml");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml, "utf8");
  console.log("[sitemap] Wrote %s (%d URLs)", outPath, urls.length);
}

function generateRobots() {
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /auth/",
    "Disallow: /login",
    "Disallow: /dashboard",
    "",
    `Sitemap: ${BASE_URL}/sitemap.xml`,
  ];
  const outPath = path.join(process.cwd(), "public", "robots.txt");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log("[robots] Wrote %s", outPath);
}

generateSitemap();
generateRobots();
