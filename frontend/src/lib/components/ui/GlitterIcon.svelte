<script lang="ts">
  /**
   * GlitterIcon — ikon glitter (Font Awesome `wand-magic-sparkles`) yang dipakai
   * sebagai ikon Nigi AI di seluruh halaman. Ukuran mengikuti kelas Tailwind
   * (`h-* w-*`), warna mengikuti `currentColor` agar menyatu dengan teks/aksen.
   */
  interface Props {
    cls?: string;
    /** Gaya inline opsional (mis. `color:var(--primary)`). */
    style?: string;
  }
  let { cls = "h-5 w-5", style = "" }: Props = $props();
</script>

<i class="fa-solid fa-wand-magic-sparkles {cls}" {style} aria-hidden="true"></i>
