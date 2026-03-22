export type ThemeId =
  | 'default'
  | 'midnight-navy'
  | 'forest-dark'
  | 'crimson-dark'
  | 'deep-sea'
  | 'amber-dusk'
  | 'violet-storm'
  | 'solar-flare'
  | 'neon-matrix';

export interface Theme {
  id: ThemeId;
  name: string;
  preview: string; // accent color for the swatch
  vars: Record<string, string>;
}

export const themes: Theme[] = [
  {
    // Graphite — cool slate-gray (default)
    id: 'default',
    name: 'Default',
    preview: '#818cf8',
    vars: {
      '--background': '#0e0f12',
      '--foreground': '#e2e4ea',
      '--card-bg': '#191b22',
      '--card-border': '#252830',
      '--accent-primary': '#818cf8',
      '--accent-green': '#34d399',
      '--card-green': '#10b981',
      '--accent-red': '#fb7185',
      '--accent-yellow': '#fcd34d',
      '--text-muted': '#7e8494',
      '--text-secondary': '#9aa0b0',
      '--hover-bg': '#20222c',
      '--border-color': '#2e3140',
      '--input-bg': '#16181f',
      '--sidebar-bg': '#0e0f1210',
      '--navbar-bg': '#0e0f12',
    },
  },
  {
    // Deep navy-shifted blacks — cool, institutional
    id: 'midnight-navy',
    name: 'Midnight Navy',
    preview: '#60a5fa',
    vars: {
      '--background': '#060c18',
      '--foreground': '#dde8f5',
      '--card-bg': '#0d1a2e',
      '--card-border': '#162440',
      '--accent-primary': '#60a5fa',
      '--accent-green': '#22c55e',
      '--card-green': '#16a34a',
      '--accent-red': '#f43f5e',
      '--accent-yellow': '#fbbf24',
      '--text-muted': '#7a8fa8',
      '--text-secondary': '#9ab0cc',
      '--hover-bg': '#111f35',
      '--border-color': '#1e2f45',
      '--input-bg': '#0a1525',
      '--sidebar-bg': '#060c1810',
      '--navbar-bg': '#060c18',
    },
  },
  {
    // Dark forest — green-tinted blacks
    id: 'forest-dark',
    name: 'Forest Dark',
    preview: '#4ade80',
    vars: {
      '--background': '#060e08',
      '--foreground': '#d8f0dd',
      '--card-bg': '#0d1f10',
      '--card-border': '#152a18',
      '--accent-primary': '#4ade80',
      '--accent-green': '#4ade80',
      '--card-green': '#22c55e',
      '--accent-red': '#f87171',
      '--accent-yellow': '#fde047',
      '--text-muted': '#6b8f72',
      '--text-secondary': '#8aad90',
      '--hover-bg': '#112015',
      '--border-color': '#1a3020',
      '--input-bg': '#09180b',
      '--sidebar-bg': '#060e0810',
      '--navbar-bg': '#060e08',
    },
  },
  {
    // Warm dark with red tint
    id: 'crimson-dark',
    name: 'Crimson Dark',
    preview: '#fb7185',
    vars: {
      '--background': '#0f0909',
      '--foreground': '#f0e0e0',
      '--card-bg': '#1e1010',
      '--card-border': '#2d1818',
      '--accent-primary': '#fb7185',
      '--accent-green': '#4ade80',
      '--card-green': '#22c55e',
      '--accent-red': '#ef4444',
      '--accent-yellow': '#fbbf24',
      '--text-muted': '#8a7070',
      '--text-secondary': '#aa9090',
      '--hover-bg': '#261414',
      '--border-color': '#351a1a',
      '--input-bg': '#180c0c',
      '--sidebar-bg': '#0f090910',
      '--navbar-bg': '#0f0909',
    },
  },
  {
    // Navy-black bg + cyan accent — high contrast
    id: 'deep-sea',
    name: 'Deep Sea',
    preview: '#18edf8',
    vars: {
      '--background': '#02060a',
      '--foreground': '#e0eef8',
      '--card-bg': '#0f2025',
      '--card-border': '#1e3d5c',
      '--accent-primary': '#18edf8',
      '--accent-green': '#22c55e',
      '--card-green': '#16a34a',
      '--accent-red': '#f43f5e',
      '--accent-yellow': '#fbbf24',
      '--text-muted': '#7a9aa5',
      '--text-secondary': '#9ab8d0',
      '--hover-bg': '#162e4a',
      '--border-color': '#234466',
      '--input-bg': '#0a1a2c',
      '--sidebar-bg': '#02080f10',
      '--navbar-bg': '#02080f',
    },
  },
  {
    // Warm chocolate bg + amber/gold accent
    id: 'amber-dusk',
    name: 'Amber Dusk',
    preview: '#f59e0b',
    vars: {
      '--background': '#0f0c07',
      '--foreground': '#f5e6c8',
      '--card-bg': '#1a1508',
      '--card-border': '#2a2010',
      '--accent-primary': '#f59e0b',
      '--accent-green': '#34d399',
      '--card-green': '#10b981',
      '--accent-red': '#fb7185',
      '--accent-yellow': '#fcd34d',
      '--text-muted': '#8a7a55',
      '--text-secondary': '#a89a70',
      '--hover-bg': '#221b0c',
      '--border-color': '#332518',
      '--input-bg': '#130f05',
      '--sidebar-bg': '#0f0c0710',
      '--navbar-bg': '#0f0c07',
    },
  },
  {
    // Deep purple bg + violet accent
    id: 'violet-storm',
    name: 'Violet Storm',
    preview: '#a78bfa',
    vars: {
      '--background': '#08061a',
      '--foreground': '#ede8ff',
      '--card-bg': '#12102a',
      '--card-border': '#1e1a40',
      '--accent-primary': '#a78bfa',
      '--accent-green': '#34d399',
      '--card-green': '#10b981',
      '--accent-red': '#fb7185',
      '--accent-yellow': '#fcd34d',
      '--text-muted': '#7a70a0',
      '--text-secondary': '#9a90c0',
      '--hover-bg': '#1a1635',
      '--border-color': '#2a2450',
      '--input-bg': '#0c0a22',
      '--sidebar-bg': '#08061a10',
      '--navbar-bg': '#08061a',
    },
  },
  {
    // Near-black + orange solar accent
    id: 'solar-flare',
    name: 'Solar Flare',
    preview: '#fb923c',
    vars: {
      '--background': '#0f0804',
      '--foreground': '#fcebd8',
      '--card-bg': '#1c1008',
      '--card-border': '#2c1a0c',
      '--accent-primary': '#fb923c',
      '--accent-green': '#34d399',
      '--card-green': '#10b981',
      '--accent-red': '#f43f5e',
      '--accent-yellow': '#fbbf24',
      '--text-muted': '#8a7060',
      '--text-secondary': '#aa9070',
      '--hover-bg': '#241508',
      '--border-color': '#38200e',
      '--input-bg': '#130a04',
      '--sidebar-bg': '#0f080410',
      '--navbar-bg': '#0f0804',
    },
  },
  {
    // Near-black + matrix bright green
    id: 'neon-matrix',
    name: 'Neon Matrix',
    preview: '#39ff14',
    vars: {
      '--background': '#020a03',
      '--foreground': '#c8ffd0',
      '--card-bg': '#071009',
      '--card-border': '#0e2010',
      '--accent-primary': '#39ff14',
      '--accent-green': '#39ff14',
      '--card-green': '#22c55e',
      '--accent-red': '#ff4444',
      '--accent-yellow': '#ffea00',
      '--text-muted': '#4a7a50',
      '--text-secondary': '#6aaa70',
      '--hover-bg': '#0c180e',
      '--border-color': '#142818',
      '--input-bg': '#050d06',
      '--sidebar-bg': '#020a0310',
      '--navbar-bg': '#020a03',
    },
  },
];

export const getTheme = (id: ThemeId): Theme =>
  themes.find((t) => t.id === id) ?? themes[0];
