import { NextPage } from "next";
import Link from "next/link";
import LegalLayout from "../components/LegalLayout";

const Legal: NextPage = () => {
  return (
    <LegalLayout
      title="Legal Notice"
      description="Legal information and imprint for Rewordly."
    >
      <Link
        href="/"
        className="mb-8 inline-flex items-center text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
      >
        ← Back to Home
      </Link>
      <h1 className="mb-2 text-3xl font-extrabold text-neutral-900">
        Legal Notice
      </h1>
      <p className="mb-10 text-sm text-neutral-500">
        Last updated: February 5, 2025
      </p>

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            1. Operator / Responsible Party
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            The Rewordly service and website are operated by the individual or
            entity responsible for the Rewordly product. For the purpose of
            these legal pages and for contact regarding the service, you may
            reach the operator at:
          </p>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            <strong>Email:</strong>{" "}
            <a
              href="mailto:sercangundogan35@gmail.com"
              className="text-neutral-900 underline"
            >
              sercangundogan35@gmail.com
            </a>
          </p>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            For full details on data processing and your rights, see our{" "}
            <Link href="/privacy" className="text-neutral-900 underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            2. Disclaimer of Liability
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Content on the Rewordly website is provided for general information
            only. We strive to keep it accurate and up to date but do not
            guarantee completeness or accuracy. We are not liable for any loss
            or damage arising from reliance on this content. Use of the
            Rewordly extension and AI-generated text is at your own risk; you
            are responsible for reviewing and using outputs appropriately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            3. External Links
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            Our site may contain links to third-party websites (e.g., Chrome
            Web Store, payment providers). We do not control and are not
            responsible for their content or privacy practices. Use of
            third-party sites is subject to their terms and policies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            4. Intellectual Property
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            The Rewordly name, logo, and website content (unless otherwise
            stated or from third parties) are protected by intellectual
            property rights. Unauthorized use (e.g., copying, commercial use
            without permission) may violate applicable law. For licensing or
            partnership inquiries, contact us at the email above.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            5. Applicable Law and Disputes
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            These legal notices and the use of our Service are subject to the
            laws of the jurisdiction in which the operator is established.
            Any disputes shall be resolved in the courts of that jurisdiction,
            unless otherwise required by mandatory law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">
            6. Related Policies
          </h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            For a complete picture of your rights and our obligations, please
            also read our{" "}
            <Link href="/privacy" className="text-neutral-900 underline">
              Privacy Policy
            </Link>
            ,{" "}
            <Link href="/terms" className="text-neutral-900 underline">
              Terms of Service
            </Link>
            , and{" "}
            <Link href="/cookies" className="text-neutral-900 underline">
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-neutral-900">7. Contact</h2>
          <p className="mt-2 text-neutral-600 leading-relaxed">
            For legal or general inquiries:{" "}
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

export default Legal;
