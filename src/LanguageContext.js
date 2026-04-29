import React, { createContext, useContext, useState } from 'react';
import translations from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('qalm_lang') || 'en');
  const setLanguage = (l) => {
    localStorage.setItem('qalm_lang', l);
    setLang(l);
  };
  const t = translations[lang] || translations.en;
  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'kn', label: 'ಕ' },
  { code: 'ta', label: 'த' },
];

export function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage();
  return (
    <div style={{
      position: 'fixed', top: '16px', right: '16px', zIndex: 1000,
      display: 'flex', gap: '6px',
    }}>
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          style={{
            padding: '5px 10px',
            background: lang === l.code ? 'rgba(37,99,235,0.3)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${lang === l.code ? 'rgba(37,99,235,0.6)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '8px',
            color: lang === l.code ? '#60a5fa' : 'rgba(255,255,255,0.45)',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600',
            backdropFilter: 'blur(10px)',
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
