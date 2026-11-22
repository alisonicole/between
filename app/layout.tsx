import type { Metadata, Viewport } from "next";
// Self-hosted copies of 1.0's Google Fonts (no request to Google at runtime).
import "@fontsource/crimson-pro/300.css";
import "@fontsource/crimson-pro/400.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "between",
  description: "Capture what comes up between sessions and bring it into the room",
  appleWebApp: { capable: true, title: "between", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f3e8ff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""}>
          <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
