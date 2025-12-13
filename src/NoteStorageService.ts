import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

interface BranchNote {
  branchName: string;
  content: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export class NoteStorageService {
  private notesDir: string;

  constructor(workspaceRoot: string) {
    this.notesDir = path.join(workspaceRoot, ".branch-notes");
    this.ensureNotesDirExists();
  }

  /**
   * Ensure the .branch-notes directory exists
   */
  private ensureNotesDirExists(): void {
    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
    }
  }

  /**
   * Sanitize branch name to be used as a filename
   * Replaces invalid characters with underscores
   */
  private sanitizeBranchName(branchName: string): string {
    return branchName.replace(/[^a-zA-Z0-9-_]/g, "_");
  }

  /**
   * Get the file path for a given branch
   */
  private getNoteFilePath(branchName: string): string {
    const sanitized = this.sanitizeBranchName(branchName);
    return path.join(this.notesDir, `${sanitized}.json`);
  }

  /**
   * Save a note for a specific branch
   */
  async saveNote(branchName: string, content: string, author: string): Promise<void> {
    const filePath = this.getNoteFilePath(branchName);
    const now = new Date().toISOString();

    let note: BranchNote;
    if (fs.existsSync(filePath)) {
      // Update existing note
      const existing = await this.getNote(branchName);
      note = {
        ...existing!,
        content,
        author,
        updatedAt: now,
      };
    } else {
      // Create new note
      note = {
        branchName,
        content,
        author,
        createdAt: now,
        updatedAt: now,
      };
    }

    fs.writeFileSync(filePath, JSON.stringify(note, null, 2), "utf-8");
  }

  /**
   * Get a note for a specific branch
   */
  async getNote(branchName: string): Promise<BranchNote | null> {
    const filePath = this.getNoteFilePath(branchName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as BranchNote;
    } catch (error) {
      console.error(`Error reading note for branch ${branchName}:`, error);
      return null;
    }
  }

  /**
   * Check if a note exists for a specific branch
   */
  hasNote(branchName: string): boolean {
    const filePath = this.getNoteFilePath(branchName);
    return fs.existsSync(filePath);
  }

  /**
   * Get all branch notes
   */
  async getAllNotes(): Promise<BranchNote[]> {
    if (!fs.existsSync(this.notesDir)) {
      return [];
    }

    const files = fs.readdirSync(this.notesDir);
    const notes: BranchNote[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = fs.readFileSync(
            path.join(this.notesDir, file),
            "utf-8"
          );
          notes.push(JSON.parse(content) as BranchNote);
        } catch (error) {
          console.error(`Error reading note file ${file}:`, error);
        }
      }
    }

    return notes;
  }

  /**
   * Delete a note for a specific branch
   */
  async deleteNote(branchName: string): Promise<void> {
    const filePath = this.getNoteFilePath(branchName);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
