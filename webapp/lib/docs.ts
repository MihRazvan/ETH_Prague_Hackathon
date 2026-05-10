import { readFileSync, readdirSync, statSync } from "fs";
import { join, posix, relative, resolve } from "path";

export interface LearnNavItem {
  title: string;
  href: string;
  depth: number;
  slugParts: string[];
  sourcePath: string;
}

export interface LearnHeading {
  depth: number;
  id: string;
  text: string;
}

export interface LearnDocPage {
  title: string;
  href: string;
  slugParts: string[];
  html: string;
  headings: LearnHeading[];
  nav: LearnNavItem[];
  previous: LearnNavItem | null;
  next: LearnNavItem | null;
}

const REPO_ROOT = resolve(process.cwd(), "..");
const DOCS_ROOT = join(REPO_ROOT, "docs", "learn");
const SUMMARY_PATH = join(DOCS_ROOT, "SUMMARY.md");
const REPO_PREFIX = "/Users/razvan/Repos/ETH_Prague_Hackathon/";
const GITHUB_BLOB_BASE = "https://github.com/anywarexyz/anyware/blob/main/";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function relPathToSlugParts(relPath: string) {
  const normalized = relPath.replace(/\\/g, "/");
  if (normalized === "README.md") {
    return [];
  }

  if (normalized.endsWith("/README.md")) {
    return normalized.slice(0, -"/README.md".length).split("/").filter(Boolean);
  }

  return normalized.replace(/\.md$/, "").split("/").filter(Boolean);
}

function relPathToHref(relPath: string) {
  const slugParts = relPathToSlugParts(relPath);
  return slugParts.length ? `/learn/${slugParts.join("/")}` : "/learn";
}

function hrefToSourcePath(href: string) {
  const withoutHash = href.split("#")[0];
  if (!withoutHash.startsWith("/learn")) {
    return withoutHash;
  }

  const pathPart = withoutHash.replace(/^\/learn\/?/, "");
  if (!pathPart) {
    return "README.md";
  }

  return `${pathPart}.md`;
}

function resolveMarkdownHref(href: string, currentSourcePath: string) {
  if (href.startsWith(REPO_PREFIX)) {
    const repoRelative = href.slice(REPO_PREFIX.length).replace(/:\d+$/, "");
    return `${GITHUB_BLOB_BASE}${repoRelative}`;
  }

  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return href;
  }

  const [rawPath, hash = ""] = href.split("#");

  if (rawPath.endsWith(".md")) {
    const currentDir = posix.dirname(currentSourcePath.replace(/\\/g, "/"));
    const resolved = posix.normalize(posix.join(currentDir === "." ? "" : currentDir, rawPath));
    const docsHref = relPathToHref(resolved);
    return hash ? `${docsHref}#${hash}` : docsHref;
  }

  return href;
}

function renderInline(markdown: string, currentSourcePath: string) {
  let html = escapeHtml(markdown);

  html = html.replace(/`([^`]+)`/g, (_match, code: string) => `<code>${escapeHtml(code)}</code>`);
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const resolved = resolveMarkdownHref(href, currentSourcePath);
    const external = /^https?:\/\//.test(resolved);
    const attrs = external ? ' target="_blank" rel="noreferrer"' : "";
    return `<a href="${escapeHtml(resolved)}"${attrs}>${escapeHtml(label)}</a>`;
  });

  return html;
}

function renderMarkdown(markdown: string, currentSourcePath: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const headings: LearnHeading[] = [];
  const chunks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] = [];
  let codeLanguage = "";
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }
    chunks.push(`<p>${renderInline(paragraph.join(" "), currentSourcePath)}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    const items = listItems.map((item) => `<li>${renderInline(item, currentSourcePath)}</li>`).join("");
    chunks.push(`<ul>${items}</ul>`);
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines.length) {
      return;
    }
    const languageClass = codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : "";
    chunks.push(
      `<pre><code${languageClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
    codeLines = [];
    codeLanguage = "";
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const depth = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = slugify(text);
      if (depth >= 2) {
        headings.push({ depth, id, text });
      }
      chunks.push(`<h${depth} id="${id}">${renderInline(text, currentSourcePath)}</h${depth}>`);
      continue;
    }

    const listMatch = /^- (.*)$/.exec(line.trim());
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();

  return {
    html: chunks.join("\n"),
    headings,
  };
}

function parseSummary() {
  const summary = readFileSync(SUMMARY_PATH, "utf8");
  const items: LearnNavItem[] = [];

  for (const line of summary.split(/\r?\n/)) {
    const match = /^(\s*)- \[(.+?)\]\((.+?)\)$/.exec(line);
    if (!match) {
      continue;
    }

    const depth = Math.floor(match[1].length / 2);
    const title = match[2].trim();
    const rawPath = match[3].trim().replace(/^\.\//, "");
    const href = relPathToHref(rawPath);

    items.push({
      title,
      href,
      depth,
      slugParts: relPathToSlugParts(rawPath),
      sourcePath: rawPath,
    });
  }

  return items;
}

function walkDocs(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      walkDocs(fullPath, files);
      continue;
    }

    if (!entry.endsWith(".md") || entry === "SUMMARY.md") {
      continue;
    }

    files.push(relative(DOCS_ROOT, fullPath).replace(/\\/g, "/"));
  }

  return files.sort();
}

function filePathForSlug(slugParts: string[]) {
  if (!slugParts.length) {
    return "README.md";
  }

  const sectionReadme = `${slugParts.join("/")}/README.md`;
  const leafPage = `${slugParts.join("/")}.md`;
  const absoluteSectionReadme = join(DOCS_ROOT, sectionReadme);
  const absoluteLeafPage = join(DOCS_ROOT, leafPage);

  try {
    if (statSync(absoluteSectionReadme).isFile()) {
      return sectionReadme;
    }
  } catch {}

  try {
    if (statSync(absoluteLeafPage).isFile()) {
      return leafPage;
    }
  } catch {}

  return null;
}

export function getAllLearnDocSlugs() {
  return walkDocs(DOCS_ROOT).map((relPath) => relPathToSlugParts(relPath));
}

export function getLearnDocPage(slugParts: string[]): LearnDocPage | null {
  const sourcePath = filePathForSlug(slugParts);
  if (!sourcePath) {
    return null;
  }

  const nav = parseSummary();
  const href = relPathToHref(sourcePath);
  const flatDocs = nav.filter((item) => item.href !== "/learn");
  const currentIndex = flatDocs.findIndex((item) => item.href === href);
  const markdown = readFileSync(join(DOCS_ROOT, sourcePath), "utf8");
  const { html, headings } = renderMarkdown(markdown, sourcePath);
  const title = (markdown.match(/^#\s+(.+)$/m)?.[1] ?? nav.find((item) => item.href === href)?.title ?? "Anyware Docs").trim();

  return {
    title,
    href,
    slugParts,
    html,
    headings,
    nav,
    previous: currentIndex > 0 ? flatDocs[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < flatDocs.length - 1 ? flatDocs[currentIndex + 1] : null,
  };
}
