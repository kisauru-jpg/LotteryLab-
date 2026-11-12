export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=60');
  const out = {};
  const tries = [
    ['mega','https://deunobicho.online/api/loterias/mega-sena'],
    ['lotofacil','https://deunobicho.online/api/loterias/lotofacil'],
    ['quina','https://deunobicho.online/api/loterias/quina'],
  ];
  for(const [key,url] of tries){
    try{
      const r = await fetch(url, {headers:{'User-Agent':'SorteLab/1.0'}});
      if(!r.ok) continue;
      const j = await r.json();
      const d = j.data || j;
      const dez = d.dezenas || d.numeros || d.resultado;
      if(!dez) continue;
      out[key] = { concurso: parseInt(d.concurso||d.numero||0), data: d.data||d.data_extracao||d.dataApuracao||'', dezenas: dez.map(x=>parseInt(x)) };
    }catch(e){}
  }
  // backup Guidi
  for(const [key,slug] of [['mega','mega-sena'],['lotofacil','lotofacil'],['quina','quina']]){
    if(out[key]) continue;
    try{
      const r = await fetch('https://api.guidi.dev.br/loterias/'+slug+'/ultimo');
      if(!r.ok) continue;
      const j = await r.json();
      if(j.dezenas) out[key] = { concurso: parseInt(j.concurso||0), data: j.dataApuracao||'', dezenas: j.dezenas.map(x=>parseInt(x)) };
    }catch(e){}
  }
  return res.status(200).json({ ok:true, at:new Date().toISOString(), data: out });
}
