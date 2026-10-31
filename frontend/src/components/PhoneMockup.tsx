import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, Check, Circle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { inr } from '../lib/format';

export function PhoneMockup({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [screen, setScreen] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setScreen((value) => (value + 1) % 3), 4200);
    return () => window.clearInterval(timer);
  }, [reduced]);
  return (
    <motion.div
      className={`phone-stage ${compact ? 'phone-stage-small' : ''}`}
      animate={reduced ? undefined : { y: [0, -6, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="receipt-float">
        <span className="receipt-check">
          <Check size={14} />
        </span>
        <span>
          <small>{t('labels.paid')}</small>
          <strong>{inr(400000)}</strong>
        </span>
      </div>
      <div className="phone-frame">
        <span className="phone-side-button" />
        <div className="phone-screen">
          <div className="phone-island" />
          <div className="phone-content">
            {screen === 0 && (
              <>
                <div className="phone-merchant">
                  <span className="merchant-avatar">S</span>
                  <span>
                    <b>Sunday Home</b>
                    <small>{t('labels.merchant')}</small>
                  </span>
                </div>
                <p className="phone-label">{t('labels.item')}</p>
                <h3>Dining table set</h3>
                <div className="phone-amount">
                  <small>{t('labels.total')}</small>
                  <strong>{inr(1600000)}</strong>
                </div>
                <div className="phone-note">
                  {t('labels.today')} {inr(400000)}, then 3 {t('labels.monthly').toLowerCase()}{' '}
                  payments
                </div>
                <button className="phone-pay">
                  {t('labels.payUpi')} <ArrowUpRight size={15} />
                </button>
              </>
            )}
            {screen === 1 && (
              <>
                <div className="phone-merchant">
                  <span className="merchant-avatar">S</span>
                  <span>
                    <b>Sunday Home</b>
                    <small>{t('labels.customerPage')}</small>
                  </span>
                </div>
                <h3>{t('labels.schedule')}</h3>
                <div className="phone-timeline">
                  {[0, 1, 2, 3].map((i) => (
                    <div className="phone-row" key={i}>
                      <span
                        className={`timeline-dot ${i === 0 ? 'is-paid' : i === 1 ? 'is-due' : ''}`}
                      >
                        {i === 0 ? <Check size={10} /> : <Circle size={8} />}
                      </span>
                      <span>
                        <b>
                          {i === 0
                            ? t('labels.paid')
                            : i === 1
                              ? t('labels.nextDue')
                              : t('labels.upcoming')}
                        </b>
                        <small>{shortDemoDate(i)}</small>
                      </span>
                      <strong>{inr(400000)}</strong>
                    </div>
                  ))}
                </div>
                <button className="phone-pay">
                  {t('labels.payUpi')} <ArrowUpRight size={15} />
                </button>
              </>
            )}
            {screen === 2 && (
              <>
                <span className="paid-big">
                  <Check size={22} />
                </span>
                <p className="phone-label">Sunday Home</p>
                <h3>{t('labels.paid')}</h3>
                <div className="phone-amount">
                  <small>{t('labels.amount')}</small>
                  <strong>{inr(400000)}</strong>
                </div>
                <p className="phone-confirm">Your payment has been recorded. A receipt is ready.</p>
                <button className="phone-pay phone-pay-secondary">View receipt</button>
              </>
            )}
            <div className="phone-dots" role="tablist" aria-label="Preview screens">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  className={screen === i ? 'active' : ''}
                  onClick={() => setScreen(i)}
                  aria-label={`Show preview ${i + 1}`}
                  aria-selected={screen === i}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="phone-shadow" />
    </motion.div>
  );
}
function shortDemoDate(i: number) {
  return ['Paid · 31 Oct', 'Due · 30 Nov', '31 Dec', '31 Jan'][i];
}
