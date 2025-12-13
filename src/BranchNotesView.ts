import * as vscode from "vscode";
import { NoteStorageService } from "./NoteStorageService";

export class BranchNotesView
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  private storageService: NoteStorageService;

  constructor(storageService: NoteStorageService) {
    this.storageService = storageService;
  }

  /**
   * Refresh the tree view
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const notes = await this.storageService.getAllNotes();

    // Create tree items for each note
    const noteItems = notes.map((note) => {
      const item = new vscode.TreeItem(
        note.branchName,
        vscode.TreeItemCollapsibleState.None
      );
      item.tooltip = `Last updated: ${new Date(note.updatedAt).toLocaleString()}`;
      item.description = new Date(note.updatedAt).toLocaleDateString();
      item.iconPath = new vscode.ThemeIcon("note");
      item.contextValue = "branchNote";
      return item;
    });

    // Add "Create New Note" button at the top
    const createNoteItem = new vscode.TreeItem(
      "Create New Note",
      vscode.TreeItemCollapsibleState.None
    );
    createNoteItem.command = {
      command: "branchNotes.createNote",
      title: "Create New Note",
    };
    createNoteItem.iconPath = new vscode.ThemeIcon("edit");

    return [createNoteItem, ...noteItems];
  }
}
