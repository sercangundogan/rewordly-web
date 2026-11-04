import { NextPage } from "next";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import Header from "../components/Header";

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp";

/** Deliberate mistakes, so the first underlines appear the moment the page opens. */
const SAMPLE_TEXT = `Hi Sarah, thanks for you're help yesterday. I has attached the report and it explain the main results.

Let me know if their is anything else you need before the meeting.

Sunumu bitirdim, akşam sana gönderecegim. Yarın görüşürüz.`;

/** The extension's overlay adds this element to every page it runs on. */
const EXTENSION_MARKER = "rewordly-live";

/**
 * Playground opened from the extension's welcome page (and linked from the site):
 * live checking can't run on extension pages, so new users try it here first.
 */
const Try: NextPage = () => {
  const [extensionFound, setExtensionFound] = useState<boolean | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rewordly only checks the focused field. React ignores autoFocus when hydrating
  // server-rendered markup, so focus it here (caret at the end) to start the demo.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (document.querySelector(EXTENSION_MARKER)) {
        setExtensionFound(true);
        clearInterval(timer);
      } else if (Date.now() - started > 2500) {
        setExtensionFound(false);
        clearInterval(timer);
      }
    }, 250);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <Head>
        <title>Try Rewordly – Live Grammar Check Playground</title>
        <meta
          name="description"
          content="See Rewordly's live grammar check in action: mistakes are underlined as you type. Hover an underline to fix it in one click, in any language."
        />
        <link rel="canonical" href="https://rewordly.store/try" />
      </Head>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Playground</p>
        <h1 className="mb-3 text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Try live grammar check
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-neutral-600">
          The text below has a few mistakes, and Rewordly underlines them in red. Hover an
          underline to see the fix, then click it. Keep typing to try your own sentences, in any
          language.
        </p>

        {extensionFound === false && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center">
            <p className="text-sm text-neutral-700">
              Rewordly isn&apos;t running on this page yet. Add the free extension to Chrome, then
              reload this page.
            </p>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg bg-neutral-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-neutral-700"
            >
              Add to Chrome – Free
            </a>
          </div>
        )}

        <label htmlFor="playground" className="sr-only">
          Playground text
        </label>
        <textarea
          id="playground"
          ref={textareaRef}
          defaultValue={SAMPLE_TEXT}
          rows={9}
          className="w-full resize-y rounded-xl border border-neutral-300 bg-white p-4 text-base leading-relaxed text-neutral-900 shadow-sm outline-none focus:border-neutral-500"
        />

        <ul className="mt-8 space-y-2 text-sm text-neutral-600">
          <li>
            <strong className="text-neutral-900">Fix all:</strong> click the red badge in the corner
            of the box, then &quot;Fix all&quot; to correct every mistake at once.
          </li>
          <li>
            <strong className="text-neutral-900">Rewrite:</strong> select a sentence and click
            Rewrite to change its tone or make it shorter.
          </li>
          <li>
            <strong className="text-neutral-900">Everywhere:</strong> the same underlines appear in
            comments, posts and messages on the sites you use.
          </li>
        </ul>
      </main>
    </>
  );
};

export default Try;
