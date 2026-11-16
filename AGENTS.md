# Agent instructions (mora)

Read `context.md` first. Keep it current when the structure or the rules change.

## Code layout: keep files small

- A file over about 500 lines is split before a feature is added to it: move a part of
  the UI to its own component, a pure function to its own module (with a test), or a block
  of state and actions to its own hook.
- Pure logic (no React, no Firebase) lives in its own module and has unit tests.
- Pure logic goes in `src/core/` (with tests). Store state goes in the matching slice in
  `src/store/slices/`. `src/platform/` holds browser and Firebase adapters only and never
  imports the store.

## Git: no co-author

Never add `Co-Authored-By:` (or any other author line) to a commit message
or a PR description. Git already records the author.

## Writing: no em dash

Never write the em dash `—` (U+2014), and never its escapes `&mdash;`,
`&#8212;` or `\u2014`. This covers everything: code, comments, UI text,
docs, commit messages and AI prompts.

Use a plain hyphen with spaces (` - `), a comma, a colon, or two short
sentences instead.
