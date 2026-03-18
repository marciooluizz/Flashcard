# LinguaDeck (GitHub Pages Ready)

LinguaDeck is a polished, local-first, Quizlet-inspired language-learning web app built with **plain HTML/CSS/JavaScript**. It runs fully in-browser (no backend), supports multi-database study workflows, and includes a separate Practice Test engine for exam-style prep.

## Features

- Static-site friendly architecture (deploy directly to GitHub Pages)
- Study Set import: **TXT**, **CSV**, **XLSX**
- Practice Test import: **JSON**, TXT/CSV/XLSX
- Multiple study databases with switching and merge-selected session support
- Flashcards mode:
  - flip, shuffle, prev/next, reverse direction
  - autoplay, star cards, keyboard shortcuts
  - touch swipe support on mobile
  - text-to-speech with auto language detection defaults
  - confidence rating buttons (Again/Hard/Good/Easy)
- Learn mode:
  - adaptive retry of missed cards
  - weighted weak-card prioritization
  - selectable multiple-choice / writing / mixed prompts
  - typo-tolerant answer checking with accent normalization
  - phrase-in-context prompts using example_sentence/example_translation in both directions
  - streak + accuracy tracking
- Test mode:
  - generated mixed quiz (MC/TF/typed)
  - configurable count + difficulty
  - score and mistake review
  - print-friendly results
- Practice Test mode (separate DB/workflow):
  - MC, TF, typed response
  - optional timer
  - explanation handling
  - score dashboard, topic breakdown, incorrect review
- Optional mini-game: Match game
- Search/filter/sort controls
- Dark mode toggle
- Local persistence via localStorage
- Export/import user progress JSON
- Responsive UI and keyboard-accessible interactions

## Supported File Formats

### Study Set Databases
- `.txt` (delimited with `|`, tab, or comma)
- `.csv` (quote-aware parser for common CSV cases)
- `.xlsx`

Expected columns (case-insensitive):

`id, term, translation, example_sentence, example_translation, pronunciation, audio, image, part_of_speech, tags, difficulty, notes, synonyms, antonyms`

Only `term` and `translation` are required. Missing optional fields are handled gracefully.

### Practice Test Databases
- `.json` (recommended)
- `.txt`, `.csv`, `.xlsx`

Expected columns/fields:

`id, question, question_type, choices, correct_answer, acceptable_answers, explanation, hint, topic, difficulty, tags, media`

For list fields (`choices`, `acceptable_answers`, `tags`) use semicolon-separated values in flat files.

## Data Samples Included

- `data-samples/study-sample.txt`
- `data-samples/study-sample.csv`
- `data-samples/study-sample.xlsx`
- `data-samples/practice-test-sample.json`

## Project Structure

```
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js
│   ├── state.js
│   ├── storage.js
│   ├── parsers.js
│   ├── ui.js
│   ├── flashcards.js
│   ├── learn.js
│   ├── testMode.js
│   ├── practiceMode.js
│   ├── game.js
│   ├── utils.js
│   └── defaultData.js
└── data-samples/
    ├── study-sample.txt
    ├── study-sample.csv
    ├── study-sample.xlsx
    └── practice-test-sample.json
```

## Run Locally

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Choose **Deploy from a branch**.
4. Select branch (e.g. `main`) and root (`/`).

No build step or backend is required.

## Import Workflow

- Use **Import Study Set** to add one or more study files.
- Use **Import Practice Test** to add exam datasets.
- Use **Use** buttons to switch active DB.
- Tick checkboxes next to study DBs and click **Merge Selected Databases** for a combined session.

## Practice Test vs Study Sets

- **Study Set DBs** power Flashcards, Learn, Test, and Match modes.
- **Practice Test DBs** are independent and only used in Practice Test mode.

## Browser & GitHub Pages Limitations

- Progress is stored in `localStorage` (browser/device-specific).
- Browser security model prevents silent arbitrary local file access.
- Imports require manual file selection.
- XLSX parsing uses SheetJS via CDN; if CDN is unavailable, XLSX import fails while TXT/CSV/JSON continue to work.

## Future Improvements

- IndexedDB option for larger datasets
- SM-2 style scheduler with due dates and retention tracking
- Rich charts for progress trends
- Better listening/spelling exercises with audio sets
- PWA offline install support
