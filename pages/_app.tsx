import type { AppProps } from "next/app";
import { Plus_Jakarta_Sans } from "next/font/google";
import dynamic from "next/dynamic";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  preload: true,
});

// Defer Analytics to avoid blocking main thread and improve LCP/TTI
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((mod) => mod.Analytics),
  { ssr: false }
);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={plusJakarta.className}>
      <Component {...pageProps} />
      <Analytics />
    </div>
  );
}
