import { NextPage } from "next";
import Link from "next/link";
import LegalLayout from "../components/LegalLayout";

const Terms: NextPage = () => {
  return (
    <LegalLayout
      title="Terms of Service"
      description="Terms and conditions for using Rewordly."
    >
      <Link
        href="/"
        className="mb-8 inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
      >
        ← Back to Home
      </Link>
      <h1 className="mb-2 text-3xl font-extrabold text-neutral-900">
        Terms of Service
      </h1>
      <p className="mb-10 text-sm text-neutral-500">
        Last updated: February 5, 2025
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            1. Acceptance of Terms
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            By installing the Rewordly Chrome extension, visiting our website,
            or using our services (the &quot;Service&quot;), you agree to these
            Terms of Service and our{" "}
            <Link href="/privacy" className="text-neutral-900 underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            2. Description of Service
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Rewordly provides AI-powered text rewriting and grammar checking
            via a Chrome extension and optional web account. Usage may be
            subject to daily limits; paid plans may offer higher or unlimited
            usage as described at the time of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            3. Acceptable Use
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            You agree to use the Service only for lawful purposes. You must not:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-600">
            <li>Violate any applicable laws or third-party rights.</li>
            <li>Use the Service to generate harmful, misleading, or illegal content.</li>
            <li>Attempt to circumvent usage limits, security, or access controls.</li>
            <li>Resell, redistribute, or commercially exploit the Service without permission.</li>
            <li>Reverse engineer or attempt to extract our models or source code.</li>
          </ul>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We may suspend or terminate access for violations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            4. Account and Subscription
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Creating an account is optional. You are responsible for keeping
            your credentials secure. Paid subscriptions are governed by the
            terms presented at checkout (e.g., Lemon Squeezy) and by our
            refund policy as stated on the website or at purchase.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            5. Intellectual Property
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Rewordly, our branding, and the Service (excluding third-party
            content and open-source components) are owned by us. You receive
            no ownership rights; we grant you a limited, non-exclusive license
            to use the Service in accordance with these Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            6. Disclaimers
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            The Service is provided &quot;as is&quot; and &quot;as available&quot;.
            We do not guarantee accuracy, availability, or fitness for a
            particular purpose. AI output may contain errors; you are
            responsible for reviewing and using results appropriately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            7. Limitation of Liability
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            To the maximum extent permitted by law, we are not liable for any
            indirect, incidental, special, or consequential damages, or for loss
            of data or profits, arising from your use of the Service. Our total
            liability shall not exceed the amount you paid us in the twelve
            months before the claim (or zero if you have not paid).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            8. Changes to Terms
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            We may update these Terms from time to time. We will post the
            updated version on this page and update the &quot;Last updated&quot;
            date. Continued use after changes constitutes acceptance. Material
            changes may be communicated via email or in-app notice where
            appropriate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            9. Governing Law and Contact
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            These Terms are governed by the laws applicable to the operator of
            Rewordly. For questions:{" "}
            <a
              href="mailto:sercangundogan35@gmail.com"
              className="text-neutral-900 underline"
            >
              sercangundogan35@gmail.com
            </a>
            . See our{" "}
            <Link href="/legal" className="text-neutral-900 underline">
              Legal Notice
            </Link>{" "}
            for entity and contact details.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
};

export default Terms;
