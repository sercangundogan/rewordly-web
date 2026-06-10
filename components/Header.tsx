"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const NavAuthLinks = dynamic(
  () => import("./NavAuthLinks").then((m) => m.default),
  { ssr: false }
);

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/rewordly/bpadlnmafgmnggjjggckmoggkeimhojp";

type HeaderProps = {
  /** Show Log in / Dashboard link (homepage only) */
  showAuthSlot?: boolean;
};

export default function Header({ showAuthSlot = false }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const navLinks = (
    <>
      <Link href="/#features" className="site-header-link" onClick={closeMenu}>
        Features
      </Link>
      <Link href="/#demo" className="site-header-link" onClick={closeMenu}>
        How it works
      </Link>
      <Link href="/#testimonials" className="site-header-link" onClick={closeMenu}>
        Reviews
      </Link>
      <Link href="/#pricing" className="site-header-link" onClick={closeMenu}>
        Pricing
      </Link>
      <Link href="/blog" className="site-header-link" onClick={closeMenu}>
        Blog
      </Link>
      {showAuthSlot && (
        <span className="site-header-auth-slot">
          <Link
            href="/login"
            className="site-header-btn-secondary"
            id="nav-auth-link"
            onClick={closeMenu}
          >
            Log in
          </Link>
          <NavAuthLinks />
        </span>
      )}
      <a
        href={CHROME_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="site-header-cta"
        onClick={closeMenu}
      >
        Add to Chrome
      </a>
    </>
  );

  return (
    <>
      <style jsx global>{`
        .site-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 16px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid #e5e5e5;
        }
        .site-header-logo {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0a0a0a;
          text-decoration: none;
        }
        .site-header-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }
        .site-header-link {
          color: #525252;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s;
        }
        .site-header-link:hover {
          color: #0a0a0a;
        }
        .site-header-auth-slot {
          min-width: 7rem;
          display: inline-block;
        }
        .site-header-btn-secondary {
          display: inline-block;
          padding: 12px 28px;
          background: #ffffff;
          color: #0a0a0a;
          border: 2px solid #e5e5e5;
          border-radius: 50px;
          font-weight: 600;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        .site-header-btn-secondary:hover {
          transform: translateY(-2px);
          border-color: #d4d4d4;
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
        }
        .site-header-cta {
          padding: 12px 28px;
          background: #0a0a0a;
          color: #ffffff;
          border-radius: 50px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }
        .site-header-cta:hover {
          transform: translateY(-2px);
          background: #262626;
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
        }
        .site-header-mobile-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #0a0a0a;
        }
        .site-header-mobile-menu {
          display: none;
          position: fixed;
          top: 57px;
          left: 0;
          right: 0;
          bottom: 0;
          background: #ffffff;
          z-index: 999;
          flex-direction: column;
          padding: 24px 20px;
          gap: 8px;
          overflow-y: auto;
          border-top: 1px solid #e5e5e5;
        }
        .site-header-mobile-menu a {
          display: block;
          padding: 14px 16px;
          color: #171717;
          text-decoration: none;
          font-weight: 500;
          font-size: 1rem;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .site-header-mobile-menu a:hover {
          background: #f5f5f5;
        }
        .site-header-mobile-menu .site-header-cta {
          margin-top: 16px;
          text-align: center;
          background: #0a0a0a;
          color: #ffffff;
        }
        .site-header-mobile-menu .site-header-cta:hover {
          background: #262626;
          color: #ffffff;
        }
        .site-header-mobile-menu .site-header-btn-secondary {
          margin-top: 8px;
          text-align: center;
          background: #ffffff;
          color: #0a0a0a;
          border: 2px solid #e5e5e5;
        }
        .site-header-mobile-menu .site-header-btn-secondary:hover {
          background: #f5f5f5;
          color: #0a0a0a;
        }
        @media (max-width: 768px) {
          .site-header {
            padding: 12px 20px;
          }
          .site-header-links {
            display: none;
          }
          .site-header-mobile-btn {
            display: block;
          }
          .site-header-mobile-menu.is-open {
            display: flex;
          }
        }
      `}</style>

      <nav className="site-header">
        <Link href="/" className="site-header-logo" onClick={closeMenu}>
          Rewordly
        </Link>
        <div className="site-header-links">{navLinks}</div>
        <button
          type="button"
          className="site-header-mobile-btn"
          onClick={() => setIsMenuOpen((o) => !o)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          )}
        </button>
      </nav>

      <div
        className={`site-header-mobile-menu ${isMenuOpen ? "is-open" : ""}`}
        aria-hidden={!isMenuOpen}
      >
        <Link href="/#features" className="site-header-link" onClick={closeMenu}>
          Features
        </Link>
        <Link href="/#demo" className="site-header-link" onClick={closeMenu}>
          How it works
        </Link>
        <Link href="/#testimonials" className="site-header-link" onClick={closeMenu}>
          Reviews
        </Link>
        <Link href="/#pricing" className="site-header-link" onClick={closeMenu}>
          Pricing
        </Link>
        <Link href="/blog" className="site-header-link" onClick={closeMenu}>
          Blog
        </Link>
        {showAuthSlot && (
          <Link
            href="/login"
            className="site-header-btn-secondary"
            id="nav-auth-link-mobile"
            onClick={closeMenu}
          >
            Log in
          </Link>
        )}
        <a
          href={CHROME_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="site-header-cta"
          onClick={closeMenu}
        >
          Add to Chrome
        </a>
      </div>
    </>
  );
}
