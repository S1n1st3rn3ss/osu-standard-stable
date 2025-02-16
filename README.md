# osu-standard-stable
[![CodeFactor](https://img.shields.io/codefactor/grade/github/kionell/osu-standard-stable)](https://www.codefactor.io/repository/github/kionell/osu-standard-stable)
[![License](https://img.shields.io/github/license/kionell/osu-standard-stable)](https://github.com/kionell/osu-standard-stable/blob/master/LICENSE)
[![Package](https://img.shields.io/npm/v/osu-standard-stable)](https://www.npmjs.com/package/osu-standard-stable)


JavaScript port of the current live version of the osu!standard ruleset.

- Supports TypeScript.
- Based on the osu!lazer source code.
- Supports beatmap conversion from other game modes.
- Can apply & reset osu!standard mods.
- Very accurate difficulty & performance calculation (up to 6 digits after decimal point)

## Installation

Add a new dependency to your project via npm:

```bash
npm install osu-standard-stable
```

## Requirements

Before you can start using this ruleset library, you need to install [osu-classes](https://github.com/kionell/osu-classes)) package as this ruleset based on it. Also you need to install [osu-parsers](https://github.com/kionell/osu-parsers)) or any other compatible beatmap parser that works with [IBeatmap](https://kionell.github.io/osu-classes/interfaces/IBeatmap.html) interface.

## Beatmap conversion

Any beatmap that implements IBeatmap interface can be converted to this ruleset. Unlike the game itself, you can convert beatmaps between different game modes, not just from osu!standard. This is possible due to the fact that hit objects from [osu-classes](https://github.com/kionell/osu-classes)) keep their initial position taken from the .osu file. All beatmaps with applied ruleset keep the reference to the original beatmap, which allows you to repeat the process of conversion or apply different ruleset.

```js
import { BeatmapDecoder, BeatmapEncoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();
const encoder = new BeatmapEncoder();

const decodePath = 'path/to/your/decoding/file.osu';
const encodePath = 'path/to/your/encoding/file.osu';
const shouldParseSb = true;

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath, shouldParseSb);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// This will create a new shallow copy of a beatmap with applied osu!standard ruleset.
// This method implicitly applies mod combination of 0.
const standardWithNoMod = ruleset.applyToBeatmap(parsed);

// Create mod combination and apply it to beatmap.
const mods = ruleset.createModCombination(1337);
const standardWithMods = ruleset.applyToBeatmapWithMods(parsed, mods);

// It will write osu!standard beatmap with no mods to a file.
encoder.encodeToPath(encodePath, standardWithNoMod);

// It will write osu!standard beatmap with applied mods to a file.
encoder.encodeToPath(encodePath, standardWithMods);

// You can also write osu!standard beatmap object to a string.
const stringified = encoder.encodeToString(standardWithMods);
```

## Difficulty calculation

```js
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create mod combination.
const mods = ruleset.createModCombination('HDDT');

// Create difficulty calculator for IBeatmap object.
const difficultyCalculator = ruleset.createDifficultyCalculator(parsed);

// You can pass any IBeatmap object to the difficulty calculator.
// Difficulty calculator will implicitly create a new beatmap with osu!standard ruleset.
const difficultyAttributes = difficultyCalculator.calculateWithMods(mods);
```

### Example of stringified difficulty attributes

```json
{
  "maxCombo": 7540,
  "mods": "EZHTFL",
  "starRating": 10.637008677038498,
  "aimStrain": 2.9681940391008124,
  "speedStrain": 2.693580451310595,
  "flashlightRating": 5.889289503849482,
  "sliderFactor": 0.9993173565222806,
  "approachRate": 1.3333333333333333,
  "overallDifficulty": 1.5555555555555547,
  "drainRate": 2,
  "hitCircleCount": 4011,
  "sliderCount": 1636,
  "spinnerCount": 15
}
```

## Advanced difficulty calculation

```js
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create mod combination and apply it to beatmap.
const mods = ruleset.createModCombination('HDHR');
const standardWithMods = ruleset.applyToBeatmapWithMods(parsed, mods);

/**
 * Any IBeatmap object can be used to create difficulty calculator. 
 * Difficulty calculator implicitly applies osu!standard ruleset with no mods.
 */
const difficultyCalculator1 = ruleset.createDifficultyCalculator(parsed);
const difficultyAttributes1 = difficultyCalculator1.calculate(); // no mods.
const moddedAttributes1 = difficultyCalculator1.calculateWithMods(mods); // with mods.

/**
 * If you pass osu!standard beatmap then it will use its ruleset and mods.
 */
const difficultyCalculator2 = ruleset.createDifficultyCalculator(standardWithMods);
const difficultyAttributes2 = difficultyCalculator2.calculate(); // with mods!
const moddedAttributes2 = difficultyCalculator2.calculateWithMods(mods); // the same as previous line.

/**
 * You can also pass custom clock rate as the last parameter.
 * It will be used instead of the original beatmap's clock rate.
 */
const customClockRate = 2;
const difficultyAttributes3 = difficultyCalculator2.calculate(customClockRate);
const moddedAttributes3 = difficultyCalculator2.calculateWithMods(mods, customClockRate);
```

## Gradual difficulty calculation

Sometimes you may need to calculate difficulty of a beatmap gradually and return attributes on every step of calculation. This is useful for real time difficulty calculation when you update your values depending on the current hit object. This can be really slow and RAM heavy for long beatmaps because attributes are created every 400 ms of the beatmap (default strain step).

```js
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create mod combination and apply it to beatmap.
const mods = ruleset.createModCombination('NCHR');

// Create difficulty calculator for IBeatmap object.
const difficultyCalculator = ruleset.createDifficultyCalculator(parsed);

/**
 * Calculate timed difficulty attributes of the beatmap.
 */
const difficultyAttributes1 = difficultyCalculator.calculateTimed();
const difficultyAttributes2 = difficultyCalculator.calculateTimedWithMods(mods);

/**
 * Calculate time difficulty attributes with custom clock rate.
 */
const clockRate = 3;
const difficultyAttributes3 = difficultyCalculator.calculateTimed(mods, clockRate);
const difficultyAttributes4 = difficultyCalculator.calculateTimedWithMods(mods, clockRate);
```

## Partial difficulty calculation 

This is a special case of gradual difficulty calculation. This is useful when you need to get difficulty attributes at a specific point of the beatmap. Unlike the previous method, this one returns difficulty attributes only once without huge memory allocations.

```js
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create mod combination and apply it to beatmap.
const mods = ruleset.createModCombination('EZHD');

// Create difficulty calculator for IBeatmap object.
const difficultyCalculator = ruleset.createDifficultyCalculator(parsed);

/**
 * Get object count for partial difficulty calculation.
 * This can be any number, but for example we will calculate first half of the beatmap.
 */
const totalObjects = Math.ceil(parsed.hitObjects.length / 2);

/**
 * Calculate difficulty at the middle of the beatmap.
 */
const partialAttributes1 = difficultyCalculator.calculateAt(totalObjects);
const partialAttributes2 = difficultyCalculator.calculateWithModsAt(mods, totalObjects);

/**
 * Calculate partial difficulty with custom clock rate.
 */
const clockRate = 1.2;
const partialAttributes3 = difficultyCalculator.calculateAt(totalObjects, clockRate);
const partialAttributes4 = difficultyCalculator.calculateWithModsAt(mods, totalObjects, clockRate);
```

## Calculating all possible modded attributes at once

Difficulty calculator can be used to calculate all attributes for every difficulty affecting modded combination. This can be time consuming for long beatmaps. All attributes are calculated inside generator function and returned as an iterator. Use JS spread syntax if you want to convert attributes to array.

```js
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create difficulty calculator for IBeatmap object.
const difficultyCalculator = ruleset.createDifficultyCalculator(parsed);

/**
 * Calculate difficulty at the middle of the beatmap.
 */
for (const attributes of difficultyCalculator.calculateAll()) {
  // Do your stuff with calculated attributes...
}
```

## Performance calculation

```js
import { ScoreInfo } from 'osu-classes';
import { BeatmapDecoder } from 'osu-parsers';
import { StandardRuleset } from 'osu-standard-stable';

const decoder = new BeatmapDecoder();

const decodePath = 'path/to/your/decoding/file.osu';

// Get beatmap object.
const parsed = decoder.decodeFromPath(decodePath);

// Create a new osu!standard ruleset.
const ruleset = new StandardRuleset();

// Create mod combination and apply it to beatmap.
const mods = ruleset.createModCombination('EZHTFL');
const standardBeatmap = ruleset.applyToBeatmapWithMods(parsed, mods);

// Create difficulty calculator for osu!std beatmap.
const difficultyCalculator = ruleset.createDifficultyCalculator(standardBeatmap);

// Calculate difficulty attributes.
const difficultyAttributes = difficultyCalculator.calculate();

// Because Maybe! pt. 3 (Renard) [Marathon]
// Kalanluu + EZHTFL 1253.18 pp.
const score = new ScoreInfo({
  maxCombo: 7262,
  rulesetId: 0,
  count300: 5656, // score.statistics.great
  count100: 4, // score.statistics.good
  count50: 0, // score.statistics.meh
  countMiss: 2, // score.statistics.miss
  mods,
});

score.accuracy = (score.count300 + (score.count100 / 3) + (score.count50 / 6)) 
  / (score.count300 + score.count100 + score.count50 + score.countMiss);

// Create performance calculator for osu!std ruleset.
const performanceCalculator = ruleset.createPerformanceCalculator(difficultyAttributes, score);

// Calculate performance attributes for a map.
const performanceAttributes = performanceCalculator.calculateAttributes();

// Calculate total performance for a map.
const totalPerformance = performanceCalculator.calculate();
```

### Example of stringified performance attributes

```json
{
  "mods": "EZHTFL",
  "totalPerformance": 1253.1769458607175,
  "aimPerformance": 298.64232489960165,
  "speedPerformance": 105.00718455675117,
  "accuracyPerformance": 6.202151426321113,
  "flashlightPerformance": 797.2179419754594,
  "effectiveMissCount": 2
}
```

## Other projects

All projects below are based on this code.

- [osu-parsers](https://github.com/kionell/osu-parsers.git) - A bundle of parsers for different osu! file formats.
- [osu-taiko-stable](https://github.com/kionell/osu-taiko-stable.git) - The osu!taiko ruleset based on the osu!lazer source code.
- [osu-catch-stable](https://github.com/kionell/osu-catch-stable.git) - The osu!catch ruleset based on the osu!lazer source code.
- [osu-mania-stable](https://github.com/kionell/osu-mania-stable.git) - The osu!mania ruleset based on the osu!lazer source code.

## Documentation

Auto-generated documentation is available [here](https://kionell.github.io/osu-standard-stable/).

## Contributing

This project is being developed personally by me on pure enthusiasm. If you want to help with development or fix a problem, then feel free to create a new pull request. For major changes, please open an issue first to discuss what you would like to change.

## License
This project is licensed under the MIT License - see the [LICENSE](https://choosealicense.com/licenses/mit/) for details.
