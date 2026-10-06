// Minimal D1-compatible wrapper over node:sqlite for local development and tests.
import {DatabaseSync} from "node:sqlite";

class Statement {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Statement(this.db, this.sql, args); }
  exec() {
    const stmt = this.db.prepare(this.sql);
    if (/^\s*(select|with|pragma)/i.test(this.sql)) return {results: stmt.all(...this.args), meta: {}};
    const info = stmt.run(...this.args);
    return {results: [], meta: {changes: Number(info.changes)}};
  }
  async all() { return this.exec(); }
  async run() { return this.exec(); }
  async first(column) { const row = this.exec().results[0] ?? null; return column && row ? row[column] : row; }
}

export function createD1(file = ":memory:") {
  const db = new DatabaseSync(file);
  return {
    raw: db,
    prepare: sql => new Statement(db, sql),
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const out = statements.map(s => s.exec());
        db.exec("COMMIT");
        return out;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  };
}
