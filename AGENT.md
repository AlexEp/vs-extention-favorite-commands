# AI Agent Guide - Favorite CLI Commands

## Project Overview
**Favorite CLI Commands** is a VS Code extension that allows users to store, organize, and execute their favorite or frequently used CLI commands directly from the VS Code sidebar. It aims to simplify workflow by reducing the need to memorize complex commands.

## Goals
- **Productivity**: Enable quick access to common commands.
- **Organization**: Group commands into folders.
- **Ease of Use**: Simple UI for adding, editing, deleting, and running commands.
- **Portability**: Import/Export functionality for backup and sharing.

## Architecture
The project follows a standard VS Code extension architecture without a build step (raw JavaScript).

### Core Components
1.  **Extension Entry Point (`extension.js`)**:
    -   `activate(context)`: Registers commands, providers, and views.
    -   **`CommandProvider`**: Implements `vscode.TreeDataProvider`. Manages the data model (folders and commands) and updates the view.
    -   **`CommandDragAndDropController`**: Handles drag-and-drop logic for reordering items.
    -   **Tree Items**:
        -   `FolderTreeItem`: Represents a folder containing commands.
        -   `CommandTreeItem`: Represents an executable command.
2.  **Configuration**:
    -   Data is stored in VS Code's global/workspace settings under `favoriteGitCommands.folders`.
    -   Schema is defined in `package.json`.
3.  **UI**:
    -   Contributes a view container `favorite-git-commands-container` to the Activity Bar.
    -   Contributes a view `favoriteGitCommandsView`.

### Data Model
The data is stored as an array of Folder objects in `settings.json`:
```json
[
  {
    "name": "FolderName",
    "commands": [
      { "label": "Command Label", "command": "actual command" }
    ]
  }
]
```

## Tech Stack
-   **Runtime**: Node.js (VS Code Extension Host)
-   **Language**: JavaScript (CommonJS)
-   **Framework**: VS Code Extension API
-   **Linting**: ESLint

## Rules & Constraints
1.  **Default Folder**:
    -   A folder named "default" always exists.
    -   It cannot be renamed or deleted by the user via the UI.
2.  **Data Persistence**:
    -   All changes are saved immediately to `vscode.workspace.getConfiguration`.
3.  **Drag and Drop**:
    -   Supports moving commands between folders.
    -   Supports reordering folders.
    -   Supports reordering commands within a folder.

## Key Files
-   `extension.js`: The entire logic of the extension.
-   `package.json`: Extension manifest, command definitions, and configuration schema.
-   `README.md`: User documentation.
-   `GEMINI.md`: Changelog/Notes for AI agents (historical).

## Development Workflow
-   **Run**: Press `F5` in VS Code to launch the Extension Development Host.
-   **Reload**: Use the "Reload Window" command in the host to apply changes.
-   **Lint**: Run `npm run lint` (if configured).

