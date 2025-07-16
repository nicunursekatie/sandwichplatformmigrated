# Sandwich Project Platform — SQL & Migration Guide

## Running SQL Scripts and Migrations

### 1. **General Principles**

- **All database access and migrations are performed via the Supabase client.**
- **Do NOT use psql or direct PostgreSQL connections.**
- SQL scripts are located in the `scripts/` and `supabase/functions/` directories.

### 2. **Running Node.js Migration/Utility Scripts**

Some scripts (like data migrations or batch updates) are written in TypeScript/JavaScript and use the Supabase client. You can run these with npm scripts defined in `package.json`.

**Example:**

```bash
npm run migrate:groups-main
```

Or, for a dry run (if supported):

```bash
npm run migrate:groups-main -- --dry-run
```

### 3. **Running Raw `.sql` Files**

**You cannot run `.sql` files directly from the command line** (no local psql). Instead, use one of these approaches:

#### Option 1: Use a Node.js Script

- Create a Node.js script that loads the SQL file and executes it using the Supabase client.
- See `scripts/execute-task-assignments-sql.js` for an example.

#### Option 2: Supabase Dashboard (LAST RESORT)

- If you must run a `.sql` file directly, copy its contents and run it in the Supabase Dashboard SQL Editor.
- Only do this if there is no automated script and you cannot use the Supabase client.

### 4. **Best Practices**

- **Always prefer automated scripts using the Supabase client.**
- **Never use psql or direct DB connections.**
- **Do not create workarounds for missing columns or schema issues—fix the schema directly.**

### 5. **Adding New SQL Scripts**

- Place new `.sql` files in the `scripts/` directory.
- If you need to run them, create a Node.js script that loads and executes the SQL using the Supabase client.

---

**If you need a template for a Node.js SQL runner, let the team know!** 