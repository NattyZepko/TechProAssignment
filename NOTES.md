# Notes / Reflection

## A - Learning journey

Before this project, my knowledge of deck.gl was basically:
"Some magic map thing that can draw a lot of points very fast."
Now I know why it can do that, and also why it sometimes does not.
I know, for example, that when creating mapboxgl, you can specify projection: 'globe', or 'mercator',
And I know, for example, that the point layer is invisible when zooming out in globe projection, while is fully visisble even at maximum zoom out when using the 'mercator'.
That's why I chose that projection (but it can be easily reverted in [src/components/MapCanvas.vue](src/components/MapCanvas.vue) when creating new mapboxgl.Map, just change the word 'mercator' to 'globe').
Mapbox was relatively straightforward. Deck.gl required a bit more patience, but once the "update lifecycle" made sense, the whole architecture felt much simpler. The idea of keeping the data stable and updating only small GPU-friendly props was much more intuitive after a few iterations.

## B - Validation process

I wanted to make sure I wasn’t just thinking things were fast - I wanted actual proof:

- [src/data/**tests**/normalizePoints.test.js](src/data/__tests__/normalizePoints.test.js) protects against accidental non-determinism in derived fields (id/value/category) when seed rows are missing some fields. This means that even if we use some outside data source, we'll successfully fill the blanks ourselves, the same way.
- [src/data/**tests**/filterCorrectness.test.js](src/data/__tests__/filterCorrectness.test.js) protects against logical mistakes in combined filtering (value range + category), e.g. "category toggles don't actually hide points".
- [src/data/**tests**/constraints.test.js](src/data/__tests__/constraints.test.js) This one ensures we're following the constraints:
  - No Array.prototype.filter, map, or other CPU filtering during interactions
  - The base dataset array stays stable (strict equality)
  - The deck.gl layer instance stays stable (also strict equality)
  - Filter scrubbing only updates lightweight props (filterRange, filterCategories)

These tests give me confidence that the architecture behaves the way I think it behaves, not the way I hope it behaves.
I deliberately avoided timing-based tests not just because I was instructed, but also because they're flaky, depend on the machine.
Fortunately, the AI understood really well the first two kinds of tests, and automatically built these, but not the third kind.
The tests didn't check for actual dataset reference was stable after filtering, and it made a test that checks a dummy layer.

At one point I considered spinning up Playwright or something fancy to test the UI "for real," but after thinking it through (and being gently guided AI into the right direction), I realized UI tests weren't necessary after all.
If I can prove I'm not touching the CPU, not recreating layers, and not allocating arrays, then the performance basically takes care of itself.

## C - Design evolution

In the early stages, I used AI mainly as a way to speed up the 'discovery' phase, and the initial build, especially around unfamiliar concepts like deck.gl's update flow and how Vue's reactivity might interact with it. It helped me get a clearer mental model quickly, but the actual architecture still needed deliberate choices on my side.
Once I understood the constraints, the design became more straightforward:
keep the dataset stable, keep the layer stable, and push only lightweight updates into deck.gl. The AI helped me think through alternatives, but the core structure came from applying the challenge rules and validating each step.
Overall, the design didn’t come from large rewrites but from gradually shaping the initial approach into something cleaner.

As the code grew, I made changes to keep things maintainable, like separating createPointsLayer into its own file, isolating normalization logic, and keeping filter state cleanly organized, keeping constants instead of magic numbers, etc. for cleaner code.

## D - Known limitations

- The current category selection is small and UI-focused, so a very large number of categories would need a different UI (search, grouping, etc.).
- The tooltip is basic, I would improve formatting and add more fields if the data grows.
- The expansion logic is intentionally simple (jitter + drift). For real data I would load a real dataset or use a more domain-appropriate expansion strategy. It would, however, cause some changes to the "loadAndPreparePoints.js", though I tried to keep it relatively simple, if we read raw data from somewhere else we'll have to change how the file itself is designed, and even some constants (like min value and max value) would have to be modified. That may be a little too inconvenient.
- Obvious limitations like too much data, or too many changes per second can also hurt the performance, clearly, but I tried to keep the assignment as loyal to the constraints and specifications as possible.

## E - AI usage reflection

AI helped clarify unfamiliar concepts (especially GPU/attribute terminology), compare alternatives, and sanity-check ideas.
Where AI guidance was noticeably weaker was around version-specific details, especially with Mapbox's imports and packaging. The "correct" import surface changed between major versions, and AI would sometimes give answers that matched an older release. I had to verify the actual behavior by going through building the project and checking the output myself.

There were also a few moments where the generated code had small bugs or missing steps. In those cases, giving it clear instructions and pointing directly at the flawed part was enough for it to refine the output. I'm also confident that I could have solved these issues manually, for example, spotting that:
`filterCategories: selectedCategoryIds,`
just needed:
`filterCategories: selectedCategoryIds.slice(),`
to avoid accidental reactive mutation.
The devtools made debugging straightforward: the errors had full stack traces, and copy-pasting those into AI was often enough for it to narrow down the issue quickly. Overall, AI sped up the building process, and learning curve.
