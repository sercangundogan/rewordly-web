import Head from "next/head";
import Link from "next/link";
import Header from "./Header";

type LegalLayoutProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

export default function LegalLayout({
  title,
  description,
  children,
}: LegalLayoutProps) {
  return (
    <>
      <Head>
        <title>{title} | Rewordly</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen flex flex-col bg-white text-neutral-800">
        <Header />

        {/* Content */}
        <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-neutral-900 px-4 py-8 text-white sm:px-6">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 sm:flex-row sm:flex-wrap">
            <span className="text-lg font-extrabold">Rewordly</span>
            <div className="flex flex-wrap justify-center gap-6">
              <Link
                href="/blog"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Blog
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Terms of Service
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Cookie Policy
              </Link>
              <Link
                href="/legal"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Legal Notice
              </Link>
              <a
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Chrome Web Store
              </a>
              <a
                href="mailto:sercangundogan35@gmail.com"
                className="text-sm text-neutral-400 transition hover:text-white"
              >
                Contact
              </a>
            </div>
            <span className="text-sm text-neutral-500">
              © {new Date().getFullYear()} Rewordly. All rights reserved.
            </span>
          </div>
        </footer>
      </div>
    </>
  );
}
