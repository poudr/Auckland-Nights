export interface SOPSection {
  id: string;
  title: string;
  number: string;
  content: SOPContentBlock[];
}

export interface SOPContentBlock {
  type: "paragraph" | "heading" | "list" | "table" | "note";
  text?: string;
  items?: string[];
  rows?: string[][];
  headers?: string[];
}

export const fireSopSections: SOPSection[] = [
  {
    id: "overview",
    title: "Overview",
    number: "1",
    content: [
      {
        type: "paragraph",
        text: "The Fire Service's purpose within Tāmaki Makaurau is to provide support to whoever may need it, whether that be medically supporting Hato Hone St John, cutting someone out from a car, or putting a building on fire out, we're here for anyone. Our personnel should be trained in all areas in which they are expected to perform. We're here to support our communities when in need.",
      },
    ],
  },
  {
    id: "chain-of-command",
    title: "Chain of Command",
    number: "2",
    content: [
      {
        type: "paragraph",
        text: "All Fire Service Personnel must follow the Chain of Command, otherwise consequences will be in place.",
      },
      {
        type: "table",
        headers: ["Rank", "Description"],
        rows: [
          ["District Manager | Area Commander", "Manages and oversees all district operations."],
          ["Group Manager | Assistant Area Commander", "Assists in managing and overseeing operations."],
          ["Senior Station Officer", "Helps organize training & Supervises the lower ranks."],
          ["Station Officer", "Supervising the lower ranks and helping with training."],
          ["Senior Firefighter", "Assists the lower ranks in their day-to-day duties."],
          ["Qualified Firefighter", "Passed training and is aware of their duties & responsibilities."],
          ["Firefighter", "An active member who knows the basics."],
        ],
      },
    ],
  },
  {
    id: "getting-started",
    title: "Getting Started",
    number: "3",
    content: [
      {
        type: "paragraph",
        text: "When you join the Fire Service team you need to do the following:",
      },
      {
        type: "list",
        items: [
          '"/duty" and select Fire Rescue New Zealand as well as your callsign.',
          '"/onduty"',
        ],
      },
      {
        type: "paragraph",
        text: "These commands will allow you to see 111 calls sent to the Fire Service or intercad messages. If you don't run these commands then you won't be able to access or see any calls or messages that come through. Even AI calls.",
      },
      {
        type: "paragraph",
        text: 'If you want to be a volunteer you can enable your pager by pressing your F9 key and clicking subscribe to channel, enter "fenzams". You will now receive pages for any call.',
      },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    number: "4",
    content: [
      {
        type: "heading",
        text: "Between Agencies",
      },
      {
        type: "paragraph",
        text: "When arriving on scene the person who is OIC (Officer In Command (Of the truck)) should approach the current scene commander and gather as much information from them before starting to take action. You should not start cutting someone out of a car before talking to St John as you have no idea what their medical conditions are etc.",
      },
      {
        type: "paragraph",
        text: "If you are the first on the scene the Officer of your truck will contact the required agencies VIA /intercad, this could be to police for getting cordons set up or St John for medical assistance.",
      },
      {
        type: "paragraph",
        text: "It is very important to have strong communication not only between yourselves but also the people around you and fully understand what is going on.",
      },
      {
        type: "paragraph",
        text: "Using [/intercad] to communicate between other agencies.",
      },
      {
        type: "heading",
        text: "Between Fire Personnel & FireComm",
      },
      {
        type: "paragraph",
        text: "When needing to talk to FireComm you should ALWAYS do /fenznotes then follow a format like so:",
      },
      {
        type: "note",
        text: "[TRUCK CALLSIGN] FIRECOMM HANDHELD.\nE.G SILV907 FIRECOMM HANDHELD.",
      },
      {
        type: "paragraph",
        text: "This informs comms that you need to communicate whether that be a sit-rep or changing of status. Once the message is sent FireComm will call your truck and you can go ahead with your message.",
      },
    ],
  },
  {
    id: "responding-to-call",
    title: "Responding to a Call",
    number: "5",
    content: [
      {
        type: "paragraph",
        text: "When responding to a call whether it be an AI call or a Player call you must always do the following:",
      },
      {
        type: "list",
        items: [
          "Do /status and state the correct status sign.",
        ],
      },
      {
        type: "paragraph",
        text: "Status codes:",
      },
      {
        type: "list",
        items: [
          "K0 — Off duty / Unavailable for further calls until stated otherwise",
          "K1 — Enroute to call/incident",
          "K2 — On scene at call/incident",
          "K3 — Available outside normal turnout area",
          "K4 — Available inside normal turnout area",
          "K7 — Available at station",
        ],
      },
      {
        type: "list",
        items: [
          "State over radio you are responding. (K1)",
          "Arrival Message.",
          "Figure out who will be OIC [Officer In Command], whatever truck is on scene first, the officer of that truck is then OIC for that scene. (OIC may K45 to any other truck officer on scene)",
        ],
      },
    ],
  },
  {
    id: "situational-reports",
    title: "Situational Reports",
    number: "6",
    content: [
      {
        type: "paragraph",
        text: "When saying a Sit-Rep or Stop-Message you must provide as much information in a short amount of time.",
      },
      {
        type: "note",
        text: "A Sit-Rep could look like: \"FireComm, Auckland 403, Sit-Rep, 4x Crew in BA with 2 HPDs fire is 10x10. Police and St John in attendance.\"",
      },
      {
        type: "paragraph",
        text: "This lets Comms know you have 4 crew fighting the fire in BA with 2 hoses and how big the fire is. As well as letting Comms know what agencies are on scene.",
      },
      {
        type: "paragraph",
        text: "A Stop-Message will look the same just changing the information to a current status of the scene. You also want to tell Comms who you are leaving the scene in the hands of E.G: Property Owner, Fire Investigator etc. A Stop-Message should also be the last scene update provided to Comms.",
      },
    ],
  },
  {
    id: "promotion-requirements",
    title: "Promotion Requirements",
    number: "7",
    content: [
      {
        type: "paragraph",
        text: "The first promotion any personal will have, is the promotion from Firefighter to Qualified Firefighter. The requirements for this promotion is to have passed both of the available trainings:",
      },
      {
        type: "list",
        items: [
          "Basic Medical ABCs",
          "Basic Fire Service Training",
        ],
      },
      {
        type: "paragraph",
        text: "If you complete both of these training you will be promoted in the next promotion round. Promotion rounds happen every month around the same date.",
      },
    ],
  },
  {
    id: "uniform-guidelines",
    title: "Uniform Guidelines",
    number: "8",
    content: [
      {
        type: "paragraph",
        text: "While within the Fire Service you generally have 3 different types of uniforms you can wear:",
      },
      {
        type: "heading",
        text: "Station Uniform",
      },
      {
        type: "paragraph",
        text: "PED:",
      },
      {
        type: "list",
        items: [
          "Legs / Pants #196",
          "Shoes #112",
          "Shirt / Accessory #16 [OPTIONAL]",
          "Shirt Overlay / Jackets #529",
        ],
      },
      {
        type: "paragraph",
        text: "MP:",
      },
      {
        type: "list",
        items: [
          "Lower Body #195",
          "Shoes #111",
          "Shirt / Accessory #15 [OPTIONAL]",
          "Shirt Overlay / Jacket #528",
        ],
      },
      {
        type: "heading",
        text: "LV.1 Turnouts",
      },
      {
        type: "paragraph",
        text: "PED:",
      },
      {
        type: "list",
        items: [
          "Lower Body #194",
          "Shoes #146",
          "Shirt Overlay / Jackets #527 [M] #528 [F]",
          "Hands / Upper Body #18",
          "Helmet",
        ],
      },
      {
        type: "paragraph",
        text: "MP:",
      },
      {
        type: "list",
        items: [
          "Lower Body #193",
          "Shoes #145",
          "Shirt Overlay / Jackets #526 [M] #527 [F]",
          "Upper Body #17",
          "Helmet",
        ],
      },
      {
        type: "heading",
        text: "Helmets",
      },
      {
        type: "paragraph",
        text: "Helmets can be equipped by going back into the EUP menu and selecting \"Helmets\". ONLY equip the corresponding helmet to your rank. If you are new to the Fire Service then you must wear the Firefighter helmet.",
      },
      {
        type: "table",
        headers: ["Rank", "Helmet"],
        rows: [
          ["District Manager", "Leadership"],
          ["Group Manager", "Leadership"],
          ["Senior Station Officer", "Supervisor"],
          ["Station Officer", "Supervisor"],
          ["Senior Firefighter", "Senior Firefighter"],
          ["Qualified Firefighter", "Qualified Firefighter"],
          ["Firefighter", "Firefighter"],
        ],
      },
    ],
  },
  {
    id: "vehicle-guidelines",
    title: "Vehicle Guidelines",
    number: "9",
    content: [
      {
        type: "paragraph",
        text: "In Tāmaki Makaurau we currently have 6 different vehicles:",
      },
      {
        type: "table",
        headers: ["Vehicle", "Details"],
        rows: [
          ["Scania Pumper | Pump Rescue Tender", "Based at every station. Respond to suburban and easy to get to calls."],
          ["Rural Isuzu Pumper", "Based out of the Albany Station. Used for off road and hard to get areas. Equipped with all medical equipment."],
          ["Aerial Pumper", "Based out of Auckland City Station. Normally only one aerial at a time, up to two when approved by Station Officer or higher."],
          ["Toyota Hilux", "Generally for VSOs (Volunteer Station Officers) and above. Can be used in off road situations."],
          ["Ford Transit", "Mainly used for op support and long jobs. Based out of Otara and Auckland City Stations."],
          ["Santa Fe", "For Group Managers or above as their personal vehicle."],
        ],
      },
      {
        type: "note",
        text: "Before crewing any other trucks make sure to have 3 people on a PRT (Pump Rescue Tender) before crewing any other trucks.",
      },
    ],
  },
  {
    id: "fire-equipment",
    title: "Fire Service Equipment",
    number: "10",
    content: [
      {
        type: "heading",
        text: "Spreaders — [/spreaders]",
      },
      {
        type: "paragraph",
        text: "The spreaders we use in the Fire Service could be used in multiple ways, whether it be opening a stuck door or lifting the dash off someone's legs if it was pinning them down. You must walk up to the truck before running the command and equipping the hose. We have these in every truck and are available for all personal to use.",
      },
      {
        type: "heading",
        text: "Fan — [/fan (setup/remove)]",
      },
      {
        type: "paragraph",
        text: "The fan is used for airing out a building or smaller indoor area. You can setup multiple fans, however common sense comes into play with how many you actually need. We have these in every truck and are available for all personal to use.",
      },
      {
        type: "heading",
        text: "Hose — [/hose]",
      },
      {
        type: "paragraph",
        text: "The main fire fighting tool, this is used for putting out a fire. You must walk up to the truck before running the command and equipping the hose. We have these on every truck, however if you need more than 3 people on hoses you must get a secondary truck to take water from to keep it realistic.",
      },
      {
        type: "heading",
        text: "SCBA Gear",
      },
      {
        type: "paragraph",
        text: "We equip these when needed, whether you are going into a building on fire or working around toxic materials or gas. Every crew member should have a set on the truck free to use when their OIC feels it's necessary. Better to be safe than sorry, you only have one set of lungs.",
      },
      {
        type: "heading",
        text: "Scene Equipment — [F4 OR F3]",
      },
      {
        type: "list",
        items: [
          "Cones: Can be used for multiple things but mainly to block off and cordon a scene to protect everyone on the inside and outside.",
          "Gazebos: Used in many cases, this could be when setting up a command post or preserving a scene in weather.",
          "Scene Lights: Used to light up a scene when needed. Just because it's night you don't need to light up a whole scene with 46 lights. Only priority areas.",
        ],
      },
    ],
  },
  {
    id: "parking-placement",
    title: "Parking and Placement",
    number: "11",
    content: [
      {
        type: "paragraph",
        text: "When arriving on a scene the placement of your truck is very important. We use our trucks to keep a scene safe. For example, if a speeding car was coming up to a scene and wasn't going to stop in time it would hit our truck and not any personnel on the scene.",
      },
      {
        type: "paragraph",
        text: "We also use our trucks to protect privacy. For example, if we had an MVA we would park our trucks to block the view from the streets to keep the privacy and protection of the driver.",
      },
      {
        type: "paragraph",
        text: "When arriving onto a scene involving a fire you have to have quick judgment revolving around the safety of your crew and the truck. If you arrive at a brush fire you wouldn't park your truck on the grass next to it as it could spread over to your truck. When arriving on scene to a building fire you have to park the truck at a safe enough distance in case something explodes or falls.",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    number: "12",
    content: [
      {
        type: "paragraph",
        text: "These are Frequently Asked Questions:",
      },
      {
        type: "heading",
        text: "Q: How can I get promoted from Firefighter to Qualified Firefighter?",
      },
      {
        type: "paragraph",
        text: "A: If you take the Base Fire Training Course and pass them, you are guaranteed a promotion to Qualified Firefighter the next promotion round. (Please note that Leadership will deny you if they think you are not ready for the role)",
      },
      {
        type: "heading",
        text: "Q: When are promotion rounds?",
      },
      {
        type: "paragraph",
        text: "A: The week before the start of the next month you can submit an EOI form for Station Officer if you hold the rank Senior FireFighter. At the start of the month the EOI forms close and are reviewed over the course of 2-3 days. Once this process has been completed the promotion will be announced.",
      },
      {
        type: "heading",
        text: "Q: Can we volunteer while on police?",
      },
      {
        type: "paragraph",
        text: "A: Yes, as long as you have your pager enabled you can.",
      },
    ],
  },
];
