import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { SUPPORT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy — 5Pixels",
  description:
    "How 5Pixels collects, uses, stores, and protects your personal information, including the photos you upload for AI transformations.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated="September 28, 2026"
      intro={
        <p>
          5Pixels (&ldquo;5Pixels,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;) is an AI-powered photo transformation service. You
          choose a preset look, upload a photo, and we generate a transformed
          result using third-party AI models. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have.
        </p>
      }
      sections={[
        {
          id: "information-we-collect",
          title: "Information we collect",
          body: (
            <>
              <p>
                <strong>Account information.</strong> When you create an
                account, we collect your email address and, optionally, a
                display name and avatar. If you sign in with Google, we receive
                your Google account name, email, and profile picture as permitted
                by your Google settings.
              </p>
              <p>
                <strong>Photos you upload.</strong> To create a transformation,
                you upload a source photo. Uploads are stored privately and are
                used only to produce your results — they are never shown to
                other users.
              </p>
              <p>
                <strong>Generated results.</strong> The images we produce for
                you are stored in your private library until you delete them or
                your retention settings remove them.
              </p>
              <p>
                <strong>Preset options.</strong> Some presets let you customize
                the result with short text fields or option selections (for
                example, a name on a poster). These inputs are part of your
                generation request.
              </p>
              <p>
                <strong>Billing information.</strong> Purchases are processed by
                Creem, our merchant of record and payment processor. We receive
                transaction details (plan purchased, amount, status) but we do
                not collect or store your full payment card number.
              </p>
              <p>
                <strong>Usage data.</strong> We record credit balance changes,
                generation history, and technical logs needed to operate,
                secure, and improve the service.
              </p>
              <p>
                <strong>Communications.</strong> If you contact us, we keep a
                record of that correspondence to respond and resolve your
                request.
              </p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "How we use your information",
          body: (
            <ul>
              <li>Provide the service: process your uploads and deliver generated results.</li>
              <li>Operate your account, credits, subscriptions, and payment history.</li>
              <li>Screen inputs for content-policy compliance before generation.</li>
              <li>Respond to support requests and send service-related notices.</li>
              <li>Maintain security, prevent fraud and abuse, and enforce our Terms.</li>
              <li>Analyze aggregated usage to improve presets and product quality.</li>
            </ul>
          ),
        },
        {
          id: "photos-and-faces",
          title: "Your photos and generated content",
          body: (
            <>
              <p>
                Your uploads and results are <strong>private by default</strong>.
                They are stored in private storage and served through short-lived
                signed URLs — only you can access them while signed in, unless you
                explicitly share a result link.
              </p>
              <p>
                Photos may contain faces. We process the photo you upload solely
                to render the preset you selected. We do not build faceprints,
                biometric identifiers, or a facial-recognition database, and we
                do not use your uploads to identify you or anyone else.
              </p>
              <p>
                Only upload photos of yourself or photos you have permission to
                use.
              </p>
            </>
          ),
        },
        {
          id: "ai-providers",
          title: "Third-party AI processing",
          body: (
            <>
              <p>
                To generate a result, your uploaded photo and preset options are
                sent to third-party AI model providers over an encrypted
                connection. These providers process your input transiently to
                produce the transformation and return the result to us.
              </p>
              <p>
                We do not name our model providers publicly as part of the
                product experience, but all processing happens server-side under
                our provider agreements — your photos are not sold and are not
                shared for unrelated purposes.
              </p>
            </>
          ),
        },
        {
          id: "sharing",
          title: "How we share information",
          body: (
            <>
              <p>We share personal information only with:</p>
              <ul>
                <li>
                  <strong>Infrastructure providers</strong> that host our
                  application, database, authentication, and file storage.
                </li>
                <li>
                  <strong>AI model providers</strong> that render your requested
                  transformations.
                </li>
                <li>
                  <strong>Creem</strong>, our merchant of record, to process
                  payments, subscriptions, refunds, and receipts.
                </li>
                <li>
                  <strong>Legal and safety</strong> recipients where required by
                  law, to enforce our rights, or to protect users and the
                  public.
                </li>
              </ul>
              <p>We do not sell your personal information.</p>
            </>
          ),
        },
        {
          id: "cookies",
          title: "Cookies and similar technologies",
          body: (
            <p>
              We use cookies and similar technologies to keep you signed in,
              remember preferences, and operate the service. We do not run
              third-party advertising trackers.
            </p>
          ),
        },
        {
          id: "retention",
          title: "Retention and deletion",
          body: (
            <>
              <p>
                You control how long your content is kept. In{" "}
                <strong>Account → Privacy &amp; data</strong> you can set
                automatic deletion for source uploads and generated results.
              </p>
              <ul>
                <li>Delete an individual generation (source + result) at any time.</li>
                <li>Enable auto-delete so uploads/results expire on your chosen schedule.</li>
                <li>Delete your entire account from Account settings.</li>
              </ul>
              <p>
                We retain billing and transaction records as required for tax,
                accounting, and legal purposes. Backup copies are removed on the
                backup system&rsquo;s normal cycle.
              </p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "Your rights and choices",
          body: (
            <>
              <p>
                Depending on where you live, you may have rights to access,
                correct, export, or delete your personal information, and to
                object to or restrict certain processing. You can exercise most
                of these directly in the product — edit your profile, adjust
                retention settings, or delete content and your account — or by
                contacting us at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
              </p>
              <p>
                If you are in the EEA, UK, or a U.S. state with a privacy law
                (such as California), you may have additional statutory rights.
                Contact us to exercise them and we will respond within the time
                required by law.
              </p>
            </>
          ),
        },
        {
          id: "security",
          title: "Security",
          body: (
            <p>
              We use industry-standard measures including encryption in transit,
              private-by-default storage with expiring signed URLs, server-side
              authorization checks, and restricted internal access. No method of
              transmission or storage is 100% secure, but protecting your photos
              is a core design goal of the product.
            </p>
          ),
        },
        {
          id: "international",
          title: "International data transfers",
          body: (
            <p>
              We process and store information in the countries where we and our
              service providers operate, which may be outside your country of
              residence. Where required, transfers rely on appropriate
              safeguards such as standard contractual clauses.
            </p>
          ),
        },
        {
          id: "children",
          title: "Children",
          body: (
            <p>
              The service is not directed to children under 13, and you must be
              at least 18 (or the age of majority in your jurisdiction) to
              create an account. If you believe a child has provided us personal
              information, contact us and we will delete it.
            </p>
          ),
        },
        {
          id: "changes",
          title: "Changes to this policy",
          body: (
            <p>
              If we update this policy, we will post the new version here and
              update the &ldquo;Last updated&rdquo; date. For material changes,
              we will provide additional notice in the product or by email.
            </p>
          ),
        },
        {
          id: "contact",
          title: "Contact us",
          body: (
            <p>
              Questions or privacy requests:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to
              respond within 3 business days.
            </p>
          ),
        },
      ]}
    />
  );
}
