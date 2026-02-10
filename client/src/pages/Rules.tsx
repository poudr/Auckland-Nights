import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Scale, Car, Users, Flame, ShieldAlert } from "lucide-react";
import Navbar from "@/components/Navbar";

const sections = [
  { id: "community", label: "Community Rules", icon: Users, number: "1.0" },
  { id: "fivem", label: "FiveM Rules", icon: ShieldAlert, number: "2.0" },
  { id: "staff-approved", label: "Staff-Approved Scenes", icon: Scale, number: "3.0" },
  { id: "civilian", label: "Civilian Roleplay", icon: Flame, number: "4.0" },
  { id: "vehicle", label: "Vehicle Rules", icon: Car, number: "5.0" },
];

interface Rule {
  number: string;
  title: string;
  description?: string;
}

interface RuleSection {
  id: string;
  title: string;
  number: string;
  rules: Rule[];
}

const ruleSections: RuleSection[] = [
  {
    id: "community",
    title: "Community Rules",
    number: "1.0",
    rules: [
      { number: "1.1", title: "Treat all members with respect." },
      { number: "1.2", title: "Discrimination, hate speech, racism, sexism or harassment will not be tolerated." },
      { number: "1.3", title: "No trolling, griefing or intentionally ruining another member/s experience." },
      { number: "1.4", title: "Do not impersonate staff or emergency services personnel unless properly whitelisted." },
      { number: "1.5", title: "English must be used in all public interactions to maintain consistency and moderation." },
      { number: "1.6", title: "Do not discuss real-life politics, religion or controversial topics in RP or OOC." },
      { number: "1.7", title: "Posting any NSFW or Gore will result in a ban." },
      { number: "1.8", title: "No streaming or promoting other servers or any links in our community." },
      { number: "1.9", title: "Keep swearing to a minimum." },
      { number: "1.10", title: "If you are unable to handle banter don't join the banter VC." },
      { number: "1.11", title: "Don't ping staff unless necessary." },
    ],
  },
  {
    id: "fivem",
    title: "FiveM Rules",
    number: "2.0",
    rules: [
      { number: "2.1", title: "Use common sense.", description: "Use your head. Don't do things you wouldn't do IRL." },
      { number: "2.2", title: "Random Deathmatch (RDM)", description: "Killing players without reason." },
      { number: "2.3", title: "Vehicle Deathmatch (VDM)", description: "Killing other players with a vehicle without reason." },
      { number: "2.4", title: "Fail Roleplay", description: "Performing actions that would be impossible in real life (e.g., instantly healing after being shot, ignoring injuries, not roleplaying crashes)." },
      { number: "2.5", title: "Combat Logging", description: "Disconnecting, force crashing, or other ways to leave the server to avoid arrest, death or any ongoing roleplay situation." },
      { number: "2.6", title: "Fail Fear", description: "Failing to show fear for your life or safety in situations where a normal person would be terrified." },
      { number: "2.7", title: "Cop Baiting", description: "Intentionally over-provoking police into chasing, arresting, or interacting with you without any valid roleplay." },
      { number: "2.8", title: "GTA Driving", description: "Unrealistic driving e.g., driving a super car offroad, launching a vehicle into the air then driving off like nothing happened." },
      { number: "2.9", title: "Meta Gaming", description: "Using information that your character shouldn't know to gain an advantage in-game e.g. watching streamers, using information in OOC chat." },
      { number: "2.10", title: "New Life Rule", description: "Once dead, hospitalized or arrested you cannot return to the same scene unless you have another character involved and all parties are aware." },
      { number: "2.11", title: "Scene Injecting", description: "Forcing yourself into a scene that has nothing to do with you." },
      { number: "2.12.1", title: "Fleeing on Cooldown", description: "Running from police while priority status is on cooldown." },
      { number: "2.12.2", title: "Fleeing on Someone Else's Priority", description: "Running from police while someone else has priority." },
      { number: "2.12.3", title: "Fleeing Without Priority", description: "Running from police without claiming the priority (try claim before running)." },
      { number: "2.13", title: "Using Emergency Services Equipment", description: "Using emergency services equipment is prohibited. e.g. Police Glock, taser, ESG." },
      { number: "2.14", title: "Repairing Vehicles", description: "Repairing vehicles during an active scene/roleplay." },
      { number: "2.15", title: "Power Gaming", description: "Forcing players' actions without their consent." },
      { number: "2.16", title: "Radio Use", description: "Keep all out of character (OOC) chat out of emergency radio, use /ooc." },
      { number: "2.17", title: "Mic Spamming", description: "Screaming, playing music or soundboards through your mic to get attention will result in a kick." },
      { number: "2.18", title: "Explicit Scenes", description: "Keep explicit scenes to a minimum." },
      { number: "2.19", title: "Must Have a Working Mic", description: "All players are required to have a working mic in order to play the server. NO MIC NO PLAY." },
    ],
  },
  {
    id: "staff-approved",
    title: "Staff-Approved Scenes",
    number: "3.0",
    rules: [
      { number: "3.1", title: "Scenes with 4 or More People (Priority Scenes)", description: "Scenes with 4 or more people requires staff approval." },
      { number: "3.2", title: "Mass Shootings", description: "Large scale shooting scenes e.g. PD wipe, public shooting." },
      { number: "3.3", title: "Using Emergency Services Vehicles", description: "Stealing any emergency services vehicle." },
      { number: "3.4", title: "Hostage Situations / Kidnapping of Emergency Personnel", description: "Taking any emergency service personal hostage (requires backstory)." },
      { number: "3.5", title: "Explosives / Bomb Threats", description: "Any scene involving a bomb requires high planning." },
      { number: "3.6", title: "Roleplaying as a Minor", description: "Roleplaying as a character under the age of 16." },
      { number: "3.7", title: "Suicide Scenes", description: "Scenes involving you taking your own life requires mass planning and staff to oversee." },
      { number: "3.8", title: "Corrupt Roleplay", description: "Roleplaying as a corrupt government employee requires a story." },
    ],
  },
  {
    id: "civilian",
    title: "Civilian Roleplay",
    number: "4.0",
    rules: [
      { number: "4.1", title: "Character Age", description: "All character ages must be 16+ (anything younger refer to 3.6)." },
      { number: "4.2", title: "Character Names", description: "All characters must have realistic and appropriate names. Names such as Jim Bob, Mike Oxlong etc. can result in staff actions." },
      { number: "4.3.1", title: "Clothing", description: "All clothing must be seen, no having invisible body parts." },
      { number: "4.3.2", title: "Wearing Emergency Clothing", description: "Wearing clothing with an emergency patch is not allowed." },
      { number: "4.4", title: "Equipment & Weapons", description: "Civilians are only allowed to use the \"Civilian Weapons\" in the weapon menu." },
      { number: "4.5", title: "Duty System", description: "All civilians are required to be off duty (this can be done by doing /offduty)." },
      { number: "4.6", title: "Gang Patches", description: "Police cannot arrest someone for wearing gang patches." },
    ],
  },
  {
    id: "vehicle",
    title: "Vehicle Rules",
    number: "5.0",
    rules: [
      { number: "5.1", title: "Armoured Vehicles", description: "All vehicles must have no armor or bulletproof tyres." },
      { number: "5.2", title: "Weaponized Vehicles", description: "Using a weaponized vehicle is forbidden. Any misuse can result in staff actions (report to a staff either in game or via ticket if you have found a vehicle)." },
    ],
  },
];

export default function Rules() {
  const [activeSection, setActiveSection] = useState("community");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of ruleSections) {
        const element = document.getElementById(`section-${section.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      const offset = 120;
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <div className="pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <BookOpen size={16} />
              SERVER RULES & GUIDELINES
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4" data-testid="text-rules-title">
              SERVER <span className="text-primary">RULES</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              All players must read and follow these rules. Breaking any rule may result in warnings, kicks, or permanent bans.
            </p>
          </motion.div>

          <div className="lg:hidden mb-6">
            <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3 overflow-x-auto sticky top-20 z-40">
              <div className="flex gap-2 min-w-max">
                {sections.map((section) => {
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-28">
                <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
                    Sections
                  </h3>
                  <nav className="space-y-1" data-testid="nav-rules-sections">
                    {sections.map((section) => {
                      const Icon = section.icon;
                      const isActive = activeSection === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => scrollToSection(section.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left ${
                            isActive
                              ? "bg-primary/15 text-primary border border-primary/20"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                          }`}
                          data-testid={`button-section-${section.id}`}
                        >
                          <Icon size={16} className={isActive ? "text-primary" : ""} />
                          <span className="flex-1">{section.label}</span>
                          <span className="text-xs opacity-50">{section.number}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                <div className="mt-4 bg-primary/5 border border-primary/10 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Rules are enforced by our staff team. If you witness a rule being broken, report it via a ticket on Discord.
                  </p>
                </div>
              </div>
            </aside>

            <main className="flex-1 min-w-0">
              <div className="space-y-12">
                {ruleSections.map((section, sectionIndex) => {
                  const SectionIcon = sections[sectionIndex]?.icon || BookOpen;
                  return (
                    <motion.section
                      key={section.id}
                      id={`section-${section.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: sectionIndex * 0.1 }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <SectionIcon size={20} className="text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold" data-testid={`text-section-title-${section.id}`}>
                            {section.title}
                          </h2>
                          <p className="text-xs text-muted-foreground font-mono">Section {section.number}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {section.rules.map((rule) => (
                          <div
                            key={rule.number}
                            className="group relative bg-zinc-900/30 hover:bg-zinc-900/50 border border-white/5 hover:border-primary/10 rounded-lg p-4 transition-all duration-200"
                            data-testid={`rule-${rule.number}`}
                          >
                            <div className="flex gap-4">
                              <div className="shrink-0">
                                <span className="inline-flex items-center justify-center w-14 h-8 rounded bg-white/5 text-xs font-mono font-bold text-primary/80 group-hover:text-primary transition-colors">
                                  {rule.number}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm leading-snug mb-1">
                                  {rule.title}
                                </h3>
                                {rule.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {rule.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.section>
                  );
                })}
              </div>

              <div className="mt-16 mb-8 text-center">
                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-8">
                  <BookOpen className="w-10 h-10 mx-auto text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Need Clarification?</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    If you're unsure about any rule, open a ticket on our Discord server and a staff member will help you out.
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
