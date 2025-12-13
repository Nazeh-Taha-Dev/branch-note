import * as vscode from "vscode";

export class BranchNotesView
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<any> =
    new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> =
    this._onDidChangeTreeData.event;

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): vscode.TreeItem[] {
    return [
      new vscode.TreeItem(
        "Create New Note",
        vscode.TreeItemCollapsibleState.None
      ),
    ].map((item) => {
      item.command = {
        command: "branchNotes.createNote",
        title: "Create New Note",
      };
      item.iconPath = new vscode.ThemeIcon("edit");
      return item;
    });
  }
}
