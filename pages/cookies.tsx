import { NextPage } from "next";
import Link from "next/link";
import LegalLayout from "../components/LegalLayout";

const Cookies: NextPage = () => {
  return (
    <LegalLayout
      title="Cookie Policy"
      description="How Rewordly uses cookies and similar technologies."
    >
      <Link
        href="/"
        className="mb-8 inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
      >
        ← Back to Home
      </Link>
      <h1 className="mb-2 text-3xl font-extrabold text-neutral-900">
        Cookie Policy
      </h1>
      <p className="mb-10 text-sm text-neutral-500">
        Last updated: February 5, 2025
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            1. What Are Cookies?
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Cookies are small text files stored on your device when you visit a
            website. They help the site remember your preferences, keep you
            signed in, and understand how the site is used. This policy explains
            how Rewordly uses cookies and similar technologies on our website.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            2. Cookies We Use
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We may use the following types of cookies on our website:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
            <li>
              <strong>Strictly necessary:</strong> Required for the website and
              authentication to work (e.g., session, security). These generally
              do not require consent where legally allowed.
            </li>
            <li>
              <strong>Functional:</strong> Remember your preferences (e.g.,
              language, consent choices) to improve your experience.
            </li>
            <li>
              <strong>Analytics:</strong> Help us understand how visitors use
              our site (e.g., page views, traffic). We may use services such as
              Vercel Analytics; data is typically aggregated and anonymized.
            </li>
            <li>
              <strong>Third-party:</strong> Our authentication provider
              (e.g., Supabase) and other embedded services may set their own
              cookies. Their use is governed by their respective policies.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            3. Chrome Extension
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            The Rewordly Chrome extension may use local storage (e.g., Chrome
            storage APIs) to save your settings (e.g., enabled/disabled state).
            This is stored on your device and is not the same as website
            cookies; we do not use it to track you across other sites.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            4. Your Choices
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            You can control cookies via your browser settings (e.g., block or
            delete cookies). Blocking strictly necessary cookies may affect
            site functionality (e.g., login). Where we use non-essential
            cookies, we will seek your consent where required by law (e.g., via
            a banner or preferences).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            5. Updates and Contact
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We may update this Cookie Policy from time to time. The &quot;Last
            updated&quot; date at the top will be revised accordingly. For
            questions about our use of cookies:{" "}
            <a
              href="mailto:sercangundogan35@gmail.com"
              className="text-neutral-900 underline"
            >
              sercangundogan35@gmail.com
            </a>
            . For more on how we process personal data, see our{" "}
            <Link href="/privacy" className="text-neutral-900 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </LegalLayout>
  );
};

export default Cookies;
