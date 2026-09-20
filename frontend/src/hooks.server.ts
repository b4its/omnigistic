import type { Handle } from "@sveltejs/kit";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { getTextDirection } from "$lib/paraglide/runtime";

/**
 * Middleware Paraglide: menetapkan locale per-request (AsyncLocalStorage) supaya
 * SSR merender bahasa yang benar pada permintaan pertama, tanpa kedip.
 */
const paraglideHandle: Handle = ({ event, resolve }) =>
  paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
    event.request = localizedRequest;
    return resolve(event, {
      transformPageChunk: ({ html }) =>
        html.replace("%lang%", locale).replace("%dir%", getTextDirection(locale))
    });
  });

export const handle: Handle = paraglideHandle;
