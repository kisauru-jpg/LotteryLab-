import fs from "fs";
async function tenta(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } });
  const t = await r.text();
  if (!t.trim().startsWith("{")) throw new Error("HTML");
  return JSON.parse(t);
}
async function buscaUltimo(tipo) {
  const j = await tenta(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${tipo}`);
  return { concurso: j.numero, data: j.dataApuracao, dezenas: j.listaDezenas.map(Number), acumulou: j.acumulado, proximoPremio: j.valorEstimadoProximoConcurso, proximoConcurso: j.numeroProximoConcurso, dataProximo: j.dataProximoConcurso };
}
async function buscaUm(tipo, numero) {
  const j = await tenta(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${tipo}/${numero}`);
  return { concurso: j.numero, data: j.dataApuracao, dezenas: j.listaDezenas.map(Number), soma: j.listaDezenas.map(Number).reduce((a,b)=>a+b,0), acumulou: j.acumulado };
}
const out = { atualizadoEm: new Date().toISOString() };
for (const [k, tipo] of Object.entries({ mega: "megasena", lotofacil: "lotofacil", quina: "quina" })) {
  const ultimo = await buscaUltimo(tipo);
  const historico = [];
  for (let i = 0; i < 50; i++) {
    const n = ultimo.concurso - i;
    if (n <= 0) break;
    try {
      historico.push(await buscaUm(tipo, n));
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { console.log("parou em", tipo, n); break; }
  }
  out[k] = { ...ultimo, historico };
  console.log("OK", k, historico.length);
}
fs.writeFileSync("resultados.json", JSON.stringify(out, null, 2));
console.log("OK geral");
