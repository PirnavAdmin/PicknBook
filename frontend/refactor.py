import re
import sys

filepath = 'c:/Users/ADMIN/Desktop/Local/frontend/src/pages/booking/HotelSearchResults.js'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the body of the modal
match = re.search(r'\{isFiltersOpen && \(\s*<div\s*className="hotel-filters-modal-backdrop"[\s\S]*?\{/\* Body \*/\}([\s\S]*?)</div>\s*</div>\s*\)\}\s*</main>', content)
if not match:
    print('Error: Could not find modal block.')
    sys.exit(1)

body_and_footer = "{/* Body */}" + match.group(1)

# Remove the entire modal from the bottom
content = re.sub(r'\s*\{isFiltersOpen && \(\s*<div\s*className="hotel-filters-modal-backdrop"[\s\S]*?</div>\s*\)\}\s*(</main>)', r'\n    \1', content)

# Find the filters button
btn_match = re.search(r'([ \t]*)\{/\* Filters Button \*/\}([\s\S]*?onClick=\{\(\) => setIsFiltersOpen\(true\)\}[\s\S]*?</button>)', content)
if not btn_match:
    print('Error: Could not find Filters button block.')
    sys.exit(1)

indent = btn_match.group(1)
old_button = btn_match.group(2)
new_button = old_button.replace('onClick={() => setIsFiltersOpen(true)}', 'onClick={() => setIsFiltersOpen(!isFiltersOpen)}')

dropdown = (
    f'{indent}{{/* Filters Dropdown */}}\n'
    f'{indent}<div className="hotel-sort-dropdown-container">\n'
    f'{indent}  {new_button.replace(chr(10), chr(10) + indent + "  ")}\n'
    f'{indent}  {{isFiltersOpen && (\n'
    f'{indent}    <>\n'
    f'{indent}      <div\n'
    f'{indent}        className="hotel-sort-dropdown-overlay"\n'
    f'{indent}        onClick={{() => setIsFiltersOpen(false)}}\n'
    f'{indent}        style={{{{ position: "fixed", inset: 0, zIndex: 998 }}}}\n'
    f'{indent}      />\n'
    f'{indent}      <div className="hotel-sort-dropdown-menu" style={{{{ width: 340, maxHeight: "60vh", overflowY: "auto", padding: 0, cursor: "default", display: "flex", flexDirection: "column", right: 0, zIndex: 999 }}}} onClick={{(e) => e.stopPropagation()}}>\n'
    f'        {body_and_footer}\n'
    f'{indent}      </div>\n'
    f'{indent}    </>\n'
    f'{indent}  )}}\n'
    f'{indent}</div>'
)

content = content.replace(btn_match.group(0), dropdown)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
