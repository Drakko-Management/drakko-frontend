import '@testing-library/jest-dom'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from '@/i18n/locales/fr.json'
import en from '@/i18n/locales/en.json'
import es from '@/i18n/locales/es.json'
import itLocale from '@/i18n/locales/it.json'
import de from '@/i18n/locales/de.json'

// Les 5 langues sont chargées pour pouvoir tester une traduction ; l'interface démarre en français
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      it: { translation: itLocale },
      de: { translation: de },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: { escapeValue: false },
  })
}
