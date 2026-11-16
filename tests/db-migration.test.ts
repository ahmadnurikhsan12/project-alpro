import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Menguji migrasi SQL pada Postgres sungguhan (PGlite, di memori, gratis).
 * Skema bawaan Supabase yang dibutuhkan migrasi (auth.users, auth.uid(), role) ditiru secukupnya.
 */
const read = (f: string) => readFileSync(resolve(__dirname, "../supabase/migrations", f), "utf8");
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

const SUPABASE_STUB = `
  create schema if not exists auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
`;
// Seperti Supabase: role API otomatis memegang hak dasar atas tabel baru di schema public;
// RLS-lah yang membatasi baris yang boleh dibaca/ditulis.
const GRANTS = `
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

let db: PGlite;
const snapshot = async (table: string, cols: string, order: string) =>
  (await db.query(`select ${cols} from public.${table} order by ${order}`)).rows;

const LEGACY_TABLES: [string, string, string][] = [
  ["lessons", "id, slug, title, difficulty", "id"],
  ["profiles", "id, display_name", "id"],
  ["user_stats", "user_id, xp, level, counters", "user_id"],
  ["lesson_progress", "user_id, lesson_id, status, best_quiz_score", "lesson_id"],
  ["quiz_attempts", "id, user_id, kind, quiz_id, title, score, correct, total, xp, difficulty", "id"],
  ["activity_logs", "id, user_id, type, ref_id, title, xp", "id"],
];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  await db.exec(GRANTS);
  await db.exec(read("0001_init.sql"));
  // data "lama" yang sudah ada sebelum migrasi 0002
  await db.exec(`
    insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');
    insert into public.lessons (id, slug, number, title, difficulty) values ('m1','m1-slug',1,'Modul 1','mudah');
    update public.profiles set display_name = 'Rani' where id = '${USER_A}';
    update public.user_stats set xp = 120, level = 2, counters = '{"rewardedQuestions":["p-m-01"],"practiceSessions":3}' where user_id = '${USER_A}';
    insert into public.lesson_progress (user_id, lesson_id, status, best_quiz_score) values ('${USER_A}','m1','completed',90);
    insert into public.quiz_attempts (id, user_id, kind, quiz_id, title, score, correct, total, xp, difficulty)
      values ('att-1','${USER_A}','practice','latihan-mudah','Latihan Mudah',80,4,5,25,'mudah');
    insert into public.activity_logs (id, user_id, type, ref_id, title, xp) values ('att-1','${USER_A}','practice','latihan-mudah','Latihan Mudah',25);
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("migrasi 0002 (pilot RMT)", () => {
  it("0002 hanya menambah: tidak ada perintah destruktif pada objek yang sudah ada", () => {
    const sql = read("0002_rmt_pilot.sql")
      .split("\n")
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .toLowerCase();
    for (const forbidden of [/drop\s+table/, /drop\s+column/, /truncate/, /delete\s+from/, /drop\s+constraint/, /alter\s+column/, /drop\s+schema/, /rename\s/]) {
      expect(sql, String(forbidden)).not.toMatch(forbidden);
    }
    // satu-satunya "drop" yang diizinkan adalah kebijakan milik tabel barunya sendiri (idempotensi)
    const drops = sql.match(/drop\s+\w+(\s+if\s+exists)?\s+("[^"]+"|\w+)/g) ?? [];
    expect(drops).toEqual(['drop policy if exists "own learning read"']);
  });

  it("data yang sudah ada tetap utuh setelah migrasi", async () => {
    const before = await Promise.all(LEGACY_TABLES.map(([t, c, o]) => snapshot(t, c, o)));
    expect(before[2][0]).toMatchObject({ xp: 120 }); // pastikan data uji memang ada
    await db.exec(read("0002_rmt_pilot.sql"));
    const after = await Promise.all(LEGACY_TABLES.map(([t, c, o]) => snapshot(t, c, o)));
    expect(after).toEqual(before);
  });

  it("idempoten: dijalankan ulang tidak error dan tidak mengubah apa pun", async () => {
    const before = await Promise.all(LEGACY_TABLES.map(([t, c, o]) => snapshot(t, c, o)));
    await db.exec(read("0002_rmt_pilot.sql"));
    await db.exec(read("0002_rmt_pilot.sql"));
    expect(await Promise.all(LEGACY_TABLES.map(([t, c, o]) => snapshot(t, c, o)))).toEqual(before);
  });

  it("kolom detail nullable: baris lama bernilai NULL, baris baru boleh berisi JSON", async () => {
    const old = await db.query<{ detail: unknown }>(`select detail from public.quiz_attempts where id = 'att-1'`);
    expect(old.rows[0].detail).toBeNull();
    await db.exec(`insert into public.quiz_attempts (id, user_id, kind, quiz_id, title, score, correct, total, xp, detail)
      values ('att-2','${USER_A}','practice','latihan-mudah','Latihan Mudah',100,1,1,10,
      '{"firstTry":100,"questions":{"p-m-03":{"attempts":1,"solvedAt":1,"hints":0,"xp":10}}}')`);
    const r = await db.query<{ detail: { firstTry: number } }>(`select detail from public.quiz_attempts where id = 'att-2'`);
    expect(r.rows[0].detail.firstTry).toBe(100);
  });

  it("learning_records: kunci (user_id,id) mencegah duplikasi, penyimpanan idempoten", async () => {
    const insert = `insert into public.learning_records (id, user_id, kind, ref_id, payload)
      values ('ev-1','${USER_A}','reflection','elimination','{"context":"lab_elimination"}')`;
    await db.exec(insert);
    await expect(db.exec(insert)).rejects.toThrow(/duplicate key|unique/i);
    await db.exec(`${insert} on conflict (user_id, id) do nothing`); // pola yang dipakai server
    const n = await db.query<{ c: number }>(`select count(*)::int as c from public.learning_records`);
    expect(n.rows[0].c).toBe(1);
    await expect(db.exec(`insert into public.learning_records (id,user_id,kind,ref_id) values ('x','${USER_A}','','r')`)).rejects.toThrow(/check/i);
  });

  it("RLS aktif: pengguna hanya dapat membaca catatan miliknya dan tidak dapat menulis langsung", async () => {
    await db.exec(`insert into public.learning_records (id, user_id, kind, ref_id) values ('ev-b','${USER_B}','lab_la','graph')`);
    await db.exec(`insert into public.quiz_attempts (id, user_id, kind, quiz_id, title, score, correct, total, xp)
      values ('att-b','${USER_B}','practice','latihan-mudah','Latihan Mudah',50,1,2,5)`);
    const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'public.learning_records'::regclass`);
    expect(rls.rows[0].relrowsecurity).toBe(true);

    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${USER_A}';`);
    try {
      const mine = await db.query<{ id: string }>(`select id from public.learning_records order by id`);
      expect(mine.rows.map((r) => r.id)).toEqual(["ev-1"]); // milik B tidak terlihat
      // tanpa kebijakan INSERT, RLS menolak penulisan langsung (penulisan hanya lewat server/service role)
      await expect(db.exec(`insert into public.learning_records (id,user_id,kind,ref_id) values ('hack','${USER_A}','reflection','x')`)).rejects.toThrow(/row-level security/i);
      // tabel lama tetap terlindungi: A melihat attempt miliknya saja
      const logs = await db.query<{ id: string }>(`select id from public.quiz_attempts order by id`);
      expect(logs.rows.map((r) => r.id)).toEqual(["att-1", "att-2"]);
    } finally {
      await db.exec(`reset role;`);
    }
  });
});
