import fs from 'node:fs';

const HEADERS = { 'User-Agent': 'LotteryLab/1.0', 'Accept': 'application/json' };
async function getJson(url){
  const r = await fetch(url, { headers: HEADERS, cache: 'no-store' });
  if(!r.ok) throw new Error(url+' '+r.status);
  return r.json();
}
// Tenta 【entity-Caixa¦canonical_name=Caixa】 oficial primeiro, depois Guidi
async function busca(loteria, concurso){
  const 【entity-caixa¦canonical_name=Caixa】 = {
    mega: 'megasena',
    lotofacil: 'lotofacil',
    quina: 'quina'
  }[loteria];
  const urls = [
    `https://servicebus2.caixa.gov.br/portaldeloterias/api/${caixa}/${concurso}`,
    `https://api.guidi.dev.br/loterias/${caixa}/${concurso}`,
    `https://api.guidi.dev.br/loterias/${caixa}/ultimo`
  ];
  for(const u of urls){
    try{
      const j = await getJson(u);
      const dz = j.dezenas || j.listaDezenas || j.resultado || j.dezenasSorteadasOrdemSorteio;
      if(dz && dz.length){
        return {
          concurso: j.numero || j.concurso || concurso,
          data: j.dataApuracao || j.data || '',
          dezenas: dz.map(n=>parseInt(n,10)).sort((a,b)=>a-b),
          acumulado: j.acumulado ?? j.acumulou ?? false,
          proximoPremio: j.valorEstimadoProximoConcurso || j.proximoPremio || 0,
          dataProximo: j.dataProximoConcurso || ''
        };
      }
    }catch(e){ /* tenta proxima fonte */ }
    await new Promise(r=>setTimeout(r,200));
  }
  return null;
}

let antigo = {};
try{ antigo = JSON.parse(fs.readFileSync('resultados.json','utf8')); }catch(e){}

async function processa(loteria, qtd){
  let ultimo = antigo[loteria]?.concurso || 0;
  // descobre o ultimo real tentando ultimo+1, +2, +3
  let atual = null;
  for(let c = ultimo+1; c <= ultimo+3; c++){
    const r = await busca(loteria, c);
    if(r) atual = r;
    else break;
  }
  if(!atual){
    // se nao achou novo, tenta buscar o ultimo conhecido de novo
    atual = await busca(loteria, ultimo) || antigo[loteria];
  }
  if(!atual) return antigo[loteria];
  // monta historico de 50 voltando do atual
  const hist = [];
  for(let c = atual.concurso; c > atual.concurso-50 && c > 0; c--){
    const r = await busca(loteria, c);
    if(r) hist.push({ concurso: r.concurso, data: r.data, dezenas: r.dezenas, soma: r.dezenas.reduce((a,b)=>a+b,0) });
    await new Promise(r=>setTimeout(r,150));
  }
  return { concurso: atual.concurso, data: atual.data, dezenas: atual.dezenas, acumulado: atual.acumulado, proximoPremio: atual.proximoPremio, dataProximo: atual.dataProximo, historico: hist };
}

const mega = await processa('mega', 6);
const lotofacil = await processa('lotofacil', 15);
const quina = await processa('quina', 5);

const out = { atualizadoEm: new Date().toISOString(), mega, lotofacil, quina };
fs.writeFileSync('resultados.json', JSON.stringify(out, null, 2));
console.log('OK', mega?.concurso, lotofacil?.concurso, quina?.concurso);
