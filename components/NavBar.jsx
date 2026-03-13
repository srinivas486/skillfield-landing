import Link from "next/link";

import { safeHref } from "../lib/content";

export default function NavBar({ logoUrl, logoAlt, links, homeHref }) {
  return (
    <nav aria-label="Main navigation">
      <div className="container">
        <div className="nav-inner">
          <a href={homeHref} className="nav-wordmark" aria-label={`${logoAlt} home`}>
            <img
              src={logoUrl}
              alt={logoAlt}
              height="40"
              width="auto"
              style={{ display: "block", height: "40px", width: "auto" }}
            />
          </a>

          <ul className="nav-links" role="list">
            {links.map((link) => {
              const href = safeHref(link.href);
              const isInternal = href.startsWith("/");
              return (
                <li key={`${link.text}-${link.href}`}>
                  {isInternal ? (
                    <Link href={href} className={link.cta ? "nav-cta" : undefined}>
                      {link.text}
                    </Link>
                  ) : (
                    <a href={href} className={link.cta ? "nav-cta" : undefined}>
                      {link.text}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
