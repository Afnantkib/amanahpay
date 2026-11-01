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
  const dateLocale = lang === 'ur' ? 'ur-IN' : 'en-IN';
  useEffect(() => {
    document.title = `Amanah Pay — ${t('tagline')}`;
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
  }, [reduced, t]);
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
              {t('nav.getStarted')}
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
            {t('home.heroNote')}
          </div>
        </div>
        <div className="hero-visual">
          <PhoneMockup />
        </div>
        <div className="hero-bottom-cue">
          <span>{t('home.scroll')}</span>
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
          <span>{t('home.payDirect')}</span>
        </div>
        <div>
          <LockKeyhole size={17} />
          <span>{t('home.scheduleUpfront')}</span>
        </div>
        <span className="verify-badge">{t('labels.verify')}</span>
      </section>
      <section className="home-section how-section public-page">
        <div className="section-heading">
          <span className="eyebrow">{t('home.howEyebrow')}</span>
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
          {t('home.exploreSteps')} <ArrowRight size={15} />
        </Link>
      </section>
      <section className="calculator-teaser">
        <div className="teaser-copy">
          <span className="eyebrow">{t('home.clarityEyebrow')}</span>
          <h2>{t('home.calculatorTitle')}</h2>
          <p>{t('home.calculatorBody')}</p>
          <Link className="button button-outline" to={'/' + lang + '/calculator'}>
            {t('home.calculatorButton')} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="teaser-card panel">
          <div className="teaser-card-top">
            <span className="merchant-avatar">S</span>
            <span>
              <b>Sunday Home</b>
              <small>{t('home.sampleItem')}</small>
            </span>
            <span className="tag-chip">{t('labels.illustrative')}</span>
          </div>
          <div className="teaser-price">
            <small>{t('home.fixedTotal')}</small>
            <strong>{inr(1600000)}</strong>
          </div>
          <div className="teaser-schedule">
            <div>
              <span className="timeline-dot is-paid">
                <Check size={10} />
              </span>
              <span>
                {t('home.today')} <small>{t('home.downPayment')}</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
            <div>
              <span className="timeline-dot is-due" />
              <span>
                {new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short' }).format(new Date(2026, 10, 30))} <small>{t('home.installment', { number: 1 })}</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
            <div>
              <span className="timeline-dot is-upcoming" />
              <span>
                {new Intl.DateTimeFormat(dateLocale, { day: 'numeric', month: 'short' }).format(new Date(2026, 11, 30))} <small>{t('home.installment', { number: 2 })}</small>
              </span>
              <b>{inr(400000)}</b>
            </div>
          </div>
        </div>
      </section>
      <section className="dashboard-preview-section public-page">
        <div className="section-heading align-start">
          <span className="eyebrow">{t('home.madeForMerchants')}</span>
          <h2>{t('sections.dashboard')}</h2>
          <p>{t('home.dashboardBody')}</p>
        </div>
        <div className="dashboard-preview panel">
          <div className="preview-side">
            <BrandSymbol />
            <span>amanah pay</span>
            <small>{t('home.overview')}</small>
            <small>{t('home.customers')}</small>
            <small>{t('home.plans')}</small>
            <small>{t('home.collections')}</small>
            <small>{t('home.reports')}</small>
          </div>
          <div className="preview-main">
            <div className="preview-top">
              <span>
                {t('home.overview')} <small>Sunday Home · {t('home.sampleMonth')} 2026</small>
              </span>
              <button className="button button-primary button-small">{t('home.newPlan')}</button>
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
                  <span>{t('home.fromActive')}</span>
                </div>
              ))}
            </div>
            <div className="preview-graph">
              <div className="graph-title">
                <span>{t('labels.collections')}</span>
                <small>{t('home.lastMonths')}</small>
              </div>
              <svg viewBox="0 0 600 130" preserveAspectRatio="none" aria-label={t('labels.collections')}>
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
          <span className="eyebrow">{t('home.clearByDesign')}</span>
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
              t('home.fixedAgreed'),
              t('home.sameSchedule'),
            ],
            [ShieldCheck, t('home.control'), t('home.merchantDecides')],
            [
              LockKeyhole,
              t('home.merchantReceives'),
              t('home.chosenAccount'),
            ],
            [
              Sparkles,
              t('home.simpleTracking'),
              t('home.calmPlace'),
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
          <span className="eyebrow">{t('home.pricingEyebrow')}</span>
          <h2>{t('sections.pricing')}</h2>
          <p>{t('sections.pricingBody')}</p>
          <Link className="button button-primary" to={'/' + lang + '/pricing'}>
            {t('home.seePricing')} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="pricing-mini panel">
          <span className="pricing-icon">
            <Check size={18} />
          </span>
          <h3>{t('home.merchantPaid')}</h3>
          <p>{t('home.feesBody')}</p>
          <span className="verify-badge">{t('labels.verify')}</span>
        </div>
      </section>
      <section className="faq-teaser public-page">
        <div className="section-heading">
          <span className="eyebrow">{t('home.goodToKnow')}</span>
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
            {t('home.whoReceives')}
            <PlusIcon />
          </summary>
          <p>
            {t('home.whoReceivesBody')}
          </p>
        </details>
        <Link className="inline-link" to={'/' + lang + '/faq'}>
          {t('home.visitHelp')} <ArrowRight size={15} />
        </Link>
      </section>
      <section className="final-cta">
        <span className="eyebrow">{t('home.forMerchants')}</span>
        <h2>{t('home.finalTitle')}</h2>
        <p>{t('home.finalBody')}</p>
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
