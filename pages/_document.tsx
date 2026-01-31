import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Preconnect to Chrome Web Store for faster CTA navigation */}
        <link rel="preconnect" href="https://chromewebstore.google.com" />
        <link rel="dns-prefetch" href="https://chromewebstore.google.com" />
        {/* DNS prefetch for deferred analytics - non-blocking */}
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

