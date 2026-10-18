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
    gradient: props.gradient || "linear-gradient(135deg, #3a3a3a, #1a1a1a)"
  };
});
