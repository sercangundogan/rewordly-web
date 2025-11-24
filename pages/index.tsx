import { NextPage } from 'next';
import Head from 'next/head';
import { useEffect, useRef } from 'react';

const Home: NextPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay was prevented, user interaction required
      });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Rewordly - Free Text Rewriting and Grammar Correction Tool</title>
        <meta 
          name="description" 
          content="Instantly rewrite selected text with Rewordly. Improve grammar, clarity, and fluency. Completely free, no sign-up required. Start using as a Chrome Extension right away." 
        />
        <meta 
          name="keywords" 
          content="text rewriting, grammar correction, paraphrase, text improvement, free writing tool, chrome extension, rewordly" 
        />
        <meta name="author" content="Rewordly" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rewordly.com/" />
        <meta property="og:title" content="Rewordly - Free Text Rewriting Tool" />
        <meta property="og:description" content="Instantly rewrite selected text. Improve grammar, clarity, and fluency. Completely free, no sign-up required." />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rewordly.com/" />
        <meta property="twitter:title" content="Rewordly - Free Text Rewriting Tool" />
        <meta property="twitter:description" content="Instantly rewrite selected text. Improve grammar, clarity, and fluency. Completely free, no sign-up required." />
        
        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#667eea" />
        <meta name="msapplication-TileColor" content="#764ba2" />
        
        <link rel="canonical" href="https://rewordly.com/" />
      </Head>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          color: #1a1a1a;
          line-height: 1.6;
          overflow-x: hidden;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }
        
        .hero {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.3;
        }
        
        .hero-content {
          position: relative;
          z-index: 1;
          max-width: 800px;
          padding: 40px 20px;
        }
        
        .hero h1 {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          margin-bottom: 1.5rem;
          line-height: 1.2;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .hero p {
          font-size: clamp(1.1rem, 2vw, 1.5rem);
          margin-bottom: 2rem;
          opacity: 0.95;
          line-height: 1.6;
        }
        
        .cta-button {
          display: inline-block;
          padding: 18px 40px;
          font-size: 1.2rem;
          font-weight: 600;
          color: #667eea;
          background: white;
          border: none;
          border-radius: 50px;
          text-decoration: none;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          cursor: pointer;
        }
        
        .cta-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
        
        .cta-button:active {
          transform: translateY(-1px);
        }
        
        .badges {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
          margin-top: 2rem;
        }
        
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: rgba(255,255,255,0.2);
          border-radius: 25px;
          font-size: 0.95rem;
          backdrop-filter: blur(10px);
        }
        
        .badge-icon {
          font-size: 1.2rem;
        }
        
        .video-section {
          padding: 80px 20px;
          background: #f8f9fa;
        }
        
        .video-container {
          max-width: 900px;
          margin: 0 auto;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          background: #000;
        }
        
        .video-container video {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .section {
          padding: 80px 20px;
        }
        
        .section-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 700;
          text-align: center;
          margin-bottom: 3rem;
          color: #1a1a1a;
        }
        
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 40px;
          margin-top: 60px;
        }
        
        .feature-card {
          padding: 40px 30px;
          background: white;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
          text-align: center;
        }
        
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }
        
        .feature-icon {
          font-size: 3rem;
          margin-bottom: 1.5rem;
        }
        
        .feature-card h3 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #667eea;
        }
        
        .feature-card p {
          color: #666;
          line-height: 1.7;
        }
        
        .highlight-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          text-align: center;
        }
        
        .highlight-section .section-title {
          color: white;
        }
        
        .highlight-content {
          max-width: 700px;
          margin: 0 auto;
          font-size: 1.2rem;
          line-height: 1.8;
        }
        
        .footer {
          background: #1a1a1a;
          color: white;
          padding: 60px 20px 40px;
          text-align: center;
        }
        
        .footer-content {
          max-width: 600px;
          margin: 0 auto;
        }
        
        .footer h3 {
          font-size: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .footer p {
          margin-bottom: 1rem;
          color: #ccc;
        }
        
        .footer a {
          color: #667eea;
          text-decoration: none;
          transition: color 0.3s ease;
        }
        
        .footer a:hover {
          color: #764ba2;
        }
        
        .chrome-store-badge {
          display: inline-block;
          margin-top: 2rem;
        }
        
        @media (max-width: 768px) {
          .hero {
            min-height: 90vh;
          }
          
          .section {
            padding: 60px 20px;
          }
          
          .features {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Rewordly</h1>
            <p>
              Instantly rewrite selected text with better grammar, clarity, and fluency. 
              Completely free, no sign-up required.
            </p>
            <a 
              href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp" 
              target="_blank" 
              rel="noopener noreferrer"
              className="cta-button"
            >
              Install from Chrome Web Store
            </a>
            <div className="badges">
              <div className="badge">
                <span className="badge-icon">✓</span>
                <span>Completely Free</span>
              </div>
              <div className="badge">
                <span className="badge-icon">✓</span>
                <span>No Sign-Up Required</span>
              </div>
              <div className="badge">
                <span className="badge-icon">✓</span>
                <span>Ready to Use Instantly</span>
              </div>
            </div>
          </div>
        </section>

        {/* Video Section */}
        <section className="video-section">
          <div className="container">
            <h2 className="section-title">How Does Rewordly Work?</h2>
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="auto"
              >
                <source src="/rewordly.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section">
          <div className="container">
            <h2 className="section-title">Why Rewordly?</h2>
            <div className="features">
              <div className="feature-card">
                <div className="feature-icon">⚡</div>
                <h3>Instant Results</h3>
                <p>
                  Select your text, click, and see the improved version instantly. 
                  No waiting, no registration, just fast and easy usage.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✨</div>
                <h3>Grammar Correction</h3>
                <p>
                  Automatically fixes grammar errors in your text and 
                  provides more professional writing.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📝</div>
                <h3>Clarity and Fluency</h3>
                <p>
                  Makes your text clearer, more understandable, and fluent. 
                  Enhance the quality of your writing.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Privacy Focused</h3>
                <p>
                  Your data is safe. No sign-up required, 
                  your personal information is not collected.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🌐</div>
                <h3>Use Anywhere</h3>
                <p>
                  Works on any webpage. 
                  Emails, documents, social media - everywhere.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💯</div>
                <h3>Completely Free</h3>
                <p>
                  No hidden fees, no credit card required. 
                  Unlimited usage, completely free.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Highlight Section */}
        <section className="section highlight-section">
          <div className="container">
            <h2 className="section-title">Get Started Now</h2>
            <div className="highlight-content">
              <p>
                Install Rewordly for free from the Chrome Web Store and start using it right away. 
                No sign-up, registration, or payment required. Just install and use!
              </p>
              <a 
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="cta-button"
                style={{ marginTop: '2rem' }}
              >
                Install Now
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <h3>Rewordly</h3>
            <p>
              For questions or suggestions, please contact us:
            </p>
            <p>
              <a href="mailto:sercangundogan35@gmail.com">sercangundogan35@gmail.com</a>
            </p>
            <div className="chrome-store-badge">
              <a 
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Rate on Chrome Web Store
              </a>
            </div>
            <p style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#888' }}>
              © 2025 Rewordly. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </>
  );
};

export default Home; 