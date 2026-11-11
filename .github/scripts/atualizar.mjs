import fs from 'node:fs';

async function getJson(url){
  try{
    const r = await fetch(url, { headers: { 'User-Agent': 'LotteryLab/1.0' } });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ return null; }
}

let antigo = {};
try{ antigo = JSON.parse(fs.readFileSync('resultados.json','utf8')); }catch(e){}

function norm(j, loteria){
  if(!j) return null;
  const d = j.data || j;
  const dz = d.dezenas || d.numeros || d.resultado || d.listaDezenas || d.dezenasSorteadas || null;
  if(!dz || !dz.length) return null;
  return {
    concurso: parseInt(d.concurso || d.numero || 0, 10),
    data: d.data || d.dataApuracao || d.data_extracao || '',
    dezenas: dz.map(n=>parseInt(n,10)).sort((a,b)=>a-b),
    acumulado: d.acumulado ?? false,
    proximoPremio: d.proximoPremio || d.valorEstimadoProximoConcurso || 0,
    dataProximo: d.dataProximo || d.dataProximoConcurso || ''
  };
}

async function buscaUltimo(loteria){
  // 1) deunobicho - fonte nova, atualizada
  const nome = loteria === 'mega' ? 'mega-sena' : loteria;
  const tentativas = [
    `https://deunobicho.online/api/loterias/${nome}`,
    `https://deunobicho.online/api/loterias/${nome}/hoje`,
    `https://api.guidi.dev.br/loterias/${nome}/ultimo`
  ];
  for(const u of tentativas){
    const j = await getJson(u);
    const n = norm(j, loteria);
    if(n && n.concurso) return n;
  }
  return null;
}

async function processa(loteria){
  const ultimo = await buscaUltimo(loteria);
  if(!ultimo) return antigo[loteria];
  // historico: tenta pegar do antigo + coloca o ultimo na frente
  let hist = (antigo[loteria]?.historico || []).filter(h=>h.concurso !== ultimo.concurso);
  hist.unshift({ concurso: ultimo.concurso, data: ultimo.data, dezenas: ultimo.dezenas, soma: ultimo.dezenas.reduce((a,b)=>a+b,0) });
  hist = hist.slice(0,50);
  // se o ultimo for igual ao antigo, mantém data antiga
  let dataFinal = ultimo.data || antigo[loteria]?.data || '';
  if(antigo[loteria]?.concurso === ultimo.concurso) dataFinal = antigo[loteria].data;
  return {
    concurso: ultimo.concurso,
    data: dataFinal,
    dezenas: ultimo.dezenas,
    acumulado: ultimo.acumulado,
    proximoPremio: ultimo.proximoPremio || antigo[loteria]?.proximoPremio || 0,
    dataProximo: ultimo.dataProximo || antigo[loteria]?.dataProximo || '',
    historico: hist
  };
}

try{
  // Mega: tenta resultadomega concursos.json primeiro (tem todos + data)
  let mega = null;
  const conc = await getJson('https://resultadomega.com.br/api/concursos.json');
  if(conc && Array.isArray(conc) && conc.length){
    const last = conc[conc.length-1]; // [concurso, "AAAA-MM-DD", [dezenas]]
    const c = last[0], dt = last[1], dz = last[2].map(n=>parseInt(n,10)).sort((a,b)=>a-b);
    const [y,m,d] = dt.split('-');
    const histMega = conc.slice(-50).reverse().map(([cc, dd, dzz])=>{
      const [yy,mm,dd2] = dd.split('-');
      const dzz2 = dzz.map(n=>parseInt(n,10)).sort((a,b)=>a-b);
      return { concurso: cc, data: `${dd2}/${mm}/${yy}`, dezenas: dzz2, soma: dzz2.reduce((a,b)=>a+b,0) };
    });
    mega = { concurso: c, data: `${d}/${m}/${y}`, dezenas: dz, acumulado: antigo.mega?.acumulado ?? false, proximoPremio: antigo.mega?.proximoPremio || 0, dataProximo: antigo.mega?.dataProximo || '', historico: histMega };
  }
  if(!mega) mega = await processa('mega');
  const lotofacil = await processa('lotofacil');
  const quina = await processa('quina');
  const out = { atualizadoEm: new Date().toISOString(), mega, lotofacil, quina };
  fs.writeFileSync('resultados.json', JSON.stringify(out, null, 2));
  console.log('OK', mega?.concurso, lotofacil?.concurso, quina?.concurso);
}catch(e){
  console.log('Erro, mantendo antigo:', e.message);
}
