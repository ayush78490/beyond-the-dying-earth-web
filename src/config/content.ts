/** All page copy in one place, so writers can edit without touching components. */

export const NAV_LINKS = [
  { id: 'story', label: 'Story' },
  { id: 'world', label: 'World' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'economy', label: 'Economy' },
  { id: 'nfts', label: 'NFTs' },
] as const;

export const HERO = {
  tagline: 'A 2D action-adventure across the stars',
  description: ['Explore a dying universe.', 'Collect cosmic energy.', 'Fight the RARI.', "Restore Earth's balance."],
  features: [
    { icon: 'explore', title: 'Explore', sub: 'Alien worlds' },
    { icon: 'fight', title: 'Fight', sub: 'The RARI' },
    { icon: 'collect', title: 'Collect', sub: 'Rego · Oliva · Kama' },
    { icon: 'restore', title: 'Restore', sub: 'A dying Earth' },
  ],
} as const;

export const HUD_READOUT = [
  { name: 'REGO', value: '100%', level: 1 },
  { name: 'OLIVA', value: '042', level: 0.42 },
  { name: 'KAMA', value: '013', level: 0.13 },
  { name: 'JORO', value: '006', level: 0.06 },
] as const;

export type ResourceId = 'rego' | 'oliva' | 'kama' | 'joro' | 'schreiber' | 'triolite' | 'nft';

export interface Resource {
  id: ResourceId;
  name: string;
  role: string;
  description: string;
  color: string;
  glow: string;
}

export const RESOURCES: Resource[] = [
  {
    id: 'rego',
    name: 'REGO',
    role: 'Suit Energy',
    description: 'Crystallised starlight that powers the Astrion exo-suit — shields, thrusters and life support all run on REGO.',
    color: '#5ad7ff',
    glow: 'rgba(90, 215, 255, 0.55)',
  },
  {
    id: 'oliva',
    name: 'OLIVA',
    role: 'Skill Energy',
    description: 'Bioluminescent essence drawn from living ecosystems. Channel it to unlock and evolve your combat skills.',
    color: '#7dffb0',
    glow: 'rgba(125, 255, 176, 0.5)',
  },
  {
    id: 'kama',
    name: 'KAMA',
    role: 'Life Currency',
    description: 'The pulse of every living thing. Spend it to revive, to trade, to survive one more cycle.',
    color: '#ff6fcf',
    glow: 'rgba(255, 111, 207, 0.55)',
  },
  {
    id: 'joro',
    name: 'JORO',
    role: 'Shockwave Fuel',
    description: 'Volatile kinetic plasma. Charges the gauntlet shockwave that shatters RARI armour.',
    color: '#ffb54d',
    glow: 'rgba(255, 181, 77, 0.5)',
  },
  {
    id: 'schreiber',
    name: 'SCHREIBER',
    role: 'Doom Energy',
    description: 'Corrupted power bleeding from the RARI citadel. Dangerous to carry — devastating when unleashed.',
    color: '#ff4d6d',
    glow: 'rgba(255, 77, 109, 0.55)',
  },
];

export const REFINED: Resource[] = [
  {
    id: 'triolite',
    name: 'TRIOLITE',
    role: 'Refined Core',
    description: 'Fused from Schreiber under extreme pressure. The rarest material in the known stars.',
    color: '#c69bff',
    glow: 'rgba(198, 155, 255, 0.55)',
  },
  {
    id: 'nft',
    name: 'NFT',
    role: 'Ownable Artifact',
    description: 'Triolite forged into a one-of-a-kind artifact that is truly yours.',
    color: '#f4f0ff',
    glow: 'rgba(244, 240, 255, 0.5)',
  },
];

/** Conversion chains for the economy diagram. */
export const ECONOMY_CHAINS: ResourceId[][] = [
  ['rego', 'kama'],
  ['oliva', 'joro', 'schreiber', 'triolite', 'nft'],
];
