import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const blogSlugs = [
    "best-free-grammar-checker",
    "change-tone-of-text",
    "grammar-checker-extension",
    "how-to-paraphrase-without-plagiarism",
    "paraphrasing-vs-rewriting",
    "rewordly-vs-grammarly",
    "rewordly-vs-quillbot",
    "rewrite-email-professionally",
    "rewrite-for-clarity",
    "rewrite-selected-text",
    "rewrite-text-chrome-extension",
  ];

  const blogEntries: MetadataRoute.Sitemap = blogSlugs.map((slug) => ({
    url: `${base}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...blogEntries,
  ];
}
