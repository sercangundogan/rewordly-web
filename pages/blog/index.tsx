import { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import Header from "../../components/Header";
import { getAllPosts } from "../../lib/blog";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://rewordly.store";

interface BlogIndexProps {
  posts: { title: string; description: string; date: string; slug: string }[];
}

const BlogIndex: NextPage<BlogIndexProps> = ({ posts }) => {
  return (
    <>
      <Head>
        <title>Blog | Rewordly - Writing Tips & Product Updates</title>
        <meta
          name="description"
          content="Rewordly blog: writing tips, grammar guides, and product updates. Write better with AI."
        />
        <meta name="keywords" content="rewordly blog, writing tips, grammar, AI writing" />
        <link rel="canonical" href={`${BASE_URL}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${BASE_URL}/blog`} />
        <meta property="og:title" content="Blog | Rewordly" />
        <meta
          property="og:description"
          content="Writing tips and Rewordly updates."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${BASE_URL}/blog`} />
        <meta property="twitter:title" content="Blog | Rewordly" />
        <meta
          property="twitter:description"
          content="Writing tips and Rewordly updates."
        />
        <meta property="twitter:image" content="/og-image.png" />
        <meta name="theme-color" content="#0a0a0a" />
      </Head>

      <style jsx global>{`
        .blog-page body {
          font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          color: #171717;
          background: #ffffff;
        }
        .blog-main {
          padding: 120px 40px 80px;
          max-width: 900px;
          margin: 0 auto;
        }
        .blog-list-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          color: #0a0a0a;
          margin-bottom: 12px;
        }
        .blog-list-subtitle {
          font-size: 1.1rem;
          color: #525252;
          margin-bottom: 48px;
          line-height: 1.7;
        }
        .blog-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .blog-card {
          display: block;
          padding: 28px 32px;
          background: #ffffff;
          border: 1px solid #e5e5e5;
          border-radius: 20px;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s;
        }
        .blog-card:hover {
          border-color: #d4d4d4;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.06);
        }
        .blog-card-date {
          font-size: 0.85rem;
          color: #737373;
          margin-bottom: 8px;
        }
        .blog-card-title {
          font-size: 1.35rem;
          font-weight: 700;
          color: #0a0a0a;
          margin-bottom: 10px;
          line-height: 1.3;
        }
        .blog-card-desc {
          font-size: 0.95rem;
          color: #525252;
          line-height: 1.6;
        }
        .blog-footer {
          margin-top: 64px;
          padding-top: 24px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
        }
        .blog-footer-link {
          color: #525252;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
        }
        .blog-footer-link:hover {
          color: #0a0a0a;
        }
        @media (max-width: 768px) {
          .blog-main {
            padding: 100px 20px 60px;
          }
        }
      `}</style>

      <div className="blog-page">
        <Header />

        <main className="blog-main">
          <h1 className="blog-list-title">Blog</h1>
          <p className="blog-list-subtitle">
            Writing tips, grammar guides, and Rewordly updates.
          </p>

          <div className="blog-list">
            {posts.length === 0 ? (
              <p style={{ color: "#737373" }}>No posts yet.</p>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="blog-card"
                >
                  <time className="blog-card-date" dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <h2 className="blog-card-title">{post.title}</h2>
                  <p className="blog-card-desc">{post.description}</p>
                </Link>
              ))
            )}
          </div>

          <footer className="blog-footer">
            <Link href="/" className="blog-footer-link">
              ← Back to home
            </Link>
          </footer>
        </main>
      </div>
    </>
  );
};

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
  const posts = getAllPosts();
  return { props: { posts } };
};

export default BlogIndex;
