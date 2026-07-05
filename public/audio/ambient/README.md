# mora - Audio Files directory

Drop your `.mp3` files here so that the app's sound engine can play them.

## File Placement

*   **Ambience audio**: Place in `public/audio/ambient/<slug>.mp3` (e.g., `public/audio/ambient/city-walk.mp3` for the "City Walk" corner ambience, or `public/audio/ambient/rain-on-window.mp3` for "Rain on Window").
*   **Background music**: Place in `public/audio/music/<slug>.mp3` (e.g., `public/audio/music/lo-fi.mp3` for "Lo-fi", or `public/audio/music/deep-focus.mp3` for "Deep Focus").

## Naming Convention

All names are converted to lowercase, spaces/underscores are replaced with hyphens (`-`), and non-alphanumeric/non-hyphen characters are stripped out.

Examples:
*   "City Walk" -> `city-walk.mp3`
*   "Lo-fi" -> `lo-fi.mp3`
*   "Rain on Window" -> `rain-on-window.mp3`
