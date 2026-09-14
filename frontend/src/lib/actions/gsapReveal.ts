/**
 * Reveal-on-scroll dengan GSAP ScrollTrigger.
 * - Stagger elemen anak saat section masuk viewport.
 * - Hormat prefers-reduced-motion (tidak menganimasikan apa pun).
 * - Aman SSR: GSAP hanya di-import di browser.
 */
type GsapRevealOpts = {
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
  delay?: number;
};

type GsapCtx = { revert: () => void } | undefined;

export function gsapReveal(node: HTMLElement, opts: GsapRevealOpts = {}) {
  const o = {
    selector: ":scope > * > *",
    y: 28,
    stagger: 0.09,
    duration: 0.75,
    start: "top 84%",
    delay: 0,
    ...opts
  };
  let ctx: GsapCtx;
  let cancelled = false;

  void (async () => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { gsap } = await import("gsap");
    const { ScrollTrigger } = await import("gsap/ScrollTrigger");
    if (cancelled) return;
    gsap.registerPlugin(ScrollTrigger);

    let items: Element[] = Array.from(node.querySelectorAll(o.selector));
    if (!items.length) items = Array.from(node.children);
    if (!items.length) return;

    ctx = gsap.context(() => {
      gsap.from(items, {
        y: o.y,
        autoAlpha: 0,
        duration: o.duration,
        ease: "power3.out",
        stagger: o.stagger,
        delay: o.delay,
        scrollTrigger: { trigger: node, start: o.start, once: true }
      });
    }, node);
  })();

  return {
    destroy() {
      cancelled = true;
      try {
        ctx?.revert();
      } catch {
        /* noop */
      }
    }
  };
}
