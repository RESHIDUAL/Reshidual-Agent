export const Shape = {
  cornerSmall: 8,
  cornerMedium: 12,
  cornerLarge: 16,
  cornerExtraLarge: 28,
} as const;

export const Elevation = {
  level0: 'none',
  level1: '0px 1px 3px 1px var(--md-sys-color-shadow), 0px 1px 2px 0px var(--md-sys-color-shadow)',
  level2: '0px 2px 6px 2px var(--md-sys-color-shadow), 0px 1px 2px 0px var(--md-sys-color-shadow)',
  level3: '0px 1px 3px 0px var(--md-sys-color-shadow), 0px 4px 8px 3px var(--md-sys-color-shadow)',
  level4: '0px 2px 3px 0px var(--md-sys-color-shadow), 0px 6px 10px 4px var(--md-sys-color-shadow)',
  level5: '0px 4px 4px 0px var(--md-sys-color-shadow), 0px 8px 12px 6px var(--md-sys-color-shadow)',
} as const;

export const Motion = {
  springStiff: { mass: 1, stiffness: 500, damping: 30 },
  springGentle: { mass: 1, stiffness: 200, damping: 20 },
  springBouncy: { mass: 0.8, stiffness: 300, damping: 15 },
  durationShort: 0.15,
  durationMedium: 0.3,
  durationLong: 0.5,
} as const;

export const StateLayerOpacities = {
  hover: 0.08,
  focus: 0.12,
  pressed: 0.12,
  dragged: 0.16,
} as const;