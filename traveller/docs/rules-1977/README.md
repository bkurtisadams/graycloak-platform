# Classic Traveller 1977, Books 1–3: rules reference text

**Private. Not for publication or distribution.** Extracted from Kurt's purchased
PDFs so the rules can be searched and cited by page during development. The
Pages workflow deploys only `client`, `src`, `world`, `campaigns` and `vendor`,
so nothing here reaches graycloak.net. This folder is only safe while the
`graycloak-platform` repository is private.

The 1977 printings are the rules authority for this project.

| File | Book | PDF pages | Printed pages |
|---|---|---|---|
| `book1-characters-and-combat.txt` | Book 1: Characters and Combat | 52 | 1–44 |
| `book2-starships.txt` | Book 2: Starships | 50 | 1–45 |
| `book3-worlds-and-adventures.txt` | Book 3: Worlds and Adventures | 49 | 1–44 |

## Finding a page

Every page opens with a marker:

```
===== BOOK 2 / PRINTED PAGE 23 / PDF PAGE 28 =====
```

Cite by **printed page**, the number at the foot of the page in the book
(`Book 2 p.23`). From Command Prompt:

```
findstr /n /c:"PRINTED PAGE 23 /" docs\rules-1977\book2-starships.txt
findstr /n /i "gas giant" docs\rules-1977\*.txt
```

## How it was made, and its limits

- `pdftotext -layout`, one page at a time, so table columns keep their alignment.
  Where a narrow text column runs beside a table, the two can interleave on
  one line. When a table value matters, check the PDF.
- Hyphenation at line ends is kept as printed (`pow-` / `er plants`), so search
  for a short stem if a phrase is not found.
- **Book 2 p.10, MAXIMUM DRIVE POTENTIAL**, has no text layer in the PDF. It is
  transcribed by hand from a 300 dpi render, each cell checked by glyph width,
  and marked as a transcription in the file.
- Figures and illustrations are not reproduced; their pages carry a note. Book 1
  PDF p.31; Book 2 PDF pp.30 and 32 (vector figures A and B, the Earth template);
  Book 3 PDF p.8 (the subsector hex grid).
