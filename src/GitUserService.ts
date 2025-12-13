import * as vscode from "vscode";
import * as child_process from "child_process";
import * as os from "os";

export class GitUserService {
  private cachedUsername: string | null = null;

  /**
   * Get the Git user name from config
   * Falls back to OS username if Git config not found
   */
  async getUsername(): Promise<string> {
    if (this.cachedUsername) {
      return this.cachedUsername;
    }

    try {
      // Try to get username from Git config
      const gitUsername = await this.getGitConfigUsername();
      if (gitUsername) {
        this.cachedUsername = gitUsername;
        return gitUsername;
      }
    } catch (error) {
      console.warn("Failed to get Git username:", error);
    }

    // Fall back to OS username
    const osUsername = os.userInfo().username;
    this.cachedUsername = osUsername;
    return osUsername;
  }

  /**
   * Get username from git config user.name
   */
  private async getGitConfigUsername(): Promise<string | null> {
    return new Promise((resolve) => {
      // Get workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        resolve(null);
        return;
      }

      // Execute git config command
      child_process.exec(
        "git config user.name",
        { cwd: workspaceFolder.uri.fsPath },
        (error, stdout, stderr) => {
          if (error || stderr) {
            resolve(null);
            return;
          }

          const username = stdout.trim();
          if (username) {
            resolve(username);
          } else {
            resolve(null);
          }
        }
      );
    });
  }
}
