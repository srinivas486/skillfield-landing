import Footer from "../components/Footer";
import NavBar from "../components/NavBar";
import { getHomePageData, getSafeIconSvg, safeHref } from "../lib/content";

export default function HomePage() {
  const data = getHomePageData();

  return (
    <>
      <NavBar
        logoUrl={data.nav.logo_url}
        logoAlt={data.nav.logo_alt}
        links={data.nav.links}
        homeHref="#hero"
      />

      <section id="hero" aria-labelledby="hero-heading">
        <div className="container">
          <div className="hero-eyebrow" aria-hidden="true">
            {data.hero.eyebrow}
          </div>

          <h1 className="hero-heading" id="hero-heading">
            <span className="accent">{data.hero.heading}</span>
          </h1>

          <p className="hero-tagline">{data.hero.tagline}</p>

          <div className="hero-cta-group">
            {data.hero.buttons.map((btn) => (
              <a
                key={`${btn.text}-${btn.href}`}
                href={safeHref(btn.href)}
                className={btn.primary ? "btn-primary" : "btn-ghost"}
              >
                {btn.text}
              </a>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section id={data.ai_services.id} aria-labelledby="ai-heading">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{data.ai_services.label}</div>
            <h2 id="ai-heading">{data.ai_services.heading}</h2>
            <p>{data.ai_services.description}</p>
          </div>

          <div className="cards-grid" role="list">
            {data.ai_services.cards.map((card) => (
              <article className="card" role="listitem" key={card.title}>
                <div
                  className="card-icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: getSafeIconSvg(card.icon) }}
                />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section
        id={data.security_services.id}
        className="section-alt"
        aria-labelledby="security-heading"
      >
        <div className="container">
          <div className="section-header">
            <div className="section-label">{data.security_services.label}</div>
            <h2 id="security-heading">{data.security_services.heading}</h2>
            <p>{data.security_services.description}</p>
          </div>

          <div className="cards-grid" role="list">
            {data.security_services.cards.map((card) => (
              <article className="card" role="listitem" key={card.title}>
                <div
                  className="card-icon"
                  aria-hidden="true"
                  dangerouslySetInnerHTML={{ __html: getSafeIconSvg(card.icon) }}
                />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section id={data.why.id} aria-labelledby="why-heading">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{data.why.label}</div>
            <h2 id="why-heading">{data.why.heading}</h2>
          </div>

          <div className="why-grid" role="list">
            {data.why.items.map((item) => (
              <div className="why-item" role="listitem" key={item.title}>
                <div className="why-icon" aria-hidden="true">
                  {item.icon}
                </div>
                <div className="why-content">
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section
        id={data.credentials.id}
        className="section-alt"
        aria-labelledby="credentials-heading"
      >
        <div className="container">
          <div className="section-header">
            <div className="section-label">{data.credentials.label}</div>
            <h2 id="credentials-heading">{data.credentials.heading}</h2>
          </div>

          <div className="badges-grid" role="list">
            {data.credentials.badges.map((badge) => (
              <div className="badge-tile" role="listitem" key={badge.title}>
                <div className="badge-title">{badge.title}</div>
                <div className="badge-detail">{badge.detail}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section id={data.testimonials.id} aria-labelledby="testimonials-heading">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{data.testimonials.label}</div>
            <h2 id="testimonials-heading">{data.testimonials.heading}</h2>
          </div>

          <div className="cards-grid" role="list">
            {data.testimonials.items.map((item) => (
              <article className="card" role="listitem" key={item.name}>
                <span className="testimonial-quote" aria-hidden="true">
                  "
                </span>
                <p className="testimonial-text">{item.quote}</p>
                <span className="testimonial-name">- {item.name}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <hr className="section-divider" />

      <section id={data.contact.id} aria-labelledby="contact-heading">
        <div className="container">
          <h2 id="contact-heading">{data.contact.heading}</h2>
          <p>{data.contact.description}</p>

          <a href={`mailto:${data.contact.email}`} className="btn-primary">
            {data.contact.email}
          </a>
        </div>
      </section>

      <Footer footer={data.footer} logoAlt={data.footer.logo_alt} />
    </>
  );
}
