"""Source adapters for the six collections; public reading contracts are shared.

Parser/provider differences describe the supplied edition, never frontend layouts.
Section numbers always come from the source; display order is a separate field.
"""
COLLECTION_RULES = {
    'Bukhari': {'parser': 'pdf', 'notes': 'bukhari'},
    'Muslim': {'parser': 'muslim', 'notes': None},
    'AbuDawud': {'parser': 'epub', 'notes': None},
    'Tirmidhi': {'parser': 'tirmidhi', 'notes': 'tirmidhi'},
    'Nasai': {'parser': 'pdf', 'notes': 'nasai'},
    'IbnMajah': {'parser': 'pdf', 'notes': 'ibnmajah'},
}
