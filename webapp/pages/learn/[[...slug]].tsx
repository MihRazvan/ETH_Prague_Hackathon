import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import {
  getAllLearnDocSlugs,
  getLearnDocPage,
  type LearnDocPage,
  type LearnNavItem,
} from "../../lib/docs";

export const getStaticPaths: GetStaticPaths = async () => {
  const paths = getAllLearnDocSlugs().map((slug) => ({
    params: { slug },
  }));

  return {
    paths,
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params.slug : [];
  const page = getLearnDocPage(slug);

  if (!page) {
    return { notFound: true };
  }

  return {
    props: {
      page,
    },
  };
};

function sidebarSectionTitle(item: LearnNavItem) {
  return item.depth === 0 && item.href !== "/learn";
}

interface LearnPageProps {
  page: LearnDocPage;
}

export default function LearnPage({ page }: LearnPageProps) {
  return (
    <>
      <Head>
        <title>{`${page.title} • Anyware Docs`}</title>
        <meta
          name="description"
          content="Learn how to use Anyware's TypeScript SDK and Solidity verifier."
        />
      </Head>

      <main className="learnPage">
        <aside className="learnSidebar">
          <div className="learnSidebarInner">
            <Link href="/" className="learnSidebarBrand">
              <img className="learnSidebarLogo" alt="Anyware" src="/landing/anyware-logo.png" />
              <span>anyware</span>
            </Link>
            <div className="learnSidebarLabel">Documentation</div>
            <nav className="learnSidebarNav" aria-label="Docs">
              {page.nav.map((item) => (
                <Link
                  className={[
                    "learnSidebarLink",
                    item.href === page.href ? "is-active" : "",
                    sidebarSectionTitle(item) ? "is-section" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  href={item.href}
                  key={item.href}
                  style={{ ["--depth" as string]: item.depth }}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="learnMain">
          <header className="learnTopbar">
            <div className="learnBreadcrumb">
              <Link href="/">Anyware</Link>
              <span>/</span>
              <Link href="/learn">Learn</Link>
              <span>/</span>
              <span>{page.title}</span>
            </div>
          </header>

          <div className="learnContent">
            <article className="learnArticle">
              <div
                className="learnMarkdown"
                dangerouslySetInnerHTML={{ __html: page.html }}
              />

              {page.previous || page.next ? (
                <div className="learnPager">
                  {page.previous ? (
                    <Link className="learnPagerLink" href={page.previous.href}>
                      <span>Previous</span>
                      <strong>{page.previous.title}</strong>
                    </Link>
                  ) : (
                    <span />
                  )}

                  {page.next ? (
                    <Link className="learnPagerLink learnPagerLinkNext" href={page.next.href}>
                      <span>Next</span>
                      <strong>{page.next.title}</strong>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </article>

            <aside className="learnToc">
              <div className="learnTocInner">
                <div className="learnSidebarLabel">On this page</div>
                {page.headings.length ? (
                  <div className="learnTocLinks">
                    {page.headings.map((heading) => (
                      <a
                        className="learnTocLink"
                        href={`#${heading.id}`}
                        key={heading.id}
                        style={{ ["--depth" as string]: Math.max(0, heading.depth - 2) }}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="learnTocEmpty">This page is short and sweet.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
