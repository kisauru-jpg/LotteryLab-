import fs from 'node:fs';

async function getJson(url){
  try{
    const r = await fetch(url, { headers: { 'User-Agent': 'LotteryLab/1.0' } });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

async function busca(loteria, concurso){
  // Só Guidi - que já funcionava antes
  const nome = loteria === 'mega' ? 'megasena' : loteria;
  const urls = [
    `https://api.guidi.dev.br/loterias/${nome}/${concurso}`,
    `https://api.guidi.dev.br/loterias/${nome}/ultimo`
  ];
  for(const u of urls){
    const j = await getJson(u);
    if(j && j.dezenas && j.dezenas.length){
      return {
        concurso: j.concurso || concurso,
        data: j.data || '',
        dezenas: j.dezenas.map(n=>parseInt(n,10)).sort((a,b)=>a-b),
        acumulado: j.acumulado || false,
        proximoPremio: j.proximoPremio || 0,
        dataProximo: j.dataProximo || ''
      };
    }
    await new Promise(r=>setTimeout(r,200));
  }
  return null;
}

let antigo = {};
try{ antigo = JSON.parse(fs.readFileSync('resultados.json','utf8')); }catch(e){}

async function processa(loteria){
  let ultimo = antigo[loteria]?.concurso || 0;
  let atual = null;
  // tenta ultimo+1, +2
  for(let c = ultimo+1; c <= ultimo+2; c++){
    const r = await busca(loteria, c);
    if(r && r.concurso > ultimo) atual = r;
    else break;
  }
  if(!atual){
    atual = await busca(loteria, ultimo) || antigo[loteria];
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
  console.log('Erro mas mantendo arquivo antigo:', e.message);
}
