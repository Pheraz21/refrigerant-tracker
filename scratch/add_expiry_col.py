import os
import re

files = [
    "app/admin/bottles/page.tsx",
    "app/admin/stores/page.tsx",
    "app/admin/vans/page.tsx",
    "app/admin/onsite/page.tsx",
    "app/admin/returned-to-supplier/page.tsx",
    "app/admin/suppliers/page.tsx"
]

def add_col(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Update SortKey
    if "rentalExpiryDate" not in content and "type SortKey" in content:
        content = re.sub(r'(type SortKey = [^;]+);', r'\1 | "rentalExpiryDate";', content)

    # 2. Add to COLUMN_DEFS
    if '{ key: "expiry"' not in content:
        if 'key: "registered"' in content:
            content = re.sub(
                r'(\{ key: "registered",\s*label: "[^"]*"\s*\},?)',
                r'\1\n  { key: "expiry",      label: "Expiry Date"                    },',
                content
            )
        elif 'key: "supplier"' in content:
            content = re.sub(
                r'(\{ key: "supplier",\s*label: "[^"]*"\s*\},?)',
                r'\1\n  { key: "expiry",      label: "Expiry Date"                    },',
                content
            )

    # 3. Add to renderHeader
    if 'case "expiry":' not in content:
        if 'case "registered":' in content:
            content = re.sub(
                r'(case "registered":.*?)(case "[a-zA-Z]+":)',
                r'\1      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;\n\2',
                content,
                flags=re.DOTALL
            )
        elif 'case "supplier":' in content:
            content = re.sub(
                r'(case "supplier":.*?)(case "[a-zA-Z]+":)',
                r'\1      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;\n\2',
                content,
                flags=re.DOTALL
            )

    # 4. Add to renderCell
    if 'case "expiry":\n        return <td key={key}' not in content:
        if 'case "registered":\n        return <td' in content or 'case "registered":\n        return <td key={key}' in content:
            content = re.sub(
                r'(case "registered":.*?\n        return <td.*?</td\s*>;\n)',
                r'\1      case "expiry":\n        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;\n',
                content,
                flags=re.DOTALL
            )
            
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Updated {file_path}")

for f in files:
    add_col(f)
