import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
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
  Command,
  Download,
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
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
  const { i18n } = useTranslation();
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
      'A calmer way for Indian merchants to offer and track clear fixed-price payment plans.',
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
    window.location.assign(`${parts.join('/')}${location.search}`);
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
              Customer log in / sign up
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
          <h4>Product</h4>
          <Link to={langPath(lang, '/how-it-works')}>{t('nav.how')}</Link>
          <Link to={langPath(lang, '/merchants')}>{t('nav.merchants')}</Link>
          <Link to={langPath(lang, '/pricing')}>{t('nav.pricing')}</Link>
          <Link to={langPath(lang, '/calculator')}>{t('labels.calculator')}</Link>
        </div>
        <div>
          <h4>Company</h4>
          <Link to={langPath(lang, '/about')}>About</Link>
          <Link to={langPath(lang, '/contact')}>{t('nav.contact')}</Link>
          <Link to={langPath(lang, '/faq')}>{t('nav.faq')}</Link>
        </div>
        <div>
          <h4>Information</h4>
          <Link to={langPath(lang, '/legal/terms')}>{t('labels.terms')}</Link>
          <Link to={langPath(lang, '/legal/privacy')}>{t('labels.privacy')}</Link>
          <Link to={langPath(lang, '/legal/dpdp')}>DPDP notice</Link>
          <Link to={langPath(lang, '/legal/grievance')}>{t('labels.grievance')}</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Amanah Pay</span>
        <span>India · INR · UPI</span>
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
  const chart = [
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
        <h2>Couldn't load this view</h2>
        <button className="button button-outline" onClick={() => void refetch()}>
          Try again
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
            <small>{i === 0 ? '+12.8% from last month' : 'Across active plans'}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>{t('labels.collected')}</h2>
              <p>Collection trend · last 5 months</p>
            </div>
            <button className="select-button">
              {t('labels.month')} <ChevronDown size={14} />
            </button>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-dot green" />
              Collected
            </span>
            <span>
              <i className="legend-dot gray" />
              Pending
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
              <p>31 October 2026</p>
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
                  {row.item} · {shortDate(row.due)}
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
            onClick={() => window.alert('Reminder queued in demo mode')}
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
            <p>Latest activity across your plans</p>
          </div>
          <button className="icon-button" aria-label="More">
            <MoreHorizontal />
          </button>
        </div>
        <div className="activity-row">
          <span className="activity-icon">
            <Check size={16} />
          </span>
          <span>
            <b>Payment recorded</b>
            <small>Ayesha Khan · 2 minutes ago</small>
          </span>
          <strong>+{inr(400000)}</strong>
        </div>
        <div className="activity-row">
          <span className="activity-icon">
            <FileText size={16} />
          </span>
          <span>
            <b>New plan accepted</b>
            <small>Vikram Shah · 1 hour ago</small>
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
            <b>{merchant.businessName || 'Merchant workspace'}</b>
            <small>Merchant workspace</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="side-label">WORKSPACE</div>
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
            <b>Need a hand?</b>
            <small>Visit the help centre</small>
          </div>
        <button className="user-row" title="Sign out" onClick={() => void authApi.logout().finally(() => window.location.assign('/' + lang + '/login'))}>
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
          aria-label="Collapse navigation"
        >
          <ChevronLeft size={16} />
        </button>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" aria-label="Open menu">
              <Menu size={19} />
            </button>
            <div className="breadcrumbs">
              <span>Sunday Home</span>
              <ChevronRight size={13} />
              <b>{locationTitle()}</b>
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
            <button className="icon-button notification-button" aria-label="Notifications">
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
              <input autoFocus placeholder="Search pages, customers, plans..." />
              <kbd>ESC</kbd>
              <button className="icon-button" onClick={() => setPalette(false)} aria-label="Close">
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
function locationTitle() {
  const part = window.location.pathname.split('/').filter(Boolean).at(-1) || 'overview';
  return part === 'app'
    ? 'Overview'
    : part === 'new'
      ? 'Create a plan'
      : part.charAt(0).toUpperCase() + part.slice(1);
}

function DataPage({
  type,
}: {
  type: 'customers' | 'plans' | 'collections' | 'payments' | 'reports' | 'settings';
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState('');
  const customerQuery = useQuery({
    queryKey: ['customers'],
    queryFn: api.customers,
    enabled: type === 'customers' || type === 'collections',
  });
  const planQuery = useQuery({
    queryKey: ['plans'],
    queryFn: api.plans,
    enabled: type === 'plans' || type === 'payments',
  });
  const { data: customers = [], isLoading: loadingCustomers } = customerQuery;
  const { data: plans = [], isLoading: loadingPlans } = planQuery;
  const filtered = customers.filter(
    (c) =>
      (c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)) &&
      (filter === 'All' || c.status === filter),
  );
  if (type === 'settings') return <SettingsPage />;
  if (type === 'reports') return <ReportsPage />;
  const titleMap = {
    customers: t('labels.customers'),
    plans: t('labels.plans'),
    collections: t('labels.collections'),
    payments: t('labels.payments'),
  };
  const isCustomer = type === 'customers' || type === 'collections';
  const action =
    type === 'customers' ? (
      <button
        className="button button-primary"
        onClick={() => setToast('Add customer flow is ready for API connection')}
      >
        <Plus size={16} />
        {t('labels.newCustomer')}
      </button>
    ) : type === 'plans' ? (
      <Link className="button button-primary" to={'/' + lang + '/app/plans/new'}>
        <Plus size={16} />
        {t('labels.createPlan')}
      </Link>
    ) : type === 'payments' ? (
      <button
        className="button button-primary"
        onClick={() => setToast('Payment recording dialog will be available with the payments API')}
      >
        <Plus size={16} />
        {t('labels.markReceived')}
      </button>
    ) : (
      <button
        className="button button-outline"
        onClick={() => setToast('Reminders queued in demo mode')}
      >
        <Bell size={15} />
        {t('labels.sendReminder')}
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
            <button className="icon-button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="filter-pills">
          {[t('labels.all'), t('labels.onTrack'), t('labels.dueSoon'), t('labels.overdue')].map(
            (label, i) => (
              <button
                className={
                  filter ===
                  (i === 0 ? 'All' : i === 1 ? 'On track' : i === 2 ? 'Due soon' : 'Overdue')
                    ? 'active'
                    : ''
                }
                key={label}
                onClick={() =>
                  setFilter(
                    i === 0 ? 'All' : i === 1 ? 'On track' : i === 2 ? 'Due soon' : 'Overdue',
                  )
                }
              >
                {label}
              </button>
            ),
          )}
        </div>
        <button
          className="icon-button export-button"
          onClick={() => setToast('CSV export prepared in demo mode')}
          aria-label={t('labels.export')}
        >
          <Download size={16} />
        </button>
      </div>
      {isCustomer ? (
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
                : filtered.map((c) => (
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
                      <td>{shortDate(c.nextDue)}</td>
                      <td>
                        <Status status={c.status} />
                      </td>
                      <td>
                        <button
                          className="icon-button"
                          aria-label={`More actions for ${c.name}`}
                          onClick={() => setToast(`Actions for ${c.name}`)}
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loadingCustomers && filtered.length === 0 && <Empty />}
        </div>
      ) : (
        <div className="panel table-panel">
          <table>
            <thead>
              <tr>
                <th>Plan</th>
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
                : plans.map((p) => (
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
                      <td>{shortDate(p.nextDue)}</td>
                      <td>
                        <Status status={p.status} />
                      </td>
                      <td>
                        <button className="icon-button" aria-label="Plan actions">
                          <MoreHorizontal size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}
      {type === 'collections' && (
        <div className="aging-grid">
          {[
            ['1–7 days', '₹ 12,400'],
            ['8–30 days', '₹ 5,200'],
            ['31–60 days', '₹ 2,100'],
            ['60+ days', '₹ 0'],
          ].map(([x, y]) => (
            <div className="aging-card" key={x}>
              <small>Overdue · {x}</small>
              <b>{y}</b>
            </div>
          ))}
        </div>
      )}
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
  return (
    <div className="toast" role="status">
      <Check size={16} />
      {text}
      <button onClick={close} aria-label="Close">
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
          <span className="eyebrow">CUSTOMER PROFILE</span>
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
          <small>Currently active</small>
        </div>
        <div className="stat-card stat-paid">
          <span>{t('labels.paidAmount')}</span>
          <strong>{inr(customer.paidPaise)}</strong>
          <small>Across all plans</small>
        </div>
        <div className="stat-card">
          <span>{t('labels.pendingAmount')}</span>
          <strong>{inr(customer.pendingPaise)}</strong>
          <small>Next due {shortDate(customer.nextDue)}</small>
        </div>
      </div>
      <div className="profile-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{t('labels.plans')}</h2>
              <p>Plans and payment progress</p>
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
                <b>Dining table set</b>
                <small>Started 01 Aug 2026</small>
              </span>
              <Status status={customer.status} />
            </div>
            <div className="progress-track">
              <span style={{ width: '68%' }} />
            </div>
            <div className="plan-detail-bottom">
              <span>
                Paid <b>{inr(customer.paidPaise)}</b>
              </span>
              <span>
                Remaining <b>{inr(customer.pendingPaise)}</b>
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
                <b>Installment {i + 1}</b>
                <small>
                  {shortDate(['2026-08-08', '2026-09-08', '2026-10-08', '2026-11-08'][i])}
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
              <h2>Customer notes</h2>
              <p>Private to your team</p>
            </div>
            <button
              className="button button-small button-outline"
              onClick={() => window.alert('Note editor in connected release')}
            >
              Add note
            </button>
          </div>
          <div className="note-card">
            <span className="tag-chip">Known customer</span>
            <p>Prefers a reminder a few days before the due date.</p>
            <small>Added by Aman Merchant · 12 Sep</small>
          </div>
          <div className="panel-subheading">Recent payments</div>
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
          <div className="panel-subheading">Reminder history</div>
          <p className="muted-paragraph">Last reminder sent 3 days before the due date.</p>
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
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
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
      <PageHeading eyebrow="STEP-BY-STEP" title={t('labels.createPlan')} />
      <div className="wizard-steps">
        {['Customer', 'Terms', 'Review & share'].map((label, i) => (
          <div className={i === step ? 'current' : i < step ? 'complete' : ''} key={label}>
            <span>{i < step ? <Check size={13} /> : i + 1}</span>
            {label}
          </div>
        ))}
      </div>
      <div className="wizard-layout">
        <section className="panel wizard-form">
          <h2>{['Choose a customer', 'Set the payment terms', 'Review the plan'][step]}</h2>
          <p className="muted-paragraph">
            {
              [
                'Pick an existing customer or add someone new.',
                'Set one fixed total and choose a payment schedule.',
                'Check the schedule before sharing the offer.',
              ][step]
            }
          </p>
          {step === 0 ? (
            <>
              <label className="field"><span>Customer name</span><input autoComplete="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required /></label>
              <label className="field"><span>Customer email for the secure offer link</span><input type="email" autoComplete="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required /></label>
              <label className="field"><span>Phone (optional)</span><input type="tel" autoComplete="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></label>
            </>
          ) : step === 1 ? (
            <div className="form-grid">
              <label className="field full-field">
                <span>{t('labels.item')}</span>
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} required placeholder="e.g. Dining table set" />
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
                    <option key={n}>{n}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t('labels.firstDate')}</span>
                <input type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
              </label>
              <div className="fixed-price-note">
                <ShieldCheck size={16} />
                <span>Fixed price, agreed upfront. No interest is added by Amanah Pay.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="review-summary">
                <span>{t('labels.customer')}</span>
                <b>{customerName || 'Customer'}</b>
                <span>Email</span>
                <b>{customerEmail || '—'}</b>
                <span>{t('labels.item')}</span>
                <b>{itemName || '—'}</b>
                <span>{t('labels.total')}</span>
                <b>{inr(Number(price || 0) * 100)}</b>
                <span>{t('labels.downPayment')}</span>
                <b>{inr(Number(down || 0) * 100)}</b>
              </div>
              <label className="field">
                <span>Share offer with customer</span>
                {offerLink ? <><OfferQr value={offerLink} /><input readOnly value={offerLink} aria-label="Secure customer offer link" /><div className="share-row"><button className="button button-outline" onClick={() => void navigator.clipboard.writeText(offerLink).then(() => setToast('Secure offer link copied'))}>Copy link</button><a className="button button-outline" href={`https://wa.me/?text=${encodeURIComponent(`Your Amanah Pay offer: ${offerLink}`)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a></div><small>QR and link expire in 7 days. Customer verifies their email before viewing the offer.</small></> : <p className="muted-paragraph">Create the plan to generate its private QR and share link.</p>}
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
                try { const offer = await api.createOffer({ customerName, customerEmail, phone: customerPhone || undefined, itemName, totalPricePaise: Math.round(Number(price) * 100), downPaymentPaise: Math.round(Number(down) * 100), installmentCount: count, firstDueDate: first }); setOfferLink(offer.shareUrl); void navigator.clipboard?.writeText(offer.shareUrl).then(() => setToast('Secure customer link created and copied')); }
                catch { setFormError('Could not create the plan. Check the details and try again.'); }
                finally { setSaving(false); }
              }}
            >
              {saving ? 'Creating…' : offerLink ? 'Link ready' : step < 2 ? t('labels.continue') : 'Create and share'}
              <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <aside className="panel schedule-preview">
          <span className="eyebrow">{t('labels.illustrative')}</span>
          <div className="preview-total">
            <small>{t('labels.total')}</small>
            <strong>{inr(Number(price || 0) * 100)}</strong>
            <p>Includes {inr(Number(down || 0) * 100)} today</p>
          </div>
          <h3>{t('labels.schedule')}</h3>
          {schedule.map((row) => (
            <div className="preview-row" key={row.number}>
              <span className="timeline-dot is-upcoming">
                <Circle size={8} />
              </span>
              <span>
                <b>Installment {row.number}</b>
                <small>{shortDate(row.date)}</small>
              </span>
              <strong>{inr(row.amountPaise)}</strong>
            </div>
          ))}
          <small className="preview-caption">
            Illustrative only · confirm final schedule with the server before sending
          </small>
        </aside>
      </div>
      {toast && <Toast text={toast} close={() => setToast('')} />}
    </div>
  );
}

function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('Business profile');
  const settingsQuery = useQuery({ queryKey: ['merchant-settings'], queryFn: api.merchantSettings });
  const [businessName, setBusinessName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  useEffect(() => { if (settingsQuery.data) { setBusinessName(settingsQuery.data.businessName); setUpiId(settingsQuery.data.upiId); setContactPhone(settingsQuery.data.contactPhone); } }, [settingsQuery.data]);
  return (
    <div className="dashboard-page">
      <PageHeading eyebrow="MERCHANT ACCOUNT" title={t('labels.settings')} />
      <div className="settings-tabs">
        {[
          'Business profile',
          'Payments',
          'Late-fee policy',
          'Reminders',
          'Staff & roles',
          'Language',
          'Data & privacy',
        ].map((x) => (
          <button className={tab === x ? 'active' : ''} onClick={() => setTab(x)} key={x}>
            {x}
          </button>
        ))}
      </div>
      <section className="panel settings-panel">
        <div className="panel-heading">
          <div>
            <h2>{tab}</h2>
            <p>Manage your merchant workspace preferences</p>
          </div>
        </div>
        {tab === 'Business profile' ? (
          <div className="form-grid">
            <label className="field">
              <span>Business name</span>
              <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </label>
            <label className="field">
              <span>
                GSTIN <small>Optional</small>
              </span>
              <input placeholder="Enter GSTIN" />
            </label>
            <label className="field">
              <span>UPI VPA</span>
              <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="business@bank" />
            </label>
            <label className="field">
              <span>Contact number</span>
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </label>
            {settingsQuery.isLoading && <p className="muted-paragraph">Loading business details…</p>}
            {settingsQuery.isError && <p role="alert" className="muted-paragraph">Could not load merchant settings.</p>}
            <button className="button button-primary" disabled={savingSettings || settingsQuery.isLoading} onClick={async () => { setSavingSettings(true); setSettingsMessage(''); try { const saved = await api.saveMerchantSettings({ businessName, upiId, contactPhone }); setBusinessName(saved.businessName); setUpiId(saved.upiId); setContactPhone(saved.contactPhone); setSettingsMessage('Business details saved.'); } catch { setSettingsMessage('Could not save these details. Check the UPI ID and try again.'); } finally { setSavingSettings(false); } }}>{savingSettings ? 'Saving…' : `${t('labels.save')} changes`}</button>
            {settingsMessage && <p role="status" className="muted-paragraph">{settingsMessage}</p>}
          </div>
        ) : tab === 'Late-fee policy' ? (
          <div className="policy-card">
            <div>
              <b>Late fees are off</b>
              <p>Any late-payment terms must be disclosed before the customer accepts a plan.</p>
            </div>
            <label className="switch">
              <input type="checkbox" />
              <span />
            </label>
            <div className="verify-badge">{t('labels.verify')}</div>
          </div>
        ) : (
          <div className="settings-placeholder">
            <ShieldCheck size={20} />
            <span>These controls are ready to connect to the merchant settings API.</span>
          </div>
        )}
      </section>
    </div>
  );
}

function ReportsPage() {
  const { t } = useTranslation();
  return (
    <div className="dashboard-page">
      <PageHeading
        eyebrow={t('labels.demo')}
        title={t('labels.reports')}
        action={
          <button className="button button-outline">
            <Download size={15} />
            {t('labels.export')}
          </button>
        }
      />
      <div className="stat-grid three-stats">
        <div className="stat-card stat-paid">
          <span>Collected · October</span>
          <strong>{inr(12450000)}</strong>
          <small>From 42 payments</small>
        </div>
        <div className="stat-card">
          <span>Pending total</span>
          <strong>{inr(8630000)}</strong>
          <small>Across 19 active plans</small>
        </div>
        <div className="stat-card stat-overdue">
          <span>Overdue total</span>
          <strong>{inr(2140000)}</strong>
          <small>Across 7 customers</small>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Collections by month</h2>
              <p>Collected vs pending totals</p>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={[
                  { month: 'Jun', collected: 48, pending: 24 },
                  { month: 'Jul', collected: 56, pending: 31 },
                  { month: 'Aug', collected: 42, pending: 37 },
                  { month: 'Sep', collected: 72, pending: 36 },
                  { month: 'Oct', collected: 64, pending: 42 },
                ]}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area dataKey="collected" stroke="var(--accent-icon)" fill="var(--mint)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="panel">
          <h2>Plan completion</h2>
          <div className="completion-number">76%</div>
          <div className="progress-track">
            <span style={{ width: '76%' }} />
          </div>
          <p className="muted-paragraph">Plans completed on their agreed schedule</p>
        </section>
      </div>
    </div>
  );
}

function AdminPage() {
  const { t } = useTranslation();
  return (
    <div className="public-page admin-page">
      <PageHeading eyebrow="PLATFORM ADMIN" title="Merchant operations" />
      <div className="stat-grid three-stats">
        <div className="stat-card">
          <span>Active merchants</span>
          <strong>128</strong>
          <small>+9 this month</small>
        </div>
        <div className="stat-card">
          <span>Plans tracked</span>
          <strong>4,820</strong>
          <small>Across all merchants</small>
        </div>
        <div className="stat-card">
          <span>Platform fees</span>
          <strong>{inr(3860000)}</strong>
          <small>Merchant billed</small>
        </div>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Merchants</h2>
            <p>Manage access and review account activity</p>
          </div>
          <div className="search-field">
            <Search size={15} />
            <input placeholder={t('labels.search')} />
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Plans</th>
              <th>Fee status</th>
              <th>Account</th>
              <th>Action</th>
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
                <td>Active</td>
                <td>
                  <button className="button button-small button-outline">View account</button>
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
      {image ? <img src={image} alt={purpose === 'payment' ? 'UPI payment QR code for the merchant' : 'Secure QR code for the customer offer'} /> : <span className="muted-paragraph">Preparing secure QR…</span>}
      <small>{purpose === 'payment' ? 'Scan with a UPI app to pay the merchant' : 'Customer scans this with their phone camera'}</small>
    </div>
  );
}

function CustomerAccessStart() {
  const lang = useLang();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const [offerLink, setOfferLink] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<'choose' | 'login' | 'signup'>('choose');
  const [signupStep, setSignupStep] = useState<'form' | 'verify'>('form');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => scannerRef.current?.stop(), []);

  function openOffer(value: string) {
    const pathToken = value.trim().match(/(?:^|\/)customer\/([A-Za-z0-9_-]{20,})(?:[/?#]|$)/)?.[1];
    const rawToken = /^[A-Za-z0-9_-]{20,}$/.test(value.trim()) ? value.trim() : undefined;
    const token = pathToken || rawToken;
    if (!token) {
      setError('That QR code does not look like an Amanah Pay offer. Scan your merchant’s plan QR or paste its link below.');
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
      setError('Camera access is unavailable. Allow camera permission or paste your secure plan link instead.');
    }
  }

  async function submitCustomerAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await customerApi.login(email, password);
        navigate(`/${lang}/customer/account`, { replace: true });
      } else if (signupStep === 'form') {
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        const result = await customerApi.signupRequest(fullName, email, password);
        setMaskedEmail(result.email);
        setSignupStep('verify');
      } else {
        await customerApi.verifySignup(email, signupCode);
        navigate(`/${lang}/customer/account`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error && err.message === 'Passwords do not match.'
        ? err.message
        : mode === 'login'
          ? 'We couldn’t sign you in. Check your email and password, then try again.'
          : signupStep === 'verify'
            ? 'That code could not be verified. Check it and try again.'
            : 'We couldn’t create your account. Check your details and try again.');
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
            <span className="eyebrow">CUSTOMER ACCOUNT</span>
            <h1>Welcome to Amanah Pay</h1>
            <p className="muted-paragraph">Sign in with your email and password, or create a new account with email verification.</p>
            <div className="customer-access-choice-actions">
              <button className="button button-primary full-width" type="button" onClick={() => setMode('login')}>Log in <ArrowRight size={15} /></button>
              <button className="button button-outline full-width" type="button" onClick={() => setMode('signup')}>Sign up <ArrowRight size={15} /></button>
            </div>
            <div className="customer-access-note">
              <b>New to Amanah Pay?</b>
              <span>Create your account here, then see any plans a merchant shares with you.</span>
            </div>
          </>
        ) : (
          <>
            <button className="text-link customer-access-back" type="button" onClick={() => { setMode('choose'); setError(''); }}>← Back</button>
            <span className="eyebrow">{mode === 'login' ? 'CUSTOMER LOGIN' : 'CUSTOMER SIGN UP'}</span>
            <h1>{mode === 'login' ? 'Log in to Amanah Pay' : signupStep === 'verify' ? 'Verify your email' : 'Create your account'}</h1>
            <p className="muted-paragraph">
              {mode === 'login'
                ? 'Enter your email and password to see your customer plans.'
                : signupStep === 'verify'
                  ? `Enter the six-digit code sent to ${maskedEmail}.`
                  : 'Add your details and choose a password. We’ll email you a code to verify your account.'}
            </p>
            <form onSubmit={submitCustomerAccount}>
              {mode === 'signup' && signupStep === 'form' && (
                <label className="field"><span>Full name</span><input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={180} /></label>
              )}
              {signupStep === 'verify' ? (
                <label className="field"><span>Email verification code</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={signupCode} onChange={(e) => setSignupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
              ) : (
                <>
                  <label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
                  <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'signup' ? 12 : undefined} maxLength={64} /></label>
                  {mode === 'signup' && <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={12} maxLength={64} /></label>}
                </>
              )}
              {error && <p role="alert" className="muted-paragraph">{error}</p>}
              <button className="button button-primary full-width" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : signupStep === 'verify' ? 'Verify and create account' : 'Create account'} <ArrowRight size={15} />
              </button>
            </form>
            {mode === 'signup' && signupStep === 'form' && <small className="muted-paragraph">Use at least 12 characters for your password.</small>}
            <details className="customer-link-fallback">
              <summary>Have a merchant offer QR or link?</summary>
              <p className="muted-paragraph">Open and verify your offer directly without creating a password account.</p>
              <button className="button button-outline full-width" type="button" onClick={() => void startScan()} disabled={scanning}>
                {scanning ? 'Point your camera at the QR…' : 'Scan offer QR'} <ArrowRight size={15} />
              </button>
              <div className={`customer-qr-scanner${scanning ? ' is-active' : ''}`}>
                <video ref={videoRef} muted playsInline />
                {scanning && <button className="text-link" type="button" onClick={() => { scannerRef.current?.stop(); scannerRef.current = null; setScanning(false); }}>Stop camera</button>}
              </div>
              <form onSubmit={continueToOffer}>
                <label className="field"><span>Secure plan link</span><input autoComplete="url" inputMode="url" placeholder="Paste the link from your merchant" value={offerLink} onChange={(e) => { setOfferLink(e.target.value); setError(''); }} required /></label>
                <button className="button button-outline full-width" type="submit">Continue with link <ArrowRight size={15} /></button>
              </form>
            </details>
          </>
        )}
        <Link className="text-link" to={`/${lang}/merchants`}>I’m a merchant</Link>
      </section>
    </div>
  );
}

function CustomerAccount() {
  const lang = useLang();
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
    catch { setError('We couldn’t accept that plan. Please try again.'); }
    finally { setBusyPlan(null); }
  }

  async function reportPayment(planId: number) {
    setBusyPlan(planId);
    setError('');
    try { await customerApi.reportAccountPayment(planId, 'Customer self-reported payment'); setReported((value) => ({ ...value, [planId]: true })); }
    catch { setError('We couldn’t record your payment report. Please try again.'); }
    finally { setBusyPlan(null); }
  }

  function signOut() {
    customerApi.logout();
    navigate(`/${lang}/customer-access`, { replace: true });
  }

  return (
    <div className="customer-portal customer-account-page">
      <div className="portal-brand"><BrandLockup /></div>
      <div className="portal-card panel customer-account-card">
        <div className="customer-account-heading">
          <div><span className="eyebrow">CUSTOMER ACCOUNT</span><h1>Your plans</h1></div>
          <button className="text-link" type="button" onClick={signOut}>Log out</button>
        </div>
        {plansQuery.isLoading ? <p className="muted-paragraph">Loading your plans…</p> : plansQuery.isError ? (
          <><p role="alert" className="muted-paragraph">Your session has expired. Log in again to view your plans.</p><Link className="button button-primary full-width" to={`/${lang}/customer-access`}>Go to customer login</Link></>
        ) : plans.length === 0 ? (
          <div className="customer-account-empty"><h2>No plans yet</h2><p className="muted-paragraph">Plans a merchant creates for this email will appear here. You can also open an offer using its secure link or QR code.</p><Link className="button button-outline full-width" to={`/${lang}/customer-access`}>Open a merchant offer</Link></div>
        ) : (
          <div className="customer-account-plans">
            {plans.map((plan) => (
              <article className="customer-account-plan" key={plan.id}>
                <div className="merchant-profile">
                  <span className="merchant-avatar">{initials(plan.merchantName)}</span>
                  <span><b>{plan.merchantName}</b><small>{plan.itemName}</small></span>
                  <span className={`tag-chip ${plan.status === 'ACTIVE' ? 'tag-active' : ''}`}>{plan.status === 'ACTIVE' ? 'Active' : 'Awaiting your decision'}</span>
                </div>
                <div className="portal-total"><small>Fixed total price</small><strong>{inr(plan.totalPricePaise)}</strong></div>
                <div className="customer-account-schedule">
                  {plan.installments.map((row, index) => <div className="preview-row" key={row.id}><span>{index + 1}. {shortDate(row.dueDate)} <small>{row.status.toLowerCase()}</small></span><strong>{inr(row.amount_paise)}</strong></div>)}
                </div>
                {plan.status === 'PENDING' ? (
                  <>
                    <label className="consent-check"><input type="checkbox" checked={Boolean(accepted[plan.id])} onChange={(e) => setAccepted((value) => ({ ...value, [plan.id]: e.target.checked }))} /><span>I reviewed this fixed total price and payment schedule and agree to the merchant’s offer.</span></label>
                    <button className="button button-primary full-width" type="button" disabled={!accepted[plan.id] || busyPlan === plan.id} onClick={() => void acceptPlan(plan.id)}>{busyPlan === plan.id ? 'Saving…' : 'Accept plan'} <ArrowRight size={15} /></button>
                  </>
                ) : (
                  <>
                    {plan.upiLink ? <><a className="button button-primary full-width" href={plan.upiLink}>Pay with UPI app <ArrowUpRight size={15} /></a><button className="button button-outline full-width" type="button" onClick={() => setShowQr((value) => ({ ...value, [plan.id]: !value[plan.id] }))}>{showQr[plan.id] ? 'Hide payment QR' : 'Pay by QR'}</button>{showQr[plan.id] && <OfferQr value={plan.upiLink} purpose="payment" />}</> : <p className="muted-paragraph">Ask {plan.merchantName} for payment details.</p>}
                    {reported[plan.id] ? <p role="status" className="muted-paragraph">Payment reported. Your merchant will confirm it.</p> : <button className="button button-outline full-width" type="button" disabled={busyPlan === plan.id} onClick={() => void reportPayment(plan.id)}>I’ve paid</button>}
                  </>
                )}
              </article>
            ))}
          </div>
        )}
        {error && <p role="alert" className="muted-paragraph">{error}</p>}
      </div>
      <div className="portal-foot">Your payments go directly to each merchant · <Link to={`/${lang}/legal/privacy`}>Privacy</Link></div>
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
  const [showPaymentQr, setShowPaymentQr] = useState(false);
  useEffect(() => {
    let active = true;
    customerApi.requestOtp(token).then((result) => { if (active) { setMaskedEmail(result.email); setView('verify'); } }).catch(() => { if (active) { setError('This offer link may have expired. Ask the merchant to send you a new one.'); setView('error'); } });
    return () => { active = false; };
  }, [token]);
  async function verifyCustomer(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await customerApi.verify(token, code); setPlan(result.plan); setView(result.plan.status === 'ACTIVE' ? 'accepted' : 'offer'); }
    catch { setError('That code could not be verified. Check it and try again.'); }
    finally { setBusy(false); }
  }
  async function acceptOffer() {
    setBusy(true); setError('');
    try { const result = await customerApi.accept(); setPlan(result.plan); setView('accepted'); }
    catch { setError('We could not record your acceptance. Please try again or contact the merchant.'); }
    finally { setBusy(false); }
  }
  async function downloadAgreement() {
    try { const blob = await customerApi.agreement(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'amanah-plan-agreement.txt'; link.click(); URL.revokeObjectURL(url); }
    catch { setError('The agreement is not available yet.'); }
  }
  return (
    <div className="customer-portal">
      <div className="portal-brand">
        <BrandLockup />
      </div>
      <div className="portal-card panel">
        {view === 'loading' ? (
          <><span className="eyebrow">SECURE CUSTOMER OFFER</span><h1>Getting your offer ready</h1><p className="muted-paragraph">We’re checking your secure link and sending an email code.</p></>
        ) : view === 'error' ? (
          <><span className="eyebrow">SECURE CUSTOMER OFFER</span><h1>We can’t open this offer</h1><p role="alert" className="muted-paragraph">{error}</p><Link to={'/' + (location.pathname.split('/')[1] || 'en')} className="button button-outline full-width">Back to Amanah Pay</Link></>
        ) : view === 'verify' ? (
          <>
            <span className="eyebrow">YOUR OFFER IS PRIVATE</span>
            <h1>Verify your email</h1>
            <p className="muted-paragraph">We sent a six-digit code to {maskedEmail}. It expires in 10 minutes.</p>
            <form onSubmit={verifyCustomer}>
              <label className="field"><span>Email verification code</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
              {error && <p role="alert" className="muted-paragraph">{error}</p>}
              <button className="button button-primary full-width" disabled={busy}>{busy ? 'Verifying…' : 'View my offer'}</button>
            </form>
          </>
        ) : view === 'offer' && plan ? (
          <>
            <div className="merchant-profile">
              <span className="merchant-avatar">{initials(plan.merchantName)}</span>
              <span>
                <b>{plan.merchantName}</b>
                <small>Purchase offer</small>
              </span>
            </div>
            <h1>Review your offer</h1>
            <p className="muted-paragraph">{plan.itemName}</p>
            <div className="portal-total">
              <small>Fixed total price</small>
              <strong>{inr(plan.totalPricePaise)}</strong>
            </div>
            {plan.downPaymentPaise > 0 && <div className="portal-line"><span>Down payment</span><b>{inr(plan.downPaymentPaise)}</b></div>}
            <h3>{t('labels.schedule')}</h3>
            {plan.installments.map((row, i) => (
              <div className="preview-row" key={row.id}>
                <span>{i + 1}. {shortDate(row.dueDate)} <small>{row.status.toLowerCase()}</small></span>
                <strong>{inr(row.amount_paise)}</strong>
              </div>
            ))}
            <p className="muted-paragraph">No interest is added to these installments. Pay the merchant directly.</p>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>I have reviewed the fixed total price and schedule and agree to this merchant’s offer.</span>
            </label>
            <button
              className="button button-primary full-width"
              disabled={!checked || busy}
              onClick={() => void acceptOffer()}
            >
              {busy ? 'Saving…' : 'Accept offer'}
            </button>
            {error && <p role="alert" className="muted-paragraph">{error}</p>}
          </>
        ) : (
          <>
            <span className="paid-big">
              <Check size={24} />
            </span>
            <h1>Offer accepted</h1>
            <p className="muted-paragraph">{plan?.merchantName} will receive your payments. Keep this schedule and your agreement for reference.</p>
            {plan?.upiLink ? (
              <>
                <a className="button button-primary full-width" href={plan.upiLink}>Pay with UPI app <ArrowUpRight size={15} /></a>
                <button className="button button-outline full-width" onClick={() => setShowPaymentQr((visible) => !visible)}>
                  {showPaymentQr ? 'Hide payment QR' : 'Pay by QR'}
                </button>
                {showPaymentQr && <OfferQr value={plan.upiLink} purpose="payment" />}
              </>
            ) : <p className="muted-paragraph">Ask {plan?.merchantName} for their payment details.</p>}
            {reported ? <p role="status" className="muted-paragraph">Payment marked as reported. Your merchant will confirm it.</p> : <button className="button button-outline full-width" onClick={async () => { try { const result = await customerApi.reportPayment('Customer self-reported payment'); setReported(true); setError(result.message); } catch { setError('Could not submit the payment report.'); } }}>I’ve paid</button>}
            <button className="text-link portal-agreement" onClick={() => void downloadAgreement()}>Download agreement</button>
            {error && <p role="status" className="muted-paragraph">{error}</p>}
            <p className="portal-support">
              Need help? <a href="mailto:support@amanahpay.in">Contact support</a>
            </p>
          </>
        )}
      </div>
      <div className="portal-foot">
        Payments go directly to the merchant · <Link to="/en/legal/privacy">Privacy</Link>
      </div>
    </div>
  );
}

function Calculator() {
  const { t } = useTranslation();
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
                  {n} months
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
            <span>No interest added by Amanah Pay. No hidden customer fee.</span>
          </div>
        </div>
        <div className="calc-result">
          <div className="calc-result-head">
            <span>{t('labels.totalSchedule')}</span>
            <strong>{inr(Number(price || 0) * 100)}</strong>
          </div>
          <div className="preview-row">
            <span>Today · Down payment</span>
            <strong>{inr(Number(down || 0) * 100)}</strong>
          </div>
          {schedule.map((row) => (
            <div className="preview-row" key={row.number}>
              <span>
                {shortDate(row.date)} · Installment {row.number}
              </span>
              <strong>{inr(row.amountPaise)}</strong>
            </div>
          ))}
          <small className="preview-caption">
            Illustrative only. The merchant confirms the final fixed-price agreement and schedule.
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
    merchants: 'A workspace made for everyday collections',
    pricing: t('sections.pricing'),
    approach: t('labels.trustTitle'),
    faq: t('sections.faq'),
    about: 'Built around a clearer agreement',
  };
  const body = {
    how: t('sections.howBody'),
    merchants:
      'Keep customer records, fixed-price plans, payments and reminders together — while the merchant stays in control.',
    pricing: t('sections.pricingBody'),
    approach: t('labels.trustBody'),
    faq: 'A few useful details for merchants and customers.',
    about:
      'Amanah Pay is being built to make installment agreements easier for merchants to share and easier for customers to understand.',
  };
  if (type === 'faq')
    return (
      <section className="public-page content-page">
        <span className="eyebrow">HELP CENTRE</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="faq-search search-field">
          <Search size={16} />
          <input placeholder="Search questions" />
        </div>
        <div className="faq-list">
          {[
            t('labels.faqQ'),
            'Who receives the customer payments?',
            'Can the customer see every due date?',
            'Does the app add late fees?',
            'How is customer information used?',
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
                        'The customer pays the merchant directly using the merchant’s UPI details or a gateway that settles to the merchant.',
                        'Yes. The customer offer page shows the agreed total, down payment and complete schedule before acceptance.',
                        'Late-fee terms are optional, off by default, and must be disclosed in the agreement before acceptance.',
                        'Only the information needed to create and service the merchant’s plan should be collected.',
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
        <span className="eyebrow">MERCHANT PRICING</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="pricing-card panel">
          <span className="pricing-icon">
            <WalletCards size={20} />
          </span>
          <h2>One clear platform fee</h2>
          <p>
            Choose a flat fee per active plan or a percentage of plan value. Your exact fee will be
            shown before you activate your merchant account.
          </p>
          <div className="price-placeholder">Pricing details shared during onboarding</div>
          <div className="feature-line">
            <Check size={15} />
            No fees added to customer installments
          </div>
          <div className="feature-line">
            <Check size={15} />
            No charge for customers to view their plan
          </div>
          <Link to={langPath(lang, '/contact')} className="button button-primary full-width">
            Talk to our team <ArrowRight size={15} />
          </Link>
        </div>
        <div className="verify-badge">{t('labels.verify')}</div>
      </section>
    );
  if (type === 'approach')
    return (
      <section className="public-page content-page">
        <span className="eyebrow">OUR APPROACH</span>
        <h1>{titles[type]}</h1>
        <p className="lead">{body[type]}</p>
        <div className="approach-grid">
          {[
            [
              'Fixed and clear',
              'The total deferred price is agreed upfront and the schedule is visible before acceptance.',
            ],
            [
              'Paid to the merchant',
              'Customers pay the merchant directly. Amanah Pay does not hold or pool customer funds.',
            ],
            [
              'Merchant-paid service',
              'A transparent platform fee is charged to the merchant, never added to the customer plan.',
            ],
            [
              'Customer data matters',
              'We aim to collect only what is needed to manage and track the plan.',
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
            Product structure and any religious or regulatory claims require independent review
            before launch.
          </p>
        </div>
      </section>
    );
  return (
    <section className="public-page content-page">
      <div className="content-hero">
        <div>
          <span className="eyebrow">{type === 'how' ? 'THREE SIMPLE STEPS' : 'FOR MERCHANTS'}</span>
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
        <span>Offer</span>
        <ArrowRight />
        <span>Accepted</span>
        <ArrowRight />
        <span>Active</span>
        <ArrowRight />
        <span>Paid / closed</span>
      </div>
      <div className="feature-grid">
        {[
          ['Customer records', 'Find a plan and payment history quickly.'],
          ['Payment schedule', 'Keep every due date and balance visible.'],
          ['Friendly reminders', 'Share a reminder by WhatsApp or SMS.'],
          ['Merchant control', 'Your team decides how to offer a plan.'],
          ['UPI collection', 'Show the merchant’s own payment details.'],
          ['Useful reports', 'See collected, pending and overdue amounts.'],
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
        <h1>Let’s make collections clearer.</h1>
        <p className="lead">Tell us a little about your business and what you need.</p>
        <div className="contact-detail">
          <span className="contact-icon">
            <CircleHelp size={18} />
          </span>
          <span>
            <b>Merchant support</b>
            <small>We’ll reply to your email as soon as we can.</small>
          </span>
        </div>
      </div>
      <form className="panel contact-form" onSubmit={handleSubmit(() => setSent(true))}>
        <label className="field">
          <span>{t('labels.customerName')}</span>
          <input {...register('name')} placeholder="Your name" />
          {errors.name && <small className="field-error">Please enter your name.</small>}
        </label>
        <label className="field">
          <span>{t('labels.email')}</span>
          <input {...register('email')} type="email" placeholder="you@business.com" />
          {errors.email && <small className="field-error">Enter a valid email.</small>}
        </label>
        <label className="field">
          <span>{t('labels.message')}</span>
          <textarea
            {...register('message')}
            rows={4}
            placeholder="A short note about your business"
          />
          {errors.message && (
            <small className="field-error">Please add a little more detail.</small>
          )}
        </label>
        <button className="button button-primary full-width" type="submit">
          {sent ? t('labels.success') : t('labels.submit')}
          <ArrowRight size={15} />
        </button>
        <small className="muted-paragraph">
          Demo form · messages are not sent until the contact API is connected.
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
    } catch { setError(sent ? 'That code could not be verified. Please try again.' : 'We could not start sign-in. Please try again shortly.'); }
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
        <span className="eyebrow">MERCHANT ACCOUNT</span>
        <h1>
          {sent ? t('labels.verifyOtp') : signup ? 'Start your merchant workspace' : 'Welcome back'}
        </h1>
        <p className="muted-paragraph">
          {sent
            ? `Enter the one-time code sent to ${email}.`
            : signup
              ? 'Create an account to organize your payment plans.'
              : 'Sign in to manage your customers and collections.'}
        </p>
        {!sent ? (
          <>
            {signup && <label className="field"><span>Business name</span><input autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required /></label>}
            <label className="field"><span>Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.in" required /></label>
          </>
        ) : (
          <label className="field"><span>6-digit email code</span><input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></label>
        )}
        {error && <p role="alert" className="muted-paragraph">{error}</p>}
        <button className="button button-primary full-width" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : sent ? t('labels.continue') : 'Send one-time code'}
        </button>
        <small className="auth-legal">
          By continuing, you agree to our <Link to={'/' + lang + '/legal/terms'}>Terms</Link> and{' '}
          <Link to={'/' + lang + '/legal/privacy'}>Privacy notice</Link>.
        </small>
        {import.meta.env.VITE_USE_MOCKS === 'true' && (
          <span className="mock-caption">Demo flow · OTP is simulated</span>
        )}
      </form>
    </div>
  );
}

function LegalPage() {
  const { slug = 'terms' } = useParams();
  const titles: Record<string, string> = {
    terms: 'Terms of use',
    privacy: 'Privacy notice',
    dpdp: 'DPDP notice',
    grievance: 'Grievance redressal',
    cookies: 'Cookie notice',
  };
  return (
    <section className="public-page legal-page">
      <span className="eyebrow">INFORMATION</span>
      <h1>{titles[slug] || 'Information'}</h1>
      <div className="legal-panel panel">
        <p>
          This page is a draft placeholder for legal review. It is not the final contract or privacy
          notice.
        </p>
        <h2>How the service works</h2>
        <p>
          Amanah Pay helps merchants create and track fixed-price installment schedules. Customer
          payments are made directly to the merchant. The platform does not hold or pool customer
          funds.
        </p>
        <h2>Customer information</h2>
        <p>
          Information should be collected only for clear purposes, protected with appropriate
          safeguards, and retained only as required. Contact support for requests about your
          information.
        </p>
        <h2>Contact and complaints</h2>
        <p>
          Write to <a href="mailto:support@amanahpay.in">support@amanahpay.in</a>. A designated
          grievance contact and response timelines will be added before launch.
        </p>
        <span className="verify-badge">DRAFT · VERIFY WITH COUNSEL</span>
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
