import re

with open("lib/db.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "supabase.from('movement_logs').insert" in line:
        print(f"--- Line {i+1} ---")
        start = max(0, i - 2)
        end = min(len(lines), i + 15)
        for j in range(start, end):
            print(f"{j+1}: {lines[j].rstrip()}")
        print("\n")
