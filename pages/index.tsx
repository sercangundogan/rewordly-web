import { NextPage } from 'next';
import Head from 'next/head';
import { Analytics } from '@vercel/analytics/react';

const Home: NextPage = () => {

  return (
    <>
      <Head>
        <title>Rewordly - AI Text Rewriting & Grammar Check | Free Chrome Extension</title>
        <meta 
          name="description" 
          content="AI-powered Chrome extension for text rewriting with real-time grammar and spelling check. Select any text, click, and get an improved version instantly. 100% free, no sign-up required." 
        />
        <meta 
          name="keywords" 
          content="text rewriting, grammar check, spelling correction, AI writing tool, chrome extension, grammar checker, rewordly, free grammar tool" 
        />
        <meta name="author" content="Rewordly" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rewordly-web.vercel.app/" />
        <meta property="og:title" content="Rewordly - AI Text Rewriting & Grammar Check" />
        <meta property="og:description" content="AI-powered Chrome extension for text rewriting with real-time grammar and spelling check. 100% free, no sign-up required." />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rewordly-web.vercel.app/" />
        <meta property="twitter:title" content="Rewordly - AI Text Rewriting & Grammar Check" />
        <meta property="twitter:description" content="AI-powered Chrome extension for text rewriting with real-time grammar and spelling check. 100% free, no sign-up required." />
        
        {/* Favicons */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#667eea" />
        <meta name="msapplication-TileColor" content="#764ba2" />
        
        <link rel="canonical" href="https://rewordly-web.vercel.app/" />
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
        
        .video-container video,
        .video-container img {
          width: 100%;
          height: auto;
          display: block;
        }
        
        .demo-gif {
          border-radius: 12px;
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
        
        .testimonials-section {
          background: #ffffff;
          padding: 80px 20px;
        }
        
        .testimonials {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 30px;
          margin-top: 60px;
        }
        
        .testimonial-card {
          background: #f8f9fa;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        
        .testimonial-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.12);
        }
        
        .testimonial-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .testimonial-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
          font-weight: 600;
          flex-shrink: 0;
        }
        
        .testimonial-avatar img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        
        .testimonial-info {
          flex: 1;
        }
        
        .testimonial-name {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 5px;
        }
        
        .testimonial-rating {
          display: flex;
          gap: 3px;
          color: #ffc107;
        }
        
        .testimonial-text {
          color: #666;
          line-height: 1.7;
          font-size: 0.95rem;
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
          
          .testimonials {
            grid-template-columns: 1fr;
            gap: 25px;
          }
        }
      `}</style>

      <main>
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Rewordly</h1>
            <p>
              AI-powered text rewriting with real-time grammar and spelling check. 
              Select any text, click, and get an improved version instantly.
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
                <span className="badge-icon">🤖</span>
                <span>AI Rewriting</span>
              </div>
              <div className="badge">
                <span className="badge-icon">✅</span>
                <span>Grammar Check</span>
              </div>
              <div className="badge">
                <span className="badge-icon">📝</span>
                <span>Spelling Fix</span>
              </div>
              <div className="badge">
                <span className="badge-icon">💯</span>
                <span>100% Free</span>
              </div>
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="video-section">
          <div className="container">
            <h2 className="section-title">See Rewordly in Action</h2>
            <div className="video-container">
              <img 
                src="/Reddit with AI Review and Grammar check.gif" 
                alt="Rewordly Demo - AI Review and Grammar Check on Reddit"
                className="demo-gif"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="section">
          <div className="container">
            <h2 className="section-title">Why Rewordly?</h2>
            <div className="features">
              <div className="feature-card">
                <div className="feature-icon">🤖</div>
                <h3>AI-Powered Rewriting</h3>
                <p>
                  Select any text and instantly get an AI-improved version. 
                  Enhance clarity, tone, and readability with one click.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✅</div>
                <h3>Real-time Grammar Check</h3>
                <p>
                  Advanced grammar checking with detailed error highlighting. 
                  See exactly what's wrong and how to fix it.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📝</div>
                <h3>Spelling Correction</h3>
                <p>
                  Automatic spelling error detection with smart suggestions. 
                  Fix typos instantly with a single click.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🌐</div>
                <h3>Works Everywhere</h3>
                <p>
                  Use on Reddit, Twitter, Gmail, LinkedIn, or any website. 
                  Works seamlessly wherever you write online.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>Privacy First</h3>
                <p>
                  No account required, no data stored. 
                  Your text is processed securely and never saved.
                </p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💯</div>
                <h3>100% Free Forever</h3>
                <p>
                  No hidden fees, no premium plans, no credit card. 
                  Full features available to everyone, always.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="testimonials-section">
          <div className="container">
            <h2 className="section-title">What Our Users Say</h2>
            <div className="testimonials">
              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    <img 
                      src="/customers/customer-himanshu-raikwar.png" 
                      alt="Himanshu Raikwar"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = 'HR';
                        }
                      }}
                    />
                  </div>
                  <div className="testimonial-info">
                    <div className="testimonial-name">Himanshu Raikwar</div>
                    <div className="testimonial-rating">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
                <div className="testimonial-text">
                  "If I recall correctly, I met a helpful developer on the Reddit community who shared this extension with me. Every day, he saves me more than 1 hour by helping me rewrite sentences. Fun fact: This review was rewritten by Rewordly."
                </div>
              </div>

              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    <img 
                      src="/customers/customer-aysu-perin.jpg" 
                      alt="aysu Perin"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.textContent = 'AP';
                        }
                      }}
                    />
                  </div>
                  <div className="testimonial-info">
                    <div className="testimonial-name">aysu Perin</div>
                    <div className="testimonial-rating">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
                <div className="testimonial-text">
                  "Extremely simple yet incredibly useful plugin. The interface is clean and very user-friendly."
                </div>
              </div>

              <div className="testimonial-card">
                <div className="testimonial-header">
                  <div className="testimonial-avatar">
                    KD
                  </div>
                  <div className="testimonial-info">
                    <div className="testimonial-name">Kristian Diana</div>
                    <div className="testimonial-rating">
                      {'★'.repeat(5)}
                    </div>
                  </div>
                </div>
                <div className="testimonial-text">
                  "Extremely convenient for improving writing on the fly. Works quickly and effectively!"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Highlight Section */}
        <section className="section highlight-section">
          <div className="container">
            <h2 className="section-title">Start Writing Better Today</h2>
            <div className="highlight-content">
              <p>
                Install Rewordly and get instant access to AI-powered text rewriting, 
                grammar checking, and spelling correction. No account needed, no payment required. 
                Just install and start improving your writing everywhere online!
              </p>
              <a 
                href="https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp" 
                target="_blank" 
                rel="noopener noreferrer"
                className="cta-button"
                style={{ marginTop: '2rem' }}
              >
                Add to Chrome - It's Free
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
      <Analytics />
    </>
  );
};

export default Home; 