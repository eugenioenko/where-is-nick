import targets from "./targets.json";

// Coordinates are percentages of the original image (0–100), in targets.json.
export const gameConfig = {
  practiceMode: targets.practiceMode,
  pointsPerFind: 100,
  wrongGuessPenalty: 10,
  hintPenalty: 20,
  rounds: [
    {
      id: "giants",
      title: "A giant adventure",
      subtitle: "Big characters. A very small hiding place.",
      image: new URL("../images/1.jpg", import.meta.url).href,
      width: 2560,
      height: 1604,
    },
    {
      id: "space",
      title: "Out of this world",
      subtitle: "One small step for Nick. One giant search for you.",
      image: new URL("../images/2.jpg", import.meta.url).href,
      width: 1280,
      height: 720,
    },
    {
      id: "crowd",
      title: "Lost in the crowd",
      subtitle: "Somewhere in the chaos, there’s our guy.",
      image: new URL("../images/3.jpg", import.meta.url).href,
      width: 2560,
      height: 1623,
    },
    {
      id: "feast",
      title: "The farewell feast",
      subtitle: "He wouldn’t leave without one last bite.",
      image: new URL("../images/4.jpg", import.meta.url).href,
      width: 2560,
      height: 1609,
    },
    {
      id: "last",
      title: "The final send-off",
      subtitle: "One last search. Make it a good one.",
      image: new URL("../images/5.jpg", import.meta.url).href,
      width: 2560,
      height: 1595,
    },
  ].map((round) => ({ ...round, target: targets.targets[round.id] })),
};
