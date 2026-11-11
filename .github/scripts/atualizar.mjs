import fs from 'node:fs';

async function getJson(url){
  try{
    const r = await fetch(url, { headers: { 'User-Agent': 'LotteryLab/1.0' } });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

function normaliza(j, loteria, concurso){
  if(!j) return null;
  // Guidi: { concurso, data, dezenas: ["06","14",...] }
  // Caixa-API Heroku: { concurso, data, dezenas: [6,14,...] }
  // ApiLoterias: { concurso, data, dezenas: [...] }
  let dz = j.dezenas || j.listaDezenas || j.resultado || j.dezenasSorteadasOrdemSorteio || null;
  if(!dz || !dz.length) return null;
  dz = dz.map(n=>parseInt(n,10)).sort((a,b)=>a-b);
  return {
    concurso: parseInt(j.concurso || j.numero || concurso, 10),
    data: j.data || j.dataApuracao || '',
    dezenas: dz,
    acumulado: j.acumulado ?? j.acumulou ?? false,
    proximoPremio: j.proximoPremio || j.valorEstimadoProximoConcurso || 0,
    dataProximo: j.dataProximo || j.dataProximoConcurso || ''
  };
}

async function busca(loteria, concurso){
  const nome = loteria === 'mega' ? 'megasena' : loteria;
  const nomeHeroku = loteria === 'mega' ? 'mega-sena' : loteria;
  const urls = [
    `https://loteriascaixa-api.herokuapp.com/api/${nomeHeroku}/${concurso}`,
    `https://apiloterias.com.br/app/resultado?loteria=${nome}&concurso=${concurso}`,
    `https://api.guidi.dev.br/loterias/${nome}/${concurso}`,
    `https://loteriascaixa-api.herokuapp.com/api/${nomeHeroku}/latest`
  ];
  for(const u of urls){
    const j = await getJson(u);
    const n = normaliza(j, loteria, concurso);
    if(n && n.concurso === concurso) return n;
    if(n && concurso === 0) return n;
    await new Promise(r=>setTimeout(r,200));
  }
  return null;
}

let antigo = {};
try{ antigo = JSON.parse(fs.readFileSync('resultados.json','utf8')); }catch(e){}

async function processa(loteria){
  let ultimo = antigo[loteria]?.concurso || 0;
  let atual = null;
  for(let c = ultimo+1; c <= ultimo+3; c++){
    const r = await busca(loteria, c);
    if(r && r.concurso > ultimo) atual = r;
    else break;
  }
  if(!atual){
    // tenta o ultimo de novo em qualquer fonte
    const r = await busca(loteria, ultimo);
    atual = r || antigo[loteria];
  }
  if(!atual) return antigo[loteria];
  const hist = [];
  for(let c = atual.concurso; c > atual.concurso-50 && c > 0; c--){
    const r = await busca(loteria, c);
    if(r) hist.push({ concurso: r.concurso, data: r.data, dezenas: r.dezenas, soma: r.dezenas.reduce((a,b)=>a+b,0) });
    await new Promise(r=>setTimeout(r,120));
  }
  return { concurso: atual.concurso, data: atual.data, dezenas: atual.dezenas, acumulado: atual.acumulado, proximoPremio: atual.proximoPremio, dataProximo: atual.dataProximo, historico: hist };
}

try{
  const mega = await processa('mega');
  const lotofacil = await processa('lotofacil');
  const quina = await processa('quina');
  const out = { atualizadoEm: new Date().toISOString(), mega, lotofacil, quina };
  fs.writeFileSync('resultados.json', JSON.stringify(out, null, 2));
  console.log('OK', mega?.concurso, lotofacil?.concurso, quina?.concurso);
}catch(e){
  console.log('Erro, mantendo antigo:', e.message);
}
