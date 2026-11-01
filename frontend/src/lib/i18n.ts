import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';

const routeLanguage = window.location.pathname.match(/^\/(en|ur)(?:\/|$)/)?.[1];
const initialLanguage = routeLanguage || localStorage.getItem('amanah-lang') || (navigator.language.startsWith('ur') ? 'ur' : 'en');
document.documentElement.lang = initialLanguage;
document.documentElement.dir = initialLanguage === 'ur' ? 'rtl' : 'ltr';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
