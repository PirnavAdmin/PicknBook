import re

filepath = 'c:/Users/ADMIN/Desktop/Local/frontend/src/pages/booking/HotelSearchResults.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state
content = content.replace(
    'const [isSortOpen, setIsSortOpen] = useState(false);',
    'const [isSortOpen, setIsSortOpen] = useState(false);\n  const [isFilterOpen, setIsFilterOpen] = useState(false);'
)

# 2. Update trigger
trigger_target = '''<div className="hotel-filter-trigger" onClick={() => setIsFilterOpen(true)}>
                <Filter size={14} />
                <span>Filter</span>
              </div>'''
trigger_replace = '''<div className={`hotel-filter-trigger${(selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length) > 0 ? " is-active" : ""}`} onClick={() => setIsFilterOpen(!isFilterOpen)}>
                <Filter size={14} />
                <span>Filter</span>
                {(selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length) > 0 && (
                  <span className="hotel-filters-badge">
                    {selectedPriceRanges.length + selectedRatings.length + selectedAmenities.length + selectedLocalities.length + selectedPaymentPrefs.length}
                  </span>
                )}
              </div>'''
content = content.replace(trigger_target, trigger_replace)

# 3. Extract sidebar and insert as popup
sidebar_match = re.search(r'(\s*)<aside className="hotel-sidebar-filters">([\s\S]*?)</aside>', content)
if sidebar_match:
    sidebar_content = sidebar_match.group(2)
    content = content.replace(sidebar_match.group(0), '')
    
    popup_code = f'''
              {{isFilterOpen && (
                <div className="hotel-sort-overlay" onClick={{() => setIsFilterOpen(false)}}>
                  <div className="hotel-sort-popup" onClick={{(e) => e.stopPropagation()}} style={{{{ width: 340, right: 0, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}}}>
                    <div className="hotel-sort-popup-header">
                      <h3>Filters</h3>
                      <button className="hotel-sort-close" onClick={{() => setIsFilterOpen(false)}}>&times;</button>
                    </div>
                    <div className="hotel-sort-popup-body" style={{{{ padding: '16px', overflowY: 'auto' }}}}>
                      <div className="hotel-sidebar-filters" style={{{{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent' }}}}>
                        {sidebar_content}
                      </div>
                    </div>
                  </div>
                </div>
              )}}'''
    
    content = re.sub(
        r'(</select>[\s\S]*?\{\s*isSortOpen[^}]*\}[\s\S]*?\)\}\s*)(</div>\s*</div>\s*</section>)',
        r'\g<1>' + popup_code.replace('\\', '\\\\') + r'\n            \g<2>',
        content
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Refactor successful')
