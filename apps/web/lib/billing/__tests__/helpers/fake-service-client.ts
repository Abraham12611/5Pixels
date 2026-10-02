/* eslint-disable @typescript-eslint/no-explicit-any */
// Minimal in-memory stand-in for the supabase-js service client, covering
// only the query surface the billing code uses.

type Row = Record<string, any>;

function getPath(row: Row, path: string): any {
  if (path.includes("->>")) {
    const [col, key] = path.split("->>");
    return row[col]?.[key];
  }
  return row[path];
}

class FakeQuery {
  private filters: Array<(r: Row) => boolean> = [];
  private singleMode: "single" | "maybeSingle" | null = null;
  private headCount = false;
  private updateValues: Row | null = null;
  private insertRows: Row[] | null = null;
  private deleteMode = false;
  private orderBy: { col: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private selectCols: string | null = null;

  constructor(
    private table: string,
    private db: Map<string, Row[]>
  ) {}

  private rows(): Row[] {
    return this.db.get(this.table) ?? [];
  }

  select(cols?: string, opts?: { count?: string; head?: boolean }) {
    this.selectCols = cols ?? "*";
    if (opts?.head) this.headCount = true;
    return this;
  }

  private compare(op: string, col: string, val: any) {
    this.filters.push((r) => {
      const actual = getPath(r, col);
      switch (op) {
        case "eq":
          return actual === val;
        case "neq":
          return actual !== val;
        case "is":
          return val === null ? actual == null : actual === val;
        case "lte":
          return actual != null && actual <= val;
        case "gte":
          return actual != null && actual >= val;
        default:
          throw new Error(`unsupported op ${op}`);
      }
    });
    return this;
  }

  eq(col: string, val: any) {
    return this.compare("eq", col, val);
  }
  in(col: string, vals: any[]) {
    const set = new Set(vals);
    this.filters.push((r) => set.has(getPath(r, col)));
    return this;
  }
  is(col: string, val: any) {
    return this.compare("is", col, val);
  }
  neq(col: string, val: any) {
    return this.compare("neq", col, val);
  }
  not(col: string, op: string, val: any) {
    this.filters.push((r) => {
      const actual = getPath(r, col);
      if (op === "is") {
        return !(val === null ? actual == null : actual === val);
      }
      throw new Error(`unsupported not-op ${op}`);
    });
    return this;
  }
  filter(col: string, op: string, val: any) {
    return this.compare(op, col, val);
  }
  gte(col: string, val: any) {
    return this.compare("gte", col, val);
  }
  lte(col: string, val: any) {
    return this.compare("lte", col, val);
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  insert(rows: Row | Row[]) {
    this.insertRows = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(values: Row) {
    this.updateValues = values;
    return this;
  }

  delete() {
    this.deleteMode = true;
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }
  maybeSingle() {
    this.singleMode = "maybeSingle";
    return this;
  }

  private embed(row: Row): Row {
    const out = { ...row };
    if (this.selectCols?.includes("plans(")) {
      const plan = (this.db.get("plans") ?? []).find(
        (p) => p.id === row.plan_id
      );
      out.plans = plan ?? null;
    }
    return out;
  }

  private applyFilters(): Row[] {
    let rows = this.rows().filter((r) =>
      this.filters.every((f) => f(r))
    );
    if (this.orderBy) {
      const { col, ascending } = this.orderBy;
      rows = [...rows].sort((a, b) => {
        const av = getPath(a, col);
        const bv = getPath(b, col);
        return (av < bv ? -1 : av > bv ? 1 : 0) * (ascending ? 1 : -1);
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows;
  }

  private exec(): { data: any; error: any; count: any } {
    if (this.insertRows) {
      const table = this.db.get(this.table) ?? [];
      this.db.set(this.table, table);
      const inserted = this.insertRows.map((r) => {
        const row = { id: r.id ?? `id-${table.length + 1}`, ...r };
        table.push(row);
        return row;
      });
      if (this.singleMode) {
        return { data: this.embed(inserted[0]), error: null, count: null };
      }
      return { data: inserted, error: null, count: null };
    }

    if (this.deleteMode) {
      const matched = this.applyFilters();
      const table = this.db.get(this.table) ?? [];
      this.db.set(
        this.table,
        table.filter((r) => !matched.includes(r))
      );
      return { data: matched, error: null, count: null };
    }

    if (this.updateValues) {
      const matched = this.applyFilters();
      for (const row of matched) Object.assign(row, this.updateValues);
      if (this.singleMode === "single") {
        return {
          data: matched[0] ?? null,
          error: matched[0] ? null : { message: "no rows" },
          count: null,
        };
      }
      return { data: matched, error: null, count: null };
    }

    const matched = this.applyFilters();
    if (this.headCount) {
      return { data: null, error: null, count: matched.length };
    }
    if (this.singleMode === "single") {
      return {
        data: matched[0] ? this.embed(matched[0]) : null,
        error: matched[0] ? null : { message: "no rows" },
        count: null,
      };
    }
    if (this.singleMode === "maybeSingle") {
      return {
        data: matched[0] ? this.embed(matched[0]) : null,
        error: null,
        count: null,
      };
    }
    return { data: matched.map((r) => this.embed(r)), error: null, count: null };
  }

  then(onfulfilled?: any, onrejected?: any) {
    return Promise.resolve(this.exec()).then(onfulfilled, onrejected);
  }
}

export class FakeServiceClient {
  db = new Map<string, Row[]>();
  /** storage.remove() calls recorded as `${bucket}:${key}` for assertions. */
  removedObjects: string[] = [];

  seed(table: string, rows: Row[]) {
    this.db.set(table, rows);
  }

  table(table: string): Row[] {
    return this.db.get(table) ?? [];
  }

  from(table: string) {
    return new FakeQuery(table, this.db) as any;
  }

  storage = {
    from: (bucket: string) => ({
      remove: async (keys: string[]) => {
        this.removedObjects.push(...keys.map((k) => `${bucket}:${k}`));
        return { data: keys.map((k) => ({ name: k })), error: null };
      },
    }),
  };
}
