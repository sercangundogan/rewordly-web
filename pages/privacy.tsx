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
        Last updated: November 5, 2026
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
              <strong>Text you type (live grammar check):</strong> While
              &quot;Auto grammar check&quot; is on, Rewordly checks the text field
              you are typing in. Each sentence is sent to our servers for
              checking after you finish it or pause, and only sentences that
              changed are sent again. Rewordly skips password fields and fields
              a site marks as email, phone, address, one-time code or payment
              details, as well as code editors. You can
              turn live checking off in the extension popup or disable Rewordly
              on any site.
            </li>
            <li>
              <strong>Check results:</strong> To make checks faster and keep
              the free plan possible, we store the results of live checks: the
              flagged words, the suggested corrections and short explanations,
              linked to a one-way fingerprint (hash) of the sentence. We do not
              store the full text you typed. The extension also keeps recent
              results on your device so the same sentence is not checked twice.
              Results are kept for up to 30 days on our servers and 7 days on
              your device, then checked again. When you ignore a suggestion, the
              extension sends only that suggestion&apos;s fingerprint, linked to
              your account or the extension&apos;s random identifier, so
              suggestions many people ignore can be removed. These votes are
              deleted after 90 days.
            </li>
            <li>
              <strong>Account data (optional):</strong> If you sign in (e.g.,
              via email or Google), we store your email and account identifier
              for authentication and usage limits.
            </li>
            <li>
              <strong>Usage data:</strong> To enforce usage limits we count how
              many characters you have checked, linked to your account or, if
              you are not signed in, to a random identifier created by the
              extension. To prevent abuse of the free trial we also count usage
              per IP address, which we store only as a salted one-way hash. We
              log the size and cost of each AI request (never its text), and may
              collect anonymous metrics such as errors to improve the Service.
            </li>
            <li>
              <strong>Feature usage per site:</strong> To learn where Rewordly
              is useful, the extension counts which features you use (for
              example checks, applied fixes, rewrites) on which website, by
              day. We store only the site&apos;s name (such as
              &quot;medium.com&quot;), never the page address or any text, and
              local or company-internal sites are recorded only as
              &quot;private&quot;. These counts are linked to your account or the
              extension&apos;s random identifier, like the usage data above.
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
            Selected text for rewrites and on-demand grammar checks is
            processed in real time and not retained. Live check results (see
            above) are kept to serve repeated checks and may be deleted at any
            time as part of routine cleanup. Usage counters and request logs
            are kept as long as needed to enforce limits and understand costs.
            Account data is kept as long as your account is active or as
            required by law. You can ask us to delete your data at any time
            (see &quot;Your Rights&quot;). We use industry-standard measures to
            protect data (e.g., encryption, access controls).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            5. Third-Party Services
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We use third-party providers for hosting, database and
            authentication (e.g., Supabase, Google), AI processing (OpenAI) and
            analytics. Text you ask Rewordly to rewrite or check is sent to
            OpenAI&apos;s API to produce the result. Their use of data is
            governed by their respective privacy policies; see{" "}
            <a
              href="https://openai.com/enterprise-privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-900 underline"
            >
              OpenAI&apos;s API data policy
            </a>
            . We do not sell your text or personal data.
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
