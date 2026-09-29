/**
 * OD&D — Chainmail engine · medieval name generator
 * Shared by character sheets, retainers, and future domain/follower workflows.
 *
 * The data is intentionally mundane-medieval rather than high-fantasy: given
 * names plus bynames by place, trade, trait, and patronymic. Campaign worlds can
 * rename presets later while keeping this API stable.
 */

export const NAME_SEXES = {
  male: "ODDCM.NameGen.Sex.Male",
  female: "ODDCM.NameGen.Sex.Female"
};

export const NAME_STYLES = {
  commoner: "ODDCM.NameGen.Style.Commoner",
  clerical: "ODDCM.NameGen.Style.Clerical",
  knightly: "ODDCM.NameGen.Style.Knightly",
  scholar: "ODDCM.NameGen.Style.Scholar"
};

const DATA = {
  generic: {
    label: "ODDCM.NameGen.Culture.Generic",
    male: ["Adam", "Alan", "Aldred", "Anselm", "Baldwin", "Edmund", "Edwin", "Elias", "Gilbert", "Godfrey", "Hugh", "Martin", "Nicholas", "Osbert", "Osmund", "Peter", "Ralph", "Richard", "Robert", "Roger", "Simon", "Stephen", "Thomas", "Walter", "William"],
    female: ["Agnes", "Alice", "Avice", "Beatrice", "Cecily", "Edith", "Eleanor", "Emma", "Gisela", "Godiva", "Isabel", "Joan", "Juliana", "Margery", "Matilda", "Mabel", "Rose", "Sibyl", "Susanna", "Sybil", "Ysabel"],
    places: ["Ashford", "Blackfen", "Bridgewick", "Caldwell", "Dunmere", "Eastfold", "Highford", "Kingsbridge", "Merewick", "Oakham", "Ravensholt", "Redmere", "Stoneleigh", "Westbrook", "Whitehill"],
    occupations: ["Baker", "Carter", "Cooper", "Fletcher", "Mason", "Miller", "Porter", "Reeve", "Shepherd", "Smith", "Tanner", "Turner", "Wainwright", "Weaver", "Wright"],
    traits: ["the Bold", "the Fair", "the Red", "the Short", "the Tall", "the Younger", "Blackbeard", "Goodman", "Longshanks", "Strongarm"],
    malePatronymicSuffix: "son",
    femalePatronymicSuffix: "daughter"
  },
  angloSaxon: {
    label: "ODDCM.NameGen.Culture.AngloSaxon",
    male: ["Aelfric", "Aethelred", "Aldred", "Alfwine", "Beorn", "Ceol", "Cuthbert", "Dunstan", "Eadric", "Eadmund", "Eadwine", "Godric", "Leofric", "Osric", "Oswald", "Sigebert", "Wulfgar", "Wulfric"],
    female: ["Aelfgifu", "Aethelflaed", "Aethelthryth", "Beornwyn", "Cwenhild", "Eadgyth", "Ealhswith", "Godgifu", "Leofrun", "Mildred", "Osburh", "Wulfhild", "Wynnflaed"],
    places: ["Aldby", "Ashdown", "Bramholt", "Cyningford", "Dunwich", "Ealdham", "Fernham", "Hrocesburh", "Leofmere", "Oxenford", "Wulfstow"],
    occupations: ["Baker", "Ceorl", "Herd", "Miller", "Reeve", "Smith", "Swineherd", "Thatcher", "Wright"],
    traits: ["the Elder", "the Good", "the Grim", "the Keen", "the Red", "the Stout", "Broadshield", "Greycloak"],
    malePatronymicSuffix: "son",
    femalePatronymicSuffix: "daughter"
  },
  angloNorman: {
    label: "ODDCM.NameGen.Culture.AngloNorman",
    male: ["Aimery", "Alan", "Baldwin", "Brian", "Geoffrey", "Gerard", "Gilbert", "Henry", "Hugh", "John", "Miles", "Odo", "Philip", "Ralph", "Ranulf", "Richard", "Robert", "Roger", "Simon", "Stephen", "Walter", "William"],
    female: ["Adelina", "Agnes", "Alice", "Avelina", "Avice", "Beatrice", "Cecily", "Constance", "Eleanor", "Emma", "Hawise", "Isabel", "Joan", "Juliana", "Margery", "Matilda", "Petronilla", "Sibyl"],
    places: ["Beaumont", "Clare", "Courcy", "Evreux", "Falaise", "Gisors", "Lacy", "Mandeville", "Montfort", "Mortain", "Redvers", "Vernon", "Warenne"],
    occupations: ["Archer", "Chamberlain", "Clerk", "Cook", "Fletcher", "Marshal", "Porter", "Steward", "Taylor"],
    traits: ["le Bel", "le Brun", "le Gros", "le Jeune", "le Noir", "le Roux", "Longespee", "Strongbow"],
    malePatronymicSuffix: "fitz",
    femalePatronymicSuffix: "fitz"
  },
  french: {
    label: "ODDCM.NameGen.Culture.French",
    male: ["Amaury", "Arnaud", "Bernard", "Charles", "Etienne", "Gaston", "Gervais", "Gilles", "Guillaume", "Henri", "Jacques", "Jehan", "Louis", "Olivier", "Pierre", "Raoul", "Renaud", "Thierry", "Yves"],
    female: ["Adele", "Alix", "Ameline", "Blanche", "Clemence", "Denise", "Fleur", "Gilette", "Heloise", "Isabeau", "Jehanne", "Marguerite", "Marie", "Perrette", "Yolande"],
    places: ["Anjou", "Blois", "Chartres", "Dreux", "Lille", "Lyon", "Melun", "Orleans", "Poitiers", "Rouen", "Troyes", "Vienne"],
    occupations: ["Boucher", "Charpentier", "Couturier", "Fauconnier", "Leclerc", "Marchand", "Meunier", "Tisserand"],
    traits: ["le Blanc", "le Fort", "le Hardi", "le Petit", "le Roux", "la Belle", "la Sage"],
    malePatronymicSuffix: "fils",
    femalePatronymicSuffix: "fille"
  },
  norse: {
    label: "ODDCM.NameGen.Culture.Norse",
    male: ["Arne", "Asbjorn", "Bjorn", "Eirik", "Finn", "Gunnar", "Halfdan", "Harald", "Hrolf", "Ivar", "Ketil", "Leif", "Olaf", "Orri", "Ragnar", "Sigurd", "Skuli", "Sven", "Thorolf", "Ulf"],
    female: ["Astrid", "Bera", "Dagny", "Freydis", "Gudrun", "Gunnhild", "Helga", "Hilda", "Inga", "Ragna", "Ragnhild", "Sigrid", "Solveig", "Thora", "Ylva"],
    places: ["Austfjord", "Birksund", "Coldwick", "Eikstead", "Frostmere", "Hrafnholt", "Jorvik", "Skaldby", "Stangfjord", "Ulfsholm"],
    occupations: ["Boatwright", "Fisher", "Skald", "Smith", "Steersman", "Tanner", "Trader"],
    traits: ["Bluetooth", "Fairhair", "Ironside", "Longspear", "Redcloak", "the Deep-Minded", "the Lucky", "the Stout"],
    malePatronymicSuffix: "son",
    femalePatronymicSuffix: "dottir"
  },
  welsh: {
    label: "ODDCM.NameGen.Culture.Welsh",
    male: ["Aeron", "Bleddyn", "Cadell", "Caradog", "Cynan", "Dafydd", "Einion", "Geraint", "Gruffudd", "Hywel", "Idris", "Iorwerth", "Llywelyn", "Madog", "Owain", "Rhydderch", "Tudur"],
    female: ["Angharad", "Branwen", "Delyth", "Efa", "Elen", "Enid", "Gwenllian", "Gwerful", "Heledd", "Lowri", "Mabli", "Nest", "Rhiannon", "Tangwystl"],
    places: ["Aberford", "Bryn Glas", "Caer Mawr", "Cwmdu", "Dinbych", "Llanfair", "Penarth", "Rhuddlan", "Trefonnen", "Ystrad"],
    occupations: ["Bard", "Harper", "Miller", "Reeve", "Smith", "Tanner", "Wright"],
    traits: ["Goch", "Gwyn", "Hir", "Llwyd", "Fychan", "the Bard", "the Harper"],
    malePatronymicSuffix: "ap",
    femalePatronymicSuffix: "ferch"
  },
  germanic: {
    label: "ODDCM.NameGen.Culture.Germanic",
    male: ["Adalbert", "Alaric", "Anselm", "Bruno", "Conrad", "Dietrich", "Eberhard", "Emmerich", "Gerhard", "Giselbert", "Heinrich", "Hermann", "Konrad", "Ludwig", "Otto", "Rudolf", "Ulrich", "Werner"],
    female: ["Adelheid", "Bertha", "Brunhild", "Elsbeth", "Ermengard", "Gertrud", "Gisela", "Hedwig", "Hildegard", "Irmgard", "Kunigunde", "Mechthild", "Oda", "Ursula"],
    places: ["Augsburg", "Bachfeld", "Bergheim", "Eisenfurt", "Falkenau", "Grunwald", "Hohenberg", "Kaltenbach", "Rosenheim", "Steinwald"],
    occupations: ["Bauer", "Becker", "Fischer", "Kramer", "Muller", "Schmidt", "Schreiber", "Weber", "Zimmermann"],
    traits: ["der Alte", "der Junge", "der Kurze", "der Lange", "Rotbart", "Starkhand", "Weisskopf"],
    malePatronymicSuffix: "sohn",
    femalePatronymicSuffix: "tochter"
  },
  italian: {
    label: "ODDCM.NameGen.Culture.Italian",
    male: ["Alberto", "Aldo", "Angelo", "Benedetto", "Bernardo", "Dante", "Enrico", "Francesco", "Giacomo", "Giovanni", "Guido", "Lorenzo", "Marco", "Matteo", "Niccolo", "Pietro", "Ruggiero", "Ugolino"],
    female: ["Adelasia", "Agata", "Alessandra", "Antonia", "Beatrice", "Bianca", "Caterina", "Chiara", "Francesca", "Giovanna", "Lucia", "Maddalena", "Margherita", "Paola", "Tessa"],
    places: ["Arezzo", "Bologna", "Ferrara", "Lucca", "Mantova", "Milano", "Padova", "Pavia", "Pisa", "Ravenna", "Siena", "Verona"],
    occupations: ["Barbiere", "Fabbro", "Mercante", "Molinari", "Notaio", "Sarto", "Speziale"],
    traits: ["il Bello", "il Forte", "il Giovane", "il Rosso", "lo Scuro", "la Bianca", "la Saggia"],
    malePatronymicSuffix: "di",
    femalePatronymicSuffix: "di"
  }
};


const EXTRA_DATA = {
  generic: {
    male: ["Andrew", "Arthur", "Bartholomew", "Benedict", "Clement", "Colin", "David", "Dennis", "Francis", "Gregory", "Guy", "Humphrey", "Jocelin", "Laurence", "Leonard", "Luke", "Mark", "Matthew", "Michael", "Nigel", "Paul", "Reginald", "Reynold", "Theobald", "Vincent"],
    female: ["Adelaide", "Amabel", "Amice", "Anne", "Christina", "Clarice", "Denise", "Elaine", "Ellen", "Felice", "Florence", "Gillian", "Hawise", "Helen", "Ida", "Katherine", "Leticia", "Lucy", "Maud", "Millicent", "Philippa", "Sara"],
    places: ["Alderford", "Barrowby", "Brambleholt", "Coldwell", "Crowfield", "Deeping", "Eldenham", "Fallowmere", "Greyford", "Hartswell", "Lowbridge", "Mosswick", "Northgate", "Rillford", "Southwold", "Thornbury", "Wickham", "Wychwood"],
    occupations: ["Bowyer", "Brewer", "Butcher", "Chandler", "Chapman", "Collier", "Dyer", "Forester", "Fuller", "Gardener", "Hayward", "Mercer", "Plowman", "Saddler", "Sawyer", "Spicer", "Walker"],
    traits: ["the Black", "the Brown", "the Elder", "the Good", "the Grey", "the Hardy", "the Keen", "the Little", "the Quiet", "the Wise", "Broadfoot", "Fairhand", "Redhand", "Whitehead"]
  },
  angloSaxon: {
    male: ["Aelfhere", "Aelfred", "Aethelstan", "Beorhtric", "Brihtnoth", "Cenric", "Coenwulf", "Cynewulf", "Eadgar", "Ealdred", "Hereward", "Hrothgar", "Leofwine", "Morcant", "Ordgar", "Saewulf", "Siward", "Thegnwald", "Wiglaf", "Wulfstan"],
    female: ["Aelflaed", "Aelfrun", "Aethelgifu", "Aethelhild", "Aethelwyn", "Brihtgifu", "Cuthburh", "Eadburg", "Eadflaed", "Eadwynn", "Frithuswith", "Godhild", "Leofgifu", "Leofhild", "Saethryth", "Wulfgifu", "Wulfwyn"],
    places: ["Aethelby", "Beornham", "Cenwold", "Eadstow", "Grimhame", "Harewood", "Leofburh", "Mildenhall", "Oakstow", "Seaxford", "Thunreslea", "Winburh"],
    occupations: ["Bailiff", "Beekeeper", "Bower", "Hayward", "Hunter", "Maltster", "Ploughman", "Woodward"],
    traits: ["the Fair", "the Far-Travelled", "the Spear-Bold", "the White", "Brownhand", "Ironhand", "Oakenstaff", "Wolfshead"]
  },
  angloNorman: {
    male: ["Aubrey", "Berengar", "Eustace", "Fulk", "Gervase", "Hamon", "Hervey", "Hubert", "Jordan", "Joscelin", "Maurice", "Osbert", "Piers", "Reynold", "Theobald", "Tristram", "Warin"],
    female: ["Adeliza", "Amicia", "Anneis", "Clarice", "Denise", "Ela", "Felicia", "Gundred", "Ida", "Letice", "Lucia", "Mabel", "Maud", "Milisent", "Philippa", "Rohais", "Sara"],
    places: ["Aubigny", "Bayeux", "Briouze", "Cantilupe", "Dreux", "Ferrers", "Glanville", "Grandmesnil", "Harcourt", "Louvain", "Lusignan", "Mowbray", "Neville", "Percy", "Ridel", "Tosny", "Vaux"],
    occupations: ["Bowyer", "Butler", "Carpenter", "Falconer", "Hunter", "Mason", "Parker", "Serjeant", "Vintner"],
    traits: ["le Blund", "le Despenser", "le Hardi", "le Mareschal", "le Petit", "le Sauvage", "le Vieux", "Mauclerc"]
  },
  french: {
    male: ["Aimeri", "Andre", "Benoit", "Bertrand", "Colin", "Denis", "Enguerrand", "Florent", "Foulques", "Gerard", "Hugues", "Lancelin", "Marcel", "Mathieu", "Philippe", "Remy", "Thibaut", "Vincent"],
    female: ["Aalis", "Agnès", "Beatris", "Catherine", "Erembourg", "Felise", "Guillemette", "Jacquette", "Mahaut", "Melisende", "Odeline", "Pernelle", "Philippa", "Richildis", "Sybille"],
    places: ["Amiens", "Arras", "Beauvais", "Bourges", "Chinon", "Dijon", "Etampes", "Laon", "Limoges", "Meaux", "Nevers", "Provins", "Saintes", "Tours"],
    occupations: ["Boulanger", "Charron", "Cordonnier", "Drapier", "Fourrier", "Mareschal", "Pelletier", "Tailleur", "Vigneron"],
    traits: ["le Bon", "le Gris", "le Sage", "le Vieux", "la Blanche", "la Courte", "la Jeune", "la Rousse"]
  },
  norse: {
    male: ["Armod", "Bard", "Brand", "Egil", "Eystein", "Geir", "Gisli", "Gudmund", "Hallvard", "Hakon", "Knut", "Orm", "Ragnvald", "Snorri", "Steinar", "Styr", "Thorfinn", "Toki", "Vagn", "Vidar"],
    female: ["Alfhild", "Aslaug", "Borghild", "Eydis", "Groa", "Hervor", "Hjordis", "Ingibjorg", "Jorunn", "Katla", "Rannveig", "Signy", "Svanhild", "Unn", "Vigdis"],
    places: ["Bearfjord", "Daneholm", "Drakkarstead", "Greyvik", "Hakonshavn", "Iceford", "Ironstrand", "Ravenwick", "Runestone", "Shieldbay", "Stormness"],
    occupations: ["Beastmaster", "Carver", "Farmer", "Huntsman", "Lawman", "Shipwright", "Shieldsmith", "Trapper"],
    traits: ["Bearclaw", "Crow-Eye", "Greybeard", "Harefoot", "Keen-Eye", "Oathkeeper", "Sea-Wolf", "Stonefist"]
  },
  welsh: {
    male: ["Aneirin", "Bedwyr", "Cadel", "Caredig", "Clydog", "Cynddelw", "Deheuwynt", "Ednyfed", "Elisedd", "Goronwy", "Gwyn", "Maelgwn", "Meurig", "Morgan", "Rhisiart", "Rhun", "Tewdwr"],
    female: ["Arianwen", "Blodwen", "Catrin", "Ceinwen", "Dyddgu", "Eleri", "Gwen", "Gwenhwyfar", "Gwenllian", "Mared", "Morwenna", "Myfanwy", "Olwen", "Sioned"],
    places: ["Aberglas", "Brynmawr", "Caerwen", "Ceredig", "Dyffryn", "Glynneath", "Llanbryn", "Maesgwyn", "Penmaen", "Rhosfair", "Talybont"],
    occupations: ["Beekeeper", "Carver", "Drover", "Hunter", "Poet", "Saddler", "Weaver", "Woodward"],
    traits: ["Ddu", "Fawr", "Gam", "Goch", "Gwallt Hir", "Gwynedd", "Hael", "Sais"]
  },
  germanic: {
    male: ["Adalhard", "Arnold", "Burchard", "Eckhart", "Friedrich", "Gebhard", "Gottschalk", "Gunther", "Hartmann", "Hugo", "Leopold", "Lothar", "Manfred", "Siegfried", "Volker", "Walther", "Wolfram"],
    female: ["Adelgund", "Agnes", "Alheid", "Beatrix", "Christina", "Dietlind", "Elisabeth", "Fredegund", "Greta", "Heilwig", "Jutta", "Luitgard", "Ottilie", "Richildis", "Sophia"],
    places: ["Altenburg", "Bärenfels", "Dunkeldorf", "Eichenwald", "Felsenheim", "Greifenau", "Hartbruck", "Lindenau", "Morgenstern", "Niederwald", "Rabenfurt"],
    occupations: ["Bottcher", "Drechsler", "Gerber", "Glaser", "Hirt", "Kohler", "Metzger", "Schneider", "Wagner"],
    traits: ["der Blasse", "der Fromme", "der Kluge", "der Rote", "Eisenfaust", "Graubart", "Kurzbein", "Silberhaar"]
  },
  italian: {
    male: ["Ambrogio", "Antonio", "Bartolomeo", "Bonifacio", "Corrado", "Domenico", "Federico", "Filippo", "Gherardo", "Guglielmo", "Jacopo", "Leonardo", "Luca", "Martino", "Paolo", "Ranieri", "Simone", "Tommaso"],
    female: ["Agnese", "Bartolomea", "Berta", "Constanza", "Diana", "Elena", "Fiore", "Ginevra", "Isotta", "Lia", "Lisabetta", "Mona", "Nicolosa", "Oretta", "Vanna"],
    places: ["Amalfi", "Assisi", "Brescia", "Cremona", "Faenza", "Firenze", "Genova", "Modena", "Orvieto", "Perugia", "Rimini", "Treviso", "Vicenza"],
    occupations: ["Calzolaio", "Cartaro", "Ceraiolo", "Lanaiolo", "Muratore", "Pescatore", "Pittore", "Sellaro", "Tintore"],
    traits: ["il Corto", "il Grande", "il Grigio", "il Vecchio", "la Bruna", "la Forte", "la Giovane", "la Rossa"]
  }
};

for (const [culture, fields] of Object.entries(EXTRA_DATA)) {
  if (!DATA[culture]) continue;
  for (const [field, values] of Object.entries(fields)) {
    if (!Array.isArray(DATA[culture]?.[field]) || !Array.isArray(values)) continue;
    DATA[culture][field] = Array.from(new Set([...DATA[culture][field], ...values]));
  }
}

export const NAME_CULTURES = Object.fromEntries(Object.entries(DATA).map(([key, data]) => [key, data.label]));

function pick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(pct) {
  return Math.random() * 100 < pct;
}

function tidy(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function locative(culture, place) {
  if (culture === "angloNorman" || culture === "french" || culture === "italian") return `de ${place}`;
  if (culture === "germanic") return `von ${place}`;
  if (culture === "welsh" || culture === "norse") return `of ${place}`;
  return chance(35) ? `atte ${place}` : `of ${place}`;
}

function patronymic(culture, sex, given, data) {
  const pool = sex === "female" ? data.male : data.male;
  const parent = pick(pool);
  if (!parent) return "";
  const suffix = sex === "female" ? data.femalePatronymicSuffix : data.malePatronymicSuffix;
  switch (suffix) {
    case "fitz": return `fitz ${parent}`;
    case "fils": return `fils ${parent}`;
    case "fille": return `fille ${parent}`;
    case "ap": return `ap ${parent}`;
    case "ferch": return `ferch ${parent}`;
    case "sohn": return `${parent}sohn`;
    case "tochter": return `${parent}tochter`;
    case "dottir": return `${parent}sdottir`;
    case "di": return `di ${parent}`;
    case "daughter": return `${parent}daughter`;
    case "son":
    default:
      return `${parent}son`;
  }
}

function titleFor(style, sex) {
  if (style === "clerical") return sex === "female" ? "Sister" : "Brother";
  if (style === "knightly") return sex === "female" ? "Dame" : "Sir";
  if (style === "scholar") return sex === "female" ? "Mistress" : "Master";
  return "";
}

function byname({ culture, sex, style, includeByname, given, data }) {
  if (!includeByname) return "";
  const weights = style === "knightly"
    ? ["locative", "locative", "trait", "patronymic"]
    : style === "clerical"
      ? ["locative", "trait", "occupation"]
      : style === "scholar"
        ? ["locative", "occupation", "trait", "patronymic"]
        : ["occupation", "locative", "trait", "patronymic"];
  const kind = pick(weights);
  if (kind === "locative") return locative(culture, pick(data.places));
  if (kind === "occupation") return pick(data.occupations);
  if (kind === "trait") return pick(data.traits);
  return patronymic(culture, sex, given, data);
}

export function generateMedievalName(options = {}) {
  const culture = DATA[options.culture] ? options.culture : "generic";
  const data = DATA[culture];
  const sex = options.sex === "female" ? "female" : "male";
  const style = NAME_STYLES[options.style] ? options.style : "commoner";
  const includeByname = options.includeByname !== false;
  const given = pick(data[sex]);
  const title = titleFor(style, sex);
  const surname = byname({ culture, sex, style, includeByname, given, data });
  return tidy([title, given, surname].filter(Boolean).join(" "));
}

export function defaultNameGenSettings() {
  return { sex: "male", culture: "generic", style: "commoner", includeByname: true };
}
