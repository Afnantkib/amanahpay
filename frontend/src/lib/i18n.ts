import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ur from './locales/ur.json';

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: localStorage.getItem('amanah-lang') || (navigator.language.startsWith('ur') ? 'ur' : 'en'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
