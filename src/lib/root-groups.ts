export interface RootGroupDef {
  label: string;
  icon: string;
  members: string[];
}

export const ROOT_GROUPS: RootGroupDef[] = [
  { label: "看与观察", icon: "eye", members: ["vis", "vid", "vic", "spect", "spec", "view", "sight", "look", "see", "observ"] },
  { label: "说与语言", icon: "speak", members: ["dict", "dic", "scribe", "script", "graph", "gram", "log", "loqu", "nounce", "nunci", "fess", "parl", "voc", "vok", "son", "liter", "lingu"] },
  { label: "行走与移动", icon: "foot", members: ["ced", "cess", "ceed", "gress", "grad", "it", "fer", "port", "por", "duct", "duc", "duce", "mot", "mov", "mob", "migr", "vad", "ven", "vent", "vail"] },
  { label: "拿取与投掷", icon: "hand", members: ["cap", "cept", "ceive", "cep", "sum", "sume", "tract", "ject", "jec", "mit", "miss", "pel", "puls", "press", "sult"] },
  { label: "站立与放置", icon: "stand", members: ["sta", "stit", "sist", "ten", "tain", "tent", "pos", "pon", "set", "sit", "sid", "sess", "her", "hes"] },
  { label: "心智与感觉", icon: "mind", members: ["sci", "cogn", "sent", "sens", "mem", "cred", "fid", "cord", "cur", "psych", "path", "pati", "spir", "jud", "put", "tegr", "tect"] },
  { label: "建造与创造", icon: "build", members: ["act", "fac", "fact", "fect", "fic", "struct", "stru", "cre", "oper", "labor", "fabric", "mechan", "techn"] },
  { label: "转变与状态", icon: "turn", members: ["vert", "vers", "volve", "rot", "gen", "form", "sol", "fin", "termin", "solv", "clos", "clud", "clu", "rupt"] },
  { label: "法律与社会", icon: "scales", members: ["leg", "jur", "mand", "not", "sign", "soci", "civil", "popul", "dem", "liber", "equ", "just", "serv", "auth", "nomin", "nom"] },
  { label: "前缀与方向", icon: "prefix", members: ["a", "ap", "at", "ar", "ad", "ante", "pre", "pro", "sub", "super", "anti", "re", "de", "dis", "en", "em", "ex", "in", "im", "un", "con", "com", "per", "inter", "trans", "ob", "para", "dia", "circum", "contra", "extra", "infra", "intro", "retro", "ambi", "omni"] },
];
