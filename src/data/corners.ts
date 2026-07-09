import type { Corner } from '../types';
import metadata from '../../public/scenes/metadata.json';

// We define custom properties for known scenes to keep them rich,
// and fallback automatically for any new scenes that aren't manually defined.
const customProps: Record<string, Partial<Corner>> = {
  "winter-nyc-sunset": {
    description: "Sunset view over snowy NYC",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #4b5563, #1f2937)"
  },
  "soothing-rain-forest": {
    description: "Soothing rain sounds in nature",
    ambient: "Rain",
    gradient: "linear-gradient(135deg, #2a4d3b, #132a1e)"
  },
  "sweden-christmas-penthouse": {
    description: "Cozy winter night near window",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #b91c1c, #450a0a)"
  },
  "morning-sea-cabin": {
    description: "Sunny cabin overlooking calm sea",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0284c7, #0369a1)"
  },
  "autumn-lakeside-cafe": {
    description: "Cozy outdoor autumn coffee shop",
    ambient: "Cafe Ambience",
    gradient: "linear-gradient(135deg, #b45309, #78350f)"
  },
  "winter-forest-cabin": {
    description: "Snowy forest view with fireplace",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #4b5563, #1f2937)"
  },
  "coastal-beach-lofi": {
    description: "Lofi beats on summer beach",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0d9488, #115e59)"
  },
  "seaside-coffee-morning": {
    description: "Peaceful morning by the sea",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0e7490, #155e75)"
  },
  "mountain-sunrise-retreat": {
    description: "Sunrise with peaceful bird songs",
    ambient: "Forest Birds",
    gradient: "linear-gradient(135deg, #ca8a04, #854d0e)"
  },
  "alpine-morning-desk": {
    description: "Mountain morning view deep focus",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #38bdf8, #0369a1)"
  },
  "alpine-escapes-house": {
    description: "Luxury cabin in snowy mountains",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #0f766e, #115e59)"
  },
  "countryside-morning-river": {
    description: "River flow and bird songs",
    ambient: "Forest Birds",
    gradient: "linear-gradient(135deg, #15803d, #166534)"
  },
  "summer-mountain-cabin": {
    description: "Mountain cabin by the lake",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0284c7, #075985)"
  },
  "lakeside-calm-rest": {
    description: "Lakeside view for deep rest",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0ea5e9, #0369a1)"
  },
  "piano-lakeside-cabin": {
    description: "Lakeside cabin with fireplace sounds",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #854d0e, #713f12)"
  },
  "calm-water-cabin": {
    description: "Calm water and birds singing",
    ambient: "Forest Birds",
    gradient: "linear-gradient(135deg, #0d9488, #115e59)"
  },
  "clear-water-firelight": {
    description: "Clear lake water with fireplace",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #b45309, #7c2d12)"
  },
  "lakeside-cabin-retreat": {
    description: "Lakeside cabin peaceful retreat",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0284c7, #1e3a8a)"
  },
  "home-office-ambience": {
    description: "Creative home office space",
    ambient: "Cafe Ambience",
    gradient: "linear-gradient(135deg, #4b5563, #374151)"
  },
  "programming-focus": {
    description: "Deep focus study music",
    ambient: "Summer Night",
    gradient: "linear-gradient(135deg, #1e1b4b, #312e81)"
  },
  "snowy-mountain-ocean": {
    description: "Snowy mountain ocean views",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #475569, #334155)"
  },
  "flow-state-ambient": {
    description: "Deep focus flow state",
    ambient: "Forest Birds",
    gradient: "linear-gradient(135deg, #15803d, #14532d)"
  },
  "relaxing-coastal-focus": {
    description: "Relaxing coastal atmosphere",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)"
  },
  "dark-academia-library": {
    description: "Dark academia study library",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #78350f, #451a03)"
  },
  "coastal-cabin-study": {
    description: "Coastal cabin ocean view",
    ambient: "Waves",
    gradient: "linear-gradient(135deg, #0369a1, #075985)"
  },
  "binaural-study": {
    description: "Binaural study brainwave music",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #4f46e5, #3730a3)"
  },
  "dark-concentration": {
    description: "Dark ambient concentration sounds",
    ambient: "Forest Night",
    gradient: "linear-gradient(135deg, #111827, #030712)"
  },
  "spring-seaside-sunset": {
    description: "Spring seaside sunset balcony",
    ambient: "Fireplace",
    gradient: "linear-gradient(135deg, #ea580c, #9a3412)"
  },
  "ambient-soundscapes": {
    description: "Deep focus ambient soundscapes",
    ambient: "Wind",
    gradient: "linear-gradient(135deg, #374151, #111827)"
  },
  "cozy-morning-jazz": {
    description: "Cozy morning focus jazz",
    ambient: "Cafe Ambience",
    gradient: "linear-gradient(135deg, #ca8a04, #854d0e)"
  },
  "indoor-cozy-jazz": {
    description: "Indoor cozy jazz playlist",
    ambient: "Cafe Ambience",
    gradient: "linear-gradient(135deg, #d97706, #92400e)"
  }
};

// Map metadata entries to Corner[] dynamically
export const CORNERS: Corner[] = metadata.map((item) => {
  const id = item.filename.replace('.mp4', '');
  const props = customProps[id] || {};
  return {
    id,
    name: item.title,
    description: props.description || "Study scene from YouTube",
    ambient: props.ambient || "Wind",
    gradient: props.gradient || "linear-gradient(135deg, #1e293b, #0f172a)"
  };
});
