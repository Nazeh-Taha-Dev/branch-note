import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

export interface BranchNote {
  id: string;
  content: string;
  author: string;
  timestamp: string;
}

interface StorageData {
  [branchName: string]: BranchNote[];
}

export class NoteStorageService {
  private storageFile: string;

  constructor(workspaceRoot: string) {
    this.storageFile = path.join(workspaceRoot, ".branch-notes.json");
  }

  /**
   * Read all data from storage file
   */
  private readData(): StorageData {
    if (!fs.existsSync(this.storageFile)) {
      return {};
    }
    try {
      const content = fs.readFileSync(this.storageFile, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error("Error reading BranchPad notes file:", error);
      return {};
    }
  }

  /**
   * Write data to storage file
   */
  private writeData(data: StorageData): void {
    fs.writeFileSync(this.storageFile, JSON.stringify(data, null, 2), "utf-8");
  }

  /**
   * Add a new note to a branch's history
   */
  async addNote(branchName: string, content: string, author: string): Promise<void> {
    const data = this.readData();
    
    if (!data[branchName]) {
      data[branchName] = [];
    }

    const newNote: BranchNote = {
      id: crypto.randomUUID(),
      content,
      author,
      timestamp: new Date().toISOString(),
    };

    // Add to beginning of array (newest first)
    data[branchName].unshift(newNote);
    this.writeData(data);
  }

  /**
   * Get all notes for a specific branch
   */
  async getNotes(branchName: string): Promise<BranchNote[]> {
    const data = this.readData();
    return data[branchName] || [];
  }

  /**
   * Get the latest note for a branch
   */
  async getLatestNote(branchName: string): Promise<BranchNote | null> {
    const notes = await this.getNotes(branchName);
    return notes.length > 0 ? notes[0] : null;
  }

  /**
   * Get all branches that have notes
   */
  async getBranches(): Promise<string[]> {
    const data = this.readData();
    return Object.keys(data);
  }

  /**
   * Delete a specific note
   */
  async deleteNote(branchName: string, noteId: string): Promise<void> {
    const data = this.readData();
    if (data[branchName]) {
      data[branchName] = data[branchName].filter(n => n.id !== noteId);
      if (data[branchName].length === 0) {
        delete data[branchName];
      }
      this.writeData(data);
    }
  }

  /**
   * Delete all notes for a branch
   */
  async deleteBranch(branchName: string): Promise<void> {
    const data = this.readData();
    if (data[branchName]) {
      delete data[branchName];
      this.writeData(data);
    }
  }
}
