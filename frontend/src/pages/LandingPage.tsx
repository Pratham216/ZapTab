import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from "@clerk/clerk-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitSnapWordmark from "../components/SplitSnapWordmark";
import ClickSparkles from "../components/ClickSparkles";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "01",
    title: "Scan the bill",
    body: "Snap a photo of any restaurant receipt. Our AI reads every line item in seconds.",
    accent: "gold" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
        <path
          d="M4 7a2 2 0 012-2h3l1-2h4l1 2h3a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V7z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Tap what you ate",
    body: "Friends join with a link, check off their items, and shares calculate automatically.",
    accent: "green" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M16 14l1.5 1.5L20 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Pay your share",
    body: "One tap opens UPI with the exact amount. No awkward math at the table.",
    accent: "gold" as const,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const MARQUEE_PHRASES = [
  "Scan the bill",
  "Tap what you ate",
  "Split fairly",
  "Pay with UPI",
  "Skip the math",
];

function MarqueeStrip() {
  return (
    <div className="marquee-strip-row flex shrink-0 items-center">
      {MARQUEE_PHRASES.map((phrase) => (
        <span key={phrase} className="marquee-phrase inline-flex items-center">
          <span>{phrase}</span>
          <span className="marquee-dash" aria-hidden>
            —
          </span>
        </span>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(bgRef.current, {
        backgroundColor: "#171717",
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      gsap.to(bgRef.current, {
        backgroundColor: "#0a0a0a",
        scrollTrigger: {
          trigger: ".steps-section",
          start: "top 80%",
          end: "bottom 60%",
          scrub: true,
        },
      });

      gsap.from(".hero-line", {
        y: 120,
        opacity: 0,
        rotateX: 40,
        transformOrigin: "50% 100%",
        stagger: 0.12,
        duration: 1.2,
        ease: "power3.out",
        delay: 0.2,
      });

      gsap.from(".hero-sub", {
        y: 40,
        opacity: 0,
        duration: 1,
        delay: 0.7,
        ease: "power2.out",
      });

      gsap.from(".hero-cta", {
        y: 30,
        opacity: 0,
        duration: 0.8,
        delay: 1,
        ease: "power2.out",
      });

      gsap.from(".float-card-1", {
        y: 48,
        opacity: 0,
        duration: 1,
        delay: 0.85,
        ease: "power3.out",
      });

      gsap.from(".float-card-2", {
        y: 56,
        opacity: 0,
        duration: 1,
        delay: 1,
        ease: "power3.out",
      });

      gsap.from(".float-card-3", {
        scale: 0.88,
        opacity: 0,
        duration: 1,
        delay: 1.15,
        ease: "power3.out",
      });

      const heroCardParallax = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
        },
      });

      heroCardParallax
        .to(
          ".float-card-1",
          {
            y: -100,
            x: -28,
            rotation: -6,
            scale: 0.88,
            opacity: 0.5,
            ease: "none",
          },
          0
        )
        .to(
          ".float-card-2",
          {
            y: -150,
            x: 36,
            rotation: 8,
            scale: 0.84,
            opacity: 0.4,
            ease: "none",
          },
          0
        )
        .to(
          ".float-card-3",
          {
            y: -80,
            x: -16,
            scale: 0.9,
            opacity: 0.6,
            ease: "none",
          },
          0
        );

      gsap.from(".steps-header > *", {
        y: 48,
        opacity: 0,
        stagger: 0.12,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".steps-section",
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".step-timeline-line", {
        scaleX: 0,
        opacity: 0,
        duration: 1.2,
        ease: "power2.inOut",
        scrollTrigger: {
          trigger: ".steps-grid",
          start: "top 82%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.utils.toArray<HTMLElement>(".step-card").forEach((card, i) => {
        gsap.from(card, {
          y: 72,
          opacity: 0,
          duration: 0.85,
          ease: "power3.out",
          delay: i * 0.12,
          scrollTrigger: {
            trigger: ".steps-grid",
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        });
      });

      gsap.from(".step-preview", {
        y: 16,
        opacity: 0,
        stagger: 0.1,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.35,
        scrollTrigger: {
          trigger: ".steps-grid",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".cta-header > *", {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.85,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".cta-block", {
        y: 56,
        opacity: 0,
        scale: 0.96,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".cta-stat", {
        y: 24,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: "power2.out",
        delay: 0.2,
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(".footer-col", {
        y: 32,
        opacity: 0,
        stagger: 0.1,
        duration: 0.7,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".landing-footer",
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });

    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} className="landing-root relative">
      <div
        ref={bgRef}
        className="fixed inset-0 -z-10 transition-colors duration-300"
        style={{ backgroundColor: "#0a0a0a" }}
      />

      <div className="landing-texture" aria-hidden />
      <div className="landing-vignette" aria-hidden />
      <ClickSparkles />

      <nav className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto py-5 flex items-center justify-between">
          <SplitSnapWordmark size="xl" />
          <div className="flex items-center gap-4">
            {!isSignedIn ? (
              <>
                <SignInButton mode="modal">
                  <button className="text-sm text-neutral-300 hover:text-white transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="text-sm px-4 py-2 btn-primary rounded-full">
                    Get started
                  </button>
                </SignUpButton>
              </>
            ) : (
              <Link
                to="/app"
                className="text-sm px-4 py-2 btn-primary rounded-full"
              >
                Open app
              </Link>
            )}
          </div>
        </div>
      </nav>

      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col px-6 pt-10 sm:pt-13"
      >
        <div className="flex-1 flex items-center w-full max-w-7xl mx-auto pb-4">
          <div className="w-full grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="space-y-6 sm:space-y-8 z-10 pt-6 sm:pt-10">
            <p className="hero-sub hero-kicker">
              Bill splitting, refined
            </p>
            <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl leading-[1.05] text-white">
              <span className="hero-line block text-amber-400">Scan.</span>
              <span className="hero-line block">Split.</span>
              <span className="hero-line block text-neutral-400">Settle up.</span>
            </h1>
            <p className="hero-sub text-lg text-neutral-400 max-w-md leading-relaxed">
              Upload a receipt, let everyone pick their items, and pay the host
              instantly via UPI. No spreadsheets. No confusion.
            </p>
            <div className="hero-cta flex flex-wrap gap-4">
              {isSignedIn ? (
                <Link
                  to="/app"
                  className="inline-flex items-center px-8 py-3.5 btn-primary rounded-full font-medium transition-all hover:scale-[1.02]"
                >
                  Start scanning
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="inline-flex items-center px-8 py-3.5 btn-primary rounded-full font-medium transition-all hover:scale-[1.02]">
                    Get started free
                  </button>
                </SignUpButton>
              )}
              <a
                href="#how-it-works"
                className="inline-flex items-center px-8 py-3.5 border border-neutral-600 text-neutral-300 rounded-full hover:border-neutral-400 hover:text-white transition-colors"
              >
                See how it works
              </a>
            </div>
          </div>

          <div
            ref={sceneRef}
            className="hero-scene relative h-[340px] sm:h-[380px] lg:h-[400px] hidden sm:block"
          >
            <div className="hero-card float-card-1 absolute top-4 left-4 w-56 h-72 rounded-2xl border border-neutral-700 bg-linear-to-br from-neutral-900 to-neutral-800 shadow-2xl p-5"
            >
              <div className="text-sm uppercase tracking-widest text-white font-semibold mb-4">
                Receipt
              </div>
              <div className="space-y-2">
                {[
                  { name: "Butter chicken", price: 380 },
                  { name: "Naan x2", price: 100 },
                  { name: "Lassi", price: 60 },
                  { name: "Biryani", price: 700 },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex justify-between text-xs text-neutral-400"
                  >
                    <span>{item.name}</span>
                    <span>₹{item.price}</span>
                  </div>
                ))}
              </div>
              <div className="absolute bottom-5 left-5 right-5 border-t border-neutral-700 pt-3 flex justify-between text-sm">
                <span className="text-neutral-300">Total</span>
                <span className="text-emerald-400 font-semibold">₹1,240</span>
              </div>
            </div>

            <div
              className="hero-card float-card-2 absolute top-10 right-0 w-52 h-64 rounded-2xl border border-neutral-700 bg-linear-to-br from-neutral-900 to-neutral-800 text-neutral-100 shadow-2xl p-5"
            >
              <div className="text-xs uppercase tracking-widest text-white font-semibold mb-4">
                Your share
              </div>
              <p className="font-serif text-4xl mt-6 text-emerald-400">₹312</p>
              <p className="text-xs text-neutral-500 mt-2">3 items selected</p>
              <div className="mt-8 py-2 px-3 border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs rounded-lg text-center font-semibold">
                Pay with UPI
              </div>
            </div>

            <div
              className="hero-card float-card-3 absolute bottom-[-10%] left-[34%] w-47 h-47 rounded-full border border-neutral-700 bg-neutral-900/90 backdrop-blur flex items-center justify-center shadow-xl"
            >
              <div className="text-center">
                <p className="text-6xl font-serif text-emerald-400">4</p>
                <p className="text-[13px] uppercase tracking-widest text-white mt-1">
                  Friends joined
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div
          className="marquee-section w-full shrink-0 border-t border-neutral-800/80 py-8 sm:py-8 overflow-hidden -mx-10 mt-5 sm:mt-6"
          aria-hidden
        >
          <div className="marquee-strip-viewport">
            <div className="marquee-strip-track flex w-max">
              <MarqueeStrip />
              <MarqueeStrip />
            </div>
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="steps-section relative py-20 lg:py-24 px-6 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto relative">
          <div className="steps-header mb-10 lg:mb-12">
            <p className="hero-kicker text-sm mb-5">How it works</p>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-white max-w-2xl leading-[1.1]">
              Three steps from{" "}
              <span className="text-amber-400">receipt</span> to settled
            </h2>
          </div>

          <div className="relative">
            <div
              className="step-timeline-line hidden md:block absolute top-18 left-[16%] right-[16%] h-px origin-left"
              aria-hidden
            />

            <div
              className="steps-grid grid md:grid-cols-3 gap-6 lg:gap-8"
            >
              {STEPS.map((step) => (
                <article
                  key={step.num}
                  className={`step-card step-card--${step.accent} group relative rounded-2xl border p-8 lg:p-9 transition-all duration-300 hover:-translate-y-1`}
                >
                  <div className="step-card-shine pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative flex items-start justify-between gap-4 mb-6">
                    <span className={`step-num step-num--${step.accent}`}>
                      {step.num}
                    </span>
                    <span className={`step-icon step-icon--${step.accent}`}>
                      {step.icon}
                    </span>
                  </div>

                  <h3 className="relative font-serif text-2xl text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="relative text-neutral-400 text-sm leading-relaxed mb-8">
                    {step.body}
                  </p>

                  <div className="step-preview relative rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 overflow-hidden">
                    {step.num === "01" && (
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase tracking-widest text-white font-semibold mb-3">
                          Receipt
                        </div>
                        {[
                          { name: "Butter chicken", price: 380 },
                          { name: "Naan x2", price: 100 },
                        ].map((item) => (
                          <div
                            key={item.name}
                            className="flex justify-between text-xs text-neutral-500"
                          >
                            <span>{item.name}</span>
                            <span>₹{item.price}</span>
                          </div>
                        ))}
                        <div className="pt-2 mt-2 border-t border-neutral-800 flex justify-between text-xs">
                          <span className="text-neutral-400">Scanning…</span>
                          <span className="text-amber-400 font-medium">AI</span>
                        </div>
                      </div>
                    )}
                    {step.num === "02" && (
                      <div className="space-y-2.5">
                        {["Butter chicken", "Naan x2", "Lassi"].map((item, i) => (
                          <div
                            key={item}
                            className="flex items-center gap-2.5 text-xs"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                i < 2
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "border-neutral-600"
                              }`}
                            >
                              {i < 2 && (
                                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" aria-hidden>
                                  <path
                                    d="M2.5 6l2.5 2.5 4.5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            <span className={i < 2 ? "text-neutral-200" : "text-neutral-500"}>
                              {item}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 mt-1 border-t border-emerald-500/20 flex justify-between text-xs">
                          <span className="text-neutral-400">Your share</span>
                          <span className="text-emerald-400 font-semibold">₹312</span>
                        </div>
                      </div>
                    )}
                    {step.num === "03" && (
                      <div className="text-center py-1">
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
                          Amount due
                        </p>
                        <p className="font-serif text-2xl text-emerald-400 mb-3">₹312</p>
                        <div className="py-1.5 px-3 rounded-lg border border-amber-500/40 bg-amber-500/15 text-amber-300 text-xs font-semibold">
                          Pay with UPI
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section relative py-20 lg:py-24 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto relative">
          <div className="cta-header text-center mb-6">
            <p className="hero-kicker text-sm">Ready when the bill arrives</p>
          </div>

          <div className="cta-block relative rounded-3xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
            <div className="pointer-events-none absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-neutral-500/30 to-transparent" />

            <div className="relative px-8 py-10 sm:px-12 sm:py-14 text-center">
              <h2 className="cta-headline font-serif text-4xl sm:text-5xl lg:text-[3.25rem] text-white mb-6 leading-[1.12] tracking-tight">
                Dinner shouldn&apos;t end in math class
              </h2>
              <p className="text-neutral-400 text-base sm:text-lg mb-10 max-w-lg mx-auto leading-relaxed">
                Join hosts who split bills in under a minute. Guests don&apos;t even
                need an account.
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-10">
                <span className="cta-stat inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-4 py-1.5 text-xs font-medium text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Splits in 60 seconds
                </span>
                <span className="cta-stat inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-800/60 px-4 py-1.5 text-xs font-medium text-neutral-300">
                  No guest signup
                </span>
                <span className="cta-stat inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  UPI built-in
                </span>
              </div>

              {isSignedIn ? (
                <Link
                  to="/app"
                  className="inline-flex px-10 py-4 btn-primary rounded-full font-medium transition-all hover:scale-[1.03] shadow-lg shadow-amber-500/25"
                >
                  Open SplitSnap
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="inline-flex px-10 py-4 btn-primary rounded-full font-medium transition-all hover:scale-[1.03] shadow-lg shadow-amber-500/25">
                    Create free account
                  </button>
                </SignUpButton>
              )}

              <p className="mt-6 text-xs text-neutral-600">
                Free for hosts · Guests join with a link
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer relative border-t border-neutral-800/80 px-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-neutral-600/40 to-transparent" />

        <div className="max-w-7xl mx-auto py-6 sm:py-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-6 mb-5">
            <div className="footer-col sm:col-span-2 lg:col-span-5">
              <SplitSnapWordmark size="lg" />
              <p className="mt-3 text-sm text-neutral-500 leading-relaxed max-w-xs">
                The fastest way to split restaurant bills with friends — scan,
                select, and pay.
              </p>
            </div>

            <div className="footer-col lg:col-span-3">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-2">
                Product
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="#how-it-works"
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <Link
                    to="/app"
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    Open app
                  </Link>
                </li>
              </ul>
            </div>

            <div className="footer-col lg:col-span-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-semibold mb-2">
                Get started
              </p>
              {isSignedIn ? (
                <Link
                  to="/app"
                  className="inline-flex text-sm px-5 py-2.5 btn-primary rounded-full font-medium"
                >
                  Start scanning
                </Link>
              ) : (
                <SignUpButton mode="modal">
                  <button className="inline-flex text-sm px-5 py-2.5 btn-primary rounded-full font-medium">
                    Get started free
                  </button>
                </SignUpButton>
              )}
            </div>
          </div>

          <div className="footer-col pt-5 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-neutral-600">
              © {new Date().getFullYear()} SplitSnap
            </p>
            <p className="text-sm text-neutral-500 text-center sm:text-right">
              <span className="text-amber-400/90">Scan</span> the bill.{" "}
              <span className="text-amber-400/90">Tap</span> what you ate.{" "}
              <span className="text-amber-400/90">Pay</span> your share.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
