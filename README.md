# SD279
DSA

Course portal for SD279 Data Structures & Algorithms (University of Mines and Technology), with a **Visual Lab** of step-by-step 3D animations of every data structure and algorithm in the course.

- `index.html`: course portal (overview, schedule, slide decks, policies)
- `lab.html`: 3D Visual Lab, e.g. `/lab.html?algo=quick-sort`
- `public/*.html`: lecture slide decks, served at the same URLs as before (e.g. `/graphs.html`)
- `src/engine/stage.js`: Three.js isometric renderer that tweens between snapshots
- `src/algos/*.js`: each algorithm records its steps (scene, pseudocode line, explanation, variables)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Adding a visualiser

Create an object with `id`, `title`, `cat`, `week`, `code` (pseudocode lines), `input` (`default`, `random`, `parse`) and `run(data)`, which returns an array of steps built with `Recorder.snap()`. Then register it in `src/algos/index.js`.
