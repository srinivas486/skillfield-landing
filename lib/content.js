import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import sanitizeHtml from "sanitize-html";

import icons from "../src/_data/icons.json";
import site from "../src/_data/site.json";

const homePagePath = path.join(process.cwd(), "src", "index.md");
const postsDir = path.join(process.cwd(), "src", "blog", "posts");

const markdownSanitizeOptions = {
  allowedTags: [
    "p",
    "a",
    "strong",
    "em",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "blockquote",
    "code",
    "pre",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
};

const svgSanitizeOptions = {
  allowedTags: ["svg", "path", "ellipse", "circle", "line", "polyline", "polygon"],
  allowedAttributes: {
    svg: [
      "width",
      "height",
      "viewBox",
      "fill",
      "stroke",
      "stroke-width",
      "stroke-linecap",
      "stroke-linejoin",
      "xmlns",
      "aria-hidden",
    ],
    path: ["d", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
    ellipse: ["cx", "cy", "rx", "ry", "fill", "stroke", "stroke-width"],
    circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width"],
    line: ["x1", "x2", "y1", "y2", "fill", "stroke", "stroke-width"],
    polyline: ["points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
    polygon: ["points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin"],
  },
};

export function getSiteData() {
  return site;
}

export function getHomePageData() {
  const raw = fs.readFileSync(homePagePath, "utf8");
  const parsed = matter(raw);
  return {
    ...parsed.data,
    content: parsed.content.trim(),
  };
}

export function getBlogPosts() {
  const files = fs.readdirSync(postsDir).filter((name) => name.endsWith(".md"));

  return files
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const filePath = path.join(postsDir, fileName);
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      return {
        slug,
        content: parsed.content.trim(),
        ...parsed.data,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getPostBySlug(slug) {
  return getBlogPosts().find((post) => post.slug === slug) || null;
}

export async function renderMarkdown(markdown) {
  const rendered = await remark().use(remarkHtml).process(markdown);
  return sanitizeHtml(rendered.toString(), markdownSanitizeOptions);
}

export function formatDate(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function dateForDateTime(dateValue) {
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toISOString().split("T")[0];
}

export function getPostTags(tags = []) {
  return tags.filter((tag) => tag !== "post");
}

export function safeHref(value) {
  if (typeof value !== "string") {
    return "#";
  }

  const href = value.trim();
  if (!href) {
    return "#";
  }

  if (href.startsWith("#") || href.startsWith("/")) {
    return href;
  }

  try {
    const parsed = new URL(href);
    return ["http:", "https:", "mailto:"].includes(parsed.protocol) ? href : "#";
  } catch {
    return "#";
  }
}

export function getSafeIconSvg(iconName) {
  const iconSvg = icons[iconName];
  if (typeof iconSvg !== "string") {
    return "";
  }

  return sanitizeHtml(iconSvg, svgSanitizeOptions);
}
