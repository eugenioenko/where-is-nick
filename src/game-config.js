import targets from "./targets.json";

// Coordinates are percentages of the original image (0–100), in targets.json.
export const gameConfig = {
  reviewMode: targets.reviewMode ?? targets.practiceMode ?? false,
  pointsPerFind: 100,
  wrongGuessPenalty: 10,
  wallyPenalty: 100,
  perfectBonus: 500,
  rounds: [
    {
      id: "giants",
      title: "A giant adventure",
      subtitle: "Big characters. A very small hiding place.",
      image: new URL("../images/new/1.jpg", import.meta.url).href,
      width: 2560,
      height: 1604,
    },
    {
      id: "space",
      title: "Out of this world",
      subtitle: "One small step for Nick. One giant search for you.",
      image: new URL("../images/new/2.jpg", import.meta.url).href,
      width: 2560,
      height: 1685,
    },
    {
      id: "crowd",
      title: "Lost in the crowd",
      subtitle: "Somewhere in the chaos, there’s our guy.",
      image: new URL("../images/new/3.jpg", import.meta.url).href,
      width: 2560,
      height: 1623,
    },
    {
      id: "feast",
      title: "A feast for the road",
      subtitle: "Every adventure starts with a good meal.",
      image: new URL("../images/new/4.jpg", import.meta.url).href,
      width: 2560,
      height: 1609,
    },
    {
      id: "last",
      title: "The next horizon",
      subtitle: "There’s always another adventure ahead.",
      image: new URL("../images/new/5.jpg", import.meta.url).href,
      width: 2560,
      height: 1595,
    },
  ].map((round) => ({
    ...round,
    wallyTargets: targets.wally?.[round.id] ?? [],
    // Older files containing a single rectangle are still accepted.
    targets: Array.isArray(targets.targets[round.id])
      ? targets.targets[round.id]
      : [targets.targets[round.id]],
  })),
};
