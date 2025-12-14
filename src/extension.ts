import * as vscode from "vscode";
import { BranchNotesView } from "./BranchNotesView";
import { NoteStorageService } from "./NoteStorageService";
import { BranchMonitor } from "./BranchMonitor";
import { GitUserService } from "./GitUserService";

let storageService: NoteStorageService | null = null;
let branchMonitor: BranchMonitor | null = null;
let gitUserService: GitUserService | null = null;
let branchNotesView: BranchNotesView | null = null;

export function activate(context: vscode.ExtensionContext) {
  // Get workspace root folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage(
      "Branch Notes: No workspace folder found. Please open a folder to use this extension."
    );
    return;
  }

  // Initialize storage service
  storageService = new NoteStorageService(workspaceFolder.uri.fsPath);

  // Initialize Git user service
  gitUserService = new GitUserService();

  // Initialize branch monitor
  branchMonitor = new BranchMonitor(storageService, context);
  branchMonitor.initialize();

  // Register command to open the note editor
  const createNoteCommand = vscode.commands.registerCommand(
    "branchNotes.createNote",
    () => {
      openNoteEditor(context);
    }
  );

  // Register command to view a note
  const viewNoteCommand = vscode.commands.registerCommand(
    "branchNotes.viewNote",
    async (branchName: string, note?: any) => {
      if (!storageService) {
        return;
      }

      let noteToView = note;
      if (!noteToView) {
        // If no specific note passed, get the latest one
        noteToView = await storageService.getLatestNote(branchName);
      }

      if (noteToView) {
        showNoteInWebview(
          branchName,
          noteToView.content,
          noteToView.author,
          noteToView.timestamp
        );
      }
    }
  );

  // Register command to delete a note or branch
  const deleteNoteCommand = vscode.commands.registerCommand(
    "branchNotes.deleteNote",
    async (item: any) => {
      if (!storageService || !branchNotesView) {
        return;
      }

      // Check if it's a branch item or note item
      if (item.contextValue === "branchItem") {
        // Delete entire branch history
        const branchName = item.branchName;
        const confirm = await vscode.window.showWarningMessage(
          `Delete ALL notes for branch "${branchName}"?`,
          "Delete All",
          "Cancel"
        );
        if (confirm === "Delete All") {
          await storageService.deleteBranch(branchName);
          branchNotesView.refresh();
          vscode.window.showInformationMessage(
            `All notes for branch "${branchName}" deleted.`
          );
        }
      } else if (item.contextValue === "noteItem") {
        // Delete specific note
        const branchName = item.branchName;
        const noteId = item.note.id;
        const confirm = await vscode.window.showWarningMessage(
          `Delete this note?`,
          "Delete",
          "Cancel"
        );
        if (confirm === "Delete") {
          await storageService.deleteNote(branchName, noteId);
          branchNotesView.refresh();
          vscode.window.showInformationMessage(`Note deleted.`);
        }
      }
    }
  );

  // Register sidebar panel
  branchNotesView = new BranchNotesView(storageService);
  vscode.window.registerTreeDataProvider("branchNotesView", branchNotesView);

  context.subscriptions.push(
    createNoteCommand,
    viewNoteCommand,
    deleteNoteCommand
  );
}

export function deactivate() {}

// Function to open rich text editor
async function openNoteEditor(context: vscode.ExtensionContext) {
  if (!branchMonitor || !storageService || !gitUserService) {
    vscode.window.showErrorMessage(
      "Branch Notes: Service not initialized properly."
    );
    return;
  }

  const currentBranch = branchMonitor.getCurrentBranch();
  if (!currentBranch) {
    vscode.window.showWarningMessage(
      "Branch Notes: Unable to detect current branch. Make sure you're in a Git repository."
    );
    return;
  }

  // Get author name
  const author = await gitUserService.getUsername();

  const panel = vscode.window.createWebviewPanel(
    "branchNoteEditor",
    `Create Branch Note: ${currentBranch}`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  // HTML content for the rich-text editor with formatting toolbar
  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Create Branch Note</title>
      <style>
        body { 
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .branch-info { 
          font-size: 14px;
          color: var(--vscode-descriptionForeground);
        }
        .author-info {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
        }
        h2 {
          margin: 0 0 15px 0;
          color: var(--vscode-foreground);
        }
        .toolbar {
          margin-bottom: 10px;
          padding: 8px;
          background: var(--vscode-editor-background);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 4px;
          display: flex;
          gap: 8px;
        }
        .toolbar button {
          padding: 6px 12px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .toolbar button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        #editor { 
          width: 90%; 
          min-height: 300px; 
          border: 1px solid var(--vscode-input-border);
          padding: 10px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border-radius: 4px;
          outline: none;
        }
        #editor:focus {
          border-color: var(--vscode-focusBorder);
        }
        .actions {
          margin-top: 15px;
          display: flex;
          gap: 10px;
        }
        .save-btn {
          padding: 8px 16px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 14px;
        }
        .save-btn:hover {
          background: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h2>Create Branch Note</h2>
          <div class="branch-info">📝 Branch: <strong>${currentBranch}</strong></div>
        </div>
        <div class="author-info">
          👤 Author: <strong>${author}</strong>
        </div>
      </div>

      <div class="toolbar">
        <button onclick="formatText('bold')" title="Bold (Ctrl+B)">
          <strong>B</strong>
        </button>
        <button onclick="insertList('ul')" title="Bullet List">
          • List
        </button>
        <button onclick="insertList('ol')" title="Numbered List">
          1. List
        </button>
      </div>

      <div id="editor" contenteditable="true"></div>

      <div class="actions">
        <button class="save-btn" id="saveBtn">💾 Save Note</button>
      </div>

      <script>
        const vscodeApi = acquireVsCodeApi();
        const editor = document.getElementById('editor');

        // Format selected text
        function formatText(command) {
          document.execCommand(command, false, null);
          editor.focus();
        }

        // Insert list
        function insertList(type) {
          document.execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList', false, null);
          editor.focus();
        }

        // Keyboard shortcuts
        editor.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
            e.preventDefault();
            formatText('bold');
          }
        });

        // Save note
        document.getElementById('saveBtn').addEventListener('click', () => {
          const noteContent = editor.innerHTML;
          vscodeApi.postMessage({ 
            type: 'submit', 
            content: noteContent,
            author: '${author}'
          });
        });

        // Focus editor on load
        editor.focus();
      </script>
    </body>
    </html>
  `;

  // Listen for messages from the webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === "submit") {
      try {
        await storageService!.addNote(currentBranch, msg.content, msg.author);
        vscode.window.showInformationMessage(
          `Note saved for branch: ${currentBranch}`
        );
        panel.dispose();

        // Refresh the tree view to show the new note instantly
        branchNotesView!.refresh();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to save note: ${error}`);
      }
    }
  });
}

// Helper function to show note in webview
function showNoteInWebview(
  branchName: string,
  content: string,
  author: string,
  timestamp?: string
): void {
  const panel = vscode.window.createWebviewPanel(
    "branchNoteView",
    `Branch Note: ${branchName}`,
    vscode.ViewColumn.One,
    { enableScripts: false }
  );

  const dateStr = timestamp ? new Date(timestamp).toLocaleString() : "";

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Branch Note</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1 {
          color: var(--vscode-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .meta-info {
          color: var(--vscode-descriptionForeground);
          font-size: 13px;
          margin-bottom: 20px;
          padding: 10px;
          background-color: var(--vscode-textBlockQuote-background);
          border-left: 3px solid var(--vscode-textBlockQuote-border);
        }
        .note-content {
          margin-top: 20px;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <h1>📝 Branch Note: ${branchName}</h1>
      <div class="meta-info">
        <div>👤 Author: <strong>${author}</strong></div>
        ${dateStr ? `<div>🕒 Date: ${dateStr}</div>` : ""}
      </div>
      <div class="note-content">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// function openNoteEditor() {
//   const panel = vscode.window.createWebviewPanel(
//     "branchNoteEditor",
//     "Create Note",
//     vscode.ViewColumn.One,
//     { enableScripts: true }
//   );

//   panel.webview.html = `
//     <html>
//       <body>
//         <h2>Create Branch Note</h2>
//         <textarea style="width:100%; height:80vh;">Write your note here...</textarea>
//       </body>
//     </html>
//   `;
// }
