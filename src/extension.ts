import * as vscode from "vscode";
import { BranchNotesView } from "./BranchNotesView";
export function activate(context: vscode.ExtensionContext) {
  // Register command to open the note editor
  const createNoteCommand = vscode.commands.registerCommand(
    "branchNotes.createNote",
    () => {
      openNoteEditor();
    }
  );
  // Register sidebar panel
  const branchNotesView = new BranchNotesView();
  vscode.window.registerTreeDataProvider("branchNotesView", branchNotesView);



  context.subscriptions.push(createNoteCommand);
}

export function deactivate() {}

// Function to open rich text editor
function openNoteEditor() {
  const panel = vscode.window.createWebviewPanel(
    "branchNoteEditor", // internal identifier
    "Create Branch Note", // title shown in tab
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
      </style>
    </head>
    <body>
      <h2>Create Branch Note</h2>
      <div id="editor" contenteditable="true" placeholder="Write your note here..."></div>
      <br/>
      <button id="sendBtn">Submit Note</button>

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
  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.type === "submit") {
      // Here you can save the note to Supabase in the next step
      vscode.window.showInformationMessage("Note content received!");
      console.log("User note content:", msg.content);
      panel.dispose(); // close the editor after submit
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
