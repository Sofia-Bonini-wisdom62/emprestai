import { describe, expect, it } from "vitest";

import { checkManifest, checkManifestText, type Manifest, missingAssetTags, objectLists } from "./manifest";
import { complete, photo, sha } from "./manifest.fixtures";

// O manifesto completo com a foto da posição `index` trocada.
function withPhoto(index: number, replacement: unknown): unknown {
  const manifest = complete();
  return { photos: manifest.photos.map((current, i) => (i === index ? replacement : current)) };
}

// A foto sem os campos dados.
const omit = (record: object, ...keys: string[]) =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));

// O manifesto completo sem um campo da foto da posição `index`.
const withoutField = (index: number, field: string) => withPhoto(index, omit(complete().photos[index], field));

// A foto do TI-0002 é a terceira do manifesto completo.
const TI_0002 = 2;
const label = "foto 3 (TI-0002, 222)";

describe("checkManifest, CA-03 (spec 002, RN-04 a RN-06)", () => {
  it("ca_03 um manifesto completo passa", () => {
    expect(checkManifest(complete())).toEqual({ ok: true, manifest: complete() });
  });

  it("ca_03 um manifesto completo gravado em UTF-8 com BOM também passa", () => {
    expect(checkManifestText(`\uFEFF${JSON.stringify(complete())}`)).toEqual({ ok: true, manifest: complete() });
  });

  it.each([
    ["photoUrl", "a página da foto (photoUrl)"],
    ["photographer", "o fotógrafo (photographer)"],
    ["photographerUrl", "a página do fotógrafo (photographerUrl)"],
    ["license", "a licença (license)"],
  ])("ca_03 reprova com o campo de crédito %s faltando", (field, description) => {
    expect(checkManifest(withoutField(TI_0002, field))).toEqual({
      ok: false,
      problems: [`${label}: falta ${description}`],
    });
  });

  it("ca_03 reprova com o id do Pexels repetido", () => {
    const repeated = photo("TI-0002", 111, "approved", { sha256: sha(222) });

    expect(checkManifest(withPhoto(TI_0002, repeated))).toEqual({
      ok: false,
      problems: ["o id do Pexels 111 está aprovado em TI-0001 e TI-0002 (RN-04)"],
    });
  });

  it("ca_03 reprova com o SHA-256 repetido", () => {
    const repeated = photo("TI-0002", 222, "approved", { sha256: sha(111) });

    expect(checkManifest(withPhoto(TI_0002, repeated))).toEqual({
      ok: false,
      problems: [`o SHA-256 ${sha(111)} está aprovado em TI-0001 e TI-0002 (RN-04)`],
    });
  });

  it.each(["TI-0002.jpg", "TI-0002-222.jpeg", "ti-0002-222.jpg", "TI-0002-111.jpg", "fotos/TI-0002-222.jpg"])(
    "ca_03 reprova o nome de objeto fora do padrão do RN-06: %s",
    (name) => {
      expect(checkManifest(withPhoto(TI_0002, photo("TI-0002", 222, "approved", { objectName: name })))).toEqual({
        ok: false,
        problems: [`${label}: o nome do objeto é "${name}", e não "TI-0002-222.jpg" (RN-06)`],
      });
    },
  );

  it("ca_03 reprova o patrimônio sem foto aprovada", () => {
    expect(checkManifest(withPhoto(3, photo("TI-0003", 333, "rejected")))).toEqual({
      ok: false,
      problems: ["o patrimônio TI-0003 não tem foto aprovada"],
    });
  });

  it("ca_03 reprova o patrimônio com duas fotos aprovadas", () => {
    expect(checkManifest(withPhoto(1, photo("TI-0001", 112, "approved")))).toEqual({
      ok: false,
      problems: ["o patrimônio TI-0001 tem 2 fotos aprovadas"],
    });
  });

  it.each([
    ["sem o campo verdict", { reason: "tela com interface legível" }],
    ["sem a revisão", undefined],
  ])("ca_03 reprova a foto sem veredito: %s", (_, review) => {
    const unreviewed = { ...photo("TI-0001", 112, "rejected"), review };

    expect(checkManifest(withPhoto(1, unreviewed))).toEqual({
      ok: false,
      problems: ["foto 2 (TI-0001, 112): foto sem veredito (review.verdict)"],
    });
  });
});

describe("checkManifest, CA-12 (RN-04, RN-05 e RN-17): os outros campos e a repetição", () => {
  it.each([
    ["sourceUrl", "a URL de origem do arquivo (sourceUrl)"],
    ["sha256", "o SHA-256 (sha256)"],
    ["downloadedAt", "a data do download (downloadedAt)"],
    ["assetTag", "o patrimônio (assetTag)"],
    ["pexelsId", "o id do Pexels (pexelsId)"],
    ["objectName", "o nome do objeto (objectName)"],
  ])("ca_12 reprova a foto sem o campo %s", (field, description) => {
    const problems = checkManifest(withoutField(TI_0002, field));
    const photoLabel =
      field === "assetTag" ? "foto 3 (sem patrimônio, 222)" : field === "pexelsId" ? "foto 3 (TI-0002, sem id)" : label;

    expect(problems).toEqual({ ok: false, problems: [`${photoLabel}: falta ${description}`] });
  });

  it("ca_12 reprova a foto sem o motivo do veredito", () => {
    const review = { verdict: "approved" };

    expect(checkManifest(withPhoto(TI_0002, { ...photo("TI-0002", 222), review }))).toEqual({
      ok: false,
      problems: [`${label}: falta o motivo do veredito (review.reason)`],
    });
  });

  it.each([
    ["photographer", "o fotógrafo (photographer)"],
    ["review.reason", "o motivo do veredito (review.reason)"],
  ])("ca_12 o campo %s só com espaços conta como campo que falta", (field, description) => {
    const blank = field === "review.reason"
      ? { ...photo("TI-0002", 222), review: { verdict: "approved", reason: "   " } }
      : { ...photo("TI-0002", 222), [field]: "   " };

    expect(checkManifest(withPhoto(TI_0002, blank))).toEqual({
      ok: false,
      problems: [`${label}: falta ${description}`],
    });
  });

  it.each([
    ["pexelsId", "222", "o id do Pexels (pexelsId)"],
    ["pexelsId", 0, "o id do Pexels (pexelsId)"],
    ["pexelsId", 2.5, "o id do Pexels (pexelsId)"],
    ["photoUrl", "página da foto", "a página da foto (photoUrl)"],
    ["photoUrl", "http://www.pexels.com/photo/222/", "a página da foto (photoUrl)"],
    ["photographerUrl", "javascript:alert(1)", "a página do fotógrafo (photographerUrl)"],
    ["sourceUrl", "pexels-photo-222.jpeg", "a URL de origem do arquivo (sourceUrl)"],
    ["sourceUrl", "data:image/jpeg;base64,AAAA", "a URL de origem do arquivo (sourceUrl)"],
    ["objectName", ["TI-0002-222.jpg"], "o nome do objeto (objectName)"],
    ["sha256", sha(222).toUpperCase().replace(/^0/, "A"), "o SHA-256 (sha256)"],
    ["sha256", "abc", "o SHA-256 (sha256)"],
    ["downloadedAt", "ontem", "a data do download (downloadedAt)"],
    ["downloadedAt", "2026-13-45", "a data do download (downloadedAt)"],
  ])("ca_12 reprova o campo %s com o valor %j", (field, value, description) => {
    const problems = checkManifest(withPhoto(TI_0002, { ...photo("TI-0002", 222), [field]: value }));
    const photoLabel = field === "pexelsId" ? "foto 3 (TI-0002, sem id)" : label;

    expect(problems).toEqual({ ok: false, problems: [`${photoLabel}: ${description} é inválido`] });
  });

  it.each([
    ["outro nome", { name: "CC0", url: "https://www.pexels.com/license/" }],
    ["outra URL", { name: "Pexels License", url: "https://www.pexels.com/" }],
  ])("ca_12 reprova a licença com %s", (_, license) => {
    expect(checkManifest(withPhoto(TI_0002, { ...photo("TI-0002", 222), license }))).toEqual({
      ok: false,
      problems: [`${label}: a licença (license) não é a "Pexels License", com https://www.pexels.com/license/`],
    });
  });

  it("ca_12 reprova o veredito fora de approved e rejected", () => {
    const review = { verdict: "aprovada", reason: "ok" };

    expect(checkManifest(withPhoto(TI_0002, { ...photo("TI-0002", 222), review }))).toEqual({
      ok: false,
      problems: [`${label}: o veredito (review.verdict) é inválido; use approved ou rejected`],
    });
  });

  it("ca_12 devolve todos os problemas de uma vez", () => {
    const incomplete = omit(photo("TI-0002", 222), "photographer", "sha256");

    expect(checkManifest(withPhoto(TI_0002, incomplete))).toEqual({
      ok: false,
      problems: [`${label}: falta o fotógrafo (photographer)`, `${label}: falta o SHA-256 (sha256)`],
    });
  });

  it("ca_12 a foto reprovada também precisa do crédito e da origem", () => {
    const incomplete = omit(photo("TI-0001", 112, "rejected"), "photographer");

    expect(checkManifest(withPhoto(1, incomplete))).toEqual({
      ok: false,
      problems: ["foto 2 (TI-0001, 112): falta o fotógrafo (photographer)"],
    });
  });

  it("ca_12 a mesma foto aprovada duas vezes no mesmo patrimônio só conta como duas aprovadas", () => {
    const manifest: Manifest = { photos: [...complete().photos, photo("TI-0002", 222)] };

    expect(checkManifest(manifest)).toEqual({ ok: false, problems: ["o patrimônio TI-0002 tem 2 fotos aprovadas"] });
  });

  it("ca_12 uma foto reprovada não conta como repetição de uma aprovada", () => {
    // A foto 111, aprovada no TI-0001, aparece reprovada no TI-0002, que tem a sua aprovada.
    const manifest: Manifest = {
      photos: [...complete().photos, photo("TI-0002", 111, "rejected")],
    };

    expect(checkManifest(manifest)).toEqual({ ok: true, manifest });
  });

  it.each([
    ["não é JSON", "{ photos: ", "o manifesto não é um JSON válido"],
    ["não tem a lista de fotos", "{}", "o manifesto não tem a lista de fotos (photos)"],
    ["traz uma foto que não é objeto", '{"photos": [1]}', "foto 1: não é um objeto"],
  ])("ca_12 reprova o manifesto que %s", (_, text, problem) => {
    expect(checkManifestText(text)).toEqual({ ok: false, problems: [problem] });
  });
});

describe("missingAssetTags, CA-12 (spec 002, RN-16)", () => {
  it("ca_12 aponta o patrimônio aprovado que ficou de fora do manifesto novo", () => {
    const next: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0003", 333)] };

    expect(missingAssetTags(complete(), next)).toEqual([
      "o patrimônio TI-0002 tem foto aprovada no manifesto aprovado e ficou de fora do manifesto novo (RN-16)",
    ]);
  });

  it("ca_12 não aponta nada quando o manifesto novo traz todos os patrimônios, mesmo com outra foto", () => {
    const next: Manifest = {
      photos: [photo("TI-0001", 444), photo("TI-0002", 222), photo("TI-0003", 333), photo("TI-0004", 555)],
    };

    expect(missingAssetTags(complete(), next)).toEqual([]);
  });

  it("ca_12 sem manifesto aprovado, nenhum patrimônio fica de fora", () => {
    expect(missingAssetTags({ photos: [] }, complete())).toEqual([]);
  });
});

describe("objectLists, CA-09 (spec 002, RN-06)", () => {
  const approved: Manifest = { photos: [photo("TI-0001", 111)] };

  it("ca_09 trocar a foto lista o objeto antigo para apagar e o novo para enviar", () => {
    const next: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 222)] };

    expect(objectLists(approved, next)).toEqual({ toUpload: ["TI-0001-222.jpg"], toDelete: ["TI-0001-111.jpg"] });
  });

  it("ca_09 a foto reprovada do manifesto aprovado não conta como objeto no bucket", () => {
    // No aprovado, a 111 está no bucket e a 112 foi reprovada; o novo inverte as duas.
    const before: Manifest = { photos: [photo("TI-0001", 111), photo("TI-0001", 112, "rejected")] };
    const after: Manifest = { photos: [photo("TI-0001", 111, "rejected"), photo("TI-0001", 112)] };

    expect(objectLists(before, after)).toEqual({ toUpload: ["TI-0001-112.jpg"], toDelete: ["TI-0001-111.jpg"] });
  });

  it("ca_09 com os dois manifestos iguais, as duas listas saem vazias", () => {
    expect(objectLists(approved, { photos: [photo("TI-0001", 111)] })).toEqual({ toUpload: [], toDelete: [] });
  });

  it("ca_12 sem manifesto aprovado, só as fotos aprovadas vão para o envio, em ordem", () => {
    expect(objectLists({ photos: [] }, complete())).toEqual({
      toUpload: ["TI-0001-111.jpg", "TI-0002-222.jpg", "TI-0003-333.jpg"],
      toDelete: [],
    });
  });
});
