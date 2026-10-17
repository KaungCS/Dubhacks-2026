import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js config used by middleware.
 * Keep providers and Node-only token refresh out of this file so the Edge
 * bundle stays small and does not pull in jose CompressionStream APIs.
 */
export const authConfig = {
  providers: [],
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request }) {
      const path = request.nextUrl.pathname;
      const isProtected =
        path.startsWith("/dashboard") || path.startsWith("/plan");
      if (isProtected) {
        return !!auth?.user;
      }
      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
