import psycopg2
import sys

conn_string = "postgresql://postgres:Notsogood%4013%21@db.qbejdxgqkanquvydszwl.supabase.co:5432/postgres"

sql_files = [
    r"c:\AI projects\Greviance lodger\supabase\migrations\02_fix_role_claim.sql",
    r"c:\AI projects\Greviance lodger\supabase\migrations\03_fix_storage_rls.sql"
]

try:
    print("Connecting to database...")
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cursor = conn.cursor()
    
    for sql_file in sql_files:
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()
        print(f"Executing {sql_file}...")
        cursor.execute(sql)
        
    print("Migrations successful!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error executing migration: {e}")
    sys.exit(1)
