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
        lines = f.readlines()

    out_lines = []
    
    in_column_defs = False
    in_render_header = False
    in_render_cell = False

    for i, line in enumerate(lines):
        # 1. Update SortKey
        if line.startswith("type SortKey = ") and "rentalExpiryDate" not in line:
            line = line.replace(";", ' | "rentalExpiryDate";')
            out_lines.append(line)
            continue
            
        # 2. Add to COLUMN_DEFS
        if "const COLUMN_DEFS =" in line:
            in_column_defs = True
            out_lines.append(line)
            continue
            
        if in_column_defs and line.strip() == "] as const;":
            in_column_defs = False
            
        if in_column_defs and '{ key: "registered"' in line:
            out_lines.append(line)
            out_lines.append('  { key: "expiry",      label: "Expiry Date"                    },\n')
            continue
            
        if in_column_defs and '{ key: "supplier"' in line and not any('{ key: "registered"' in l for l in lines[i-5:i+5]):
            out_lines.append(line)
            out_lines.append('  { key: "expiry",      label: "Expiry Date"                    },\n')
            continue
            
        # 3. Add to renderHeader
        if "function renderHeader" in line:
            in_render_header = True
            
        if in_render_header and line.strip() == "default:            return null;" or (in_render_header and "default:" in line and "return null" in line):
            in_render_header = False
            
        if in_render_header and 'case "registered":' in line and '<th' in line:
            out_lines.append(line)
            out_lines.append('      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;\n')
            continue

        if in_render_header and 'case "supplier":' in line and '<th' in line and not any('case "registered":' in l for l in lines[i-5:i+5]):
            out_lines.append(line)
            out_lines.append('      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;\n')
            continue
            
        # 4. Add to renderCell
        if "function renderCell" in line:
            in_render_cell = True
            
        if in_render_cell and line.strip() == "default: return null;":
            in_render_cell = False

        if in_render_cell and 'case "registered":' in line and 'return <td' in lines[i+1]:
            # This is a multi-line case "registered": \n return <td ... >
            pass # handled below
            
        if in_render_cell and ('case "registered":' in line and '<td' in line):
            out_lines.append(line)
            out_lines.append('      case "expiry":\n')
            out_lines.append('        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;\n')
            continue

        # If it's a multi-line return for registered
        if in_render_cell and 'case "registered":' in lines[i-1] and '<td' in line:
            out_lines.append(line)
            out_lines.append('      case "expiry":\n')
            out_lines.append('        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;\n')
            continue

        out_lines.append(line)

    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(out_lines)
        
    print(f"Updated {file_path}")

for f in files:
    add_col(f)
