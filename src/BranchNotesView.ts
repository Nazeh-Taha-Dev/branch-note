import * as vscode from "vscode";
import { NoteStorageService, BranchNote } from "./NoteStorageService";

// Tree item types
type BranchTreeItem = BranchItem | NoteItem | CreateNoteItem;

class BranchItem extends vscode.TreeItem {
  constructor(public readonly branchName: string) {
    super(branchName, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = "branchItem";
    this.iconPath = new vscode.ThemeIcon("git-branch");
  }
}

class NoteItem extends vscode.TreeItem {
  constructor(
    public readonly branchName: string,
    public readonly note: BranchNote
  ) {
    const date = new Date(note.timestamp);
    const label = date.toLocaleString();
    super(label, vscode.TreeItemCollapsibleState.None);
    
    this.description = `by ${note.author}`;
    this.tooltip = new vscode.MarkdownString(`**${note.author}** on ${date.toLocaleString()}\n\n---\n\n${note.content}`);
    this.tooltip.supportHtml = true;
    this.contextValue = "noteItem";
    this.iconPath = new vscode.ThemeIcon("note");
    
    this.command = {
      command: "branchNotes.viewNote",
      title: "View Note",
      arguments: [branchName, note]
    };
  }
}

class CreateNoteItem extends vscode.TreeItem {
  constructor() {
    super("Create New Note", vscode.TreeItemCollapsibleState.None);
    this.command = {
      command: "branchNotes.createNote",
      title: "Create New Note",
    };
    this.iconPath = new vscode.ThemeIcon("edit");
  }
}

export class BranchNotesView implements vscode.TreeDataProvider<BranchTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<BranchTreeItem | undefined | null | void> =
    new vscode.EventEmitter<BranchTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<BranchTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private storageService: NoteStorageService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: BranchTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: BranchTreeItem): Promise<BranchTreeItem[]> {
    if (!element) {
      // Root level: Create button + List of branches
      const branches = await this.storageService.getBranches();
      const branchItems = branches.map(b => new BranchItem(b));
      return [new CreateNoteItem(), ...branchItems];
    } else if (element instanceof BranchItem) {
      // Branch level: List of notes
      const notes = await this.storageService.getNotes(element.branchName);
      return notes.map(note => new NoteItem(element.branchName, note));
    }
    return [];
  }
}
