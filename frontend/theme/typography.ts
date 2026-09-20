export const FontFamilies = {
  display: 'var(--font-display)',
  body: 'var(--font-body)',
  mono: 'var(--font-mono)',
} as const;

export const TypographyScale = {
  displayLarge: { fontFamily: FontFamilies.display, fontSize: '57px', fontWeight: 400, lineHeight: '64px', letterSpacing: '-0.25px' },
  displayMedium: { fontFamily: FontFamilies.display, fontSize: '45px', fontWeight: 400, lineHeight: '52px', letterSpacing: '0px' },
  displaySmall: { fontFamily: FontFamilies.display, fontSize: '36px', fontWeight: 400, lineHeight: '44px', letterSpacing: '0px' },

  headlineLarge: { fontFamily: FontFamilies.display, fontSize: '32px', fontWeight: 400, lineHeight: '40px', letterSpacing: '0px' },
  headlineMedium: { fontFamily: FontFamilies.display, fontSize: '28px', fontWeight: 400, lineHeight: '36px', letterSpacing: '0px' },
  headlineSmall: { fontFamily: FontFamilies.display, fontSize: '24px', fontWeight: 400, lineHeight: '32px', letterSpacing: '0px' },

  titleLarge: { fontFamily: FontFamilies.display, fontSize: '22px', fontWeight: 400, lineHeight: '28px', letterSpacing: '0px' },
  titleMedium: { fontFamily: FontFamilies.body, fontSize: '16px', fontWeight: 500, lineHeight: '24px', letterSpacing: '0.15px' },
  titleSmall: { fontFamily: FontFamilies.body, fontSize: '14px', fontWeight: 500, lineHeight: '20px', letterSpacing: '0.1px' },

  bodyLarge: { fontFamily: FontFamilies.body, fontSize: '16px', fontWeight: 400, lineHeight: '24px', letterSpacing: '0.5px' },
  bodyMedium: { fontFamily: FontFamilies.body, fontSize: '14px', fontWeight: 400, lineHeight: '20px', letterSpacing: '0.25px' },
  bodySmall: { fontFamily: FontFamilies.body, fontSize: '12px', fontWeight: 400, lineHeight: '16px', letterSpacing: '0.4px' },

  labelLarge: { fontFamily: FontFamilies.body, fontSize: '14px', fontWeight: 500, lineHeight: '20px', letterSpacing: '0.1px' },
  labelMedium: { fontFamily: FontFamilies.body, fontSize: '12px', fontWeight: 500, lineHeight: '16px', letterSpacing: '0.5px' },
  labelSmall: { fontFamily: FontFamilies.body, fontSize: '11px', fontWeight: 500, lineHeight: '16px', letterSpacing: '0.5px' },
} as const;

export const getGoogleFontsUrl = () => {
  return `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap`;
};