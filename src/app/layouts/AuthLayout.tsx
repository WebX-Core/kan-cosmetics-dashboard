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
      style={{ background: "#fff" }}
    >
      {/* ── Left panel ─────────────────────────────────────────── */}
      <div
        ref={leftRef}
        className="relative hidden select-none flex-col justify-between overflow-hidden p-14 lg:flex lg:w-[54%]"
        style={{ background: "#ffffff" }}
      >
        <img
          src="/login/Artboard1.png"
          alt="KAN Cosmetics visual"
          className="pointer-events-none  absolute left-100 top-1/2 -z-10 h-[72%] w-[72%] -translate-x-1/2 -translate-y-1/2 object-contain"
        />
        {/* Subtle ambient orb */}
        <div
          ref={orbRef}
          aria-hidden="true"
          className="pointer-events-none absolute flex justify-between pl-20"
          style={{
            width: 640,
            height: 640,
            borderRadius: "50%",
            left: "48%",
            top: "48%",
            transform: "translate(-50%, -50%)",
            filter: "blur(60px)",
          }}
        />

        {/* Logo */}
        <div>
          <img
            ref={logoRef}
            src="/logo/kan-blue.png"
            alt="KAN Cosmetics"
            className="relative z-40 h-9 w-auto self-start object-contain"
            style={{ opacity: 0.9 }}
          />
          <h3 className="text-4xl font-medium text-zinc-950 py-4">
            Manage your orders and products from one simple dashboard.
          </h3>
        </div>
        <div>
          {" "}
          <p
            ref={copyRef}
            className="relative z-10 text-[11px]"
            style={{ color: "rgb(60,30,45)" }}
          >
            © {new Date().getFullYear()} KAN Cosmetics
          </p>
        </div>
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

        <div ref={formRef} className="w-full max-w-90">
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
