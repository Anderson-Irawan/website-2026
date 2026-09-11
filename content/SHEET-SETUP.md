# Case studies: the Google Sheet

The project pages build themselves from a spreadsheet. Edit the sheet,
refresh the site — nothing to re-upload.

## One-time setup

1. Go to **sheets.new** to make a blank spreadsheet. Name it something
   like *Double Dash — Case Studies*.

2. **File → Import → Upload**, choose `content/projects.csv` from this
   folder, and pick **Replace spreadsheet**. Import type: comma. The
   headers and the Furari rows land in the grid, paragraph breaks intact.

3. **File → Share → Publish to web.** Choose the sheet tab, set the
   format to **Comma-separated values (.csv)**, then **Publish**.

4. Copy the link it gives you. It looks like:

   ```
   https://docs.google.com/spreadsheets/d/e/2PACX-1vT.../pub?gid=0&single=true&output=csv
   ```

5. Open `js/projects.js` and paste it into `SHEET_URL` near the top:

   ```js
   const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX.../pub?output=csv';
   ```

6. Upload `js/projects.js` once. That's the last upload — from here on
   you only ever touch the sheet.

## Day to day

Add a project by adding rows with a new name in the **project** column.
The page is `case-study.html?p=<that name in lowercase>`.

| column | what it does |
|---|---|
| `project` | which case study the row belongs to |
| `type` | `intro`, `hero`, `media` or `text` |
| `file` | image or video path, e.g. `furari/bag.jpg` |
| `alt` | what the image shows. On an `intro` row: the role line |
| `row` | give 2–4 media rows the same number to sit them side by side |
| `width` | that item's share of the row as a %. Blank = even split |
| `heading` | the section heading. On an `intro` row: the project name |
| `text` | the paragraphs. **Ctrl+Enter** in a cell = new paragraph |
| `poster` | still frame shown before a video plays |
| `bg` | background colour behind a full-width item |

Rows render top to bottom — the sheet order *is* the page order.

Every project needs an `intro` row and a `hero` row. After that it's
yours.

**Side by side:** same number in `row` puts items on one line, up to 4.
Blank means full width on its own. Leave `width` blank and they split
evenly; set it on every item in a row and make them total 100.

**Video:** just point `file` at a `.mp4`, `.webm` or `.mov`. It's picked
up from the extension, so video goes anywhere an image goes. Clips are
muted, loop, and only start once they scroll into view.

**Notes to yourself:** start the `project` cell with `#` and the row is
ignored.

## Things worth knowing

- Publishing makes that sheet readable by anyone with the link. It's
  website copy, so that's fine — just don't keep private notes in it.
- Google caches the published CSV for around five minutes, so an edit
  can take a few minutes to appear. A hard refresh doesn't speed it up.
- `content/projects.csv` stays as the fallback: if the sheet is
  unreachable, the site quietly uses the local copy instead. It's worth
  re-exporting it (**File → Download → CSV**) now and then so the
  fallback isn't stale.
- Leave `SHEET_URL` empty and the site just uses the local CSV. Useful
  if you ever want to go back.
