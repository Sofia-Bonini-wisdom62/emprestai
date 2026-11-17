// Os caminhos da skill, resolvidos a partir da raiz do repositório, de onde quer que o script
// rode. A pasta de trabalho fica fora do git (.gitignore, .skill-output/).
import { fileURLToPath } from "node:url";

const fromRoot = (relative: string) => fileURLToPath(new URL(`../../../../../${relative}`, import.meta.url));

// O manifesto aprovado e a lista dos 12 equipamentos, que o seed lê (RN-10).
export const APPROVED_MANIFEST = fromRoot("prisma/data/equipment-images.json");
export const EQUIPMENT_LIST = fromRoot("prisma/data/equipment.json");

// A pasta de trabalho de uma rodada (RN-18): as buscas guardadas por 24 h, os candidatos, as
// fotos baixadas, o manifesto da rodada e a folha de contato.
export const WORK_DIR = fromRoot(".skill-output/imagens-equipamentos");
export const CACHE_DIR = "cache";
export const CANDIDATES_FILE = "candidates.json";
export const MANIFEST_FILE = "manifest.json";
export const CONTACT_SHEET_FILE = "folha-de-contato.html";
