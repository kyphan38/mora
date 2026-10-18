import type { Corner } from '../types';
import metadata from './scenes.json';

// Keyed by the scene file id in src/data/scenes.json (files live in Cloud Storage).
// Gradients are gray: they only show when the image is missing.
const customProps: Record<string, Partial<Corner>> = {
  "scene_887eec": { description: "Jazz and a quiet reading nook", ambient: "Room Tone" },
  "scene_e3f92c": { description: "Soft lounge by the fire", ambient: "Fireplace" },
  "scene_0a850b": { description: "Evening living room, low light", ambient: "Fireplace" },
  "scene_850ce5": { description: "A calm seat by the window", ambient: "Rain on Window" },
  "scene_185b83": { description: "Warm cafe with soft jazz", ambient: "Cafe Ambience" },
  "scene_2459b0": { description: "Porch view, slow afternoon", ambient: "Wind" },
  "scene_072605": { description: "Cabin by the sea, fire on", ambient: "Fireplace" },
  "scene_6be729": { description: "Ocean sunset from the room", ambient: "Waves" },
  "scene_8fcbb2": { description: "Chalet above a turquoise lake", ambient: "Wind" },
  "scene_5eefed": { description: "Mountains passing the car window", ambient: "City Walk" },
  "scene_b4529d": { description: "Clouds over a quiet valley lake", ambient: "Wind" },
  "scene_61ddfb": { description: "Empty street lights at night", ambient: "City Terrace Night" },
  "scene_e7db50": { description: "A small coffee kiosk after dark", ambient: "City Terrace Night" },
  "scene_85308c": { description: "Green path through a spring park", ambient: "Forest Night" },
  "scene_579866": { description: "Open road through a green valley", ambient: "Wind" },
  "scene_1cbf6f": { description: "Still glacier lake under snowy peaks", ambient: "Winter Wind" },
  "scene_8e6788": { description: "A dim hall full of quiet readers", ambient: "Room Tone" },
  "scene_8b843c": { description: "Walking toward the mountains", ambient: "Wind" },
  "scene_7eb481": { description: "Mountain terrace on a bright day", ambient: "Wind" },
  "scene_a33260": { description: "Plants and warm light at a coffee stall", ambient: "Cafe Ambience" },
  "scene_b088d1": { description: "Church tower in an alpine village", ambient: "Wind" },
  "scene_2ccd1e": { description: "Late work under a desk lamp", ambient: "Room Tone" },
  "scene_5b831a": { description: "White coffee kiosk under trees", ambient: "Cafe Ambience" },
  "scene_5df6fd": { description: "Coffee bags on a clean white shelf", ambient: "Cafe Ambience" },
  "scene_72bf2a": { description: "Concrete counter, soft light", ambient: "Room Tone" },
  "scene_16902e": { description: "Green meadows below sharp peaks", ambient: "Wind" },
  "scene_12f142": { description: "Warm window on a dark street", ambient: "City Terrace Night" },
  "scene_2182a9": { description: "Old village on a still lake", ambient: "Waves" },
  "scene_1a56c6": { description: "Fog drifting over pine hills", ambient: "Rain" },
  "scene_209863": { description: "A quiet bakery on the corner", ambient: "Cafe Ambience" },
  "scene_17dc86": { description: "Plants outside a white shop", ambient: "City Walk" },
  "scene_56d7f9": { description: "A waterfall deep in the jungle", ambient: "Rain" },
  "scene_f29f23": { description: "Resting on the grass in the park", ambient: "Wind" },
  "scene_3d442a": { description: "Cafe glow through big windows", ambient: "Cafe Ambience" },
};

// Map metadata entries to Corner[] dynamically
export const CORNERS: Corner[] = metadata.map((item) => {
  const id = item.filename.replace('.mp4', '');
  const props = customProps[id] || {};
  return {
    id,
    name: item.title,
    description: props.description || "",
    ambient: props.ambient || "Wind",
    gradient: props.gradient || "linear-gradient(135deg, #3a3a3a, #1a1a1a)",
    portrait: (item as { portrait?: boolean }).portrait === true,
    still: (item as { still?: boolean }).still === true
  };
});
