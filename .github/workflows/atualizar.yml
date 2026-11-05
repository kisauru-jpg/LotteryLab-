const urls = {
  mega: "https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena",
  lotofacil: "https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil",
  quina: "https://servicebus2.caixa.gov.br/portaldeloterias/api/quina"
};
const out = { atualizadoEm: new Date().toISOString() };
for (const [k, url] of Object.entries(urls)) {
  const r = await fetch(url);
  const j = await r.json();
  out[k] = {
    concurso: j.numero,
    data: j.dataApuracao,
    dezenas: j.listaDezenas.map(Number),
    acumulou: j.acumulado,
    proximoPremio: j.valorEstimadoProximoConcurso,
    proximoConcurso: j.numeroProximoConcurso,
    dataProximo: j.dataProximoConcurso
  };
}
import fs from "fs";
fs.writeFileSync("resultados.json", JSON.stringify(out, null, 2));
console.log("OK", out);
