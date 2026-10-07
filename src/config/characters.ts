/**
 * Optional separate character cut-outs.
 *
 * The hero already animates the Astrion painted into the key art (breathing, capes,
 * hair, armour lights). If you have transparent PNG/WebP cut-outs that match the
 * painting, list them here and they will be layered on top with their own breathing
 * and parallax — e.g.
 *
 *   { who: 'male', src: '/assets/characters/astrion-male.webp', x: 0, y: 330, w: 490, h: 611 }
 *
 * x / y / w / h are the cut-out's placement in source-image pixels (1672 x 941).
 */
export interface CharacterArt {
  who: 'male' | 'female';
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const CHARACTER_ART: CharacterArt[] = [];
