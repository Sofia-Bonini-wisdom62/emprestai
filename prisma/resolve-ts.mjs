// Deixa o Node rodar o seed em TypeScript sem dependência nova. O Node 24 já remove os tipos,
// mas o client gerado do Prisma importa os próprios arquivos sem extensão ("./enums"); este hook
// tenta de novo com ".ts" quando um import relativo sem extensão não é encontrado.
import { registerHooks } from "node:module";

const RELATIVE = /^\.\.?\//;
const HAS_EXTENSION = /\.[cm]?[jt]s$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (
        error?.code === "ERR_MODULE_NOT_FOUND" &&
        RELATIVE.test(specifier) &&
        !HAS_EXTENSION.test(specifier)
      ) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw error;
    }
  },
});
