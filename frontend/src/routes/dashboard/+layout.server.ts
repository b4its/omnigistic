import type { LayoutServerLoad } from "./$types";

/** Role utk SSR: path URL menang; kalau shared page → cookie supaya shell nav tidak CLS 256px. */
export const load: LayoutServerLoad = ({ cookies }) => ({
  cookieRole: cookies.get("omnigistic-role") ?? null
});
