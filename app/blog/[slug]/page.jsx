import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "../../../components/Footer";
import NavBar from "../../../components/NavBar";
import {
  dateForDateTime,
  formatDate,
  getBlogPosts,
  getPostBySlug,
  getPostTags,
  getSiteData,
  renderMarkdown,
} from "../../../lib/content";

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }) {
  const post = getPostBySlug(params.slug);
  if (!post) {
    return {
      title: "Post Not Found - Skillfield",
    };
  }

  return {
    title: `${post.title} - Skillfield`,
    description: post.description,
  };
}

export default async function BlogPostPage({ params }) {
  const post = getPostBySlug(params.slug);
  const site = getSiteData();

  if (!post) {
    notFound();
  }

  const postHtml = await renderMarkdown(post.content);

  return (
    <>
      <NavBar logoUrl={site.logo_url} logoAlt={site.logo_alt} links={site.nav} homeHref="/" />

      <article className="post-page">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">&gt;</span>
            <Link href="/blog/">Blog</Link>
            <span aria-hidden="true">&gt;</span>
            <span>{post.title}</span>
          </nav>

          <header className="post-header">
            <div className="post-meta">
              <time dateTime={dateForDateTime(post.date)}>{formatDate(post.date)}</time>
              {getPostTags(post.tags).map((tag) => (
                <span className="post-tag" key={`${post.slug}-${tag}`}>
                  {tag}
                </span>
              ))}
            </div>
            <h1>{post.title}</h1>
            {post.description ? <p className="post-description">{post.description}</p> : null}
          </header>

          <div className="post-content" dangerouslySetInnerHTML={{ __html: postHtml }} />

          <div className="post-footer-nav">
            <Link href="/blog/" className="btn-ghost">
              &lt;- Back to Blog
            </Link>
          </div>
        </div>
      </article>

      <Footer footer={site.footer} logoAlt={site.logo_alt} />
    </>
  );
}
