# Feature Folders

Status: planned ownership structure, not wired.

These folders reserve clear boundaries for future feature work. Do not import from a feature folder at runtime until that feature has a scoped implementation PR, tests, and docs.

Current production behavior still lives in the existing `src/` modules. Move code here only when it reduces active complexity without changing public routes or response shapes unexpectedly.
