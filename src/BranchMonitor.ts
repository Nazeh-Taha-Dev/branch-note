import * as vscode from "vscode";
import { NoteStorageService } from "./NoteStorageService";

export class BranchMonitor {
  private storageService: NoteStorageService;
  private context: vscode.ExtensionContext;
  private currentBranch: string | null = null;
  private gitExtension: any;

  constructor(
    storageService: NoteStorageService,
    context: vscode.ExtensionContext
  ) {
    this.storageService = storageService;
    this.context = context;
  }

  /**
   * Initialize the branch monitor
   * Sets up Git extension API and starts monitoring
   */
  async initialize(): Promise<void> {
    // Get Git extension
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (!gitExtension) {
      console.warn("Git extension not found");
      return;
    }

    if (!gitExtension.isActive) {
      await gitExtension.activate();
    }

    this.gitExtension = gitExtension.exports;
    const api = this.gitExtension.getAPI(1);

    if (api.repositories.length === 0) {
      console.warn("No Git repositories found in workspace");
      return;
    }

    // Monitor the first repository
    const repo = api.repositories[0];
    this.currentBranch = repo.state.HEAD?.name || null;

    // Listen for branch changes
    repo.state.onDidChange(() => {
      this.onBranchChange(repo);
    });

    // Check for note on current branch on startup
    if (this.currentBranch) {
      await this.checkAndShowNote(this.currentBranch);
    }
  }

  /**
   * Handle branch change event
   */
  private async onBranchChange(repo: any): Promise<void> {
    const newBranch = repo.state.HEAD?.name;

    if (newBranch && newBranch !== this.currentBranch) {
      this.currentBranch = newBranch;
      await this.checkAndShowNote(newBranch);
    }
  }

  /**
   * Check if a note exists for the branch and show it if not dismissed
   */
  private async checkAndShowNote(branchName: string): Promise<void> {
    // Get the latest note content
    const note = await this.storageService.getLatestNote(branchName);
    if (!note) {
      return;
    }

    // Check if user has already dismissed this note
    const dismissedNotes = this.getDismissedNotes();
    const noteKey = this.getNoteKey(branchName);

    if (dismissedNotes.includes(noteKey)) {
      // User has dismissed this note before, don't show again
      return;
    }

    // Show the note in a popup
    this.showNotePopup(branchName, note.content, note.author);
  }

  /**
   * Show note popup to user
   */
  /**
   * Show note popup to user
   */
  private async showNotePopup(
    branchName: string,
    content: string,
    author: string
  ): Promise<void> {
    // Strip HTML tags for the popup message (simple version)
    const plainText = content.replace(/<[^>]*>/g, "");

    const action = await vscode.window.showInformationMessage(
      `📝 Branch Note from ${author} (${branchName}): ${plainText}`,
      "Dismiss",
      "View Full Note"
    );

    if (action === "Dismiss") {
      // Mark note as dismissed
      this.markNoteDismissed(branchName);
    } else if (action === "View Full Note") {
      // Show full note using the command
      vscode.commands.executeCommand("branchNotes.viewNote", branchName);
      // Also mark as dismissed so it doesn't show again
      this.markNoteDismissed(branchName);
    }
  }

  /**
   * Show full note in a webview panel
   */


  /**
   * Get unique key for a note (branch name + content hash)
   */
  private getNoteKey(branchName: string): string {
    // For now, just use branch name as key
    // In future, could add content hash to detect note updates
    return branchName;
  }

  /**
   * Get list of dismissed notes from workspace state
   */
  private getDismissedNotes(): string[] {
    return this.context.workspaceState.get("dismissedNotes", []);
  }

  /**
   * Mark a note as dismissed
   */
  private async markNoteDismissed(branchName: string): Promise<void> {
    const dismissedNotes = this.getDismissedNotes();
    const noteKey = this.getNoteKey(branchName);

    if (!dismissedNotes.includes(noteKey)) {
      dismissedNotes.push(noteKey);
      await this.context.workspaceState.update("dismissedNotes", dismissedNotes);
    }
  }

  /**
   * Clear dismissed status for a branch (useful for testing or when note is updated)
   */
  async clearDismissed(branchName: string): Promise<void> {
    const dismissedNotes = this.getDismissedNotes();
    const noteKey = this.getNoteKey(branchName);
    const filtered = dismissedNotes.filter((key) => key !== noteKey);
    await this.context.workspaceState.update("dismissedNotes", filtered);
  }

  /**
   * Get current branch name
   */
  getCurrentBranch(): string | null {
    return this.currentBranch;
  }
}
