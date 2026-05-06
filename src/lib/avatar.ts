const BG_COLORS = "b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf"

export const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${BG_COLORS}&radius=10`

export const randomSeed = () => Math.random().toString(36).slice(2, 10)
