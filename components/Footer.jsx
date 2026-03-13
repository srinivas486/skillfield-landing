export default function Footer({ footer, logoAlt }) {
  return (
    <footer>
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-wordmark">
              <img
                src={footer.logo_url}
                alt={logoAlt}
                style={{ display: "block", height: "36px", width: "auto", marginBottom: "4px" }}
              />
            </div>
            <div className="footer-tagline">{footer.tagline}</div>
          </div>

          <p className="footer-copy">{footer.copyright}</p>

          <div className="footer-meta">
            {footer.location} · <a href={`mailto:${footer.email}`}>{footer.email}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
