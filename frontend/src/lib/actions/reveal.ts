/** Reveal-on-scroll: tambah class `in` saat elemen masuk viewport (hormat reduced-motion). */
import { browser } from "$app/environment";
export function reveal(node: HTMLElement) {
  if (!browser) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { node.classList.add("in"); return; }
  node.classList.add("rv");
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { node.classList.add("in"); io.disconnect(); } }),
    { threshold: 0.12 }
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}
