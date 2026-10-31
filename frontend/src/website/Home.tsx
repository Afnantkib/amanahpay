import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleCheck,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PhoneMockup } from '../components/PhoneMockup';
import { BrandSymbol } from '../components/BrandLogo';
import { inr } from '../lib/format';

export function Home() {
  const { t } = useTranslation();
  const location = useLocation();
  const reduced = useReducedMotion();
  const [splash, setSplash] = useState(false);
  const lang = location.pathname.split('/')[1] || 'en';
  useEffect(() => {
    document.title = 'Amanah Pay — installments, made clear';
    let shown = false;
    try {
      shown = sessionStorage.getItem('amanah-splash') === '1';
      if (!shown && !reduced) {
        setSplash(true);
        sessionStorage.setItem('amanah-splash', '1');
        window.setTimeout(() => setSplash(false), 680);
      }
    } catch {
      // Storage may be unavailable; render the page without the optional splash.
    }
  }, [reduced]);
  return (
    <>
      {splash && (
        <motion.div
          className="brand-splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
        >
          <svg className="splash-symbol" viewBox="0 0 64 64" aria-hidden="true">
            <path className="splash-arc arc-one" d="M32 7a25 25 0 0 1 25 25" />
            <path className="splash-arc arc-two" d="M57 32a25 25 0 0 1-25 25" />
            <path className="splash-arc arc-three" d="M32 57A25 25 0 0 1 7 32" />
            <path className="splash-arc arc-four" d="M7 32A25 25 0 0 1 32 7" />
            <circle cx="54" cy="15" r="8" fill="#9A6B12" />
          </svg>
          <span>amanah pay</span>
        </motion.div>
      )}
      <section className="hero-section public-page">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> {t('hero.eyebrow')}
          </span>
          <h1>{t('hero.title')}</h1>
          <p className="hero-body">{t('hero.body')}</p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" to={'/' + lang + '/customer-access'}>
              Get started
              <ArrowRight size={16} />
            </Link>
            <Link className="hero-link" to={'/' + lang + '/how-it-works'}>
              {t('hero.secondary')}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="hero-note">
            <span className="note-check">
              <Check size={12} />
            </span>
            Scan your merchant’s QR to get started · email verification, no password needed
          </div>
        </div>
        <div className="hero-visual">
          <PhoneMockup />
        </div>
        <div className="hero-bottom-cue">
          <span>Scroll to explore</span>
          <ChevronDown size={15} />
        </div>
      </section>
      <section className="trust-strip">
        <div>
          <CircleCheck size={17} />
          <span>{t('labels.noCustomerFee')}</span>
        </div>
        <div>
          <ShieldCheck size={17} />
          <span>Pay the merchant directly</span>
        </div>
        <div>
          <LockKeyhole size={17} />
          <span>Full schedule before you agree</span>
        </div>
        <span className="verify-badge">{t('labels.verify')}</span>
      </section>
      <section className="home-section how-section public-page">
        <div className="section-heading">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>{t('sections.how')}</h2>
          <p>{t('sections.howBody')}</p>
        </div>
        <div className="steps-grid">
          {[
            [t('customerSteps.one'), t('customerSteps.oneBody')],
            [t('customerSteps.two'), t('customerSteps.twoBody')],
            [t('customerSteps.three'), t('customerSteps.threeBody')],
          ].map(([title, body], i) => (
            <article className="step-card" key={title}>
              <span className="step-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              {i === 1 && (
                <div className="step-mini-phone">
                  <PhoneMockup compact />
                </div>
              )}
            </article>
          ))}
        </div>
        <Link className="inline-link" to={'/' + lang + '/how-it-works'}>
          Explore the steps <ArrowRight size={15} />
        </Link>
      </section>
      <section className="calculator-teaser">
        <div className="teaser-copy">
          <span className="eyebrow">A LITTLE MORE CLARITY</span>
          <h2>See what a clear schedule looks like.</h2>
          <p>
            Choose a fixed price and payment dates. Get a simple example you can understand at a
            glance.
          </p>
          <Link className="button button-outline" to={'/' + lang + '/calculator'}>
            Try the illustrative calculator <ArrowRight size={15} />
          </Link>
        </div>
        <div className="teaser-card panel">
          <div className="teaser-card-top">
            <span className="merchant-avatar">S</span>
            <span>
              <b>Sunday Home</b>
              <small>Dining table set</small>
            </span>
            <span className="tag-chip">{t('labels.illustrative')}</span>
          </div>
          <div className="teaser-price">
            <small>Fixed total price</small>
            <strong>{inr(1600000)}</strong>
          </div>
          <div className="teaser-schedule">
            <div>
              <span className="timeline-dot is-paid">
                <Check size={10} />
              </span>
              <span>
                Today <small>Down payment</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
            <div>
              <span className="timeline-dot is-due" />
              <span>
                30 Nov <small>Installment 1</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
            <div>
              <span className="timeline-dot is-upcoming" />
              <span>
                30 Dec <small>Installment 2</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
          </div>
        </div>
      </section>
      <section className="dashboard-preview-section public-page">
        <div className="section-heading align-start">
          <span className="eyebrow">MADE FOR MERCHANTS</span>
          <h2>{t('sections.dashboard')}</h2>
          <p>Today’s priorities and the bigger picture, together.</p>
        </div>
        <div className="dashboard-preview panel">
          <div className="preview-side">
            <BrandSymbol />
            <span>amanah pay</span>
            <small>OVERVIEW</small>
            <small>CUSTOMERS</small>
            <small>PLANS</small>
            <small>COLLECTIONS</small>
            <small>REPORTS</small>
          </div>
          <div className="preview-main">
            <div className="preview-top">
              <span>
                Overview <small>Sunday Home · October 2026</small>
              </span>
              <button className="button button-primary button-small">+ New plan</button>
            </div>
            <div className="preview-stats">
              {[
                [t('labels.collected'), inr(12450000)],
                [t('labels.pending'), inr(8630000)],
                [t('labels.overdue'), inr(2140000)],
              ].map(([label, value]) => (
                <div key={label}>
                  <small>{label}</small>
                  <b>{value}</b>
                  <span>From active plans</span>
                </div>
              ))}
            </div>
            <div className="preview-graph">
              <div className="graph-title">
                <span>Collections</span>
                <small>Last 5 months</small>
              </div>
              <svg viewBox="0 0 600 130" preserveAspectRatio="none" aria-label="Collections chart">
                <path
                  d="M0 100 C60 85 75 91 120 64 S210 88 270 52 S360 64 420 33 S510 55 600 16"
                  fill="none"
                  stroke="var(--accent-icon)"
                  strokeWidth="3"
                />
                <path
                  d="M0 115 C60 104 75 108 120 92 S210 102 270 84 S360 89 420 73 S510 81 600 60"
                  fill="none"
                  stroke="var(--upcoming)"
                  strokeWidth="2"
                  strokeDasharray="4 5"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>
      <section className="why-section">
        <div className="why-left">
          <span className="eyebrow">CLEAR BY DESIGN</span>
          <h2>{t('sections.why')}</h2>
          <p>{t('sections.whyBody')}</p>
          <Link className="inline-link" to={'/' + lang + '/approach'}>
            {t('labels.learnMore')}
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="why-list">
          {[
            [
              CircleCheck,
              'A fixed total, agreed up front',
              'Everyone can see the same payment schedule.',
            ],
            [ShieldCheck, 'You stay in control', 'The merchant decides who to offer a plan to.'],
            [
              LockKeyhole,
              'The merchant receives payment',
              'Customer payments go to your chosen merchant account.',
            ],
            [
              Sparkles,
              'Simple, considerate tracking',
              'A calm place for records, reminders and receipts.',
            ],
          ].map(([Icon, title, body]) => {
            const Symbol = Icon as typeof CircleCheck;
            return (
              <article key={title as string}>
                <span className="why-icon">
                  <Symbol size={18} />
                </span>
                <span>
                  <b>{title as string}</b>
                  <small>{body as string}</small>
                </span>
              </article>
            );
          })}
        </div>
      </section>
      <section className="pricing-teaser public-page">
        <div>
          <span className="eyebrow">PRICING THAT STAYS CLEAR</span>
          <h2>{t('sections.pricing')}</h2>
          <p>{t('sections.pricingBody')}</p>
          <Link className="button button-primary" to={'/' + lang + '/pricing'}>
            See merchant pricing <ArrowRight size={15} />
          </Link>
        </div>
        <div className="pricing-mini panel">
          <span className="pricing-icon">
            <Check size={18} />
          </span>
          <h3>Merchant-paid</h3>
          <p>
            Platform fees are billed to your business. They never appear as an added fee on a
            customer's plan.
          </p>
          <span className="verify-badge">{t('labels.verify')}</span>
        </div>
      </section>
      <section className="faq-teaser public-page">
        <div className="section-heading">
          <span className="eyebrow">GOOD TO KNOW</span>
          <h2>{t('sections.faq')}</h2>
        </div>
        <details className="home-faq">
          <summary>
            {t('labels.faqQ')}
            <PlusIcon />
          </summary>
          <p>{t('labels.faqA')}</p>
        </details>
        <details className="home-faq">
          <summary>
            Who receives the customer payments?
            <PlusIcon />
          </summary>
          <p>
            Customers pay the merchant directly using the merchant’s UPI details or a gateway that
            settles to the merchant.
          </p>
        </details>
        <Link className="inline-link" to={'/' + lang + '/faq'}>
          Visit the help centre <ArrowRight size={15} />
        </Link>
      </section>
      <section className="final-cta">
        <span className="eyebrow">FOR MERCHANTS</span>
        <h2>Offer clear installments to your customers.</h2>
        <p>Give customers a fixed price and a schedule they can understand.</p>
        <Link className="button button-light button-large" to={'/' + lang + '/signup'}>
          {t('nav.start')}
          <ArrowRight size={16} />
        </Link>
        <span className="cta-orbit" />
      </section>
    </>
  );
}
function PlusIcon() {
  return <span className="faq-plus">+</span>;
}
