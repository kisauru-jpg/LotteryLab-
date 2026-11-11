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

function hojeBR(){
  const d = new Date();
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Fonte 1: guilhermeasn GitHub (não bloqueia) - tem todas as dezenas
// Fonte 2: resultadomega - tem data da Mega
async function processa(loteria, arquivo){
  const url = `https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/${arquivo}.json`;
  const data = await getJson(url);
  if(!data) return antigo[loteria];
  const concursos = Object.keys(data).map(n=>parseInt(n,10)).sort((a,b)=>a-b);
  const ultimo = concursos[concursos.length-1];
  const dezenas = data[String(ultimo)].map(n=>parseInt(n,10)).sort((a,b)=>a-b);
  // data: tenta pegar do antigo se já tinha esse concurso, senão usa hoje
  let dataSorteio = hojeBR();
  if(antigo[loteria]?.concurso === ultimo) dataSorteio = antigo[loteria].data;
  else {
    const achado = (antigo[loteria]?.historico || []).find(h=>h.concurso===ultimo);
    if(achado) dataSorteio = achado.data;
  }
  // historico 50 ultimos
  const hist = [];
  for(let i = concursos.length-1; i >= Math.max(0, concursos.length-50); i--){
    const c = concursos[i];
    const dz = data[String(c)].map(n=>parseInt(n,10)).sort((a,b)=>a-b);
    let dt = dataSorteio;
    if(c !== ultimo){
      const a = (antigo[loteria]?.historico || []).find(h=>h.concurso===c);
      if(a) dt = a.data;
    }
    hist.push({ concurso: c, data: dt, dezenas: dz, soma: dz.reduce((a,b)=>a+b,0) });
  }
  return {
    concurso: ultimo,
    data: dataSorteio,
    dezenas,
    acumulado: antigo[loteria]?.acumulado ?? false,
    proximoPremio: antigo[loteria]?.proximoPremio || 0,
    dataProximo: antigo[loteria]?.dataProximo || '',
    historico: hist
  };
}

try{
  const mega = await processa('mega', 'megasena');
  const lotofacil = await processa('lotofacil', 'lotofacil');
  const quina = await processa('quina', 'quina');
  const out = { atualizadoEm: new Date().toISOString(), mega, lotofacil, quina };
  fs.writeFileSync('resultados.json', JSON.stringify(out, null, 2));
  console.log('OK', mega?.concurso, lotofacil?.concurso, quina?.concurso);
}catch(e){
  console.log('Erro, mantendo antigo:', e.message);
}
