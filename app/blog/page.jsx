import Link from "next/link";

import Footer from "../../components/Footer";
import NavBar from "../../components/NavBar";
import {
  dateForDateTime,
  formatDate,
  getBlogPosts,
  getPostTags,
  getSiteData,
} from "../../lib/content";

export const metadata = {
  title: "Blog - Skillfield",
  description: "Insights on Cyber Security, AI and Data Services from the Skillfield team.",
};

export default function BlogPage() {
  const posts = getBlogPosts();
  const site = getSiteData();

  return (
    <>
      <NavBar logoUrl={site.logo_url} logoAlt={site.logo_alt} links={site.nav} homeHref="/" />

      <section className="blog-listing">
        <div className="container">
          <div className="section-header blog-page-header">
            <div className="section-label">Insights</div>
            <h1>Blog</h1>
            <p>Perspectives on Cyber Security, AI and Data Services from the Skillfield team.</p>
          </div>

          {posts.length ? (
            <div className="blog-grid">
              {posts.map((post) => (
                <article className="blog-card" key={post.slug}>
                  <div className="blog-card-meta">
                    <time dateTime={dateForDateTime(post.date)}>{formatDate(post.date)}</time>
                    {getPostTags(post.tags).map((tag) => (
                      <span className="post-tag" key={`${post.slug}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h2 className="blog-card-title">
                    <Link href={`/blog/${post.slug}/`}>{post.title}</Link>
                  </h2>
                  {post.description ? <p className="blog-card-excerpt">{post.description}</p> : null}
                  <Link href={`/blog/${post.slug}/`} className="blog-card-readmore">
                    Read article -&gt;
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="blog-empty">No posts yet. Check back soon!</p>
          )}
        </div>
      </section>

      <Footer footer={site.footer} logoAlt={site.logo_alt} />
    </>
  );
}

