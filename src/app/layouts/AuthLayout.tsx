import React, { useLayoutEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { gsap } from "gsap";

export const AuthLayout: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  /* ── entrance + ongoing ─────────────────────────────────────── */
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        /* orb: continuous slow breath */
        gsap.to(orbRef.current, {
          scale: 1.2,
          opacity: 0.9,
          duration: 4.2,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });

        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.set(rootRef.current, { opacity: 1 })
          .from(leftRef.current, { x: -36, opacity: 0, duration: 0.65 })
          .from(
            logoRef.current,
            { y: -14, opacity: 0, duration: 0.4 },
            "-=0.38",
          )
          .from(eyebrowRef.current, { opacity: 0, duration: 0.3 }, "-=0.15")
          .from(
            ruleRef.current,
            {
              scaleX: 0,
              transformOrigin: "left center",
              duration: 0.45,
              ease: "power2.inOut",
            },
            "-=0.05",
          )
          /* text-mask wipe from below */
          .from(
            line1Ref.current,
            { y: "110%", duration: 0.62, ease: "power4.out" },
            "-=0.1",
          )
          .from(
            line2Ref.current,
            { y: "110%", duration: 0.62, ease: "power4.out" },
            "-=0.48",
          )
          .from(subRef.current, { y: 14, opacity: 0, duration: 0.42 }, "-=0.28")
          .from(copyRef.current, { opacity: 0, duration: 0.36 }, "-=0.2")
          .from(
            rightRef.current,
            { x: 28, opacity: 0, duration: 0.55 },
            "-=0.6",
          )
          .from(
            [formRef.current, footerRef.current],
            { y: 18, opacity: 0, stagger: 0.1, duration: 0.44 },
            "-=0.38",
          );
      }, rootRef);

      return () => ctx.revert();
    });

    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(rootRef.current, { opacity: 1 });
    });

    return () => mm.revert();
  }, []);

  /* ── mouse parallax on orb ──────────────────────────────────── */
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference) and (min-width: 1024px)",
      () => {
        const onMove = (e: MouseEvent) => {
          const rx = (e.clientX / window.innerWidth - 0.5) * 22;
          const ry = (e.clientY / window.innerHeight - 0.5) * 14;
          gsap.to(orbRef.current, {
            x: rx,
            y: ry,
            duration: 1.6,
            ease: "power1.out",
            overwrite: "auto",
          });
        };
        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
      },
    );
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex min-h-screen opacity-0"
      style={{ background: "#f7f5f6" }}
    >
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative hidden select-none flex-col justify-between overflow-hidden p-14 lg:flex lg:w-[54%]"
        style={{ background: "#ffffff" }}
      >
        {/* Subtle ambient orb */}
        <div
          ref={orbRef}
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            width: 640,
            height: 640,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(180,80,110,0.07) 0%, rgba(160,60,90,0.03) 50%, transparent 72%)",
            left: "48%",
            top: "48%",
            transform: "translate(-50%, -50%)",
            filter: "blur(60px)",
          }}
        />

        {/* Logo */}
        <img
          ref={logoRef}
          src="/logo/kan_logo_gold-01.png"
          alt="KAN Cosmetics"
          className="relative z-10 h-9 w-auto object-contain"
          style={{ opacity: 0.9 }}
        />

        {/* Brand statement */}
        <div className="relative z-10">
          <div className="mb-5 flex items-center gap-3">
            <p
              ref={eyebrowRef}
              className="text-[10px] font-semibold uppercase tracking-[0.44em]"
              style={{ color: "rgba(160,100,120,0.55)" }}
            >
              Nepal's Premier
            </p>
            <span
              ref={ruleRef}
              className="block h-px flex-1"
              style={{ background: "rgba(180,120,140,0.18)" }}
            />
          </div>

          <h1
            className="font-black"
            style={{
              fontSize: "clamp(54px, 6.6vw, 94px)",
              letterSpacing: "-0.03em",
              lineHeight: 0.9,
            }}
          >
            {/* overflow-hidden containers are the mask for each line */}
            <span className="block overflow-hidden">
              <span
                ref={line1Ref}
                className="block"
                style={{ color: "#1a0a12" }}
              >
                Beauty
              </span>
            </span>
            <span className="block overflow-hidden">
              <span
                ref={line2Ref}
                className="block"
                style={{ color: "#1a0a12" }}
              >
                Brand.
              </span>
            </span>
          </h1>

          <p
            ref={subRef}
            className="mt-7 text-[13px] leading-relaxed"
            style={{ color: "rgba(60,30,45,0.38)", maxWidth: 268 }}
          >
            Manage products, orders, and customers from one elegant dashboard.
          </p>
        </div>

        <p
          ref={copyRef}
          className="relative z-10 text-[11px]"
          style={{ color: "rgba(60,30,45,0.25)" }}
        >
          © {new Date().getFullYear()} KAN Cosmetics
        </p>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div
        ref={rightRef}
        className="flex flex-1 flex-col items-center justify-center bg-white p-8 lg:p-16"
      >
        {/* Mobile logo */}
        <div className="mb-8 lg:hidden">
          <img
            src="/logo/kan_logo_gold-01.png"
            alt="KAN"
            className="h-8 w-auto object-contain"
          />
        </div>

        <div ref={formRef} className="w-full max-w-[360px]">
          <Outlet />
        </div>

        <div
          ref={footerRef}
          className="mt-10 flex items-center gap-1.5 text-[11px] text-gray-700"
        >
          <span>Powered by</span>
          <a
            href="https://www.webxnepal.com"
            target="_blank"
            rel="noreferrer"
            className="transition-opacity hover:opacity-70"
          >
            <img src="/logo/webx.svg" alt="WebX" className="h-3 w-auto" />
          </a>
        </div>
      </div>
    </div>
  );
};
