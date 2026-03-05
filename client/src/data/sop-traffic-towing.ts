import type { SOPSection } from "./sop-fire";

export const trafficTowingSopSections: SOPSection[] = [
  {
    id: "purpose",
    title: "Purpose",
    number: "1",
    content: [
      {
        type: "paragraph",
        text: "This SOP outlines procedures, responsibilities, and conduct standards for all members of the Traffic Management Unit (TMU) and the Towing & Recovery Unit (TRU).",
      },
      {
        type: "paragraph",
        text: "The goal is to:",
      },
      {
        type: "list",
        items: [
          "Ensure public safety",
          "Maintain realistic roleplay standards",
          "Reduce scene chaos",
          "Protect civilians, emergency services, and staff",
        ],
      },
    ],
  },
  {
    id: "traffic-management",
    title: "Traffic Management Unit (TMU)",
    number: "2",
    content: [
      {
        type: "heading",
        text: "2.1 Role of Traffic Management",
      },
      {
        type: "paragraph",
        text: "Traffic Management is responsible for:",
      },
      {
        type: "list",
        items: [
          "Scene traffic control",
          "Road closures & diversions",
          "Hazard management",
          "Temporary traffic setups",
          "Supporting Police & Fire",
          "Motorway incident management",
        ],
      },
      {
        type: "heading",
        text: "2.2 Rank Structure",
      },
      {
        type: "table",
        headers: ["#", "Rank"],
        rows: [
          ["1", "Trainee TC (Traffic Controller)"],
          ["2", "Qualified TC"],
          ["3", "Senior TC"],
          ["4", "STMS (Site Traffic Management Supervisor)"],
          ["5", "Operations Manager"],
        ],
      },
      {
        type: "heading",
        text: "2.3 General Conduct",
      },
      {
        type: "paragraph",
        text: "All TMU members must:",
      },
      {
        type: "list",
        items: [
          "Remain professional at all times",
          "Follow realistic NZTA-style practices",
          "Take instructions from STMS on scene",
          "Never interfere with Police investigations",
          "Never escalate roleplay situations",
        ],
      },
      {
        type: "heading",
        text: "2.4 Standard Incident Procedure",
      },
      {
        type: "paragraph",
        text: "When Arriving at a Scene:",
      },
      {
        type: "list",
        items: [
          "Park safely (45° angle if protecting scene)",
          "Activate beacons",
          "Assess hazards: fuel spills, fire risk, blind corners, traffic speed",
          "Contact STMS (if not present)",
        ],
      },
      {
        type: "heading",
        text: "Establishing Traffic Control",
      },
      {
        type: "paragraph",
        text: "Minor Crash:",
      },
      {
        type: "list",
        items: [
          "Cones around scene",
          "Single lane flow",
          "Stop/Go paddles if required",
        ],
      },
      {
        type: "paragraph",
        text: "Major Crash / Fatal / Fire:",
      },
      {
        type: "list",
        items: [
          "Full road closure",
          "Detour route setup",
          "Notify Police before full closure",
        ],
      },
      {
        type: "paragraph",
        text: "Motorway Incident:",
      },
      {
        type: "list",
        items: [
          "Taper cones minimum 10–15 cone length",
          "Shadow vehicle with arrow board",
          "Reduced speed roleplay enforcement",
        ],
      },
      {
        type: "heading",
        text: "2.5 Road Closure Procedure",
      },
      {
        type: "list",
        items: [
          "Inform Police, Fire, and Dispatch",
          "Deploy cones",
          "Place advance warning signs",
          "Establish detour route",
          "Assign TC at each end",
        ],
      },
      {
        type: "note",
        text: "Only STMS can authorize full closures, motorway shutdowns, and long-term closures.",
      },
    ],
  },
  {
    id: "towing-recovery",
    title: "Towing & Recovery Unit (TRU)",
    number: "3",
    content: [
      {
        type: "heading",
        text: "3.1 Role of Towing",
      },
      {
        type: "paragraph",
        text: "Towing is responsible for:",
      },
      {
        type: "list",
        items: [
          "Crash recovery",
          "Illegally parked vehicles",
          "Impounded vehicles",
          "Abandoned vehicles",
          "Police-requested tows",
          "Heavy recovery operations",
        ],
      },
      {
        type: "heading",
        text: "3.2 Rank Structure",
      },
      {
        type: "table",
        headers: ["#", "Rank"],
        rows: [
          ["1", "Tow Operator Trainee"],
          ["2", "Light Recovery Operator"],
          ["3", "Heavy Recovery Operator"],
          ["4", "Senior Operator"],
          ["5", "Tow Supervisor"],
        ],
      },
      {
        type: "note",
        text: "Only a Supervisor may authorize complex recoveries or override scene decisions.",
      },
      {
        type: "heading",
        text: "3.3 Tow Request Procedure",
      },
      {
        type: "paragraph",
        text: "Tow operators must:",
      },
      {
        type: "list",
        items: [
          "Receive dispatch call",
          "Confirm location",
          "Confirm type: Police Tow, Private Tow, or Crash Recovery",
          "Confirm vehicle details",
        ],
      },
      {
        type: "heading",
        text: "3.4 On-Scene Procedure",
      },
      {
        type: "paragraph",
        text: "Step 1 — Safety First:",
      },
      {
        type: "list",
        items: [
          "Park behind crash (if safe)",
          "Activate hazard lights",
          "Confirm traffic control in place",
          "Request TMU if unsafe",
        ],
      },
      {
        type: "paragraph",
        text: "Step 2 — Vehicle Assessment:",
      },
      {
        type: "list",
        items: [
          "Check: fuel leaks, fire damage, stability, wheel condition",
          "Determine: flatbed required? Hook lift safe? Heavy wrecker needed?",
        ],
      },
      {
        type: "heading",
        text: "3.5 Police Tows",
      },
      {
        type: "paragraph",
        text: "Police must confirm vehicle is cleared for removal, evidence is collected, and impound duration. Tow operator must log plate, log owner, take RP photo, and deliver to impound lot.",
      },
      {
        type: "heading",
        text: "3.6 Crash Recovery Procedure",
      },
      {
        type: "paragraph",
        text: "If vehicle is drivable: escort off roadway. If undrivable: load onto flatbed, secure properly (RP straps), remove debris (RP clean up). If overturned: call heavy recovery and coordinate with Fire.",
      },
    ],
  },
  {
    id: "dispatch-response",
    title: "Dispatch & Response",
    number: "4",
    content: [
      {
        type: "heading",
        text: "Dispatch Procedure",
      },
      {
        type: "paragraph",
        text: "Before responding, confirm:",
      },
      {
        type: "list",
        items: [
          "Location",
          "Type of request: Police tow, Crash recovery, Breakdown, Illegal parking, Abandoned vehicle",
          "Vehicle description",
          "Whether Traffic Management is required",
        ],
      },
      {
        type: "note",
        text: "Do NOT self-dispatch to active Police pursuits.",
      },
      {
        type: "heading",
        text: "En Route",
      },
      {
        type: "list",
        items: [
          "Drive realistically",
          "No emergency driving unless authorized",
          "Confirm ETA with dispatch",
        ],
      },
      {
        type: "heading",
        text: "On Arrival",
      },
      {
        type: "list",
        items: [
          "Park safely behind the vehicle if possible",
          "Activate hazard lights/beacons",
          "Assess the environment: traffic risk, fire risk, fuel leaks, vehicle stability",
          "Confirm with Police before touching any vehicle involved in a crime",
        ],
      },
      {
        type: "note",
        text: "If unsafe conditions exist, request Traffic Management.",
      },
    ],
  },
  {
    id: "scene-cooperation",
    title: "Scene Cooperation",
    number: "5",
    content: [
      {
        type: "paragraph",
        text: "TMU & TRU must:",
      },
      {
        type: "list",
        items: [
          "Communicate via radio",
          "Not argue in public RP",
          "Follow Police scene command",
          "Not self-dispatch to active Police scenes unless requested",
        ],
      },
    ],
  },
  {
    id: "recovery-types",
    title: "Recovery Types",
    number: "6",
    content: [
      {
        type: "heading",
        text: "Drivable Vehicle",
      },
      {
        type: "list",
        items: [
          "Escort off roadway",
          "Do not tow unless necessary",
        ],
      },
      {
        type: "heading",
        text: "Standard Tow (Light Vehicle)",
      },
      {
        type: "list",
        items: [
          "Position flatbed correctly",
          "Winch vehicle slowly",
          "Secure vehicle (RP straps/chains)",
          "Ensure no unrealistic instant loading",
        ],
      },
      {
        type: "heading",
        text: "Overturned Vehicle",
      },
      {
        type: "list",
        items: [
          "Confirm scene is safe",
          "Coordinate with Fire (if present)",
          "Use heavy wrecker if required",
          "Upright vehicle safely before loading",
        ],
      },
      {
        type: "heading",
        text: "Police Impound",
      },
      {
        type: "paragraph",
        text: "Police must confirm vehicle is cleared for removal, evidence collection is complete, and impound duration. Tow operator must log plate, log owner (if known), RP photo documentation, and deliver to designated impound lot.",
      },
    ],
  },
  {
    id: "roleplay-standards",
    title: "Roleplay Standards",
    number: "7",
    content: [
      {
        type: "paragraph",
        text: "The following is NOT permitted:",
      },
      {
        type: "list",
        items: [
          "Insta-towing without RP",
          "Towing during active Police pursuits",
          "Powergaming recoveries",
          "Blocking emergency vehicles",
          "Towing police vehicles without authorization",
          "Instant loading vehicles",
          "Towing for personal gain",
          "Ignoring Police instructions",
        ],
      },
      {
        type: "paragraph",
        text: "Expected standards:",
      },
      {
        type: "list",
        items: [
          "Proper approach RP",
          "Realistic timing",
          "Proper vehicle positioning",
          "Scene safety setup",
          "Clear communication",
          "Professional behaviour",
        ],
      },
    ],
  },
  {
    id: "motorway-protocol",
    title: "Motorway Protocol",
    number: "8",
    content: [
      {
        type: "paragraph",
        text: "If an incident occurs on a motorway:",
      },
      {
        type: "list",
        items: [
          "TMU must establish rolling block (if Police assist)",
          "Tow must wait until safe lane established",
          "No standing in live lanes",
          "Always protect rear with truck positioning",
          "Use extended realism timing for recovery",
        ],
      },
      {
        type: "note",
        text: "Safety is priority over speed of removal.",
      },
    ],
  },
  {
    id: "impound-lot",
    title: "Impound Lot Procedure",
    number: "9",
    content: [
      {
        type: "paragraph",
        text: "Upon delivery:",
      },
      {
        type: "list",
        items: [
          "Park vehicle in assigned bay",
          "Log into system",
          "Document visible damage",
          "Notify dispatch vehicle is secured",
        ],
      },
      {
        type: "note",
        text: "Vehicles may not be released without proper authorization.",
      },
    ],
  },
  {
    id: "shift-end",
    title: "Shift End Procedure",
    number: "10",
    content: [
      {
        type: "paragraph",
        text: "Before going off duty:",
      },
      {
        type: "list",
        items: [
          "Clear all active jobs",
          "Return truck to depot",
          "Notify dispatch",
          "Log off-duty status",
        ],
      },
    ],
  },
  {
    id: "disciplinary",
    title: "Disciplinary Action",
    number: "11",
    content: [
      {
        type: "paragraph",
        text: "Failure to follow this SOP may result in:",
      },
      {
        type: "list",
        items: [
          "Verbal warning",
          "Written warning",
          "Suspension",
          "Removal from unit",
        ],
      },
    ],
  },
];
