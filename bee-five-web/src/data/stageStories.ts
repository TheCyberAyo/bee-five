// Stage Stories - Narrative introductions for each life stage
export interface StageStory {
  title: string;
  slides: string[];
}

export const stageStories: Record<number, StageStory> = {
  // Egg Stage (Games 1-200)
  0: {
    title: "🥚 The Sacred Egg - Your Divine Appointment",
    slides: [
      "The Bee God has appointed you to become a Bee Watcher. Your duty starts when a new egg is laid, you are to protect it throughout its entire life, until it becomes a queen bee. You do this in a form of challenges that you must win. With every single victory, the egg becomes stronger and safer.",
      "Behold—your egg rests in a golden cell, no larger than a grain of rice. Predators lurk. Disease threatens. Temperature must remain perfect. Only through your victories can you shield this fragile beginning from the dangers that surround it."
    ]
  },
  
  // Larva Stage (Games 201-400)
  1: {
    title: "🐛 The Hungry Larva - Trials of Growth",
    slides: [
      "Your victories have paid off! The egg has hatched into a pale larva. But your sacred duty continues. This helpless creature needs constant feeding and protection. Each challenge you win ensures she receives the royal jelly and pollen she desperately needs.",
      "The larva must grow 1,500 times her size in just five days. Starvation, infection, and temperature swings threaten her survival. Your continued victories strengthen her, allowing her to feed safely and grow into something magnificent."
    ]
  },
  
  // Nectar Stage (Games 401-600)
  2: {
    title: "🍯 The Sealed Chamber - Guarding Transformation",
    slides: [
      "Through your triumphs, the larva has grown strong! Workers now seal her cell with wax. Inside this sacred chamber, she will undergo metamorphosis. But danger still lurks—disease can penetrate even sealed cells, and temperature changes can kill the transforming life within.",
      "Your challenges now protect the chamber itself. Each victory maintains the perfect environment—95°F, sealed from disease, undisturbed by vibrations. Win, and your bee will safely spin her cocoon and begin the great change."
    ]
  },
  
  // Cocoon Stage (Games 601-800)
  3: {
    title: "🕸️ The Silken Cocoon - Hidden Perils",
    slides: [
      "Your protective power has kept her safe! Now wrapped in silk, suspended in darkness, your bee begins her transformation. But threats multiply—mites, bacteria, and wax moths seek to destroy cocoons. The Bee God tests your resolve with harder challenges.",
      "Wings are forming. Eyes are developing. A body takes shape. Every victory you achieve drives away the parasites, maintains warmth, and ensures oxygen reaches the transforming life. Fail, and your bee dies in her silk prison. Win, and she lives to see light."
    ]
  },
  
  // Pupa Stage (Games 801-1000)
  4: {
    title: "🦋 The Pupa - Ultimate Metamorphosis",
    slides: [
      "Your unwavering victories have brought her to the pupa stage! Her larval form has dissolved into golden liquid and reformed into a perfect bee. But this is the most vulnerable moment—the final twelve days before emergence. The challenges grow fiercer.",
      "Her body must harden. Wings must strengthen. The stinger must fully develop. Each victory you claim reinforces her cells, accelerates her development, and shields her from the diseases that claim weak pupae. Your bee's life hangs on your continued success."
    ]
  },
  
  // Emergence Stage (Games 1001-1200)
  5: {
    title: "🌅 The Emergence - Breaking Free",
    slides: [
      "Your countless victories have brought her to this moment! Your bee is ready to emerge, but she must chew through the wax cap herself. Your challenges now give her the strength and energy needed to break free. Each win strengthens her mandibles and her determination.",
      "She chews. She pushes. Light floods in! Your victorious power helps her pull herself free from the cell. She stands on trembling legs, wings unfurling. Thanks to your protection through every stage, she has been born alive and strong."
    ]
  },
  
  // Nurse Stage (Games 1201-1400)
  6: {
    title: "🏠 The Nurse Bee - Protecting Her Service",
    slides: [
      "She lives! Your bee begins her work as a nurse, tending larvae deep within the hive. But your sacred duty is not over. The Bee God commands you to continue protecting her as she serves. New dangers arise—exhaustion, disease from sick larvae, and accidents in the crowded nursery.",
      "Your victories now ensure she has the strength to produce royal jelly, the wisdom to spot diseased larvae, and the energy to work tirelessly. Each challenge you win keeps her healthy and capable as she cares for the next generation."
    ]
  },
  
  // Forager Stage (Games 1401-1600)
  7: {
    title: "🌻 The Forager - Perils of the Outside World",
    slides: [
      "At three weeks, your bee takes her first flight into the outside world! But the dangers multiply a thousandfold—predators fill the sky, storms threaten, flowers may be contaminated with pesticides, and exhaustion can strand her far from home.",
      "Your challenges become battles for her survival. Each victory guides her to safe flowers, protects her from birds and spiders, gives her strength to fly home with heavy pollen loads, and shields her from the poisons that kill so many foragers. Keep winning, and she will thrive."
    ]
  },
  
  // Guard Stage (Games 1601-1800)
  8: {
    title: "🛡️ The Guard - Defending the Hive",
    slides: [
      "Your bee's wings are worn from faithful service. The Bee God honors her by assigning her as a guard at the hive entrance. Your protective duty shifts—now you help her defend against wasps, hornets, robber bees, and other invaders that would destroy the colony.",
      "Each challenge you win sharpens her senses, strengthens her stinger, and bolsters her courage. In battle, your victories mean the difference between her survival and death. Guard well, for the entire hive depends on her vigilance—and your power."
    ]
  },
  
  // Queen Stage (Games 1801-2000)
  9: {
    title: "👑 The Queen - Fulfilling Destiny",
    slides: [
      "The Bee God reveals the truth: your bee was always destined for greatness! Fed exclusively royal jelly by divine plan, she has grown larger and stronger than her sisters. She is meant to be QUEEN. But first, she must fight rival queens in mortal combat. Your challenges now are legendary.",
      "Every victory you claim empowers her in battle. She defeats her rivals one by one until she alone remains. Then comes the sacred mating flight—high into the sky, storing the future of the colony. Your journey is complete. Through your victories, the egg you once protected has become Queen. The Bee God is pleased."
    ]
  }
};

// Get the story for a specific game number based on its stage
export const getStoryForGame = (gameNumber: number): StageStory | null => {
  const stageIndex = Math.floor((gameNumber - 1) / 200);
  return stageStories[stageIndex] || null;
};

// Check if this is the first game of a stage (should show story)
export const shouldShowStory = (gameNumber: number): boolean => {
  // Show story at the start of each stage (1, 201, 401, etc.)
  return ((gameNumber - 1) % 200) === 0;
};

