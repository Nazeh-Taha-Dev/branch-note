import * as vscode from "vscode";
import { BranchNotesView } from "./BranchNotesView";
import { NoteStorageService } from "./NoteStorageService";
import { BranchMonitor } from "./BranchMonitor";

let storageService: NoteStorageService | null = null;
let branchMonitor: BranchMonitor | null = null;

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

  // Register sidebar panel
  const branchNotesView = new BranchNotesView(storageService);
  vscode.window.registerTreeDataProvider("branchNotesView", branchNotesView);

  context.subscriptions.push(createNoteCommand);
}

export function deactivate() {}

// Function to open rich text editor
function openNoteEditor(context: vscode.ExtensionContext) {
  if (!branchMonitor || !storageService) {
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

  const panel = vscode.window.createWebviewPanel(
    "branchNoteEditor", // internal identifier
    `Create Branch Note: ${currentBranch}`, // title shown in tab
    vscode.ViewColumn.One,
    { enableScripts: true } // allow JS
  );

  // HTML content for the rich-text editor
  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Create Branch Note</title>
      <style>
        body { font-family: sans-serif; padding: 10px; }
        #editor { width: 100%; height: 300px; border: 1px solid #ccc; padding: 5px; }
        button { margin-top: 10px; padding: 5px 10px; }
        .branch-info { 
          background: #f0f0f0; 
          padding: 10px; 
          margin-bottom: 10px; 
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="branch-info">
        <strong>Branch:</strong> ${currentBranch}
      </div>
      <h2>Create Branch Note</h2>
      <div id="editor" contenteditable="true" placeholder="Write your note here..."></div>
      <br/>
      <button id="sendBtn">Save Note</button>

      <script>
        const vscodeApi = acquireVsCodeApi();
        document.getElementById('sendBtn').addEventListener('click', () => {
          const noteContent = document.getElementById('editor').innerHTML;
          vscodeApi.postMessage({ type: 'submit', content: noteContent });
        });
      </script>
    </body>
    </html>
  `;

  // Listen for messages from the webview
  panel.webview.onDidReceiveMessage(async (msg) => {
    if (msg.type === "submit") {
      try {
        await storageService!.saveNote(currentBranch, msg.content);
        vscode.window.showInformationMessage(
          `Note saved for branch: ${currentBranch}`
        );
        panel.dispose(); // close the editor after submit
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to save note: ${error}`
        );
      }
    }
  });
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
