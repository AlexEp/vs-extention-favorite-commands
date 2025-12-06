# Gemini Agent Changes

## 2025-11-07

### Changes

- Fixed a race condition that occurred when creating the default folder.
- Updated the `CHANGELOG.md` and `package.json` files to reflect these changes.

## 2025-12-06

### Changes

- Renamed "Paste Command" to "Copy to Clipboard".
- Updated `extension.js` to implement `vscode.env.clipboard.writeText`.
- Cleaned up syntax errors (stray quotes) in `extension.js`.
- Updated `package.json` with new command ID and icon.
