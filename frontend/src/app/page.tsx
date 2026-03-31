import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import Footer from "@/components/Footer";
import MobileNav from "@/components/MobileNav";
import WalletButton from "@/components/WalletButton";
import ScrollReveal from "@/components/ScrollReveal";

/* ─── Nav ─── */
function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 sla-glass-header"
      style={{ height: "60px" }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div
        className="mx-auto flex w-full items-center justify-between"
        style={{
          maxWidth: "1200px",
          height: "100%",
          padding: "0 clamp(20px, 5vw, 48px)",
        }}
      >
        <Link
          href="/"
          className="font-bold"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "1.125rem",
            letterSpacing: "-0.02em",
            color: "var(--sla-text-primary)",
            textDecoration: "none",
          }}
          aria-label="SlaStream home"
        >
          <Image src="/logo.png" alt="SLAStream" width={28} height={28} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8 }} />
          <span style={{ color: "var(--sla-accent)" }}>SLA</span>Stream
        </Link>

        {/* Desktop links */}
        <ul
          className="hidden items-center md:flex"
          style={{ gap: "32px", listStyle: "none" }}
          role="list"
        >
          <li>
            <Link href="/dashboard" className="sla-nav-link text-sm font-medium">
              Dashboard
            </Link>
          </li>
          <li>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="sla-nav-link text-sm font-medium"
            >
              Docs
            </a>
          </li>
        </ul>

        {/* Desktop actions */}
        <div className="hidden items-center md:flex" style={{ gap: "12px" }}>
          <ThemeToggle />
          <WalletButton />
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <WalletButton />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </nav>
  );
}

/* ─── Hero — Centered cinematic viewport ─── */
function Hero() {
  return (
    <section className="sla-hero-centered" aria-labelledby="sla-hero-headline">
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 clamp(20px, 5vw, 48px)" }}>
        {/* Eyebrow */}
        <div className="sla-reveal">
          <span
            className="font-mono inline-block"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--sla-text-muted)",
              marginBottom: "28px",
              padding: "6px 14px",
              border: "1px solid var(--sla-border-strong)",
              borderRadius: "2px",
            }}
          >
            PL Genesis: Frontiers of Collaboration
          </span>
        </div>

        {/* Headline */}
        <h1
          id="sla-hero-headline"
          className="sla-reveal sla-delay-1 font-bold"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            letterSpacing: "-0.04em",
            lineHeight: "1.0",
            color: "var(--sla-text-primary)",
            marginBottom: "28px",
          }}
        >
          Proof-Gated
          <br />
          <span style={{ color: "var(--sla-accent)" }}>Streaming</span> Payments
        </h1>

        {/* Subheadline */}
        <p
          className="sla-reveal sla-delay-2"
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
            color: "var(--sla-text-muted)",
            maxWidth: "560px",
            margin: "0 auto 40px",
            lineHeight: "1.65",
          }}
        >
          Storage providers get paid per verified chunk.
          Miss the SLA? Automatic slash. Zero human intervention.
        </p>

        {/* CTA buttons */}
        <div
          className="sla-reveal sla-delay-3"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
            marginBottom: "56px",
          }}
        >
          <Link href="/dashboard" className="sla-btn-primary" role="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
            View Live Dashboard
          </Link>
          <Link href="/dashboard" className="sla-btn-secondary" role="button">
            Connect &amp; Create Deal
          </Link>
        </div>

        {/* Chain tagline */}
        <div
          className="sla-chain-tagline sla-reveal"
          aria-label="Technology stack: Filecoin PDP, Lit Protocol Oracle, Starknet Cairo Escrow"
        >
          <div className="sla-chain-node">
            <span
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#0090FF", flexShrink: 0 }}
              aria-hidden="true"
            />
            Filecoin PDP
          </div>
          <div className="sla-chain-node" style={{ color: "var(--sla-text-muted)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="sla-chain-node">
            <span
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#9B59FF", flexShrink: 0 }}
              aria-hidden="true"
            />
            Lit Protocol Oracle
          </div>
          <div className="sla-chain-node" style={{ color: "var(--sla-text-muted)" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div className="sla-chain-node">
            <span
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#EC796B", flexShrink: 0 }}
              aria-hidden="true"
            />
            Starknet Cairo Escrow
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Problem — Contained island with stats ─── */
function Problem() {
  const stats = [
    {
      value: "3,600 PB",
      label: "Filecoin Data Stored",
      note: "Massive scale, zero payment automation",
      accent: true,
    },
    {
      value: "$0",
      label: "SP Retrieval Revenue",
      note: "Since Filecoin genesis. Storage providers subsidize the network",
      accent: false,
    },
    {
      value: "1,400+",
      label: "Active Storage Providers",
      note: "Doing the work, not getting paid for it",
      accent: true,
    },
  ];

  return (
    <section
      style={{ padding: "clamp(72px, 10vw, 120px) clamp(20px, 5vw, 48px)" }}
      aria-labelledby="sla-problem-heading"
    >
      <div className="sla-problem-island sla-reveal">
        <div className="sla-label" aria-label="Section: The Problem">
          The Problem
        </div>

        <h2
          id="sla-problem-heading"
          className="font-bold"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(1.6rem, 4vw, 2.6rem)",
            letterSpacing: "-0.03em",
            lineHeight: "1.15",
            marginBottom: "16px",
          }}
        >
          Storage work deserves
          <br />
          real pay.
        </h2>

        <p
          style={{
            color: "var(--sla-text-muted)",
            fontSize: "1rem",
            lineHeight: "1.7",
            maxWidth: "540px",
            marginBottom: "48px",
          }}
        >
          The infrastructure exists. The proofs are verifiable. The payments just
          weren&apos;t automated — until now.
        </p>

        <div className="sla-stats-grid-v" role="list" aria-label="Problem statistics">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`sla-stat-cell sla-reveal${i === 1 ? " sla-delay-1" : i === 2 ? " sla-delay-2" : ""}`}
              role="listitem"
            >
              <div
                className="font-bold"
                style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  letterSpacing: "-0.04em",
                  color: stat.accent ? "var(--sla-accent)" : "var(--sla-text-primary)",
                  lineHeight: "1",
                  marginBottom: "6px",
                }}
                aria-label={stat.value}
              >
                {stat.value}
              </div>
              <div
                className="font-mono"
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--sla-text-muted)",
                  marginBottom: "12px",
                }}
              >
                {stat.label}
              </div>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--sla-text-dim)",
                  lineHeight: "1.5",
                }}
              >
                {stat.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works — Asymmetric 60/40 split ─── */
function HowItWorks() {
  const pipelineNodes = [
    { abbr: "FIL", name: "Filecoin", role: "Proof of Data Possession", net: "Calibration\nTestnet", color: "#0090FF" },
    { abbr: "LIT", name: "Lit Protocol", role: "Oracle cross-chain bridge", net: "Chronicle\nYellowstone", color: "#9B59FF" },
    { abbr: "STK", name: "Starknet", role: "Cairo escrow releases STRK", net: "Sepolia\nTestnet", color: "#EC796B" },
  ];

  return (
    <section
      style={{ padding: "clamp(72px, 10vw, 120px) 0" }}
      aria-labelledby="sla-hiw-heading"
    >
      <div className="sla-hiw-split">
        {/* Left: text */}
        <div>
          <div className="sla-label sla-reveal" aria-label="Section: How It Works">
            How It Works
          </div>

          <h2
            id="sla-hiw-heading"
            className="sla-reveal font-bold"
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              letterSpacing: "-0.03em",
              lineHeight: "1.1",
              marginBottom: "16px",
            }}
          >
            Three chains.
            <br />
            One seamless flow.
          </h2>

          <p
            className="sla-reveal sla-delay-1"
            style={{
              color: "var(--sla-text-muted)",
              fontSize: "1rem",
              lineHeight: "1.7",
              marginBottom: "40px",
            }}
          >
            SlaStream wires together three independent blockchains into a single,
            unstoppable payment rail. Each chain does what it does best — no trust
            required at any handoff.
          </p>

          <div className="sla-reveal sla-delay-2">
            <a href="#sla-steps" className="sla-btn-secondary" role="button">
              See the steps
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>
        </div>

        {/* Right: pipeline diagram */}
        <div
          className="sla-pipeline-sticky sla-reveal sla-delay-1"
          style={{ display: "flex", flexDirection: "column", gap: "3px" }}
          aria-label="Pipeline diagram: Filecoin to Lit Protocol to Starknet"
        >
          <p
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--sla-text-dim)",
              marginBottom: "12px",
            }}
          >
            Live pipeline
          </p>

          {pipelineNodes.map((node, i) => (
            <div key={node.name}>
              {i > 0 && <div className="sla-pipeline-connector" aria-hidden="true" />}
              <div className="sla-pipeline-node">
                <div
                  className="font-mono flex shrink-0 items-center justify-center"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: `${node.color}1F`,
                    color: node.color,
                    fontSize: "0.65rem",
                    fontWeight: 500,
                    letterSpacing: "0",
                  }}
                  aria-hidden="true"
                >
                  {node.abbr}
                </div>
                <div>
                  <div
                    className="font-bold"
                    style={{
                      fontFamily: "var(--font-space-grotesk), sans-serif",
                      fontSize: "0.875rem",
                      color: "var(--sla-text-primary)",
                    }}
                  >
                    {node.name}
                  </div>
                  <div
                    className="font-mono"
                    style={{
                      fontSize: "0.65rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--sla-text-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {node.role}
                  </div>
                </div>
                <div
                  className="font-mono"
                  style={{
                    marginLeft: "auto",
                    fontSize: "0.6rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--sla-text-dim)",
                    textAlign: "right",
                    whiteSpace: "pre-line",
                  }}
                >
                  {node.net}
                </div>
              </div>
            </div>
          ))}

          {/* Pipeline status bar */}
          <div className="sla-pipeline-status">
            <span
              className="sla-pulse"
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--sla-accent)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            />
            <span
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--sla-accent)",
              }}
            >
              Pipeline Active
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Steps — Full-width breakout band ─── */
function Steps() {
  const steps = [
    {
      num: "STEP 01",
      chain: "Filecoin",
      chainColor: "#0090FF",
      verb: "Prove",
      desc: "Storage Provider submits a Proof of Data Possession on Filecoin Calibration — cryptographic evidence that the data chunk is intact and stored.",
      net: "Calibration Testnet",
    },
    {
      num: "STEP 02",
      chain: "Lit Protocol",
      chainColor: "#9B59FF",
      verb: "Bridge",
      desc: "Lit Actions on Chronicle Yellowstone verify the proof and relay a signed cross-chain attestation to Starknet — no intermediary, no trust.",
      net: "Chronicle Yellowstone",
    },
    {
      num: "STEP 03",
      chain: "Starknet",
      chainColor: "#EC796B",
      verb: "Pay",
      desc: "The Cairo smart contract validates the attestation and auto-streams the escrowed STRK payment directly to the storage provider.",
      net: "Sepolia Testnet",
    },
  ];

  return (
    <section className="sla-steps-band" id="sla-steps" aria-labelledby="sla-steps-title">
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "clamp(48px, 8vw, 96px) clamp(20px, 5vw, 48px)",
        }}
      >
        {/* Header */}
        <div
          className="sla-reveal"
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "48px",
          }}
        >
          <h2
            id="sla-steps-title"
            className="font-bold"
            style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)",
              letterSpacing: "-0.02em",
            }}
          >
            The three-step flow
          </h2>
          <span
            className="font-mono"
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--sla-text-muted)",
            }}
            aria-hidden="true"
          >
            Filecoin → Lit → Starknet
          </span>
        </div>

        {/* Steps grid */}
        <div className="sla-steps-grid" role="list" aria-label="Three payment steps">
          {steps.map((step, i) => (
            <article
              key={step.num}
              className={`sla-step-card sla-reveal${i === 1 ? " sla-delay-1" : i === 2 ? " sla-delay-2" : ""}`}
              role="listitem"
              aria-labelledby={`sla-step${i + 1}-verb`}
            >
              <div className="sla-step-num" aria-label={step.num}>
                {step.num}
              </div>
              <div
                className="font-mono"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "14px",
                }}
              >
                <span
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: step.chainColor,
                  }}
                  aria-hidden="true"
                />
                <span style={{ color: step.chainColor }}>{step.chain}</span>
              </div>
              <h3
                id={`sla-step${i + 1}-verb`}
                className="font-bold"
                style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: "1.5rem",
                  letterSpacing: "-0.03em",
                  color: "var(--sla-text-primary)",
                  marginBottom: "12px",
                }}
              >
                {step.verb}
              </h3>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--sla-text-muted)",
                  lineHeight: "1.65",
                  marginBottom: "20px",
                }}
              >
                {step.desc}
              </p>
              <span className="sla-step-net">{step.net}</span>
            </article>
          ))}
        </div>

        {/* CTA row */}
        <div
          className="sla-reveal"
          style={{
            marginTop: "36px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <Link href="/dashboard" className="sla-btn-primary" role="button">
            See It Live
          </Link>
          <span
            className="font-mono"
            style={{
              fontSize: "0.7rem",
              letterSpacing: "0.06em",
              color: "var(--sla-text-dim)",
            }}
          >
            Live on Starknet Sepolia — no wallet required to observe
          </span>
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA — Contained island ─── */
function CtaSection() {
  return (
    <section
      style={{ padding: "clamp(72px, 10vw, 120px) clamp(20px, 5vw, 48px)" }}
      aria-labelledby="sla-cta-heading"
    >
      <div className="sla-cta-island sla-reveal">
        <div className="sla-label" style={{ justifyContent: "center" }} aria-hidden="true">
          Start Now
        </div>

        <h2
          id="sla-cta-heading"
          className="font-bold"
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
            letterSpacing: "-0.03em",
            lineHeight: "1.15",
            marginBottom: "14px",
          }}
        >
          Storage providers
          <br />
          earn per verified chunk — automatically.
        </h2>

        <p
          style={{
            color: "var(--sla-text-muted)",
            fontSize: "0.95rem",
            lineHeight: "1.65",
            marginBottom: "36px",
            maxWidth: "420px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Connect your wallet, lock escrow, and let SlaStream handle the rest.
          Every proof verified, every payment streamed.
        </p>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <Link href="/dashboard" className="sla-btn-primary" role="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 9h6M9 12h6M9 15h4" />
            </svg>
            View Live Dashboard
          </Link>
          <Link href="/dashboard" className="sla-btn-ghost" role="button">
            Connect &amp; Create Deal
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── DNA Badge ─── */
function DnaBadge() {
  return (
    <aside className="sla-dna-badge" aria-label="Design DNA">
      <span
        className="font-mono"
        style={{
          fontSize: "9px",
          letterSpacing: "0.1em",
          color: "var(--sla-text-muted)",
          textTransform: "uppercase",
        }}
      >
        Variation V
      </span>
      <strong
        className="font-mono"
        style={{
          fontSize: "11px",
          letterSpacing: "0.05em",
          color: "var(--sla-accent)",
        }}
      >
        G-T-C-N-S
      </strong>
    </aside>
  );
}

/* ─── Divider (horizontal rule) ─── */
function Rule() {
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--sla-border)",
      }}
    />
  );
}

/* ScrollRevealScript removed — replaced by ScrollReveal client component */

/* ─── Page ─── */
export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: "var(--sla-bg-primary)" }}>
      <DnaBadge />
      <Nav />
      <Hero />
      <Rule />
      <Problem />
      <HowItWorks />
      <Steps />
      <CtaSection />
      <Footer />
      <ScrollReveal />
    </div>
  );
}
