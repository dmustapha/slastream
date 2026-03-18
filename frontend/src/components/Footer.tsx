export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--sla-border)",
        padding: "clamp(40px, 6vw, 72px) 0 clamp(24px, 4vw, 40px)",
      }}
      role="contentinfo"
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 clamp(20px, 5vw, 48px)",
        }}
      >
        {/* Top: 3-column grid */}
        <div className="sla-footer-top">
          {/* Brand column */}
          <div>
            <span
              className="font-bold block"
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "1.125rem",
                letterSpacing: "-0.02em",
                color: "var(--sla-text-primary)",
                marginBottom: "10px",
              }}
            >
              <span style={{ color: "var(--sla-accent)" }}>SLA</span>Stream
            </span>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--sla-text-muted)",
                lineHeight: "1.6",
                maxWidth: "280px",
              }}
            >
              Proof-gated streaming payments. Storage providers earn per verified
              chunk — automatically.
            </p>
          </div>

          {/* Chains column */}
          <div>
            <p
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--sla-text-dim)",
                marginBottom: "16px",
              }}
            >
              Built on
            </p>
            <ul
              style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}
              aria-label="Supported chains"
            >
              <ChainListItem color="#0090FF" name="Filecoin" />
              <ChainListItem color="#9B59FF" name="Lit Protocol" />
              <ChainListItem color="#EC796B" name="Starknet" />
            </ul>
          </div>

          {/* Links column */}
          <div>
            <p
              className="font-mono"
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--sla-text-dim)",
                marginBottom: "16px",
              }}
            >
              Links
            </p>
            <ul
              style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}
              aria-label="External links"
            >
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sla-nav-link"
                  style={{ fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
                  aria-label="GitHub repository"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                  </svg>
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://sepolia.starkscan.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sla-nav-link"
                  style={{ fontSize: "0.875rem", display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
                  aria-label="View on Starkscan block explorer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Starkscan
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            borderTop: "1px solid var(--sla-border)",
            paddingTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--sla-text-dim)",
            }}
          >
            Built for PL Genesis: Frontiers of Collaboration — by Dami, Lagos,
            Nigeria
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--sla-text-dim)",
            }}
            aria-hidden="true"
          >
            G &middot; T &middot; C &middot; N &middot; S
          </span>
        </div>
      </div>
    </footer>
  );
}

function ChainListItem({ color, name }: { color: string; name: string }) {
  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.875rem",
        color: "var(--sla-text-muted)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {name}
    </li>
  );
}
