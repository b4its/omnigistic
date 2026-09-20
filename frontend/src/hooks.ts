import type { Reroute } from "@sveltejs/kit";
import { deLocalizeUrl } from "$lib/paraglide/runtime";

/**
 * Reroute: URL ber-locale (`/id/dashboard/...`) dipetakan ke rute kanonik
 * (`/dashboard/...`). Rute di disk tetap satu versi, bukan diduplikasi per bahasa.
 */
export const reroute: Reroute = (request) => deLocalizeUrl(request.url).pathname;
