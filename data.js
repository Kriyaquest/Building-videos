/**
 * KRIYA QUEST SCANNER DATABASE (data.js)
 * 
 * Local JSON database containing experiment codes, titles, 
 * instruction manuals, and YouTube videos.
 */

const scannerData = {
  "emotions": {
    title: "Emotions - Face and feelings",
    manualUrl: "",
    buildVideo: "https://youtu.be/F9fpULO4D9U",
    explainerVideo: "",
    extraVideo: ""
  },
  "habits": {
    title: "Nutrition and habits",
    manualUrl: "",
    buildVideo: "https://youtu.be/sK6YA1NRNhQ",
    explainerVideo: "",
    extraVideo: ""
  },
  "internalorgans": {
    title: "Human body and internal organs",
    manualUrl: "",
    buildVideo: "https://youtu.be/HWvUIi_pgE0",
    explainerVideo: "",
    extraVideo: ""
  },
  "maps": {
    title: "Maps and directions",
    manualUrl: "",
    buildVideo: "https://youtu.be/rfpclg3ICsg",
    explainerVideo: "",
    extraVideo: ""
  },
  "skeleton": {
    title: "Skeleton and muscular system",
    manualUrl: "",
    buildVideo: "https://youtu.be/ceSAxID9PLI",
    explainerVideo: "",
    extraVideo: ""
  },
  "nutritiontests": {
    title: "Nutrition and food tests",
    manualUrl: "",
    buildVideo: "https://youtu.be/wQ-lU7neulg",
    explainerVideo: "",
    extraVideo: ""
  },
  "heateffects": {
    title: "Heat and its effects",
    manualUrl: "",
    buildVideo: "https://youtu.be/XoIo05xvvzY",
    explainerVideo: "",
    extraVideo: ""
  },
  "irrigation": {
    title: "Irrigation systems",
    manualUrl: "",
    buildVideo: "https://youtu.be/Ej0TRH9TQVY",
    buildLabel: "Drip Irrigation",
    buildHeader: "💧 Drip Irrigation System",
    buildDesc: "Follow along to assemble the drip irrigation model, observing how water is slowly and directly delivered to plant roots.",
    explainerVideo: "https://youtu.be/U8ch83-6hl0",
    explainerLabel: "Sprinkler Irrigation",
    explainerHeader: "💦 Sprinkler Irrigation System",
    explainerIcon: "build",
    explainerDesc: "Construct a mini sprinkler system to see how water disperses over a field. This hands-on model demonstrates pressure, distribution patterns, and efficient watering techniques — making irrigation science clear and engaging.",
    extraVideo: ""
  },
  "atomicmodel": {
    title: "Atomic model",
    manualUrl: "",
    buildVideo: "https://youtu.be/_bKrxZfcahE",
    explainerVideo: "",
    extraVideo: ""
  },
  "acidsandcompounds": {
    title: "Acids and compounds",
    manualUrl: "",
    buildVideo: "https://youtu.be/ZDp599AQvZI",
    buildLabel: "Acids and Bases",
    buildHeader: "🧪 Acids and Bases",
    explainerVideo: "https://youtu.be/24_Rm9TYz90",
    explainerLabel: "Molecules",
    explainerHeader: "⚛️ Molecules",
    explainerIcon: "build",
    extraVideo: ""
  },
  "microscope": {
    title: "Microscope",
    manualUrl: "",
    buildVideo: "https://youtu.be/Qu3ilRo3MP8",
    explainerVideo: "",
    extraVideo: ""
  },
  "familytree": {
    title: "Family trees",
    manualUrl: "",
    buildVideo: "https://youtu.be/UZLzKtctG8g",
    buildLabel: "Family Tree",
    buildHeader: "🌳 Family Tree",
    explainerVideo: "https://youtu.be/0SEq0FeS5cA",
    explainerLabel: "Helper Hats",
    explainerHeader: "👨‍🚒 Community Helper Hats",
    explainerIcon: "build",
    extraVideo: "https://youtu.be/Bi1tHnIi1KI",
    extraLabel: "Helper Game",
    extraHeader: "❓ Guess the Helper Game",
    extraIcon: "build"
  },
  "naturecells": {
    title: "Electricity: Nature cells",
    manualUrl: "",
    buildVideo: "https://youtu.be/ODoSoVPB2jI",
    explainerVideo: "",
    extraVideo: ""
  },
  "electromagnet": {
    title: "Electromagnet",
    manualUrl: "",
    buildVideo: "https://youtu.be/ODoSoVPB2jI",
    explainerVideo: "",
    extraVideo: ""
  },
  "funmagnets": {
    title: "Fun with magnets",
    manualUrl: "",
    buildVideo: "https://youtu.be/5Tc3EHcgYYs",
    explainerVideo: "",
    extraVideo: ""
  },
  "ballooncar": {
    title: "Balloon car",
    manualUrl: "",
    buildVideo: "https://youtu.be/5Tc3EHcgYYs",
    explainerVideo: "",
    extraVideo: ""
  },
  "forcesaroundus": {
    title: "Forces around us",
    manualUrl: "",
    buildVideo: "https://youtu.be/K2W4su8f6Jk",
    explainerVideo: "",
    extraVideo: ""
  },
  "workandfriction": {
    title: "Work and friction",
    manualUrl: "",
    buildVideo: "https://youtu.be/wuqE_GEC-1Y",
    explainerVideo: "",
    extraVideo: ""
  },
  "lifecycle": {
    title: "Life cycle",
    manualUrl: "",
    buildVideo: "https://youtu.be/gFcLtI1jJKA",
    explainerVideo: "",
    extraVideo: ""
  },
  "heredity": {
    title: "Heredity",
    manualUrl: "",
    buildVideo: "https://youtu.be/aH-Kpt_g4ZA",
    buildLabel: "Heredity",
    buildHeader: "🧬 Heredity",
    explainerVideo: "https://youtu.be/UIJRTYCjZHQ",
    explainerLabel: "Heredity Activity Kit Explanation",
    explainerHeader: "📖 Heredity Activity Kit Explanation",
    explainerIcon: "explainer",
    extraVideo: ""
  }
};

// Make the data accessible to app.js
window.scannerDataFallback = scannerData;
