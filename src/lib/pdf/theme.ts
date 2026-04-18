export type PdfColorScheme = 'light' | 'dark'

export const PDF_COLORS_LIGHT = {
  background:      '#ffffff',
  foreground:      '#0a0a0a',
  primary:         '#0a0a0a',
  muted:           '#f5f5f5',
  mutedForeground: '#737373',
  border:          '#e5e5e5',
  destructive:     '#ef4444',
  success:         '#16a34a',
  accent:          '#f4f4f5',
}

export const PDF_COLORS_DARK = {
  background:      '#09090b',
  foreground:      '#fafafa',
  primary:         '#fafafa',
  muted:           '#18181b',
  mutedForeground: '#a1a1aa',
  border:          '#27272a',
  destructive:     '#f87171',
  success:         '#4ade80',
  accent:          '#27272a',
}

export function getPdfColors(scheme: PdfColorScheme) {
  return scheme === 'dark' ? PDF_COLORS_DARK : PDF_COLORS_LIGHT
}

// Backward compat alias
export const PDF_COLORS = PDF_COLORS_LIGHT

export const PDF_FONTS = {
  regular: 'Helvetica',
  bold:    'Helvetica-Bold',
}

export const PDF_SIZES = {
  page:        { paddingH: 40, paddingV: 48 },
  sectionGap:  20,
  cardRadius:  6,
  borderWidth: 1,
}
