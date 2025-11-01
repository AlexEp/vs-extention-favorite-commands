Favorite CLI Commands VS Code Extension

A simple VS Code extension to store, organize, and run your favorite or most-used CLI commands directly from the sidebar.

Stop remembering complex commands and start organizing them into folders. Run or paste commands directly into your terminal with a single click.

Features

Command Organization: Store commands in a clean, collapsible folder structure.

Default Folder: A "default" folder is always present for your most common commands.

Click to Run: Click the Run button ($(play)) to execute the command in your active terminal.

Click to Paste: Click the Paste button ($(clippy)) to paste the command into your terminal without running it.

Full CRUD:

Folders: Add, Rename, and Delete folders.

Commands: Add, Edit, and Delete commands within any folder.

Import/Export: Back up all your commands and folders to a JSON file, and import them later or on another machine.

How to Use

Managing Folders

Add Folder: Click the $(new-folder) icon in the sidebar header.

Rename Folder: Hover over a folder and click the $(edit) icon. (Cannot rename "default" folder).

Delete Folder: Hover over a folder and click the $(trash) icon. (Cannot delete "default" folder).

Managing Commands

Add Command: Hover over a folder and click the $(add) icon.

Run Command: Hover over a command and click the $(play) icon.

Paste Command: Hover over a command and click the $(clippy) icon.

Edit Command: Hover over a command and click the $(edit) icon.

Delete Command: Hover over a command and click the $(trash) icon.

Import / Export

Export: Click the $(export) icon in the sidebar header to save all your folders and commands to a cli-favorites.json file.

Import: Click the $(json) icon in the sidebar header to select a JSON file. This will overwrite all your current commands.

Configuration

You can also manage your commands directly by editing your settings.json file (Ctrl+Shift+P > Open User Settings (JSON)). The commands are stored under the favoriteGitCommands.folders property.

"favoriteGitCommands.folders": [
  {
    "name": "default",
    "commands": [
      {
        "label": "Git Status",
        "command": "git status"
      }
    ]
  },
  {
    "name": "Docker",
    "commands": [
      {
        "label": "List Running Containers",
        "command": "docker ps"
      },
      {
        "label": "Prune System",
        "command": "docker system prune -a"
      }
    ]
  }
]


Author: Alexey Eppelman
License: MIT