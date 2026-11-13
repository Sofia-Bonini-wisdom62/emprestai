// O módulo de entrada da chave (spec 002, RN-08; rules/secrets.md). É o único arquivo da skill
// que lê a PEXELS_API_KEY, e só ela, do .env.local, por util.parseEnv: o resto do arquivo não
// entra no ambiente do processo, e a chave não aparece em mensagem, log nem JSON.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { inspect, parseEnv } from "node:util";

const NAME = "PEXELS_API_KEY";

// O .env.local da raiz do repositório, resolvido a partir deste arquivo.
export const ENV_FILE = fileURLToPath(new URL("../../../../../.env.local", import.meta.url));

// A chave fica num campo privado. Impressa, convertida em texto ou em JSON, sai só o nome dela.
export class ApiKey {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  // Só o pexels.ts chama, para montar o cabeçalho Authorization.
  reveal(): string {
    return this.#value;
  }

  toString() {
    return `[${NAME}]`;
  }

  toJSON() {
    return `[${NAME}]`;
  }

  [inspect.custom]() {
    return `ApiKey [${NAME}]`;
  }
}

export class ApiKeyError extends Error {}

// Lê a chave do arquivo dado; o padrão é o .env.local da raiz. Nenhuma mensagem traz o valor.
export function readApiKey(path: string = ENV_FILE): ApiKey {
  if (!existsSync(path)) {
    throw new ApiKeyError(`O ${path} não existe. Copie o .env.example para .env.local e preencha a ${NAME}.`);
  }
  // Sem aparar: o parseEnv já tira os espaços em volta de um valor sem aspas, e o que sobra nas
  // pontas, entre aspas, cai na regra do ASCII visível do RN-19.
  const value = parseEnv(readFileSync(path, "utf8"))[NAME];
  if (!value) {
    throw new ApiKeyError(`A ${NAME} está vazia ou ausente no ${path}. Preencha com a sua chave do Pexels.`);
  }
  // Só ASCII visível, de "!" a "~": espaço, quebra de linha, aspas curvas ou espaço invisível de
  // uma colagem quebrariam o cabeçalho Authorization, e o erro sairia como falha de rede.
  if (!/^[!-~]+$/.test(value)) {
    throw new ApiKeyError(
      `A ${NAME} no ${path} tem espaço, quebra de linha ou caractere fora do ASCII visível, como aspas curvas. Confira se a chave foi colada inteira.`,
    );
  }
  return new ApiKey(value);
}
