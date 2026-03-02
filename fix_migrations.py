import os
import re

MIGRATION_DIR = 'supabase/migrations'

def rename_migrations():
    files = sorted([f for f in os.listdir(MIGRATION_DIR) if f.endswith('.sql')])
    
    # Track counts per date to generate unique suffixes
    # Map: '20260207' -> 0
    date_counts = {}

    for filename in files:
        # Match YYYYMMDD prefix
        match = re.match(r'^(\d{8})_(.+)$', filename)
        if match:
            date_part = match.group(1)
            name_part = match.group(2)
            
            # Increment counter for this date
            count = date_counts.get(date_part, 0) + 1
            date_counts[date_part] = count
            
            # Create new timestamp: YYYYMMDD + HHMMSS (fake it with count)
            # We map count 1 -> 000001, count 2 -> 000002
            # This ensures they are unique and ordered
            fake_time = f"{count:06d}" 
            new_prefix = f"{date_part}{fake_time}"
            
            new_filename = f"{new_prefix}_{name_part}"
            
            old_path = os.path.join(MIGRATION_DIR, filename)
            new_path = os.path.join(MIGRATION_DIR, new_filename)
            
            print(f"Renaming {filename} -> {new_filename}")
            os.rename(old_path, new_path)
            
if __name__ == "__main__":
    if os.path.exists(MIGRATION_DIR):
        rename_migrations()
        print("Done renaming migrations.")
    else:
        print(f"Directory {MIGRATION_DIR} not found.")
