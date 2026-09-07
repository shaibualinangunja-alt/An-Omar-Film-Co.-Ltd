export interface HistoryCommand<T> {
  name: string;
  undo: (state: T) => T;
  redo: (state: T) => T;
}

export class HistoryManager<T> {
  private undoStack: HistoryCommand<T>[] = [];
  private redoStack: HistoryCommand<T>[] = [];
  private maxHistory: number = 50;

  push(command: HistoryCommand<T>) {
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(currentState: T): { newState: T; commandName: string } | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    const newState = cmd.undo(currentState);
    this.redoStack.push(cmd);
    return { newState, commandName: cmd.name };
  }

  redo(currentState: T): { newState: T; commandName: string } | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    const newState = cmd.redo(currentState);
    this.undoStack.push(cmd);
    return { newState, commandName: cmd.name };
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
