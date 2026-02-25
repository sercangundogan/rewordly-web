import { GetStaticPaths, GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import Header from "../../components/Header";
import { getAllSlugs, getPostBySlug, BlogPost } from "../../lib/blog";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rewordly.store";

interface BlogPostPageProps {
  post: BlogPost;
}

const BlogPostPage: NextPage<BlogPostPageProps> = ({ post }) => {
  const canonical = `${BASE_URL}/blog/${post.slug}`;
  const ogImage = post.image
    ? (post.image.startsWith("http") ? post.image : `${BASE_URL}${post.image}`)
    : undefined;

  return (
    <>
      <Head>
        <title>{post.title} | Rewordly Blog</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="article:published_time" content={post.date} />
        {post.author && (
          <meta property="article:author" content={post.author} />
        )}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonical} />
        <meta property="twitter:title" content={post.title} />
        <meta property="twitter:description" content={post.description} />
        {ogImage && <meta property="twitter:image" content={ogImage} />}
        <meta name="theme-color" content="#0a0a0a" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: post.description,
              datePublished: post.date,
              author: post.author
                ? { "@type": "Organization", name: post.author }
                : undefined,
              url: canonical,
            }),
          }}
        />
      </Head>

      <style jsx global>{`
        .blog-page body {
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          color: #171717;
          background: #ffffff;
        }
        .blog-article-wrap {
          padding: 120px 40px 80px;
          max-width: 720px;
          margin: 0 auto;
        }
        .blog-article-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #525252;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          margin-bottom: 24px;
          transition: color 0.2s;
        }
        .blog-article-back:hover {
          color: #0a0a0a;
        }
        .blog-article-header {
          margin-bottom: 32px;
        }
        .blog-article-date {
          font-size: 0.9rem;
          color: #737373;
          margin-bottom: 12px;
        }
        .blog-article-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          color: #0a0a0a;
          line-height: 1.25;
          margin-bottom: 12px;
        }
        .blog-article-author {
          font-size: 0.9rem;
          color: #525252;
        }
        .blog-article-body {
          font-size: 1.05rem;
          line-height: 1.8;
          color: #171717;
        }
        .blog-article-body :global(h2) {
          font-size: 1.4rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-top: 2em;
          margin-bottom: 0.6em;
        }
        .blog-article-body :global(h3) {
          font-size: 1.15rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-top: 1.6em;
          margin-bottom: 0.5em;
        }
        .blog-article-body :global(p) {
          margin-bottom: 1.2em;
        }
        .blog-article-body :global(ul),
        .blog-article-body :global(ol) {
          margin-bottom: 1.2em;
          padding-left: 1.5em;
        }
        .blog-article-body :global(li) {
          margin-bottom: 0.4em;
        }
        .blog-article-body :global(strong) {
          font-weight: 600;
          color: #0a0a0a;
        }
        .blog-article-body :global(a) {
          color: #0a0a0a;
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }
        .blog-article-body :global(a:hover) {
          color: #262626;
        }
        @media (max-width: 768px) {
          .blog-article-wrap {
            padding: 100px 20px 60px;
          }
        }
      `}</style>

      <div className="blog-page">
        <Header />

        <main className="blog-article-wrap">
          <Link href="/blog" className="blog-article-back">
            ← Blog
          </Link>

          <article>
            <header className="blog-article-header">
              <time className="blog-article-date" dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <h1 className="blog-article-title">{post.title}</h1>
              {post.author && (
                <p className="blog-article-author">{post.author}</p>
              )}
            </header>
            <div className="blog-article-body">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
          </article>
        </main>
      </div>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({
  params,
}) => {
  const slug = params?.slug as string;
  const post = getPostBySlug(slug);
  if (!post) return { notFound: true };
  return { props: { post } };
};

export default BlogPostPage;
