// Minimal integration example. Mount ONCE near your app root.
import { VideoBubbleOnboarding, type Tour } from "video-bubble-onboarding";
import "video-bubble-onboarding/styles.css";
import tours from "./tours.json";

// --- Next.js (App Router): app/layout.tsx ---
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <VideoBubbleOnboarding tours={tours as Tour[]} exclude={["/login"]} />
      </body>
    </html>
  );
}

// --- Any React app: render it once, alongside your <App /> ---
//
//   import { createRoot } from "react-dom/client";
//   createRoot(document.getElementById("root")!).render(
//     <>
//       <App />
//       <VideoBubbleOnboarding tours={tours} />
//     </>
//   );
//
// Trigger a tour manually (e.g. from a "Show me how" button):
//   window.dispatchEvent(new CustomEvent("vbo:play", { detail: { id: "welcome-dashboard" } }));
//   // or: window.vboPlay("welcome-dashboard")
