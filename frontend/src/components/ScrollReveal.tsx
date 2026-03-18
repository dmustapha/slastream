"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const targets = document.querySelectorAll(".sla-reveal");

    if (prefersReduced) {
      targets.forEach((el) => el.classList.add("visible"));
      return;
    }

    if (typeof IntersectionObserver === "undefined") return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    targets.forEach((t) => io.observe(t));

    return () => io.disconnect();
  }, []);

  return null;
}
