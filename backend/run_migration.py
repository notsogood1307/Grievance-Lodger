import psycopg2
import sys

conn_string = "postgresql://postgres:Notsogood%4013%21@db.qbejdxgqkanquvydszwl.supabase.co:5432/postgres"

sql_file = r"c:\AI projects\Greviance lodger\supabase\migrations\01_initial_schema.sql"

try:
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql = f.read()

    print("Connecting to database...")
    conn = psycopg2.connect(conn_string)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("Executing SQL script...")
    cursor.execute(sql)
    print("Migration successful!")
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error executing migration: {e}")
    sys.exit(1)
