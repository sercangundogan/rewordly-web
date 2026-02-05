import Head from "next/head";
import Link from "next/link";

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
        {/* Navbar */}
        <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/98 backdrop-blur supports-backdrop-filter:bg-white/80">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
            <Link href="/" className="text-xl font-extrabold text-neutral-900">
              Rewordly
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
              >
                Home
              </Link>
              <Link
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-neutral-700"
              >
                Add to Chrome
              </Link>
            </div>
          </div>
        </nav>

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
