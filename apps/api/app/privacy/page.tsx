import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for the HypeDCA Chrome extension and cloud execution service.",
};

const updatedAt = "June 30, 2026";

const sections = [
  {
    title: "What HypeDCA does",
    body: [
      "HypeDCA is an independent Chrome extension for creating and managing recurring Hyperliquid spot or perpetual orders. Users can run schedules locally in the browser or use HypeDCA Cloud for hosted execution.",
      "HypeDCA is not affiliated with, endorsed by, or sponsored by Hyperliquid.",
    ],
  },
  {
    title: "Information we collect",
    body: [
      "Hyperliquid account information, including the account address, selected network, and user-provided Hyperliquid API or agent wallet private key.",
      "Recurring order settings, including market, side, notional amount, cadence, timezone, risk controls, execution mode, schedule status, and run history.",
      "Cloud account information, including an internal account identifier, authentication token, subscription status, and billing identifiers needed to operate HypeDCA Cloud.",
      "Payment and subscription information is processed by Stripe. HypeDCA does not store full card numbers.",
      "Operational information, including API requests, execution results, order identifiers, errors, and security or abuse-prevention logs.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use this information only to provide HypeDCA's single purpose: recurring Hyperliquid order automation, schedule management, execution history, cloud execution, billing, support, security, and abuse prevention.",
      "Browser-mode credentials and schedules are stored in Chrome local storage on the user's device. Cloud-mode credentials are sent to HypeDCA infrastructure so scheduled orders can be signed and submitted while the user's browser is offline.",
      "Cloud credentials are encrypted at rest and decrypted only when needed to execute a user-created schedule.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "HypeDCA sends signed order requests and market/account requests to Hyperliquid mainnet or testnet APIs as needed to execute user schedules.",
      "HypeDCA uses Stripe for subscription checkout, billing, and customer portal management.",
      "HypeDCA uses hosted infrastructure providers, including Vercel and Neon, to operate the cloud API, database, scheduled execution, logs, and related infrastructure.",
    ],
  },
  {
    title: "What we do not do",
    body: [
      "We do not sell user data.",
      "We do not transfer user data to third parties except as needed to provide the extension's recurring-order automation, billing, infrastructure, security, legal compliance, or user-requested support.",
      "We do not use or transfer user data for purposes unrelated to HypeDCA's single purpose.",
      "We do not use or transfer user data to determine creditworthiness or for lending purposes.",
      "We do not ask for seed phrases, master wallet private keys, or withdrawal credentials.",
    ],
  },
  {
    title: "User choices and deletion",
    body: [
      "Users can remove browser-mode data by deleting schedules in the extension, disconnecting credentials where available, clearing the extension's Chrome storage, or uninstalling the extension.",
      "Users can revoke Hyperliquid API or agent wallet credentials from Hyperliquid at any time. Revocation is the recommended way to immediately stop any future signing capability for that key.",
      "Users can manage or cancel HypeDCA Cloud billing through the Stripe customer portal opened from the extension.",
      "For cloud account deletion or privacy requests, use the support or contact channel listed on the Chrome Web Store listing.",
    ],
  },
  {
    title: "Security",
    body: [
      "HypeDCA uses limited Hyperliquid API or agent wallet credentials and instructs users not to provide seed phrases or master wallet keys.",
      "Cloud credentials are encrypted at rest. Access is limited to the systems required to execute user-created schedules and maintain the service.",
      "No internet-connected system can be guaranteed completely secure. Users should create limited-purpose Hyperliquid API or agent wallets and revoke credentials that are no longer needed.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this privacy policy as HypeDCA changes. The latest version will be available at this URL and will include the effective date above.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main style={styles.page}>
      <article style={styles.article}>
        <p style={styles.eyebrow}>HypeDCA</p>
        <h1 style={styles.heading}>Privacy Policy</h1>
        <p style={styles.updated}>Effective date: {updatedAt}</p>

        {sections.map((section) => (
          <section key={section.title} style={styles.section}>
            <h2 style={styles.sectionHeading}>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} style={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    background: "#f7f7f4",
    color: "#171717",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    lineHeight: 1.6,
  },
  article: {
    width: "min(760px, calc(100% - 32px))",
    margin: "0 auto",
    padding: "64px 0 80px",
  },
  eyebrow: {
    margin: "0 0 10px",
    color: "#54616d",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  heading: {
    margin: 0,
    fontSize: "clamp(36px, 6vw, 58px)",
    lineHeight: 1,
    letterSpacing: 0,
  },
  updated: {
    margin: "18px 0 42px",
    color: "#54616d",
    fontSize: "15px",
  },
  section: {
    borderTop: "1px solid #dadbd3",
    padding: "28px 0",
  },
  sectionHeading: {
    margin: "0 0 12px",
    fontSize: "22px",
    lineHeight: 1.25,
    letterSpacing: 0,
  },
  paragraph: {
    margin: "10px 0 0",
    fontSize: "16px",
  },
} satisfies Record<string, React.CSSProperties>;
