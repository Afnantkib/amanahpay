import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleHelp,
  Clock,
  Command,
  Copy,
  Download,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { PhoneMockup } from './components/PhoneMockup';
import { BrandLockup, BrandSymbol } from './components/BrandLogo';
import { api, authApi, customerApi } from './lib/api/client';
import type { CustomerOffer } from './lib/api/client';
import { illustrativeSchedule } from './lib/api/illustrativeSchedule';
import { inr, shortDate } from './lib/format';

const Home = lazy(() => import('./website/Home').then((m) => ({ default: m.Home })));

function langPath(lang: string, path: string) {
  return `/${lang}${path === '/' ? '' : path}`;
}
function useLang() {
  const { lang = 'en' } = useParams();
  return lang === 'ur' ? 'ur' : 'en';
}

export function App() {
  const location = useLocation();
  const lang = location.pathname.split('/')[1] === 'ur' ? 'ur' : 'en';
  const { i18n, t } = useTranslation();
  useEffect(() => {
    const rtl = lang === 'ur';
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.documentElement.dataset.adviserBadge =
      import.meta.env.VITE_SHOW_ADVISER_BADGE === 'false' ? 'false' : 'true';
    const title =
      location.pathname.split('/').filter(Boolean).slice(1).join(' · ') ||
      'Installments, made clear';
    document.title = `${title.charAt(0).toUpperCase()}${title.slice(1)} | Amanah Pay`;
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      'content',
      t('hero.body'),
    );
    for (const locale of ['en', 'ur']) {
      let alternate = document.querySelector<HTMLLinkElement>(`link[hreflang="${locale}"]`);
      if (!alternate) {
        alternate = document.createElement('link');
        alternate.rel = 'alternate';
        alternate.hreflang = locale;
        document.head.appendChild(alternate);
      }
      const path = location.pathname.replace(/^\/(en|ur)/, `/${locale}`);
      alternate.href = `${window.location.origin}${path}`;
    }
    void i18n.changeLanguage(lang);
    localStorage.setItem('amanah-lang', lang);
  }, [lang, i18n, location.pathname]);
  return (
    <Suspense
      fallback={
        <div className="page-loader">
          <span className="brand-mark">a</span>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/en" replace />} />
        <Route path="/:lang/*" element={<SiteLayout />} />
      </Routes>
    </Suspense>
  );
}

function ThemeLanguage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const lang = useLang();
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark');
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? 'dark' : 'light';
    localStorage.setItem('amanah-theme', next ? 'dark' : 'light');
  };
  const switchLanguage = async () => {
    const next = lang === 'en' ? 'ur' : 'en';
    const parts = location.pathname.split('/');
    parts[1] = next;
    await i18n.changeLanguage(next);
    localStorage.setItem('amanah-lang', next);
    navigate(`${parts.join('/')}${location.search}${location.hash}`);
  };
  return (
    <div className="icon-tools">
      <button className="icon-button" onClick={toggleTheme} aria-label={t('labels.theme')}>
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <button
        className="language-button"
        onClick={switchLanguage}
        aria-label={t('labels.language')}
      >
        {lang === 'en' ? 'اردو' : 'EN'}
      </button>
    </div>
  );
}

function SiteLayout() {
  const lang = useLang();
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="nav-inner">
          <Link to={langPath(lang, '/')} className="wordmark">
            <BrandLockup />
          </Link>
          <button
            className="mobile-menu icon-button"
            aria-label={t('labels.menu')}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav className={`site-nav ${menu ? 'is-open' : ''}`}>
            <NavLink to={langPath(lang, '/how-it-works')}>{t('nav.how')}</NavLink>
            <NavLink to={langPath(lang, '/merchants')}>{t('nav.merchants')}</NavLink>
            <NavLink to={langPath(lang, '/pricing')}>{t('nav.pricing')}</NavLink>
            <NavLink to={langPath(lang, '/approach')}>{t('nav.approach')}</NavLink>
            <NavLink className="mobile-login-item" to={langPath(lang, '/login')}>
              {t('nav.login')}
            </NavLink>
          </nav>
          <div className="nav-actions">
            <ThemeLanguage />
            <Link className="text-link login-link" to={langPath(lang, '/login')}>
              {t('nav.login')}
            </Link>
            <Link className="button button-primary nav-cta" to={langPath(lang, '/customer-access')}>
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      </header>
      <main>
        <Suspense fallback={<div className="page-loader" />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="how-it-works" element={<ContentPage type="how" />} />
            <Route path="merchants" element={<ContentPage type="merchants" />} />
            <Route path="pricing" element={<ContentPage type="pricing" />} />
            <Route path="approach" element={<ContentPage type="approach" />} />
            <Route path="faq" element={<ContentPage type="faq" />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="about" element={<ContentPage type="about" />} />
            <Route path="contact" element={<Contact />} />
            <Route path="legal/:slug" element={<LegalPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="signup" element={<AuthPage signup />} />
            <Route path="customer/account" element={<CustomerAccount />} />
            <Route path="customer/open-offer" element={<CustomerOfferOpen />} />
            <Route path="app" element={<MerchantLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="overview" element={<Dashboard />} />
              <Route path="customers" element={<DataPage type="customers" />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="plans" element={<DataPage type="plans" />} />
              <Route path="plans/new" element={<PlanWizard />} />
              <Route path="collections" element={<DataPage type="collections" />} />
              <Route path="payments" element={<DataPage type="payments" />} />
              <Route path="reports" element={<DataPage type="reports" />} />
              <Route path="settings" element={<DataPage type="settings" />} />
            </Route>
            <Route path="customer/:token" element={<CustomerPortal />} />
            <Route path="customer-access" element={<CustomerAccessStart />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  const lang = useLang();
  const { t } = useTranslation();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to={langPath(lang, '/')} className="wordmark">
            <BrandLockup />
          </Link>
          <p>{t('tagline')}</p>
        </div>
        <div>
          <h4>{t('content.product')}</h4>
          <Link to={langPath(lang, '/how-it-works')}>{t('nav.how')}</Link>
          <Link to={langPath(lang, '/merchants')}>{t('nav.merchants')}</Link>
          <Link to={langPath(lang, '/pricing')}>{t('nav.pricing')}</Link>
          <Link to={langPath(lang, '/calculator')}>{t('labels.calculator')}</Link>
        </div>
        <div>
          <h4>{t('content.company')}</h4>
          <Link to={langPath(lang, '/about')}>{t('content.about')}</Link>
          <Link to={langPath(lang, '/contact')}>{t('nav.contact')}</Link>
          <Link to={langPath(lang, '/faq')}>{t('nav.faq')}</Link>
        </div>
        <div>
          <h4>{t('content.information')}</h4>
          <Link to={langPath(lang, '/legal/terms')}>{t('labels.terms')}</Link>
          <Link to={langPath(lang, '/legal/privacy')}>{t('labels.privacy')}</Link>
          <Link to={langPath(lang, '/legal/dpdp')}>{t('content.dpdp')}</Link>
          <Link to={langPath(lang, '/legal/grievance')}>{t('labels.grievance')}</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Amanah Pay</span>
        <span>{t('content.regional')}</span>
        <span>LinkedIn · Instagram</span>
      </div>
    </footer>
  );
}

function Status({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    'On track': 'onTrack',
    'Due soon': 'dueSoon',
    Overdue: 'overdue',
    Paid: 'paid',
    Due: 'due',
    Upcoming: 'upcoming',
  };
  const key = map[status] || 'upcoming';
  return (
    <span className={`status-chip status-${key}`}>
      <span className="status-icon">
        {key === 'paid' ? (
          <Check size={11} />
        ) : key === 'overdue' ? (
          <ArrowDownLeft size={11} />
        ) : (
          <CircleHelp size={10} />
        )}
      </span>
      {t(`labels.${key}`)}
    </span>
  );
}

function Dashboard() {
  const { t } = useTranslation();
  const lang = useLang();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
  });
  const stats = data
    ? ([
        [t('labels.collected'), data.collectedPaise, 'paid'],
        [t('labels.pending'), data.pendingPaise, 'pending'],
        [t('labels.overdue'), data.overduePaise, 'overdue'],
        [t('labels.upcomingWeek'), data.upcomingPaise, 'upcoming'],
      ] as const)
    : [];
  const monthlyQuery = useQuery({
    queryKey: ['reports-monthly'],
    queryFn: api.reportsMonthly,
  });
  const chart = (monthlyQuery.data && monthlyQuery.data.length > 0)
    ? monthlyQuery.data.map((d) => ({
        month: d.monthLabel || d.month,
        collected: d.collected,
        pending: d.pending,
      }))
    : [
        { month: 'Jun', collected: 48, pending: 24 },
        { month: 'Jul', collected: 56, pending: 31 },
        { month: 'Aug', collected: 42, pending: 37 },
        { month: 'Sep', collected: 72, pending: 36 },
        { month: 'Oct', collected: 64, pending: 42 },
      ];
  if (isError)
    return (
      <div className="error-state">
        <CircleHelp />
        <h2>{t('workspace.loadError')}</h2>
        <button className="button button-outline" onClick={() => void refetch()}>
          {t('workspace.tryAgain')}
        </button>
      </div>
    );
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={t('labels.demo')}
        title={t('labels.overview')}
        action={
          <Link className="button button-primary" to={'/' + lang + '/app/plans/new'}>
            <Plus size={16} />
            {t('labels.createPlan')}
          </Link>
        }
      />
      <div className="stat-grid">
        {(isLoading
          ? Array.from(
              { length: 4 },
              (_, i) =>
                [t('labels.pending'), 0, ['paid', 'pending', 'overdue', 'upcoming'][i]] as const,
            )
          : stats
        ).map(([label, value, tone], i) => (
          <div className={`stat-card stat-${tone} ${isLoading ? 'skeleton' : ''}`} key={label + i}>
            <span>{label}</span>
            <strong>{inr(value)}</strong>
            <small>{i === 0 ? t('home.monthlyChange', { value: '+12.8%' }) : t('workspace.activePlansCaption')}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('labels.collected')}</h2>
              <p>{t('workspace.trend')}</p>
            </div>
            <button className="select-button">
              {t('labels.month')} <ChevronDown size={14} />
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot green" />
              {t('workspace.collected')}
            </span>
            <span>
              <i className="legend-dot gray" />
              {t('workspace.pending')}
            </span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  tickFormatter={(v) => `₹${v}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    color: 'var(--ink)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--accent-icon)"
                  strokeWidth={2.5}
                  fill="var(--mint)"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stroke="var(--upcoming)"
                  strokeWidth={2}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel due-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('labels.dueToday')}</h2>
              <p>{t('workspace.todayDate')}</p>
            </div>
            <Link className="text-link" to={'/' + lang + '/app/collections'}>
              {t('labels.viewAll')}
              <ArrowRight size={14} />
            </Link>
          </div>
          {(data?.dueToday || []).map((row) => (
            <div className="due-row" key={row.id}>
              <span className="avatar">
                {row.customer
                  .split(' ')
                  .map((x) => x[0])
                  .join('')}
              </span>
              <span className="due-main">
                <b>{row.customer}</b>
                <small>
                  {row.item} · {shortDate(row.due, lang === 'ur' ? 'ur-IN' : 'en-IN')}
                </small>
              </span>
              <span className="due-amount">
                <b>{inr(row.amountPaise)}</b>
                <Status status={row.status} />
              </span>
            </div>
          ))}
          <button
            className="button button-soft full-width"
            onClick={() => window.alert(t('workspace.remindersReady'))}
          >
            {' '}
            <Bell size={15} />
            {t('labels.sendReminder')}
          </button>
        </section>
      </div>
      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <h2>{t('labels.recent')}</h2>
            <p>{t('workspace.latestActivity')}</p>
          </div>
          <button className="icon-button" aria-label={t('workspace.more')}>
            <MoreHorizontal />
          </button>
        </div>
        <div className="activity-row">
          <span className="activity-icon">
            <Check size={16} />
          </span>
          <span>
            <b>{t('workspace.paymentRecorded')}</b>
            <small>Ayesha Khan · {t('workspace.minutesAgo', { count: 2 })}</small>
          </span>
          <strong>+{inr(400000)}</strong>
        </div>
        <div className="activity-row">
          <span className="activity-icon">
            <FileText size={16} />
          </span>
          <span>
            <b>{t('workspace.planAccepted')}</b>
            <small>Vikram Shah · {t('workspace.hourAgo')}</small>
          </span>
          <strong>{inr(1200000)}</strong>
        </div>
      </section>
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

function MerchantLayout() {
  const lang = useLang();
  const { t } = useTranslation();
  const session = useQuery({ queryKey: ['merchant-session'], queryFn: authApi.me, retry: false });
  const [collapsed, setCollapsed] = useState(false);
  const [palette, setPalette] = useState(false);
  const merchant = (session.data || {}) as { email?: string; businessName?: string; role?: string };
  const routePart = window.location.pathname.split('/').filter(Boolean).at(-1) || 'overview';
  const breadcrumbTitle = routePart === 'new'
    ? t('labels.createPlan')
    : /^\d+$/.test(routePart)
      ? t('workspace.customerProfile')
      : t(`labels.${routePart === 'app' ? 'overview' : routePart}`);
  const nav = [
    ['overview', t('labels.overview'), LayoutDashboard],
    ['customers', t('labels.customers'), Users],
    ['plans', t('labels.plans'), FileText],
    ['collections', t('labels.collections'), WalletCards],
    ['reports', t('labels.reports'), ArrowUpRight],
    ['settings', t('labels.settings'), Settings],
  ] as const;
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette((v) => !v);
      }
      if (e.key === 'Escape') setPalette(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  if (session.isLoading) return <div className="page-loader"><span className="brand-mark">a</span></div>;
  if (session.isError) return <Navigate to={langPath(lang, '/login')} replace />;
  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="app-sidebar">
        <Link className="app-logo" to={'/' + lang + '/app'}>
          <BrandSymbol />
          <span>amanah pay</span>
        </Link>
        <button className="merchant-switch">
          <span className="merchant-avatar">S</span>
          <span>
            <b>{merchant.businessName || t('workspace.merchantWorkspace')}</b>
            <small>{t('workspace.merchantWorkspace')}</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="side-label">{t('workspace.workspace')}</div>
        <nav className="side-nav">
          {nav.map(([path, label, Icon]) => (
            <NavLink key={path} to={'/' + lang + '/app/' + path} end={path === 'overview'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon">
              <CircleHelp size={17} />
            </span>
            <b>{t('workspace.needHelp')}</b>
            <small>{t('workspace.helpCentre')}</small>
          </div>
        <button className="user-row" title={t('labels.logout')} onClick={() => void authApi.logout().finally(() => window.location.assign('/' + lang + '/login'))}>
            <span className="avatar">AM</span>
            <span>
              <b>{merchant.email || 'Merchant account'}</b>
              <small>{merchant.role || 'Merchant'}</small>
            </span>
            <MoreHorizontal size={16} />
          </button>
        </div>
        <button
          className="collapse-button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={t('workspace.collapseNav')}
        >
          <ChevronLeft size={16} />
        </button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label={t('workspace.openNav')}>
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>{merchant.businessName || t('workspace.merchantWorkspace')}</span>
              <ChevronRight size={13} />
              <b>{breadcrumbTitle}</b>
            </div>
          </div>
          <div className="topbar-right">
            <button className="search-trigger" onClick={() => setPalette(true)}>
              <Search size={15} />
              <span>{t('labels.search')}...</span>
              <kbd>
                <Command size={11} /> K
              </kbd>
            </button>
            <ThemeLanguage />
            <button className="icon-button notification-button" aria-label={t('workspace.notifications')}>
              <Bell size={17} />
              <i />
            </button>
          </div>
        </header>
        <div className="app-content">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="overview" element={<Dashboard />} />
            <Route path="customers" element={<DataPage type="customers" />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="plans" element={<DataPage type="plans" />} />
            <Route path="plans/new" element={<PlanWizard />} />
            <Route path="collections" element={<DataPage type="collections" />} />
            <Route path="payments" element={<DataPage type="payments" />} />
            <Route path="reports" element={<DataPage type="reports" />} />
            <Route path="settings" element={<DataPage type="settings" />} />
          </Routes>
        </div>
      </div>
      {palette && (
        <div className="modal-backdrop" onClick={() => setPalette(false)}>
          <div className="command-modal" onClick={(e) => e.stopPropagation()}>
            <div className="command-input">
              <Search size={18} />
              <input autoFocus placeholder={t('workspace.searchPages')} />
              <kbd>ESC</kbd>
              <button className="icon-button" onClick={() => setPalette(false)} aria-label={t('labels.close')}>
                <X size={16} />
              </button>
            </div>
            {nav.map(([path, label, Icon]) => (
              <Link
                to={'/' + lang + '/app/' + path}
                onClick={() => setPalette(false)}
                className="command-item"
                key={path}
              >
                <Icon size={17} />
                {label}
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
function MarkPaymentModal({
  isOpen,
  onClose,
  plans,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  plans: Array<{ id: string; customer: string; item: string }>;
  onSuccess: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string>('');
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [method, setMethod] = useState<'UPI' | 'BANK_TRANSFER' | 'CASH'>('UPI');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const installmentsQuery = useQuery({
    queryKey: ['plan-installments', selectedPlanId],
    queryFn: () => api.planInstallments(selectedPlanId),
    enabled: Boolean(selectedPlanId),
  });

  useEffect(() => {
    if (installmentsQuery.data && installmentsQuery.data.length > 0) {
      const unpaid = installmentsQuery.data.find((i) => i.status !== 'PAID') || installmentsQuery.data[0];
      setSelectedInstallmentId(String(unpaid.id));
      setAmountRupees(String(unpaid.amountPaise / 100));
    }
  }, [installmentsQuery.data]);

  function handleInstallmentChange(instId: string) {
    setSelectedInstallmentId(instId);
    const inst = installmentsQuery.data?.find((i) => String(i.id) === instId);
    if (inst) {
      setAmountRupees(String(inst.amountPaise / 100));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId || !selectedInstallmentId) {
      setError('Please select a plan and installment');
      return;
    }
    const paise = Math.round(parseFloat(amountRupees || '0') * 100);
    if (isNaN(paise) || paise <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.markInstallmentPaid(selectedPlanId, selectedInstallmentId, {
        amountPaise: paise,
        paymentMethod: method,
        reference: reference || 'OFFLINE-CONFIRMED',
        notes,
      });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['reports-monthly'] });
      await queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
      onSuccess(t('workspace.paymentConfirmedToast', 'Payment confirmed & marked as received!'));
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not record payment');
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="action-modal-backdrop" onClick={onClose}>
      <div className="action-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="action-modal-header">
          <h3>{t('labels.markReceived')}</h3>
          <button className="icon-button" onClick={onClose} aria-label={t('labels.cancel')}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="action-modal-body">
            {error && <p role="alert" className="muted-paragraph" style={{ color: 'var(--overdue)' }}>{error}</p>}
            <label className="field">
              <span>{t('labels.plans')}</span>
              <select
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
                required
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} — {p.item} ({p.customer})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('labels.schedule')} / Installment</span>
              <select
                value={selectedInstallmentId}
                onChange={(e) => handleInstallmentChange(e.target.value)}
                required
              >
                {(installmentsQuery.data || []).map((inst, idx) => (
                  <option key={inst.id} value={inst.id}>
                    Inst. #{idx + 1} ({inst.dueDate}) — {inr(inst.amountPaise)} [{inst.status}]
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t('labels.amount')} (₹)</span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Payment Method</span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'UPI' | 'BANK_TRANSFER' | 'CASH')}
              >
                <option value="UPI">UPI (QR / Direct Transfer)</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT / RTGS</option>
                <option value="CASH">In-person Cash</option>
              </select>
            </label>

            <label className="field">
              <span>{t('labels.utr')}</span>
              <input
                placeholder="e.g. UPI Ref / Bank UTR / Receipt #"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Notes (Optional)</span>
              <input
                placeholder="Verified at store counter"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>
          <div className="action-modal-footer">
            <button type="button" className="button button-outline" onClick={onClose} disabled={busy}>
              {t('labels.cancel')}
            </button>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? t('workspace.saving') : t('labels.markReceived')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NewCustomerModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Customer name is required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.createCustomer({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess(`Customer "${fullName.trim()}" added successfully!`);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add customer');
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="action-modal-backdrop" onClick={onClose}>
      <div className="action-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="action-modal-header">
          <h3>{t('labels.newCustomer')}</h3>
          <button className="icon-button" onClick={onClose} aria-label={t('labels.cancel')}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="action-modal-body">
            {error && <p role="alert" className="muted-paragraph" style={{ color: 'var(--overdue)' }}>{error}</p>}
            <label className="field">
              <span>{t('labels.customerName')} *</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Fatima Zahra"
                required
              />
            </label>
            <label className="field">
              <span>{t('labels.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </label>
            <label className="field">
              <span>{t('labels.phone')}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
          </div>
          <div className="action-modal-footer">
            <button type="button" className="button button-outline" onClick={onClose} disabled={busy}>
              {t('labels.cancel')}
            </button>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? t('workspace.saving') : t('labels.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DataPage({
  type,
}: {
  type: 'customers' | 'plans' | 'collections' | 'payments' | 'reports' | 'settings';
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);

  const customerQuery = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers,
    enabled: type === 'customers' || type === 'collections',
  });
  const planQuery = useQuery({
    queryKey: ['plans'],
    queryFn: api.plans,
    enabled: type === 'plans' || type === 'payments' || type === 'collections',
  });
  const paymentsQuery = useQuery({
    queryKey: ['payments'],
    queryFn: api.payments,
    enabled: type === 'payments',
  });

  const { data: customers = [], isLoading: loadingCustomers } = customerQuery;
  const { data: plans = [], isLoading: loadingPlans } = planQuery;
  const { data: payments = [], isLoading: loadingPayments } = paymentsQuery;

  if (type === 'settings') return <SettingsPage />;
  if (type === 'reports') return <ReportsPage />;

  const titleMap = {
    customers: t('labels.customers'),
    plans: t('labels.plans'),
    collections: t('labels.collections'),
    payments: t('labels.payments'),
  };

  const filteredCustomers = customers.filter(
    (c) =>
      (c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)) &&
      (filter === 'All' || c.status === filter),
  );

  const filteredPlans = plans.filter(
    (p) =>
      (p.item.toLowerCase().includes(query.toLowerCase()) || p.customer.toLowerCase().includes(query.toLowerCase())) &&
      (filter === 'All' || p.status === filter),
  );

  const filteredPayments = payments.filter((p) => {
    const matchesQuery =
      p.customerName.toLowerCase().includes(query.toLowerCase()) ||
      p.itemName.toLowerCase().includes(query.toLowerCase()) ||
      p.reference.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      filter === 'All' ||
      (filter === 'PAID' && p.status === 'PAID') ||
      (filter === 'REPORTED' && p.status === 'REPORTED') ||
      (filter === 'Due soon' && p.status === 'REPORTED');
    return matchesQuery && matchesFilter;
  });

  async function handleApprovePayment(paymentId: number) {
    try {
      await api.confirmPayment(paymentId);
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['reports-monthly'] });
      await queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
      setToast('Payment approved and installment marked as PAID!');
    } catch {
      setToast('Could not approve payment. Please try again.');
    }
  }

  async function handleQuickReminder(planId: number | string, installmentId: number | string) {
    setSendingReminderId(Number(installmentId));
    try {
      const res = await api.sendReminder(planId, installmentId);
      setToast(res.message || 'Payment reminder sent to customer email.');
    } catch {
      setToast('Could not dispatch reminder. Check customer email.');
    } finally {
      setSendingReminderId(null);
    }
  }

  function handleExportCsv() {
    let csv = '';
    let filename = `amanah-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    if (type === 'customers') {
      csv = 'ID,Name,Phone,Active Plans,Paid (INR),Pending (INR),Next Due,Status\n';
      filteredCustomers.forEach((c) => {
        csv += `"${c.id}","${c.name}","${c.phone}",${c.activePlans},${c.paidPaise / 100},${c.pendingPaise / 100},"${c.nextDue || ''}","${c.status}"\n`;
      });
    } else if (type === 'payments') {
      csv = 'ID,Plan ID,Customer,Item,Amount (INR),Method,Status,Reference,Date\n';
      filteredPayments.forEach((p) => {
        csv += `"${p.id}","${p.planId}","${p.customerName}","${p.itemName}",${p.amountPaise / 100},"${p.paymentMethod}","${p.status}","${p.reference}","${p.date}"\n`;
      });
    } else {
      csv = 'ID,Customer,Item,Total (INR),Remaining (INR),Status,Next Due\n';
      filteredPlans.forEach((p) => {
        csv += `"${p.id}","${p.customer}","${p.item}",${p.totalPaise / 100},${p.remainingPaise / 100},"${p.status}","${p.nextDue || ''}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setToast('CSV exported successfully');
  }

  const action =
    type === 'customers' ? (
      <button className="button button-primary" onClick={() => setShowCustomerModal(true)}>
        <Plus size={16} />
        {t('labels.newCustomer')}
      </button>
    ) : type === 'plans' ? (
      <Link className="button button-primary" to={'/' + lang + '/app/plans/new'}>
        <Plus size={16} />
        {t('labels.createPlan')}
      </Link>
    ) : type === 'payments' ? (
      <button className="button button-primary" onClick={() => setShowPaymentModal(true)}>
        <Plus size={16} />
        {t('labels.markReceived')}
      </button>
    ) : (
      <button className="button button-primary" onClick={() => setShowPaymentModal(true)}>
        <Plus size={16} />
        {t('labels.markReceived')}
      </button>
    );

  return (
    <div className="dashboard-page">
      <PageHeading eyebrow={t('labels.demo')} title={titleMap[type]} action={action} />
      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label={t('labels.search')}
            placeholder={`${t('labels.search')} ${titleMap[type].toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-button" onClick={() => setQuery('')} aria-label={t('workspace.clearSearch')}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="filter-pills">
          {(type === 'payments'
            ? [t('labels.all'), 'PAID', 'REPORTED']
            : [t('labels.all'), t('labels.onTrack'), t('labels.dueSoon'), t('labels.overdue')]
          ).map((label, i) => {
            const val = type === 'payments' ? (i === 0 ? 'All' : label) : i === 0 ? 'All' : i === 1 ? 'On track' : i === 2 ? 'Due soon' : 'Overdue';
            return (
              <button
                className={filter === val ? 'active' : ''}
                key={label}
                onClick={() => setFilter(val)}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          className="icon-button export-button"
          onClick={handleExportCsv}
          aria-label={t('labels.export')}
          title="Export CSV"
        >
          <Download size={16} />
        </button>
      </div>

      {type === 'customers' ? (
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>{t('labels.name')}</th>
                <th>{t('labels.activePlans')}</th>
                <th>{t('labels.paidAmount')}</th>
                <th>{t('labels.pendingAmount')}</th>
                <th>{t('labels.next')}</th>
                <th>{t('labels.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loadingCustomers
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="table-skeleton" />
                      </td>
                    </tr>
                  ))
                : filteredCustomers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link className="person-cell" to={'/' + lang + '/app/customers/' + c.id}>
                          <span className="avatar">{initials(c.name)}</span>
                          <span>
                            <b>{c.name}</b>
                            <small>{c.phone}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{c.activePlans}</td>
                      <td>
                        <b>{inr(c.paidPaise)}</b>
                      </td>
                      <td>
                        <b>{inr(c.pendingPaise)}</b>
                      </td>
                      <td>{shortDate(c.nextDue, lang === 'ur' ? 'ur-IN' : 'en-IN')}</td>
                      <td>
                        <Status status={c.status} />
                      </td>
                      <td>
                        <Link
                          to={'/' + lang + '/app/plans/new?name=' + encodeURIComponent(c.name) + '&phone=' + encodeURIComponent(c.phone)}
                          className="button button-outline"
                          style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                        >
                          <Plus size={12} /> Plan
                        </Link>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loadingCustomers && filteredCustomers.length === 0 && <Empty />}
        </div>
      ) : type === 'payments' ? (
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Payment / Ref</th>
                <th>Customer</th>
                <th>Item / Plan</th>
                <th>{t('labels.amount')}</th>
                <th>{t('labels.date')}</th>
                <th>Method</th>
                <th>{t('labels.status')}</th>
              </tr>
            </thead>
            <tbody>
              {loadingPayments
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="table-skeleton" />
                      </td>
                    </tr>
                  ))
                : filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="plan-name">
                          <span className="file-icon">
                            <FileText size={16} />
                          </span>
                          <span>
                            <b>#{p.id}</b>
                            <small>{p.reference || 'No UTR'}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="person-cell">
                          <span className="avatar">{initials(p.customerName)}</span>
                          <span>
                            <b>{p.customerName}</b>
                            <small>{p.customerPhone}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span>
                          <b>{p.itemName}</b>
                          <small>Plan #{p.planId}</small>
                        </span>
                      </td>
                      <td>
                        <b style={{ color: p.status === 'PAID' ? '#059669' : '#d97706' }}>
                          {inr(p.amountPaise)}
                        </b>
                      </td>
                      <td>{p.date}</td>
                      <td>
                        <span className="method-pill">{p.paymentMethod}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {p.status === 'PAID' ? (
                            <span className="status-badge paid">
                              <Check size={12} /> Paid
                            </span>
                          ) : (
                            <>
                              <span className="status-badge reported">
                                <Clock size={12} /> Reported
                              </span>
                              <button
                                className="btn-approve"
                                onClick={() => void handleApprovePayment(p.id)}
                                title="Approve & mark installment as PAID"
                              >
                                <Check size={12} /> Approve
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loadingPayments && filteredPayments.length === 0 && <Empty />}
        </div>
      ) : type === 'collections' ? (
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>{t('labels.plans')}</th>
                <th>{t('labels.pendingAmount')}</th>
                <th>{t('labels.next')}</th>
                <th>{t('labels.status')}</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingCustomers
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={6}>
                        <div className="table-skeleton" />
                      </td>
                    </tr>
                  ))
                : filteredCustomers.map((c) => {
                    const matchedPlan = plans.find((p) => p.customer === c.name);
                    return (
                      <tr key={c.id}>
                        <td>
                          <span className="person-cell">
                            <span className="avatar">{initials(c.name)}</span>
                            <span>
                              <b>{c.name}</b>
                              <small>{c.phone}</small>
                            </span>
                          </span>
                        </td>
                        <td>{matchedPlan ? matchedPlan.item : `${c.activePlans} plans`}</td>
                        <td>
                          <b>{inr(c.pendingPaise)}</b>
                        </td>
                        <td>{shortDate(c.nextDue, lang === 'ur' ? 'ur-IN' : 'en-IN')}</td>
                        <td>
                          <Status status={c.status} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="button button-outline"
                              style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                              onClick={() => setShowPaymentModal(true)}
                            >
                              <Plus size={12} /> Collect
                            </button>
                            {matchedPlan && (
                              <button
                                className="button button-outline"
                                style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                                disabled={sendingReminderId !== null}
                                onClick={async () => {
                                  try {
                                    const insts = await api.planInstallments(matchedPlan.id);
                                    const unpaid = insts.find((i) => i.status !== 'PAID') || insts[0];
                                    if (unpaid) {
                                      await handleQuickReminder(matchedPlan.id, unpaid.id);
                                    } else {
                                      setToast('All installments for this plan are already paid');
                                    }
                                  } catch {
                                    setToast('Could not send reminder');
                                  }
                                }}
                              >
                                <Send size={12} /> Remind
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!loadingCustomers && filteredCustomers.length === 0 && <Empty />}
        </div>
      ) : (
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>{t('labels.plans')}</th>
                <th>{t('labels.customer')}</th>
                <th>{t('labels.total')}</th>
                <th>{t('labels.pendingAmount')}</th>
                <th>{t('labels.next')}</th>
                <th>{t('labels.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loadingPlans
                ? Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}>
                      <td colSpan={7}>
                        <div className="table-skeleton" />
                      </td>
                    </tr>
                  ))
                : filteredPlans.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="plan-name">
                          <span className="file-icon">
                            <FileText size={16} />
                          </span>
                          <span>
                            <b>{p.item}</b>
                            <small>#{p.id}</small>
                          </span>
                        </span>
                      </td>
                      <td>{p.customer}</td>
                      <td>
                        <b>{inr(p.totalPaise)}</b>
                      </td>
                      <td>
                        <b>{inr(p.remainingPaise)}</b>
                      </td>
                      <td>{shortDate(p.nextDue, lang === 'ur' ? 'ur-IN' : 'en-IN')}</td>
                      <td>
                        <Status status={p.status} />
                      </td>
                      <td>
                        <button
                          className="button button-outline"
                          style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                          onClick={() => setShowPaymentModal(true)}
                        >
                          <Plus size={12} /> Collect
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loadingPlans && filteredPlans.length === 0 && <Empty />}
        </div>
      )}

      {type === 'collections' && (
        <div className="aging-grid">
          {[
            [t('workspace.days1to7'), '₹ 12,400'],
            [t('workspace.days8to30'), '₹ 5,200'],
            [t('workspace.days31to60'), '₹ 2,100'],
            [t('workspace.days60plus'), '₹ 0'],
          ].map(([x, y]) => (
            <div className="aging-card" key={x}>
              <small>{t('labels.overdue')} · {x}</small>
              <b>{y}</b>
            </div>
          ))}
        </div>
      )}

      <MarkPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        plans={plans}
        onSuccess={(msg) => setToast(msg)}
      />

      <NewCustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSuccess={(msg) => setToast(msg)}
      />

      {toast && <Toast text={toast} close={() => setToast('')} />}
    </div>
  );
}
function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
function Empty() {
  const { t } = useTranslation();
  return (
    <div className="empty-state">
      <span className="empty-illustration">
        <Search size={22} />
      </span>
      <h3>{t('labels.empty')}</h3>
      <p>{t('labels.emptyBody')}</p>
    </div>
  );
}
function Toast({ text, close }: { text: string; close: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="toast" role="status">
      <Check size={16} />
      {text}
      <button onClick={close} aria-label={t('labels.close')}>
        <X size={15} />
      </button>
    </div>
  );
}

function CustomerDetail() {
  const { t } = useTranslation();
  const { id = 'c1' } = useParams();
  const lang = useLang();
  const { data = [] } = useQuery({ queryKey: ['customers'], queryFn: api.customers });
  const customer = data.find((c) => c.id === id) || data[0];
  if (!customer) return <Empty />;
  return (
    <div className="dashboard-page">
      <Link className="back-link" to={'/' + lang + '/app/customers'}>
        <ArrowLeft size={15} />
        {t('labels.customers')}
      </Link>
      <div className="customer-profile panel">
        <span className="avatar avatar-large">{initials(customer.name)}</span>
        <div className="customer-profile-main">
          <span className="eyebrow">{t('workspace.customerProfile')}</span>
          <h1>{customer.name}</h1>
          <p>
            {customer.phone} · <Status status={customer.status} />
          </p>
        </div>
        <div className="profile-actions">
          <button className="button button-outline">
            <Bell size={15} />
            {t('labels.sendReminder')}
          </button>
          <button className="button button-primary">
            <Plus size={16} />
            {t('labels.createPlan')}
          </button>
        </div>
      </div>
      <div className="stat-grid three-stats">
        <div className="stat-card">
          <span>{t('labels.activePlans')}</span>
          <strong>{customer.activePlans}</strong>
          <small>{t('workspace.currentlyActive')}</small>
        </div>
        <div className="stat-card stat-paid">
          <span>{t('labels.paidAmount')}</span>
          <strong>{inr(customer.paidPaise)}</strong>
          <small>{t('workspace.acrossPlans')}</small>
        </div>
        <div className="stat-card">
          <span>{t('labels.pendingAmount')}</span>
          <strong>{inr(customer.pendingPaise)}</strong>
          <small>{t('workspace.nextDue', { date: shortDate(customer.nextDue, lang === 'ur' ? 'ur-IN' : 'en-IN') })}</small>
        </div>
      </div>
      <div className="profile-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{t('labels.plans')}</h2>
              <p>{t('workspace.plansProgress')}</p>
            </div>
            <button className="icon-button">
              <MoreHorizontal />
            </button>
          </div>
          <div className="plan-detail-card">
            <div className="plan-detail-top">
              <span className="file-icon">
                <FileText size={17} />
              </span>
              <span>
                <b>{t('home.sampleItem')}</b>
                <small>{t('workspace.started', { date: lang === 'ur' ? '1 اگست 2026' : '01 Aug 2026' })}</small>
              </span>
              <Status status={customer.status} />
            </div>
            <div className="progress-track">
              <span style={{ width: '68%' }} />
            </div>
            <div className="plan-detail-bottom">
              <span>
                {t('workspace.paid')} <b>{inr(customer.paidPaise)}</b>
              </span>
              <span>
                {t('workspace.remaining')} <b>{inr(customer.pendingPaise)}</b>
              </span>
            </div>
          </div>
          <div className="panel-subheading">{t('labels.schedule')}</div>
          {[0, 1, 2, 3].map((i) => (
            <div className="timeline-row" key={i}>
              <span className={`timeline-dot ${i < 2 ? 'is-paid' : i === 2 ? 'is-due' : ''}`}>
                {i < 2 ? <Check size={10} /> : <Circle size={8} />}
              </span>
              <span>
                  <b>{t('home.installment', { number: i + 1 })}</b>
                <small>
                  {shortDate(['2026-08-08', '2026-09-08', '2026-10-08', '2026-11-08'][i], lang === 'ur' ? 'ur-IN' : 'en-IN')}
                </small>
              </span>
              <strong>{inr(400000)}</strong>
              <Status status={i < 2 ? 'Paid' : i === 2 ? 'Due' : 'Upcoming'} />
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
          <h2>{t('workspace.customerNotes')}</h2>
              <p>{t('workspace.privateTeam')}</p>
            </div>
            <button
              className="button button-small button-outline"
              onClick={() => window.alert(t('workspace.noteEditor'))}
            >
              {t('workspace.addNote')}
            </button>
          </div>
          <div className="note-card">
            <span className="tag-chip">{t('workspace.knownCustomer')}</span>
            <p>{t('workspace.reminderPreference')}</p>
            <small>{t('workspace.addedBy')}</small>
          </div>
          <div className="panel-subheading">{t('workspace.recentPayments')}</div>
          {[0, 1].map((i) => (
            <div className="activity-row" key={i}>
              <span className="activity-icon">
                <Check size={15} />
              </span>
              <span>
                <b>{inr(400000)}</b>
                <small>UPI · {i ? '08 Sep' : '08 Oct'} 2026</small>
              </span>
              <Status status="Paid" />
            </div>
          ))}
          <div className="panel-subheading">{t('workspace.reminderHistory')}</div>
          <p className="muted-paragraph">{t('workspace.lastReminder')}</p>
        </section>
      </div>
    </div>
  );
}

function PlanWizard() {
  const { t } = useTranslation();
  const lang = useLang();
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState('');
  const [price, setPrice] = useState('16000');
  const [down, setDown] = useState('4000');
  const [count, setCount] = useState(3);
  const [first, setFirst] = useState('2026-11-30');
  const [searchParams] = useSearchParams();
  const [customerName, setCustomerName] = useState(searchParams.get('name') || '');
  const [customerEmail, setCustomerEmail] = useState(searchParams.get('email') || '');
  const [customerPhone, setCustomerPhone] = useState(searchParams.get('phone') || '');
  const [itemName, setItemName] = useState('');
  const [offerLink, setOfferLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const schedule = useMemo(
    () =>
      illustrativeSchedule(
        Math.round(Number(price || 0) * 100),
        Math.round(Number(down || 0) * 100),
        count,
        first,
      ),
    [price, down, count, first],
  );
  return (
    <div className="dashboard-page wizard-page">
      <Link className="back-link" to={'/' + lang + '/app/plans'}>
        <ArrowLeft size={15} />
        {t('labels.plans')}
      </Link>
      <PageHeading eyebrow={t('content.threeSteps')} title={t('labels.createPlan')} />
      <div className="wizard-steps">
        {[t('wizard.stepCustomer'), t('wizard.stepTerms'), t('wizard.stepReview')].map((label, i) => (
          <div className={i === step ? 'current' : i < step ? 'complete' : ''} key={label}>
            <span>{i < step ? <Check size={13} /> : i + 1}</span>
            {label}
          </div>
        ))}
      </div>
      <div className="wizard-layout">
        <section className="panel wizard-form">
          <h2>{[t('wizard.chooseCustomer'), t('wizard.setTerms'), t('wizard.reviewPlan')][step]}</h2>
          <p className="muted-paragraph">
            {
              [
                t('wizard.chooseCustomerBody'),
                t('wizard.setTermsBody'),
                t('wizard.reviewPlanBody'),
              ][step]
            }
          </p>
          {step === 0 ? (
            <>
              <label className="field"><span>{t('labels.customerName')}</span><input autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label>
              <label className="field"><span>{t('wizard.customerEmailLabel')}</span><input type="email" autoComplete="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required /></label>
              <label className="field"><span>{t('wizard.phoneOptional')}</span><input type="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></label>
            </>
          ) : step === 1 ? (
            <div className="form-grid">
              <label className="field full-field">
                <span>{t('labels.item')}</span>
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} required placeholder={t('wizard.itemPlaceholder')} />
              </label>
              <label className="field">
                <span>{t('labels.price')} (₹)</span>
                <input
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{t('labels.downPayment')} (₹)</span>
                <input inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} />
              </label>
              <label className="field">
                <span>{t('labels.months')}</span>
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
                  {[2, 3, 4, 6, 9, 12, 18, 24].map((n) => (
                    <option key={n} value={n}>{t('calculator.monthsOption', { count: n })}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('labels.firstDate')}</span>
                <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
              </label>
              <div className="fixed-price-note">
                <ShieldCheck size={16} />
                <span>{t('wizard.fixedNote')}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="review-summary">
                <span>{t('labels.customer')}</span>
                <b>{customerName || 'Customer'}</b>
                <span>{t('merchantAuth.email')}</span>
                <b>{customerEmail || '—'}</b>
                <span>{t('labels.item')}</span>
                <b>{itemName || '—'}</b>
                <span>{t('labels.total')}</span>
                <b>{inr(Number(price || 0) * 100)}</b>
                <span>{t('labels.downPayment')}</span>
                <b>{inr(Number(down || 0) * 100)}</b>
              </div>
              <label className="field">
                {t('wizard.shareOffer')}
                {offerLink ? <><OfferQr value={offerLink} /><input readOnly value={offerLink} aria-label={t('customer.offerLink')} /><div className="share-row"><button className="button button-outline" onClick={() => void navigator.clipboard.writeText(offerLink).then(() => setToast(t('wizard.copied')))}>{t('wizard.copyLink')}</button><a className="button button-outline" href={`https://wa.me/?text=${encodeURIComponent(t('wizard.shareText', { offerLink }))}`} target="_blank" rel="noreferrer">{t('wizard.shareWhatsApp')}</a></div><small>{t('wizard.linkExpiry')}</small></> : <p className="muted-paragraph">{t('wizard.createPlanFirst')}</p>}
              </label>
            </>
          )}
          {formError && <p role="alert" className="muted-paragraph">{formError}</p>}
          <div className="wizard-actions">
            {step > 0 && (
              <button className="button button-outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={15} />
                {t('labels.back')}
              </button>
            )}
            <button
              className="button button-primary"
              disabled={saving || (step === 2 && Boolean(offerLink))}
              onClick={async () => {
                setFormError('');
                if (step < 2) { setStep(step + 1); return; }
                setSaving(true);
                try { const offer = await api.createOffer({ customerName, customerEmail, phone: customerPhone || undefined, itemName, totalPricePaise: Math.round(Number(price) * 100), downPaymentPaise: Math.round(Number(down) * 100), installmentCount: count, firstDueDate: first }); setOfferLink(offer.shareUrl); void navigator.clipboard?.writeText(offer.shareUrl).then(() => setToast(t('wizard.createdCopied'))); }
                catch { setFormError(t('wizard.createError')); }
                finally { setSaving(false); }
              }}
            >
              {saving ? t('wizard.creating') : offerLink ? t('wizard.linkReady') : step < 2 ? t('labels.continue') : t('wizard.createShare')}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <aside className="panel schedule-preview">
          <span className="eyebrow">{t('labels.illustrative')}</span>
          <div className="preview-total">
            <small>{t('labels.total')}</small>
            <strong>{inr(Number(price || 0) * 100)}</strong>
            <p>{t('wizard.includesToday', { amount: inr(Number(down || 0) * 100) })}</p>
          </div>
          <h3>{t('labels.schedule')}</h3>
          {schedule.map((row) => (
            <div className="preview-row" key={row.number}>
              <span className="timeline-dot is-upcoming">
                <Circle size={8} />
              </span>
              <span>
                <b>{t('home.installment', { number: row.number })}</b>
                <small>{shortDate(row.date, lang === 'ur' ? 'ur-IN' : 'en-IN')}</small>
              </span>
              <strong>{inr(row.amountPaise)}</strong>
            </div>
          ))}
          <small className="preview-caption">
            {t('calculator.illustrativeOnly')}
          </small>
        </aside>
      </div>
      {toast && <Toast text={toast} close={() => setToast('')} />}
    </div>
  );
}

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('businessProfile');
  const settingsQuery = useQuery({ queryKey: ['merchant-settings'], queryFn: api.merchantSettings });
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [remindDaysBefore, setRemindDaysBefore] = useState(3);
  const [methods, setMethods] = useState<string[]>(['UPI', 'BANK_TRANSFER', 'CASH']);
  const [defaultLanguage, setDefaultLanguage] = useState('en');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffRole, setStaffRole] = useState('CLERK');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  useEffect(() => {
    if (settingsQuery.data) {
      setBusinessName(settingsQuery.data.businessName || '');
      setUpiId(settingsQuery.data.upiId || '');
      setContactPhone(settingsQuery.data.contactPhone || '');
      setRemindDaysBefore(settingsQuery.data.remindDaysBefore ?? 3);
      if (settingsQuery.data.acceptedPaymentMethods) {
        setMethods(settingsQuery.data.acceptedPaymentMethods.split(',').map((s) => s.trim()));
      }
      if (settingsQuery.data.defaultLanguage) {
        setDefaultLanguage(settingsQuery.data.defaultLanguage);
      }
    }
  }, [settingsQuery.data]);

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const saved = await api.saveMerchantSettings({
        businessName,
        upiId,
        contactPhone,
        remindDaysBefore,
        acceptedPaymentMethods: methods.join(','),
        defaultLanguage,
      });
      setBusinessName(saved.businessName);
      setUpiId(saved.upiId);
      setContactPhone(saved.contactPhone);
      setSettingsMessage(t('workspace.settingsSaved', 'Settings updated successfully!'));
    } catch {
      setSettingsMessage(t('workspace.settingsSaveError', 'Could not save settings'));
    } finally {
      setSavingSettings(false);
    }
  }

  function handleMethodToggle(method: string) {
    setMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  }

  function switchInterfaceLanguage(newLang: 'en' | 'ur') {
    setDefaultLanguage(newLang);
    void i18n.changeLanguage(newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ur' ? 'rtl' : 'ltr';
    const parts = location.pathname.split('/');
    if (parts[1] === 'en' || parts[1] === 'ur') {
      parts[1] = newLang;
      navigate(parts.join('/'), { replace: true });
    }
  }

  return (
    <div className="dashboard-page">
      <PageHeading eyebrow={t('merchantAuth.eyebrow')} title={t('labels.settings')} />
      <div className="settings-tabs">
        {[
          ['businessProfile', 'workspace.businessProfile'],
          ['payments', 'labels.payments'],
          ['lateFeePolicy', 'workspace.lateFeePolicy'],
          ['reminders', 'workspace.reminders'],
          ['staffRoles', 'workspace.staffRoles'],
          ['language', 'labels.language'],
          ['dataPrivacy', 'workspace.dataPrivacy'],
        ].map((x) => (
          <button className={tab === x[0] ? 'active' : ''} onClick={() => setTab(x[0])} key={x[0]}>
            {t(x[1])}
          </button>
        ))}
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>{tab === 'businessProfile' ? t('workspace.businessProfile') : tab === 'payments' ? t('labels.payments') : tab === 'reminders' ? t('workspace.reminders') : tab === 'staffRoles' ? t('workspace.staffRoles') : tab === 'language' ? t('labels.language') : tab}</h2>
            <p>{t('workspace.settingsDescription')}</p>
          </div>
        </div>

        {tab === 'businessProfile' ? (
          <div className="form-grid">
            <label className="field">
              <span>{t('workspace.businessName')}</span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </label>
            <label className="field">
              <span>
                {t('workspace.gstin')} <small>{t('workspace.optional')}</small>
              </span>
              <input placeholder={t('workspace.enterGstin')} />
            </label>
            <label className="field">
              <span>{t('workspace.upiVpa')}</span>
              <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="business@bank" />
            </label>
            <label className="field">
              <span>{t('workspace.contactNumber')}</span>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>
            {settingsQuery.isLoading && <p className="muted-paragraph">{t('workspace.loadingBusiness')}</p>}
            {settingsQuery.isError && <p role="alert" className="muted-paragraph">{t('workspace.settingsLoadError')}</p>}
            <button
              className="button button-primary"
              disabled={savingSettings || settingsQuery.isLoading}
              onClick={() => void handleSaveSettings()}
            >
              {savingSettings ? t('workspace.saving') : t('workspace.saveButton')}
            </button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'payments' ? (
          <div className="form-grid" style={{ maxWidth: '640px' }}>
            <p className="muted-paragraph" style={{ gridColumn: '1 / -1' }}>
              Select payment methods accepted from your customers for installment settlement:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={methods.includes('UPI')}
                  onChange={() => handleMethodToggle('UPI')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <b>UPI Payments (Recommended)</b>
                  <p className="muted-paragraph" style={{ margin: '2px 0 0' }}>
                    Dynamic scannable QR codes & direct VPA transfers via PhonePe, Google Pay, Paytm, BHIM.
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={methods.includes('BANK_TRANSFER')}
                  onChange={() => handleMethodToggle('BANK_TRANSFER')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <b>Direct Bank Transfer (IMPS / NEFT / RTGS)</b>
                  <p className="muted-paragraph" style={{ margin: '2px 0 0' }}>
                    Allow customers to transfer to your designated current account and input transaction UTR.
                  </p>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={methods.includes('CASH')}
                  onChange={() => handleMethodToggle('CASH')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <b>In-person Cash Collection</b>
                  <p className="muted-paragraph" style={{ margin: '2px 0 0' }}>
                    Accept physical cash at your retail store counter and mark installment as received.
                  </p>
                </div>
              </label>
            </div>

            <button
              className="button button-primary"
              disabled={savingSettings || settingsQuery.isLoading}
              onClick={() => void handleSaveSettings()}
              style={{ marginTop: '10px' }}
            >
              {savingSettings ? t('workspace.saving') : t('workspace.saveButton')}
            </button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'reminders' ? (
          <div className="form-grid" style={{ maxWidth: '640px' }}>
            <p className="muted-paragraph" style={{ gridColumn: '1 / -1' }}>
              Configure automatic installment reminder schedule for customers:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', gridColumn: '1 / -1' }}>
              {[
                [3, '3 days before due date (Standard practice)'],
                [1, '1 day before due date'],
                [0, 'On the installment due date'],
              ].map(([days, desc]) => (
                <label key={days} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="remindSchedule"
                    checked={remindDaysBefore === days}
                    onChange={() => setRemindDaysBefore(Number(days))}
                  />
                  <span>{desc}</span>
                </label>
              ))}
            </div>

            <div className="policy-card" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
              <div>
                <b>Ethical Shariah Reminder Invariant</b>
                <p>
                  Reminders are strictly polite notifications sent via email. No punitive language, no threats, and zero late fees or compounding interest are ever added.
                </p>
              </div>
              <ShieldCheck size={24} style={{ color: '#059669' }} />
            </div>

            <button
              className="button button-primary"
              disabled={savingSettings || settingsQuery.isLoading}
              onClick={() => void handleSaveSettings()}
              style={{ marginTop: '10px' }}
            >
              {savingSettings ? t('workspace.saving') : t('workspace.saveButton')}
            </button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'staffRoles' ? (
          <div className="form-grid" style={{ maxWidth: '640px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <h3>Current Access & Permissions</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--surface2)', borderRadius: '10px', marginTop: '8px' }}>
                <div>
                  <b>Active Session</b>
                  <p className="muted-paragraph" style={{ margin: '2px 0 0' }}>Role: Merchant OWNER (Full Access)</p>
                </div>
                <span className="status-badge paid"><Check size={12} /> Active</span>
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
              <h3>Invite Team Member</h3>
              <p className="muted-paragraph">Grant store clerks or accountants access to view plans and mark received payments.</p>
            </div>

            <label className="field">
              <span>Staff Email Address</span>
              <input
                type="email"
                placeholder="clerk@yourstore.com"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Assigned Role</span>
              <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)}>
                <option value="CLERK">Store Clerk (Can mark received payments)</option>
                <option value="ACCOUNTANT">Accountant (Read-only reports & CSV exports)</option>
              </select>
            </label>

            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                if (!staffEmail) return;
                setSettingsMessage(`Invitation sent to ${staffEmail} as ${staffRole}!`);
                setStaffEmail('');
              }}
            >
              <Send size={15} /> Send Staff Invite
            </button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'language' ? (
          <div className="form-grid" style={{ maxWidth: '640px' }}>
            <p className="muted-paragraph" style={{ gridColumn: '1 / -1' }}>
              Select your preferred default dashboard interface language:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <input
                  type="radio"
                  name="defaultLang"
                  checked={defaultLanguage === 'en'}
                  onChange={() => switchInterfaceLanguage('en')}
                />
                <div>
                  <b>English (LTR)</b>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>Left-to-right layout with standard financial terminology</small>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '10px' }}>
                <input
                  type="radio"
                  name="defaultLang"
                  checked={defaultLanguage === 'ur'}
                  onChange={() => switchInterfaceLanguage('ur')}
                />
                <div>
                  <b>اردو (Urdu - RTL)</b>
                  <small style={{ display: 'block', color: 'var(--muted)' }}>دائیں سے بائیں (Right-to-left) ترتیب اور اردو ترجمہ</small>
                </div>
              </label>
            </div>

            <button
              className="button button-primary"
              disabled={savingSettings || settingsQuery.isLoading}
              onClick={() => void handleSaveSettings()}
              style={{ marginTop: '10px' }}
            >
              {savingSettings ? t('workspace.saving') : t('workspace.saveButton')}
            </button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'lateFeePolicy' ? (
          <div className="policy-card">
            <div>
              <b>{t('workspace.lateFeesOff')}</b>
              <p>{t('workspace.lateDisclosure')}</p>
            </div>
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span />
            </label>
            <div className="verify-badge">{t('labels.verify')}</div>
          </div>
        ) : (
          <div className="settings-placeholder">
            <ShieldCheck size={20} />
            <span>Strict end-to-end data privacy with TLS 1.3 encryption and zero third-party telemetry.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportsPage() {
  const { t } = useTranslation();
  const summaryQuery = useQuery({ queryKey: ['reports-summary'], queryFn: api.reportsSummary });
  const monthlyQuery = useQuery({ queryKey: ['reports-monthly'], queryFn: api.reportsMonthly });
  const plansQuery = useQuery({ queryKey: ['plans'], queryFn: api.plans });
  const paymentsQuery = useQuery({ queryKey: ['payments'], queryFn: api.payments });

  const summary = summaryQuery.data || {
    collectedPaise: 0,
    paymentCount: 0,
    pendingPaise: 0,
    pendingPlansCount: 0,
    overduePaise: 0,
    overdueCustomersCount: 0,
    activePlansCount: 0,
    completedPlansCount: 0,
    completionRate: 100,
  };

  const chartData = (monthlyQuery.data && monthlyQuery.data.length > 0)
    ? monthlyQuery.data.map((d) => ({
        month: d.monthLabel || d.month,
        collected: d.collected,
        pending: d.pending,
      }))
    : [
        { month: 'Jun', collected: 0, pending: 0 },
        { month: 'Jul', collected: 0, pending: 0 },
        { month: 'Aug', collected: 0, pending: 0 },
        { month: 'Sep', collected: 0, pending: 0 },
        { month: 'Oct', collected: 0, pending: 0 },
      ];

  function handleExportReport() {
    const plans = plansQuery.data || [];
    const payments = paymentsQuery.data || [];
    let csv = '=== AMANAHPAY FINANCIAL REPORT ===\n';
    csv += `Exported At,${new Date().toISOString()}\n`;
    csv += `Total Collected (INR),${summary.collectedPaise / 100}\n`;
    csv += `Total Pending (INR),${summary.pendingPaise / 100}\n`;
    csv += `Total Overdue (INR),${summary.overduePaise / 100}\n`;
    csv += `Plan Completion Rate,${summary.completionRate}%\n\n`;

    csv += '--- PLANS ---\n';
    csv += 'ID,Customer,Item,Total (INR),Remaining (INR),Status,Next Due\n';
    plans.forEach((p) => {
      csv += `"${p.id}","${p.customer}","${p.item}",${p.totalPaise / 100},${p.remainingPaise / 100},"${p.status}","${p.nextDue || ''}"\n`;
    });

    csv += '\n--- PAYMENTS ---\n';
    csv += 'ID,Plan ID,Customer,Item,Amount (INR),Method,Status,Reference,Date\n';
    payments.forEach((p) => {
      csv += `"${p.id}","${p.planId}","${p.customerName}","${p.itemName}",${p.amountPaise / 100},"${p.paymentMethod}","${p.status}","${p.reference}","${p.date}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `amanah-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={t('labels.demo')}
        title={t('labels.reports')}
        action={
          <button className="button button-outline" onClick={handleExportReport}>
            <Download size={15} />
            {t('labels.export')}
          </button>
        }
      />
      <div className="stat-grid three-stats">
        <div className="stat-card stat-paid">
          <span>{t('labels.collected')}</span>
          <strong>{inr(summary.collectedPaise)}</strong>
          <small>{summary.paymentCount} payments collected</small>
        </div>
        <div className="stat-card">
          <span>{t('labels.pending')}</span>
          <strong>{inr(summary.pendingPaise)}</strong>
          <small>Across {summary.pendingPlansCount} pending plans</small>
        </div>
        <div className="stat-card stat-overdue">
          <span>{t('labels.overdue')}</span>
          <strong>{inr(summary.overduePaise)}</strong>
          <small>Across {summary.overdueCustomersCount} customers</small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('workspace.collectionsByMonth')}</h2>
              <p>{t('workspace.collectedVsPending')}</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="collected" stroke="var(--accent-icon)" fill="var(--mint)" />
                <Area type="monotone" dataKey="pending" stroke="var(--upcoming)" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <h2>{t('workspace.planCompletion')}</h2>
          <div className="completion-number">{summary.completionRate}%</div>
          <div className="progress-track">
            <span style={{ width: `${summary.completionRate}%` }} />
          </div>
          <p className="muted-paragraph">
            {summary.completedPlansCount} of {summary.completedPlansCount + summary.activePlansCount} plans fully settled.
          </p>
        </section>
      </div>
    </div>
  );
}

function AdminPage() {
  const { t } = useTranslation();
  return (
    <div className="public-page admin-page">
      <PageHeading eyebrow={t('admin.eyebrow')} title={t('admin.title')} />
      <div className="stat-grid three-stats">
        <div className="stat-card">
          <span>{t('admin.activeMerchants')}</span>
          <strong>128</strong>
          <small>+{t('admin.thisMonth', { count: 9 })}</small>
        </div>
        <div className="stat-card">
          <span>{t('admin.plansTracked')}</span>
          <strong>4,820</strong>
          <small>{t('admin.allMerchants')}</small>
        </div>
        <div className="stat-card">
          <span>{t('admin.platformFees')}</span>
          <strong>{inr(3860000)}</strong>
          <small>{t('admin.merchantBilled')}</small>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{t('admin.merchants')}</h2>
            <p>{t('admin.manage')}</p>
          </div>
          <div className="search-field">
            <Search size={15} />
            <input placeholder={t('labels.search')} />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t('admin.business')}</th>
              <th>{t('admin.plans')}</th>
              <th>{t('admin.feeStatus')}</th>
              <th>{t('admin.account')}</th>
              <th>{t('admin.action')}</th>
            </tr>
          </thead>
          <tbody>
            {['Sunday Home', 'Naya Furnishings', 'Zara Electronics'].map((x, i) => (
              <tr key={x}>
                <td>
                  <b>{x}</b>
                </td>
                <td>{[42, 18, 31][i]}</td>
                <td>
                  <Status status="On track" />
                </td>
                <td>{t('admin.active')}</td>
                <td>
                  <button className="button button-small button-outline">{t('admin.viewAccount')}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function OfferQr({ value, purpose = 'offer' }: { value: string; purpose?: 'offer' | 'payment' }) {
  const { t } = useTranslation();
  const [image, setImage] = useState('');
  useEffect(() => {
    let active = true;
    void import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(value, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B1F18', light: '#ffffff' },
    })).then((url) => { if (active) setImage(url); });
    return () => { active = false; };
  }, [value]);
  return (
    <div className="offer-qr">
      {image ? <img src={image} alt={t(purpose === 'payment' ? 'qr.paymentAlt' : 'qr.offerAlt')} /> : <span className="muted-paragraph">{t('qr.preparing')}</span>}
      <small>{t(purpose === 'payment' ? 'qr.paymentHint' : 'qr.offerHint')}</small>
    </div>
  );
}

function CustomerAccessStart() {
  const lang = useLang();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const [offerLink, setOfferLink] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<'choose' | 'login' | 'signup'>('choose');
  const [authStep, setAuthStep] = useState<'details' | 'verify'>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [needsFullName, setNeedsFullName] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => scannerRef.current?.stop(), []);

  function openOffer(value: string) {
    const pathToken = value.trim().match(/(?:^|\/)customer\/([A-Za-z0-9_-]{20,})(?:[/?#]|$)/)?.[1];
    const rawToken = /^[A-Za-z0-9_-]{20,}$/.test(value.trim()) ? value.trim() : undefined;
    const token = pathToken || rawToken;
    if (!token) {
      setError(t('access.invalidQr'));
      return;
    }
    scannerRef.current?.stop();
    setScanning(false);
    navigate(`/${lang}/customer/${token}`);
  }

  function continueToOffer(e: React.FormEvent) {
    e.preventDefault();
    openOffer(offerLink);
  }

  async function startScan() {
    setError('');
    scannerRef.current?.stop();
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (!videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      scannerRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) openOffer(result.getText());
      });
    } catch {
      setScanning(false);
      setError(t('access.cameraDenied'));
    }
  }

  async function submitCustomerAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (authStep === 'details') {
        const result = mode === 'login'
          ? await customerApi.requestLogin(email)
          : await customerApi.signupRequest(fullName, email);
        setMaskedEmail(result.email ?? email);
        setAuthStep('verify');
        setNotice('Check your inbox and spam folder for the one-time code.');
      } else {
        if (mode === 'login') await customerApi.verifyLogin(email, signupCode, needsFullName ? fullName : undefined);
        else await customerApi.verifySignup(email, signupCode);
        navigate(`/${lang}/customer/account`, { replace: true });
      }
    } catch (err) {
      if (mode === 'login' && authStep === 'verify' && err instanceof Error &&
          (err.message.toLowerCase().includes('full name') || err.message.includes('(409)'))) {
        setNeedsFullName(true);
        setError(t('access.addName'));
        return;
      }
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      setError(errorMessage.includes('429') || errorMessage.includes('too many')
        ? t('access.rateLimit')
        : authStep === 'verify'
          ? t('access.verifyFailed')
          : mode === 'login'
            ? t('access.startFailed')
            : t('access.createFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function resendCustomerCode() {
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const result = mode === 'login'
        ? await customerApi.requestLogin(email)
        : await customerApi.signupRequest(fullName, email);
      setMaskedEmail(result.email ?? email);
      setSignupCode('');
      setNotice('Check your inbox and spam folder for the one-time code.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message.toLowerCase() : '';
      setError(errorMessage.includes('429') || errorMessage.includes('too many') ? t('access.rateLimit') : t('access.resendFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <section className="panel auth-card customer-access-card">
        <span className="auth-symbol"><BrandSymbol /></span>
        {mode === 'choose' ? (
          <>
            <span className="eyebrow">{t('customer.accountEyebrow')}</span>
            <h1>{t('access.welcome')}</h1>
            <p className="muted-paragraph">{t('access.welcomeBody')}</p>
            <div className="customer-access-choice-actions">
              <button className="button button-primary full-width" type="button" onClick={() => { setMode('login'); setAuthStep('details'); setNeedsFullName(false); setError(''); }}>{t('access.loginChoice')} <ArrowRight size={15} /></button>
              <button className="button button-outline full-width" type="button" onClick={() => { setMode('signup'); setAuthStep('details'); setNeedsFullName(false); setError(''); }}>{t('access.createChoice')} <ArrowRight size={15} /></button>
            </div>
            <div className="customer-access-note">
              <b>{t('access.newHere')}</b>
              <span>{t('access.createHere')}</span>
            </div>
          </>
        ) : (
          <>
            <button className="text-link customer-access-back" type="button" onClick={() => { setMode('choose'); setAuthStep('details'); setNeedsFullName(false); setError(''); }}>← {t('access.back')}</button>
            <span className="eyebrow">{t(mode === 'login' ? 'access.loginEyebrow' : 'access.signupEyebrow')}</span>
            <h1>{authStep === 'verify' ? t('access.verifyTitle') : t(mode === 'login' ? 'access.loginTitle' : 'access.signupTitle')}</h1>
            <p className="muted-paragraph">
              {authStep === 'verify'
                ? t('access.verifyInstruction', { email: maskedEmail })
                : mode === 'login'
                  ? t('access.loginBody')
                  : t('access.signupBody')}
            </p>
            <form onSubmit={submitCustomerAccount}>
              {mode === 'signup' && authStep === 'details' && (
                <label className="field"><span>{t('access.fullName')}</span><input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={180} /></label>
              )}
              {authStep === 'verify' ? (
                <>
                  <label className="field"><span>{t(mode === 'login' ? 'access.loginCode' : 'access.signupCode')}</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={signupCode} onChange={(e) => setSignupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
                  {mode === 'login' && needsFullName && <label className="field"><span>{t('access.fullName')}</span><input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={180} /></label>}
                </>
              ) : (
                <label className="field"><span>{t('access.email')}</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
              )}
              {error && <p role="alert" className="muted-paragraph">{error}</p>}
              {notice && <p role="status" className="muted-paragraph">{t('access.checkInbox')}</p>}
              <button className="button button-primary full-width" type="submit" disabled={busy}>
                {busy ? t('access.wait') : authStep === 'verify' ? mode === 'login' ? needsFullName ? t('access.completeAccount') : t('access.verifyContinue') : t('access.verifyCreate') : mode === 'login' ? t('access.sendLoginCode') : t('access.sendSignupCode')} <ArrowRight size={15} />
              </button>
            </form>
            {authStep === 'verify' && <button className="text-link" type="button" onClick={() => void resendCustomerCode()} disabled={busy}>{t('access.resend')}</button>}
            <button className="text-link" type="button" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setAuthStep('details'); setNeedsFullName(false); setError(''); }}>
              {t(mode === 'login' ? 'access.switchSignup' : 'access.switchLogin')}
            </button>
            <details className="customer-link-fallback">
              <summary>{t('access.offerFallback')}</summary>
              <p className="muted-paragraph">{t('access.offerFallbackBody')}</p>
              <button className="button button-outline full-width" type="button" onClick={() => void startScan()} disabled={scanning}>
                {scanning ? t('access.cameraScanning') : t('access.scanOffer')} <ArrowRight size={15} />
              </button>
              <div className={`customer-qr-scanner${scanning ? ' is-active' : ''}`}>
                <video ref={videoRef} muted playsInline />
                {scanning && <button className="text-link" type="button" onClick={() => { scannerRef.current?.stop(); scannerRef.current = null; setScanning(false); }}>{t('customer.stopCamera')}</button>}
              </div>
              <form onSubmit={continueToOffer}>
                <label className="field"><span>{t('access.securePlanLink')}</span><input autoComplete="url" inputMode="url" placeholder={t('access.pasteMerchantLink')} value={offerLink} onChange={(e) => { setOfferLink(e.target.value); setError(''); }} required /></label>
                <button className="button button-outline full-width" type="submit">{t('access.continueLink')} <ArrowRight size={15} /></button>
              </form>
            </details>
          </>
        )}
        <Link className="text-link" to={`/${lang}/merchants`}>{t('access.merchantLink')}</Link>
      </section>
    </div>
  );
}

function CustomerAccount() {
  const lang = useLang();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState<Record<number, boolean>>({});
  const [showQr, setShowQr] = useState<Record<number, boolean>>({});
  const [reported, setReported] = useState<Record<number, boolean>>({});
  const [busyPlan, setBusyPlan] = useState<number | null>(null);
  const [error, setError] = useState('');
  const plansQuery = useQuery({ queryKey: ['customer-account-plans'], queryFn: customerApi.accountPlans, retry: false });
  const plans = plansQuery.data || [];

  async function acceptPlan(planId: number) {
    setBusyPlan(planId);
    setError('');
    try { await customerApi.acceptAccountPlan(planId); await plansQuery.refetch(); }
    catch { setError(t('customer.acceptError')); }
    finally { setBusyPlan(null); }
  }

  async function reportPayment(planId: number) {
    setBusyPlan(planId);
    setError('');
    try { await customerApi.reportAccountPayment(planId, 'Customer self-reported payment'); setReported((value) => ({ ...value, [planId]: true })); }
    catch { setError(t('customer.paymentError')); }
    finally { setBusyPlan(null); }
  }

  function signOut() {
    customerApi.logout();
    navigate(`/${lang}/customer-access`, { replace: true });
  }

  return (
    <div className="customer-portal customer-account-page">
      <div className="portal-topbar"><div className="portal-brand"><BrandLockup /></div><ThemeLanguage /></div>
      <div className="portal-card panel customer-account-card">
        <div className="customer-account-heading">
          <div><span className="eyebrow">{t('customer.accountEyebrow')}</span><h1>{t('customer.plansTitle')}</h1></div>
          <button className="text-link" type="button" onClick={signOut}>{t('customer.logOut')}</button>
        </div>
        {plansQuery.isLoading ? <p className="muted-paragraph">{t('customer.loadingPlans')}</p> : plansQuery.isError ? (
          <><p role="alert" className="muted-paragraph">{t('customer.sessionExpired')}</p><Link className="button button-primary full-width" to={`/${lang}/customer-access`}>{t('customer.customerLogin')}</Link></>
        ) : plans.length === 0 ? (
          <div className="customer-account-empty"><h2>{t('customer.noPlansTitle')}</h2><p className="muted-paragraph">{t('customer.noPlansBody')}</p><Link className="button button-outline full-width" to={`/${lang}/customer/open-offer`}>{t('customer.openOffer')}</Link></div>
        ) : (
          <div className="customer-account-plans">
            {plans.map((plan) => (
              <article className="customer-account-plan" key={plan.id}>
                <div className="merchant-profile">
                  <span className="merchant-avatar">{initials(plan.merchantName)}</span>
                  <span><b>{plan.merchantName}</b><small>{plan.itemName}</small></span>
                  <span className={`tag-chip ${plan.status === 'ACTIVE' ? 'tag-active' : ''}`}>{plan.status === 'ACTIVE' ? t('customer.active') : t('customer.awaitingDecision')}</span>
                </div>
                <div className="portal-total"><small>{t('customer.fixedTotal')}</small><strong>{inr(plan.totalPricePaise)}</strong></div>
                <div className="customer-account-schedule">
                  {plan.installments.map((row, index) => <div className="preview-row" key={row.id}><span>{index + 1}. {shortDate(row.dueDate, lang === 'ur' ? 'ur-IN' : 'en-IN')} <small>{t(`labels.${row.status.toLowerCase()}`)}</small></span><strong>{inr(row.amount_paise)}</strong></div>)}
                </div>
                {plan.status === 'PENDING' ? (
                  <>
                    <label className="consent-check"><input type="checkbox" checked={Boolean(accepted[plan.id])} onChange={(e) => setAccepted((value) => ({ ...value, [plan.id]: e.target.checked }))} /><span>{t('customer.acceptConsent')}</span></label>
                    <button className="button button-primary full-width" type="button" disabled={!accepted[plan.id] || busyPlan === plan.id} onClick={() => void acceptPlan(plan.id)}>{busyPlan === plan.id ? t('customer.saving') : t('customer.acceptPlan')} <ArrowRight size={15} /></button>
                  </>
                ) : (
                  <>
                    {plan.upiLink ? <><a className="button button-primary full-width" href={plan.upiLink}>{t('customer.payWithUpi')} <ArrowUpRight size={15} /></a><button className="button button-outline full-width" type="button" onClick={() => setShowQr((value) => ({ ...value, [plan.id]: !value[plan.id] }))}>{showQr[plan.id] ? t('customer.hideQr') : t('customer.payByQr')}</button>{showQr[plan.id] && <OfferQr value={plan.upiLink} purpose="payment" />}</> : <p className="muted-paragraph">{t('customer.askForPayment', { merchant: plan.merchantName })}</p>}
                    {reported[plan.id] ? <p role="status" className="muted-paragraph">{t('customer.paymentReported')}</p> : <button className="button button-outline full-width" type="button" disabled={busyPlan === plan.id} onClick={() => void reportPayment(plan.id)}>{t('customer.ivePaid')}</button>}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        {error && <p role="alert" className="muted-paragraph">{error}</p>}
      </div>
      <div className="portal-foot">{t('customer.directPayments')} · <Link to={`/${lang}/legal/privacy`}>{t('customer.privacy')}</Link></div>
    </div>
  );
}

function CustomerOfferOpen() {
  const lang = useLang();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const [offerLink, setOfferLink] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => () => scannerRef.current?.stop(), []);

  function openOffer(value: string) {
    const pathToken = value.trim().match(/(?:^|\/)customer\/([A-Za-z0-9_-]{20,})(?:[/?#]|$)/)?.[1];
    const rawToken = /^[A-Za-z0-9_-]{20,}$/.test(value.trim()) ? value.trim() : undefined;
    const token = pathToken || rawToken;
    if (!token) {
      setError(t('customer.invalidLink'));
      return;
    }
    scannerRef.current?.stop();
    scannerRef.current = null;
    navigate(`/${lang}/customer/${token}`);
  }

  async function startScan() {
    setError('');
    setScanning(true);
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      if (!videoRef.current) return;
      const reader = new BrowserMultiFormatReader();
      scannerRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) openOffer(result.getText());
      });
    } catch {
      setScanning(false);
      setError(t('customer.cameraUnavailable'));
    }
  }

  function submitLink(event: React.FormEvent) {
    event.preventDefault();
    openOffer(offerLink);
  }

  return (
    <div className="customer-portal">
      <div className="portal-topbar"><div className="portal-brand"><BrandLockup /></div><ThemeLanguage /></div>
      <section className="portal-card panel customer-offer-open-card">
        <Link className="text-link" to={`/${lang}/customer/account`}>← {t('customer.backToPlans')}</Link>
        <span className="eyebrow">{t('customer.accountEyebrow')}</span>
        <h1>{t('customer.openTitle')}</h1>
        <p className="muted-paragraph">{t('customer.openBody')}</p>
        <button className="button button-outline full-width" type="button" onClick={() => void startScan()} disabled={scanning}>
          {scanning ? t('customer.scanning') : t('customer.scanQr')} <ArrowRight size={15} />
        </button>
        <div className={`customer-qr-scanner${scanning ? ' is-active' : ''}`}>
          <video ref={videoRef} muted playsInline />
          {scanning && <button className="text-link" type="button" onClick={() => { scannerRef.current?.stop(); scannerRef.current = null; setScanning(false); }}>{t('customer.stopCamera')}</button>}
        </div>
        <div className="offer-open-divider"><span>{t('customer.or')}</span></div>
        <form onSubmit={submitLink}>
          <label className="field"><span>{t('customer.offerLink')}</span><input autoComplete="url" inputMode="url" placeholder={t('customer.offerLinkPlaceholder')} value={offerLink} onChange={(event) => { setOfferLink(event.target.value); setError(''); }} required /></label>
          {error && <p role="alert" className="muted-paragraph">{error}</p>}
          <button className="button button-primary full-width" type="submit">{t('customer.continueOffer')} <ArrowRight size={15} /></button>
        </form>
        <p className="muted-paragraph offer-open-security">{t('customer.privateOffer')}</p>
      </section>
      <div className="portal-foot">{t('customer.directPayments')} · <Link to={`/${lang}/legal/privacy`}>{t('customer.privacy')}</Link></div>
    </div>
  );
}

function CustomerPortal() {
  const { t } = useTranslation();
  const { token = '' } = useParams();
  const [view, setView] = useState<'loading' | 'verify' | 'offer' | 'accepted' | 'error'>('loading');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [code, setCode] = useState('');
  const [plan, setPlan] = useState<CustomerOffer | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reported, setReported] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [accountSession, setAccountSession] = useState(() => customerApi.hasCustomerSession());
  useEffect(() => {
    let active = true;
    if (customerApi.hasCustomerSession()) {
      setAccountSession(true);
      customerApi.accountOffer(token)
        .then((offer) => { if (active) { setPlan(offer); setView(offer.status === 'ACTIVE' ? 'accepted' : 'offer'); } })
        .catch((err: unknown) => { if (active) { setError(err instanceof Error && err.message.includes('(403)') ? t('customer.offerMismatch') : t('customer.offerExpired')); setView('error'); } });
    } else {
      customerApi.requestOtp(token).then((result) => { if (active) { setMaskedEmail(result.email); setView('verify'); } }).catch(() => { if (active) { setError(t('customer.offerExpired')); setView('error'); } });
    }
    return () => { active = false; };
  }, [token]);
  async function verifyCustomer(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await customerApi.verify(token, code); setPlan(result.plan); setView(result.plan.status === 'ACTIVE' ? 'accepted' : 'offer'); }
    catch { setError(t('access.verifyFailed')); }
    finally { setBusy(false); }
  }
  async function acceptOffer() {
    setBusy(true); setError('');
    try {
      const result = accountSession && plan
        ? await customerApi.acceptAccountPlan(plan.id)
        : await customerApi.accept();
      setPlan(result.plan); setView('accepted');
    }
    catch { setError(t('customer.acceptError')); }
    finally { setBusy(false); }
  }
  async function downloadAgreement() {
    try { const blob = accountSession && plan ? await customerApi.accountAgreement(plan.id) : await customerApi.agreement(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'amanah-plan-agreement.txt'; link.click(); URL.revokeObjectURL(url); }
    catch { setError(t('customer.offerLoadError')); }
  }
  return (
    <div className="customer-portal">
      <div className="portal-topbar"><div className="portal-brand"><BrandLockup /></div><ThemeLanguage /></div>
      <div className="portal-card panel">
        {view === 'loading' ? (
          <><span className="eyebrow">{t('customer.offerEyebrow')}</span><h1>{t('customer.loadingOffer')}</h1><p className="muted-paragraph">{accountSession ? t('customer.checkingAccount') : t('customer.checkingLink')}</p></>
        ) : view === 'error' ? (
          <><span className="eyebrow">{t('customer.offerEyebrow')}</span><h1>{t('customer.offerErrorTitle')}</h1><p role="alert" className="muted-paragraph">{error}</p><Link to={'/' + (location.pathname.split('/')[1] || 'en')} className="button button-outline full-width">{t('customer.backHome')}</Link></>
        ) : view === 'verify' ? (
          <>
            <span className="eyebrow">{t('customer.privateEyebrow')}</span>
            <h1>{t('customer.verifyEmail')}</h1>
            <p className="muted-paragraph">{t('customer.codeSent', { email: maskedEmail })}</p>
            <form onSubmit={verifyCustomer}>
              <label className="field"><span>{t('customer.emailCode')}</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
              {error && <p role="alert" className="muted-paragraph">{error}</p>}
              <button className="button button-primary full-width" disabled={busy}>{busy ? t('customer.verifying') : t('customer.viewOffer')}</button>
            </form>
          </>
        ) : view === 'offer' && plan ? (
          <>
            <div className="merchant-profile">
              <span className="merchant-avatar">{initials(plan.merchantName)}</span>
              <span>
                <b>{plan.merchantName}</b>
                <small>{t('customer.purchaseOffer')}</small>
              </span>
            </div>
            <h1>{t('customer.reviewOffer')}</h1>
            <p className="muted-paragraph">{plan.itemName}</p>
            <div className="portal-total">
              <small>{t('customer.fixedTotal')}</small>
              <strong>{inr(plan.totalPricePaise)}</strong>
            </div>
            {plan.downPaymentPaise > 0 && <div className="portal-line"><span>{t('labels.downPayment')}</span><b>{inr(plan.downPaymentPaise)}</b></div>}
            <h3>{t('labels.schedule')}</h3>
            {plan.installments.map((row, i) => (
              <div className="preview-row" key={row.id}>
                <span>{i + 1}. {shortDate(row.dueDate, location.pathname.startsWith('/ur/') ? 'ur-IN' : 'en-IN')} <small>{t(`labels.${row.status.toLowerCase()}`)}</small></span>
                <strong>{inr(row.amount_paise)}</strong>
              </div>
            ))}
            <p className="muted-paragraph">{t('customer.noInterest')}</p>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>{t('customer.acceptOfferConsent')}</span>
            </label>
            <button
              className="button button-primary full-width"
              disabled={!checked || busy}
              onClick={() => void acceptOffer()}
            >
              {busy ? t('customer.saving') : t('customer.acceptOffer')}
            </button>
            {error && <p role="alert" className="muted-paragraph">{error}</p>}
          </>
        ) : (
          <>
            <span className="paid-big">
              <Check size={24} />
            </span>
            <h1>{t('customer.accepted')}</h1>
            <p className="muted-paragraph">{t('customer.acceptedBody', { merchant: plan?.merchantName })}</p>
            {plan?.upiLink ? (
              <div className="upi-qr-box">
                <span className="qr-sub">{t('workspace.nextInstallmentDue', 'Installment Amount Due')}</span>
                <span className="qr-amount">
                  {inr(
                    plan.nextDuePaise ||
                    (plan.installments && plan.installments.find((i) => i.status !== 'PAID')?.amount_paise) ||
                    plan.totalPricePaise
                  )}
                </span>
                <OfferQr value={plan.upiLink} purpose="payment" />
                {plan.upiId ? (
                  <div className="upi-copy-row">
                    <span>UPI ID: <code>{plan.upiId}</code></span>
                    <button
                      type="button"
                      className="button button-outline"
                      style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                      onClick={() => {
                        void navigator.clipboard.writeText(plan.upiId || '');
                        setCopiedUpi(true);
                        setTimeout(() => setCopiedUpi(false), 2500);
                      }}
                    >
                      {copiedUpi ? <Check size={13} /> : <Copy size={13} />}
                      {copiedUpi ? 'Copied!' : 'Copy UPI ID'}
                    </button>
                  </div>
                ) : null}
                <a className="button button-primary full-width" href={plan.upiLink}>
                  {t('customer.payWithUpi')} <ArrowUpRight size={15} />
                </a>
              </div>
            ) : <p className="muted-paragraph">{t('customer.askForPayment', { merchant: plan?.merchantName })}</p>}
            {reported ? <p role="status" className="muted-paragraph">{t('customer.paymentMarked')}</p> : <button className="button button-outline full-width" onClick={async () => { try { const result = accountSession && plan ? await customerApi.reportAccountPayment(plan.id, 'Customer self-reported payment') : await customerApi.reportPayment('Customer self-reported payment'); setReported(true); setError(result.message); } catch { setError(t('customer.reportPaymentError')); } }}>{t('customer.ivePaid')}</button>}
            <button className="text-link portal-agreement" onClick={() => void downloadAgreement()}>{t('customer.agreement')}</button>
            {accountSession && <Link className="button button-outline full-width" to={`/${location.pathname.split('/')[1] || 'en'}/customer/account`}>{t('customer.backToPlans')}</Link>}
            {error && <p role="status" className="muted-paragraph">{error}</p>}
            <p className="portal-support">{t('customer.supportQuestion')} <a href="mailto:afnan@ghpcl.com">{t('customer.contactSupport')}</a></p>
          </>
        )}
      </div>
      <div className="portal-foot">
        {t('customer.directPayments')} · <Link to={`/${location.pathname.split('/')[1] || 'en'}/legal/privacy`}>{t('customer.privacy')}</Link>
      </div>
    </div>
  );
}

function Calculator() {
  const { t } = useTranslation();
  const lang = useLang();
  const [price, setPrice] = useState('16000');
  const [down, setDown] = useState('4000');
  const [count, setCount] = useState(3);
  const [first, setFirst] = useState('2026-11-30');
  const schedule = useMemo(
    () =>
      illustrativeSchedule(
        Math.round(Number(price || 0) * 100),
        Math.round(Number(down || 0) * 100),
        count,
        first,
      ),
    [price, down, count, first],
  );
  return (
    <section className="calculator-section public-page">
      <div className="calculator-intro">
        <span className="eyebrow">{t('labels.calculator')}</span>
        <h1>{t('labels.calculateTitle')}</h1>
        <p>{t('labels.calculateBody')}</p>
        <span className="illustrative-tag">
          <ShieldCheck size={14} />
          {t('labels.illustrative')}
        </span>
      </div>
      <div className="calculator-card panel">
        <div className="calc-form">
          <label className="field">
            <span>{t('labels.price')}</span>
            <div className="money-input">
              <span>₹</span>
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>{t('labels.downPayment')}</span>
            <div className="money-input">
              <span>₹</span>
              <input inputMode="decimal" value={down} onChange={(e) => setDown(e.target.value)} />
            </div>
          </label>
          <label className="field">
            <span>{t('labels.months')}</span>
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[2, 3, 4, 6, 9, 12, 18, 24].map((n) => (
                <option key={n} value={n}>
                  {t('calculator.monthsOption', { count: n })}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('labels.firstDate')}</span>
            <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
          </label>
          <div className="fixed-price-note">
            <Check size={16} />
            <span>{t('calculator.fixedPriceNote')}</span>
          </div>
        </div>
        <div className="calc-result">
          <div className="calc-result-head">
            <span>{t('labels.totalSchedule')}</span>
            <strong>{inr(Number(price || 0) * 100)}</strong>
          </div>
          <div className="preview-row">
            <span>{t('calculator.todayDown')}</span>
            <strong>{inr(Number(down || 0) * 100)}</strong>
          </div>
          {schedule.map((row) => (
            <div className="preview-row" key={row.number}>
              <span>
                {shortDate(row.date, lang === 'ur' ? 'ur-IN' : 'en-IN')} · {t('home.installment', { number: row.number })}
              </span>
              <strong>{inr(row.amountPaise)}</strong>
            </div>
          ))}
          <small className="preview-caption">
            {t('calculator.illustrativeOnly')}
          </small>
        </div>
      </div>
    </section>
  );
}

function ContentPage({
  type,
}: {
  type: 'how' | 'merchants' | 'pricing' | 'approach' | 'faq' | 'about';
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [faq, setFaq] = useState(-1);
  const titles = {
    how: t('sections.how'),
    merchants: t('content.merchantTitle'),
    pricing: t('sections.pricing'),
    approach: t('labels.trustTitle'),
    faq: t('sections.faq'),
    about: t('content.aboutTitle'),
  };
  const body = {
    how: t('sections.howBody'),
    merchants:
      t('content.merchantBody'),
    pricing: t('sections.pricingBody'),
    approach: t('labels.trustBody'),
    faq: t('content.faqIntro'),
    about: t('content.aboutBody'),
  };
  if (type === 'faq')
    return (
      <section className="public-page content-page">
        <span className="eyebrow">{t('content.help')}</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="faq-search search-field">
          <Search size={16} />
          <input placeholder={t('content.searchQuestions')} />
        </div>
        <div className="faq-list">
          {[
            t('labels.faqQ'),
            t('content.faqWho'),
            t('content.faqDates'),
            t('content.faqLate'),
            t('content.faqData'),
          ].map((q, i) => (
            <div className="faq-item" key={q}>
              <button aria-expanded={faq === i} onClick={() => setFaq(faq === i ? -1 : i)}>
                <span>{q}</span>
                {faq === i ? <X size={17} /> : <Plus size={17} />}
              </button>
              {faq === i && (
                <p>
                  {i === 0
                    ? t('labels.faqA')
                    : [
                        t('content.faqDirectBody'),
                        t('content.faqScheduleBody'),
                        t('content.faqLateBody'),
                        t('content.faqDataBody'),
                      ][i - 1]}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>
    );
  if (type === 'pricing')
    return (
      <section className="public-page content-page centered-content">
        <span className="eyebrow">{t('content.pricing')}</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="pricing-card panel">
          <span className="pricing-icon">
            <WalletCards size={20} />
          </span>
          <h2>{t('content.oneFee')}</h2>
          <p>
            {t('content.feeDetails')}
          </p>
          <div className="price-placeholder">{t('content.feeOnboarding')}</div>
          <div className="feature-line">
            <Check size={15} />
            {t('content.noCustomerFees')}
          </div>
          <div className="feature-line">
            <Check size={15} />
            {t('content.freePlan')}
          </div>
          <Link to={langPath(lang, '/contact')} className="button button-primary full-width">
            {t('content.talkToTeam')} <ArrowRight size={15} />
          </Link>
        </div>
        <div className="verify-badge">{t('labels.verify')}</div>
      </section>
    );
  if (type === 'approach')
    return (
      <section className="public-page content-page">
        <span className="eyebrow">{t('content.approach')}</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="approach-grid">
          {[
            [
              t('content.fixedClear'),
              t('content.fixedClearBody'),
            ],
            [
              t('content.paidToMerchant'),
              t('content.paidToMerchantBody'),
            ],
            [
              t('content.merchantPaid'),
              t('content.merchantPaidBody'),
            ],
            [
              t('content.dataMatters'),
              t('content.dataBody'),
            ],
          ].map(([a, b]) => (
            <article className="approach-card" key={a}>
              <span className="approach-check">
                <Check size={16} />
              </span>
              <h3>{a}</h3>
              <p>{b}</p>
            </article>
          ))}
        </div>
        <div className="adviser-panel">
          <span className="verify-badge">{t('labels.verify')}</span>
          <p>
            {t('content.reviewRequired')}
          </p>
        </div>
      </section>
    );
  return (
    <section className="public-page content-page">
      <div className="content-hero">
        <div>
          <span className="eyebrow">{type === 'how' ? t('content.threeSteps') : t('content.forMerchants')}</span>
          <h1>{titles[type]}</h1>
          <p className="lead">{body[type]}</p>
          <Link to={langPath(lang, type === 'how' ? '/calculator' : '/signup')} className="button button-primary">
            {type === 'how' ? t('hero.cta') : t('nav.start')}
            <ArrowRight size={15} />
          </Link>
        </div>
        <PhoneMockup compact />
      </div>
      <div className="steps-grid">
        {[
          [t(type === 'how' ? 'customerSteps.one' : 'steps.one'), t(type === 'how' ? 'customerSteps.oneBody' : 'steps.oneBody')],
          [t(type === 'how' ? 'customerSteps.two' : 'steps.two'), t(type === 'how' ? 'customerSteps.twoBody' : 'steps.twoBody')],
          [t(type === 'how' ? 'customerSteps.three' : 'steps.three'), t(type === 'how' ? 'customerSteps.threeBody' : 'steps.threeBody')],
        ].map(([a, b], i) => (
          <article className="step-card" key={a}>
            <span className="step-number">0{i + 1}</span>
            <h3>{a}</h3>
            <p>{b}</p>
          </article>
        ))}
      </div>
      <div className="lifecycle">
        <span>{t('content.offer')}</span>
        <ArrowRight />
        <span>{t('content.accepted')}</span>
        <ArrowRight />
        <span>{t('content.active')}</span>
        <ArrowRight />
        <span>{t('content.closed')}</span>
      </div>
      <div className="feature-grid">
        {[
          [t('content.customerRecords'), t('content.customerRecordsBody')],
          [t('content.schedule'), t('content.scheduleBody')],
          [t('content.reminders'), t('content.remindersBody')],
          [t('content.merchantControl'), t('content.merchantControlBody')],
          [t('content.upi'), t('content.upiBody')],
          [t('content.reports'), t('content.reportsBody')],
        ].map(([a, b]) => (
          <article className="feature-card" key={a}>
            <span className="feature-icon">
              <Check size={16} />
            </span>
            <h3>{a}</h3>
            <p>{b}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  const { t } = useTranslation();
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    message: z.string().min(10),
  });
  type Form = z.infer<typeof schema>;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });
  const [sent, setSent] = useState(false);
  return (
    <section className="public-page contact-page">
      <div>
        <span className="eyebrow">{t('labels.contactUs')}</span>
        <h1>{t('content.contactTitle')}</h1>
        <p className="lead">{t('content.contactBody')}</p>
        <div className="contact-detail">
          <span className="contact-icon">
            <CircleHelp size={18} />
          </span>
          <span>
            <b>{t('content.merchantSupport')}</b>
            <small>{t('content.replyEmail')}</small>
          </span>
        </div>
      </div>
      <form className="panel contact-form" onSubmit={handleSubmit(() => setSent(true))}>
        <label className="field">
          <span>{t('content.yourName')}</span>
          <input {...register('name')} placeholder={t('content.yourName')} />
          {errors.name && <small className="field-error">{t('content.validName')}</small>}
        </label>
        <label className="field">
          <span>{t('labels.email')}</span>
          <input {...register('email')} type="email" placeholder="you@business.com" />
          {errors.email && <small className="field-error">{t('content.validEmail')}</small>}
        </label>
        <label className="field">
          <span>{t('labels.message')}</span>
          <textarea
            {...register('message')}
            rows={4}
            placeholder={t('content.messagePlaceholder')}
          />
          {errors.message && (
            <small className="field-error">{t('content.moreDetail')}</small>
          )}
        </label>
        <button className="button button-primary full-width" type="submit">
          {sent ? t('labels.success') : t('labels.submit')}
          <ArrowRight size={15} />
        </button>
        <small className="muted-paragraph">
          {t('content.demoContact')}
        </small>
      </form>
    </section>
  );
}

function AuthPage({ signup = false }: { signup?: boolean }) {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (!sent) { if (signup) await authApi.signup(email, businessName); else await authApi.requestLogin(email); setSent(true); }
      else { await authApi.verify(email, code, signup ? 'SIGNUP' : 'LOGIN'); navigate(`/${lang}/app`, { replace: true }); }
    } catch { setError(sent ? t('merchantAuth.invalidCode') : t('merchantAuth.signInFailed')); }
    finally { setBusy(false); }
  }
  return (
    <div className="auth-wrap">
      <form
        className="panel auth-card"
        onSubmit={submit}
      >
        <span className="auth-symbol">
          <BrandSymbol />
        </span>
        <span className="eyebrow">{t('merchantAuth.eyebrow')}</span>
        <h1>
          {sent ? t('merchantAuth.verifyCode') : signup ? t('merchantAuth.startTitle') : t('merchantAuth.welcome')}
        </h1>
        <p className="muted-paragraph">
          {sent
            ? t('merchantAuth.codeToEmail', { email })
            : signup
              ? t('merchantAuth.createBody')
              : t('merchantAuth.signInBody')}
        </p>
        {!sent ? (
          <>
            {signup && <label className="field"><span>{t('merchantAuth.businessName')}</span><input autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></label>}
            <label className="field"><span>{t('merchantAuth.email')}</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('merchantAuth.emailPlaceholder')} required /></label>
          </>
        ) : (
          <label className="field"><span>{t('merchantAuth.codeLabel')}</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
        )}
        {error && <p role="alert" className="muted-paragraph">{error}</p>}
        <button className="button button-primary full-width" type="submit" disabled={busy}>
          {busy ? t('merchantAuth.wait') : sent ? t('labels.continue') : t('merchantAuth.sendCode')}
        </button>
        <small className="auth-legal">
          {t('merchantAuth.agree')} <Link to={'/' + lang + '/legal/terms'}>{t('merchantAuth.terms')}</Link>{' '}
          <Link to={'/' + lang + '/legal/privacy'}>{t('merchantAuth.privacy')}</Link>.
        </small>
        <Link className={`auth-switch-link ${signup ? 'auth-switch-signin' : 'auth-switch-create'}`} to={'/' + lang + (signup ? '/login' : '/signup')}>
          {signup ? t('merchantAuth.alreadyRegistered') : t('merchantAuth.newMerchant')}
        </Link>
        {import.meta.env.VITE_USE_MOCKS === 'true' && (
          <span className="mock-caption">Demo flow · OTP is simulated</span>
        )}
      </form>
    </div>
  );
}

function LegalPage() {
  const { slug = 'terms' } = useParams();
  const { t } = useTranslation();
  const titles: Record<string, string> = {
    terms: t('legal.terms'),
    privacy: t('legal.privacy'),
    dpdp: t('legal.dpdp'),
    grievance: t('legal.grievance'),
    cookies: t('legal.cookies'),
  };
  return (
    <section className="public-page legal-page">
      <span className="eyebrow">{t('legal.information')}</span>
      <h1>{titles[slug] || t('legal.information')}</h1>
      <div className="legal-panel panel">
        <p>{t('legal.placeholder')}</p>
        <h2>{t('legal.serviceTitle')}</h2>
        <p>{t('legal.serviceBody')}</p>
        <h2>{t('legal.customerTitle')}</h2>
        <p>{t('legal.customerBody')}</p>
        <h2>{t('legal.contactTitle')}</h2>
        <p>{t('legal.contactBody')} <a href="mailto:afnan@ghpcl.com">afnan@ghpcl.com</a>. {t('legal.grievanceDraft')}</p>
        <span className="verify-badge">{t('legal.draftBadge')}</span>
      </div>
    </section>
  );
}

function NotFound() {
  const { t } = useTranslation();
  const lang = useLang();
  return (
    <section className="public-page not-found">
      <span className="not-found-art">404</span>
      <h1>{t('labels.notFound')}</h1>
      <Link className="button button-primary" to={'/' + lang}>
        {t('labels.backHome')}
        <ArrowRight size={15} />
      </Link>
    </section>
  );
}
