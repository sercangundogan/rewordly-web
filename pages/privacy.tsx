import { NextPage } from "next";
import Link from "next/link";
import LegalLayout from "../components/LegalLayout";

const Privacy: NextPage = () => {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Rewordly collects, uses, and protects your data."
    >
      <Link
        href="/"
        className="mb-8 inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
      >
        ← Back to Home
      </Link>
      <h1 className="mb-2 text-3xl font-extrabold text-neutral-900">
        Privacy Policy
      </h1>
      <p className="mb-10 text-sm text-neutral-500">
        Last updated: February 5, 2025
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            1. Introduction
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Rewordly (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) respects your
            privacy. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our Chrome extension,
            website, and related services (collectively, the &quot;Service&quot;).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            2. Information We Collect
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
            <li>
              <strong>Text you select:</strong> When you use Rewordly to rewrite
              or check grammar, the selected text is sent to our servers for
              processing. We do not store this content after processing.
            </li>
            <li>
              <strong>Account data (optional):</strong> If you sign in (e.g.,
              via email or Google), we store your email and account identifier
              for authentication and usage limits.
            </li>
            <li>
              <strong>Usage data:</strong> We may collect anonymous usage
              metrics (e.g., feature usage, errors) to improve the Service.
            </li>
            <li>
              <strong>Cookies and similar tech:</strong> Our website may use
              cookies; see our{" "}
              <Link href="/cookies" className="text-neutral-900 underline">
                Cookie Policy
              </Link>{" "}
              for details.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            3. How We Use Your Information
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We use the information to: provide and improve the Service (e.g.,
            AI rewriting and grammar check), enforce usage limits, communicate
            with you (e.g., login codes, support), and comply with legal
            obligations. We do not sell your personal data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            4. Data Retention &amp; Security
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Selected text is processed in real time and not retained. Account
            and usage data are kept as long as your account is active or as
            required by law. We use industry-standard measures to protect data
            (e.g., encryption, access controls).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            5. Third-Party Services
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We use third-party providers for hosting, authentication (e.g.,
            Supabase, Google), AI processing (e.g., OpenAI), and analytics.
            Their use of data is governed by their respective privacy policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            6. Your Rights
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Depending on your location, you may have rights to access, correct,
            delete, or port your data, or to object to or restrict processing.
            To exercise these rights or ask questions, contact us at{" "}
            <a
              href="mailto:sercangundogan35@gmail.com"
              className="text-neutral-900 underline"
            >
              sercangundogan35@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            7. Changes
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We may update this Privacy Policy from time to time. We will post
            the updated version on this page and update the &quot;Last
            updated&quot; date. Continued use of the Service after changes
            constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">8. Contact</h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            For privacy-related questions:{" "}
            <a
              href="mailto:sercangundogan35@gmail.com"
              className="text-neutral-900 underline"
            >
              sercangundogan35@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </LegalLayout>
  );
};

export default Privacy;
