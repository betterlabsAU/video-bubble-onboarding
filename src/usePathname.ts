import { useEffect, useState } from "react";

// Framework-agnostic current pathname. Tracks the History API (pushState /
// replaceState / popstate), so it works with Next.js, React Router, plain SPAs,
// etc. — no router dependency.
export function usePathname(): string {
  const [path, setPath] = useState<string>(() =>
    typeof window !== "undefined" ? window.location.pathname : "/"
  );

  useEffect(() => {
    const update = () => setPath(window.location.pathname);

    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;
    const fire = () => window.dispatchEvent(new Event("vbo:locationchange"));

    window.history.pushState = function (...args: any[]) {
      const r = origPush.apply(this, args as any);
      fire();
      return r;
    };
    window.history.replaceState = function (...args: any[]) {
      const r = origReplace.apply(this, args as any);
      fire();
      return r;
    };

    window.addEventListener("popstate", update);
    window.addEventListener("vbo:locationchange", update);
    update();

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", update);
      window.removeEventListener("vbo:locationchange", update);
    };
  }, []);

  return path;
}
