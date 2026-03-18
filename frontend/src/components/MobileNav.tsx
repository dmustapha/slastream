"use client";

import { useState, useEffect } from "react";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when nav is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Hamburger button */}
      <button
        type="button"
        className={`sla-hamburger${open ? " open" : ""}`}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* Overlay */}
      <div
        className={`sla-nav-overlay${open ? " open" : ""}`}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <nav
        className={`sla-nav-panel${open ? " open" : ""}`}
        aria-label="Mobile navigation"
      >
        <a href="/dashboard" onClick={() => setOpen(false)}>
          Dashboard
        </a>
        <a href="https://github.com" target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
          Docs
        </a>
        <a href="#how-it-works" onClick={() => setOpen(false)}>
          How It Works
        </a>

        <div className="sla-nav-panel-footer">
          Proof-gated streaming payments on Starknet
        </div>
      </nav>
    </>
  );
}
