// Windows driver: gen.js's standalone guard (file:// vs C:\ path) never matches
// on win32, so drive generateSite() explicitly.
import { generateSite } from "./gen.js";
generateSite().catch((e) => { console.error(e); process.exit(1); });
