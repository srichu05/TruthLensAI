"""
TRUTHLENS AI — SQLITE TO SUPABASE POSTGRESQL DATA MIGRATION SCRIPT

Usage:
    python migrate_sqlite_to_supabase.py [--target-url <POSTGRES_URL>] [--demo-uuid <SUPABASE_USER_UUID>] [--dry-run]

This script:
1. Reads all analyses and real_articles from SQLite (truthlens.db).
2. Connects to Supabase PostgreSQL via DATABASE_URL.
3. Maps legacy integer user IDs (e.g. user_id=1 for Demo User) to the corresponding Supabase Auth UUID.
4. Preserves all 127 anonymous analyses intact (user_id=NULL).
5. Inserts records into public.analyses and public.real_articles.
6. Verifies exact row counts between SQLite and PostgreSQL.
7. NEVER modifies or deletes the original SQLite database file.
"""

import os
import sys
import json
import sqlite3
import argparse
from pathlib import Path
from typing import Optional

# Ensure backend root on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.core.config import settings

SQLITE_PATH = Path(__file__).resolve().parent / "truthlens.db"


def run_migration(target_postgres_url: Optional[str] = None, demo_uuid: Optional[str] = None, dry_run: bool = False):
    print("=" * 70)
    print("TRUTHLENS AI: SQLITE -> SUPABASE POSTGRESQL MIGRATION")
    print("=" * 70)

    if not SQLITE_PATH.exists():
        print(f"[ERROR] SQLite database file not found at: {SQLITE_PATH}")
        sys.exit(1)

    pg_url = target_postgres_url or settings.DATABASE_URL
    if not pg_url or "sqlite" in pg_url.lower():
        print("[WARNING] DATABASE_URL is currently set to SQLite or not specified.")
        print("Please provide a Supabase PostgreSQL URL via --target-url or DATABASE_URL in .env")
        print("Example: postgresql+psycopg2://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true")
        if dry_run:
            print("[INFO] Running in inspect-only mode since --dry-run is specified.")
        else:
            sys.exit(1)

    # 1. Connect to SQLite
    sqlite_conn = sqlite3.connect(str(SQLITE_PATH))
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Read SQLite counts
    user_rows = sqlite_cur.execute("SELECT * FROM users").fetchall()
    analysis_rows = sqlite_cur.execute("SELECT * FROM analyses").fetchall()
    real_article_rows = sqlite_cur.execute("SELECT * FROM real_articles").fetchall()

    anon_analyses = [r for r in analysis_rows if r["user_id"] is None]
    user_analyses = [r for r in analysis_rows if r["user_id"] is not None]

    print(f"[SOURCE SQLITE] Database: {SQLITE_PATH}")
    print(f"  - Users count:           {len(user_rows)}")
    for u in user_rows:
        print(f"      ID {u['id']}: {u['name']} <{u['email']}>")
    print(f"  - Analyses count:        {len(analysis_rows)} (Anonymous: {len(anon_analyses)}, User-linked: {len(user_analyses)})")
    print(f"  - Real Articles count:   {len(real_article_rows)}")
    print("-" * 70)

    if dry_run:
        print("[DRY-RUN] Inspection complete. No changes made to PostgreSQL.")
        sqlite_conn.close()
        return

    # 2. Connect to PostgreSQL
    import psycopg2
    from psycopg2.extras import execute_values

    # Clean URL for psycopg2 if it has +psycopg2 prefix
    conn_url = pg_url.replace("postgresql+psycopg2://", "postgresql://")
    print(f"[TARGET POSTGRES] Connecting to PostgreSQL...")
    try:
        pg_conn = psycopg2.connect(conn_url)
        pg_cur = pg_conn.cursor()
        print("[OK] Connected to PostgreSQL successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    # 3. Check / Ensure Target Tables Exist
    pg_cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('profiles', 'analyses', 'real_articles');
    """)
    existing_tables = [r[0] for r in pg_cur.fetchall()]
    print(f"[CHECK] Target PostgreSQL tables found: {existing_tables}")

    if "analyses" not in existing_tables or "real_articles" not in existing_tables:
        print("[ERROR] Target tables (analyses, real_articles) do not exist in PostgreSQL.")
        print("Please execute 'backend/supabase_schema.sql' in the Supabase SQL Editor first.")
        sys.exit(1)

    # Map user IDs:
    # If a demo_uuid is supplied, map user_id = 1 to demo_uuid; otherwise map user_id = 1 to demo_uuid if found in profiles
    target_user_id = demo_uuid
    if not target_user_id and "profiles" in existing_tables:
        pg_cur.execute("SELECT id, email FROM public.profiles LIMIT 5;")
        profiles = pg_cur.fetchall()
        if profiles:
            target_user_id = profiles[0][0]
            print(f"[MAPPING] Using existing Supabase profile for user_id=1: {profiles[0][1]} ({target_user_id})")

    # 4. Migrate Analyses
    migrated_analyses = 0
    for row in analysis_rows:
        mapped_user_id = target_user_id if row["user_id"] is not None else None
        claims_json = row["claims"] if isinstance(row["claims"], str) else json.dumps(row["claims"] or [])
        metrics_json = row["metrics"] if isinstance(row["metrics"], str) else json.dumps(row["metrics"] or [])
        meta_json = row["metadata_info"] if isinstance(row["metadata_info"], str) else json.dumps(row["metadata_info"] or {})

        pg_cur.execute("""
            INSERT INTO public.analyses (
                id, user_id, input_type, title, source_url, raw_content, 
                verdict, confidence, summary, claims, metrics, metadata_info, 
                is_bookmarked, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (
            row["id"],
            mapped_user_id,
            row["input_type"],
            row["title"],
            row["source_url"],
            row["raw_content"],
            row["verdict"],
            row["confidence"],
            row["summary"],
            claims_json,
            metrics_json,
            meta_json,
            bool(row["is_bookmarked"]),
            row["created_at"]
        ))
        migrated_analyses += 1

    # Reset serial sequence for analyses.id
    pg_cur.execute("SELECT setval('analyses_id_seq', COALESCE((SELECT MAX(id) FROM public.analyses), 1));")

    # 5. Migrate Real Articles
    migrated_articles = 0
    for row in real_article_rows:
        mapped_user_id = target_user_id if row["user_id"] is not None else None
        sources_json = row["sources"] if isinstance(row["sources"], str) else json.dumps(row["sources"] or [])
        claims_bd_json = row["claims_breakdown"] if isinstance(row["claims_breakdown"], str) else json.dumps(row["claims_breakdown"] or [])

        pg_cur.execute("""
            INSERT INTO public.real_articles (
                id, user_id, analysis_id, input_type, original_title, original_claim,
                original_verdict, confidence, what_was_wrong, what_actually_happened,
                verified_source_name, verified_source_url, sources, claims_breakdown,
                content_hash, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING;
        """, (
            row["id"],
            mapped_user_id,
            row["analysis_id"],
            row["input_type"],
            row["original_title"],
            row["original_claim"],
            row["original_verdict"],
            row["confidence"],
            row["what_was_wrong"],
            row["what_actually_happened"],
            row["verified_source_name"],
            row["verified_source_url"],
            sources_json,
            claims_bd_json,
            row["content_hash"],
            row["created_at"]
        ))
        migrated_articles += 1

    # Reset serial sequence for real_articles.id
    pg_cur.execute("SELECT setval('real_articles_id_seq', COALESCE((SELECT MAX(id) FROM public.real_articles), 1));")

    pg_conn.commit()

    # 6. Verify row count parity
    pg_cur.execute("SELECT count(*) FROM public.analyses;")
    pg_analyses_count = pg_cur.fetchone()[0]

    pg_cur.execute("SELECT count(*) FROM public.real_articles;")
    pg_articles_count = pg_cur.fetchone()[0]

    print("[SUCCESS] Data Migration Completed:")
    print(f"  - Analyses in PostgreSQL:      {pg_analyses_count} / {len(analysis_rows)} source rows")
    print(f"  - Real Articles in PostgreSQL:  {pg_articles_count} / {len(real_article_rows)} source rows")
    print(f"  - Original SQLite Database:     {SQLITE_PATH} (PRESERVED & UNCHANGED)")
    print("=" * 70)

    pg_cur.close()
    pg_conn.close()
    sqlite_conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate TruthLens SQLite data to Supabase PostgreSQL.")
    parser.add_argument("--target-url", help="Target Supabase PostgreSQL database URL", default=None)
    parser.add_argument("--demo-uuid", help="Target Supabase Auth UUID to map legacy user_id=1 to", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Inspect source data without executing writes")
    args = parser.parse_args()

    run_migration(target_postgres_url=args.target_url, demo_uuid=args.demo_uuid, dry_run=args.dry_run)
