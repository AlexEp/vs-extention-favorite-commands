const vscode = require('vscode');

// --- CONSTANTS ---
const CONFIG_SECTION = 'favoriteGitCommands';
const CONFIG_KEY_FOLDERS = 'folders';
const DEFAULT_FOLDER_NAME = 'default';

// --- ACTIVATION FUNCTION ---

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    // Create the Tree Data Provider
    const commandProvider = new CommandProvider();
    const folders = await commandProvider.getFolders();
    await commandProvider.saveFolders(folders);

    const treeView = vscode.window.createTreeView('favoriteGitCommandsView', {
        treeDataProvider: commandProvider,
        dragAndDropController: new CommandDragAndDropController(commandProvider)
    });
    context.subscriptions.push(treeView);

    // Register all commands
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.refresh', () =>
            commandProvider.refresh()
        )
    );

    // Folder Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.addFolder', () =>
            actions.addFolder(commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.renameFolder', (item) =>
            actions.renameFolder(item, commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.deleteFolder', (item) =>
            actions.deleteFolder(item, commandProvider)
        )
    );

    // Command Item Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.addCommand', (item) =>
            actions.addCommand(item, commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.editCommand', (item) =>
            actions.editCommand(item, commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.deleteCommand', (item) =>
            actions.deleteCommand(item, commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.runCommand', (item) =>
            actions.runCommand(item)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.copyToClipboard', (item) =>
            actions.copyToClipboard(item)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.moveCommand', (item) =>
            actions.moveCommand(item, commandProvider)
        )
    );

    // Import/Export Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.importCommands', () =>
            actions.importCommands(commandProvider)
        )
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('favorite-git-commands.exportCommands', () =>
            actions.exportCommands(commandProvider)
        )
    );

    // Refresh tree when configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CONFIG_SECTION)) {
                commandProvider.refresh();
            }
        })
    );
}

// --- TREE DATA PROVIDER ---

class CommandProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        return element;
    }

    async getChildren(element) {
        const folders = await this.getFolders();

        if (element instanceof FolderTreeItem) {
            // Children of a Folder are Commands
            return element.commands.map((cmd, index) => {
                return new CommandTreeItem(
                    cmd.label,
                    cmd.command,
                    element.folderIndex,
                    index
                );
            });
        }

        if (!element) {
            // Root elements are Folders
            return folders.map((folder, index) => {
                return new FolderTreeItem(
                    folder.name,
                    folder.commands || [], // Ensure commands array exists
                    index,
                    folder.name === DEFAULT_FOLDER_NAME // Check if it's the default folder
                );
            });
        }

        return []; // Command items have no children
    }

    /**
     * Reads folders from settings, ensuring default folder exists.
     */
    async getFolders() {
        let folders = vscode.workspace.getConfiguration(CONFIG_SECTION).get(CONFIG_KEY_FOLDERS, []);

        if (!Array.isArray(folders)) {
            folders = [];
        }

        let defaultFolder = folders.find(f => f.name === DEFAULT_FOLDER_NAME);

        if (!defaultFolder) {
            // If default folder doesn't exist, create it
            defaultFolder = { name: DEFAULT_FOLDER_NAME, commands: [] };
            folders.unshift(defaultFolder); // Add to the beginning
            // Don't save here, let the caller decide when to save
        }

        return folders;
    }

    /**
     * Saves the complete folder structure back to settings.
     * @param {Array<Object>} folders 
     */
    async saveFolders(folders) {
        await vscode.workspace.getConfiguration(CONFIG_SECTION).update(
            CONFIG_KEY_FOLDERS,
            folders,
            vscode.ConfigurationTarget.Global
        );
    }

    /**
     * Moves a tree item (folder or command) to a new position.
     * @param {FolderTreeItem | CommandTreeItem} item The item to move.
     * @param {FolderTreeItem} targetFolder The folder to move the item into.
     * @param {number} newIndex The new index for the item.
     */
    async moveItem(item, targetFolder, newIndex) {
        const folders = await this.getFolders();

        if (item instanceof FolderTreeItem) {
            // Move Folder
            const folderToMove = folders.splice(item.folderIndex, 1)[0];
            folders.splice(newIndex, 0, folderToMove);
        } else if (item instanceof CommandTreeItem) {
            // Move Command
            const sourceFolder = folders[item.folderIndex];
            const commandToMove = sourceFolder.commands.splice(item.commandIndex, 1)[0];

            if (targetFolder) {
                const destinationFolderIndex = folders.findIndex(f => f.name === targetFolder.label);
                if (destinationFolderIndex !== -1) {
                    const destinationFolder = folders[destinationFolderIndex];
                    destinationFolder.commands.splice(newIndex, 0, commandToMove);
                }
            } else {
                // This case might happen if dropping on the root
                // For simplicity, we'll add it to the same folder at the new position
                sourceFolder.commands.splice(newIndex, 0, commandToMove);
            }
        }

        await this.saveFolders(folders);
        this.refresh();
    }
}

// --- DRAG AND DROP CONTROLLER ---

class CommandDragAndDropController {
    constructor(provider) {
        this.provider = provider;
        this.supportedMimeTypes = ['application/vnd.code.tree.favoriteGitCommandsView'];
    }

    handleDrag(source, dataTransfer, token) {
        if (source.length > 1) {
            // For simplicity, only allow dragging one item at a time
            return;
        }
        const item = source[0];
        if (item instanceof FolderTreeItem && item.isDefault) {
            // Prevent dragging the default folder
            return;
        }
        dataTransfer.set(this.supportedMimeTypes[0], new vscode.DataTransferItem(item));
    }

    async handleDrop(target, dataTransfer, token) {
        const transferItem = dataTransfer.get(this.supportedMimeTypes[0]);
        if (!transferItem) {
            return;
        }

        const draggedItem = transferItem.value;
        let targetFolder;
        let newIndex;

        if (target) {
            if (target instanceof FolderTreeItem) {
                targetFolder = target;
                if (draggedItem instanceof CommandTreeItem) {
                    newIndex = target.commands.length; // Drop at the end of the folder
                } else if (draggedItem instanceof FolderTreeItem) {
                    newIndex = target.folderIndex; // Drop before the target folder
                }
            } else if (target instanceof CommandTreeItem) {
                const folders = await this.provider.getFolders();
                const targetFolderData = folders[target.folderIndex];
                targetFolder = new FolderTreeItem(targetFolderData.name, targetFolderData.commands, target.folderIndex);
                newIndex = target.commandIndex; // Drop at the position of the target command
            }
        } else {
            // Dropping on the root of the tree
            if (draggedItem instanceof FolderTreeItem) {
                const folders = await this.provider.getFolders();
                newIndex = folders.length;
            } else {
                // Don't allow dropping commands on the root
                return;
            }
        }

        this.provider.moveItem(draggedItem, targetFolder, newIndex);
    }
}

// --- TREE ITEM CLASSES ---

class FolderTreeItem extends vscode.TreeItem {
    /**
     * @param {string} label The folder name
     * @param {Array<Object>} commands Array of command objects
     * @param {number} folderIndex Its index in the settings array
     * @param {boolean} isDefault Is this the default folder?
     */
    constructor(label, commands, folderIndex, isDefault = false) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.commands = commands;
        this.folderIndex = folderIndex;
        this.isDefault = isDefault;

        this.contextValue = 'folderItem';
        this.iconPath = new vscode.ThemeIcon('folder');
        this.tooltip = `${commands.length} command(s)`;
    }
}

class CommandTreeItem extends vscode.TreeItem {
    /**
     * @param {string} label The command's friendly name
     * @param {string} commandString The command to execute
     * @param {number} folderIndex Index of its parent folder
     * @param {number} commandIndex Index of the command within its folder
     */
    constructor(label, commandString, folderIndex, commandIndex) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.commandString = commandString;
        this.folderIndex = folderIndex;
        this.commandIndex = commandIndex;

        this.contextValue = 'commandItem';
        this.iconPath = new vscode.ThemeIcon('terminal');
        this.tooltip = `Cmd: ${this.commandString}`;
    }
}


// --- ACTIONS LOGIC ---
// Encapsulated in an 'actions' object for clarity
const actions = {
    /**
     * Gets the active terminal or creates a new one.
     */
    getTerminal() {
        let terminal = vscode.window.activeTerminal;
        if (!terminal) {
            terminal = vscode.window.createTerminal("CLI Favorites");
        }
        terminal.show();
        return terminal;
    },

    /**
     * Runs the command in the terminal.
     * @param {CommandTreeItem} item
     */
    runCommand(item) {
        if (!item || !(item instanceof CommandTreeItem)) return;
        const terminal = this.getTerminal();
        terminal.sendText(item.commandString);
    },

    /**
     * Copies the command to the clipboard.
     * @param {CommandTreeItem} item
     */
    async copyToClipboard(item) {
        if (!item || !(item instanceof CommandTreeItem)) return;
        await vscode.env.clipboard.writeText(item.commandString);
        vscode.window.showInformationMessage(`Copied "${item.commandString}" to clipboard.`);
    },

    /**
     * Adds a new empty folder.
     * @param {CommandProvider} provider
     */
    async addFolder(provider) {
        const folderName = await vscode.window.showInputBox({
            prompt: 'Enter a name for the new folder',
            placeHolder: 'e.g., "Kubernetes Commands"'
        });
        if (!folderName) return;

        const folders = await provider.getFolders();
        folders.push({ name: folderName, commands: [] });
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Renames a folder (unless it's the default).
     * @param {FolderTreeItem} item
     * @param {CommandProvider} provider
     */
    async renameFolder(item, provider) {
        if (!item || !(item instanceof FolderTreeItem)) return;
        if (item.isDefault) {
            vscode.window.showErrorMessage('The "default" folder cannot be renamed.');
            return;
        }

        const newName = await vscode.window.showInputBox({
            prompt: 'Enter a new name for the folder',
            value: item.label
        });
        if (!newName || newName === item.label) return;

        const folders = await provider.getFolders();
        folders[item.folderIndex].name = newName;
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Deletes a folder (unless it's the default).
     * @param {FolderTreeItem} item
     * @param {CommandProvider} provider
     */
    async deleteFolder(item, provider) {
        if (!item || !(item instanceof FolderTreeItem)) return;
        if (item.isDefault) {
            vscode.window.showErrorMessage('The "default" folder cannot be deleted.');
            return;
        }

        const confirm = await vscode.window.showQuickPick(['No', 'Yes'], {
            placeHolder: `Are you sure you want to delete the folder "${item.label}" and all its commands?`
        });
        if (confirm !== 'Yes') return;

        const folders = await provider.getFolders();
        folders.splice(item.folderIndex, 1);
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Adds a new command to a specific folder.
     * @param {FolderTreeItem} item
     * @param {CommandProvider} provider
     */
    async addCommand(item, provider) {
        if (!item || !(item instanceof FolderTreeItem)) {
            vscode.window.showErrorMessage('Please add a command by clicking the "+" icon on a folder.');
            return;
        }

        const label = await vscode.window.showInputBox({
            prompt: 'Enter a label for the command',
            placeHolder: 'e.g., "Git Status"'
        });
        if (!label) return;

        const command = await vscode.window.showInputBox({
            prompt: 'Enter the command to run',
            placeHolder: 'e.g., "git status"'
        });
        if (command === undefined) return; // User cancelled

        const folders = await provider.getFolders();
        folders[item.folderIndex].commands.push({ label, command });
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Edits an existing command.
     * @param {CommandTreeItem} item
     * @param {CommandProvider} provider
     */
    async editCommand(item, provider) {
        if (!item || !(item instanceof CommandTreeItem)) return;

        const folders = await provider.getFolders();
        const oldCommand = folders[item.folderIndex].commands[item.commandIndex];

        const newLabel = await vscode.window.showInputBox({
            prompt: 'Edit command label',
            value: oldCommand.label
        });
        if (newLabel === undefined) return; // User cancelled

        const newCommand = await vscode.window.showInputBox({
            prompt: 'Edit command string',
            value: oldCommand.command
        });
        if (newCommand === undefined) return; // User cancelled

        folders[item.folderIndex].commands[item.commandIndex] = {
            label: newLabel,
            command: newCommand
        };
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Moves a command to a different folder.
     * @param {CommandTreeItem} item
     * @param {CommandProvider} provider
     */
    async moveCommand(item, provider) {
        if (!item || !(item instanceof CommandTreeItem)) return;

        const folders = await provider.getFolders();

        // Filter out the current folder from available targets
        const availableFolders = folders
            .map((f, index) => ({ label: f.name, index: index }))
            .filter((f, index) => index !== item.folderIndex);

        if (availableFolders.length === 0) {
            vscode.window.showInformationMessage('No other folders available to move to.');
            return;
        }

        const selectedFolder = await vscode.window.showQuickPick(availableFolders, {
            placeHolder: `Select a folder to move "${item.label}" to`
        });

        if (!selectedFolder) return;

        const commandToMove = folders[item.folderIndex].commands.splice(item.commandIndex, 1)[0];
        folders[selectedFolder.index].commands.push(commandToMove);

        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Deletes an existing command.
     * @param {CommandTreeItem} item
     * @param {CommandProvider} provider
     */
    async deleteCommand(item, provider) {
        if (!item || !(item instanceof CommandTreeItem)) return;

        const confirm = await vscode.window.showQuickPick(['No', 'Yes'], {
            placeHolder: `Are you sure you want to delete "${item.label}"?`
        });
        if (confirm !== 'Yes') return;

        const folders = await provider.getFolders();
        folders[item.folderIndex].commands.splice(item.commandIndex, 1);
        await provider.saveFolders(folders);
        provider.refresh();
    },

    /**
     * Exports all commands to a JSON file.
     * @param {CommandProvider} provider
     */
    async exportCommands(provider) {
        const folders = await provider.getFolders();
        const jsonContent = JSON.stringify(folders, null, 2);

        try {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Export Commands',
                filters: { 'JSON': ['json'] },
                defaultUri: vscode.Uri.file('cli-favorites.json')
            });

            if (uri) {
                // VS Code uses Uint8Array for file writing
                const writeData = new (typeof TextEncoder === 'undefined' ? require('util').TextEncoder : TextEncoder)().encode(jsonContent);
                await vscode.workspace.fs.writeFile(uri, writeData);
                vscode.window.showInformationMessage('Commands exported successfully!');
            }
        } catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(`Failed to export commands: ${err.message}`);
        }
    },

    /**
     * Imports commands from a JSON file, overwriting current commands.
     * @param {CommandProvider} provider
     */
    async importCommands(provider) {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                openLabel: 'Import Commands',
                filters: { 'JSON': ['json'] }
            });

            if (!uris || uris.length === 0) return; // User cancelled

            const uri = uris[0];
            const readData = await vscode.workspace.fs.readFile(uri);
            const jsonContent = new (typeof TextDecoder === 'undefined' ? require('util').TextDecoder : TextDecoder)().decode(readData);

            const importedFolders = JSON.parse(jsonContent);

            // Basic validation
            if (!Array.isArray(importedFolders) || (importedFolders.length > 0 && (importedFolders[0].name === undefined || importedFolders[0].commands === undefined))) {
                throw new Error('Invalid JSON format. Expected an array of folders.');
            }

            const confirm = await vscode.window.showQuickPick(['No', 'Yes'], {
                placeHolder: 'Are you sure you want to import? This will overwrite ALL current commands.'
            });

            if (confirm === 'Yes') {
                await provider.saveFolders(importedFolders);
                provider.refresh();
                vscode.window.showInformationMessage('Commands imported successfully!');
            }

        } catch (err) {
            console.error(err);
            vscode.window.showErrorMessage(`Failed to import commands: ${err.message}`);
        }
    }
};

// --- DEACTIVATION FUNCTION ---
function deactivate() { }

module.exports = {
    activate,
    deactivate
};
