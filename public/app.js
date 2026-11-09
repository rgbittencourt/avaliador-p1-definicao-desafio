/* Avaliador P1 · Descobrindo meu desafio (TEDPRO/IFSC) */
const C=window.DesafioCore;
const RUBRIC=C.RUBRICA;
const ORDER=C.ORDEM;
const FIELD_IDS=['nome','matricula','orientador','conformidadeModelo','propostasLista','propostasDetalhe','desafio','justificativa','resultadosEsperados','iaDeclaracao','iaDescricao','coerenciaEtiqueta','coerenciaMotivo'];
let elementos={valores:null,origem:'auto',obs:''};
let classes=[],evaluations=[],currentEvaluationId=null,authHeader=sessionStorage.getItem('p1Auth')||'',rawPdfPages=[],pagePreviews=[];
const $=id=>document.getElementById(id);
const value=id=>$(id)?.type==='checkbox'?($(id).checked?'Sim, verificado':'Não verificado'):($(id)?.value||'').trim();
const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const slug=s=>String(s||'avaliacao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||`avaliacao-${Date.now()}`;

async function api(url,options={}){
  const headers={...(options.headers||{}),...(window.SeletorIA?SeletorIA.cabecalho():{})};
  if(authHeader) headers.Authorization=authHeader;
  if(options.body && !(options.body instanceof FormData)) headers['Content-Type']='application/json';
  let response=await fetch(url,{...options,headers});
  if(response.status===401&&response.headers.get('X-Login-Necessario')){
    const login=await SeletorIA.pedirLogin('professor'); if(!login) throw new Error('Autenticação cancelada.');
    authHeader=SeletorIA.basic(login.usuario,login.senha); sessionStorage.setItem('p1Auth',authHeader);
    response=await fetch(url,{...options,headers:{...headers,...SeletorIA.cabecalho(),Authorization:authHeader}});
    if(response.status===401){authHeader='';sessionStorage.removeItem('p1Auth');SeletorIA.esquecerLogin();throw new Error('Usuário ou senha incorretos.');}
  }
  const text=await response.text(); let data; try{data=JSON.parse(text);}catch{data={erro:text||`Erro ${response.status}`};}
  if(!response.ok) throw new Error(data.erro||`Erro ${response.status}`);
  return data;
}
const fmt=n=>C.formatar(n);

function renderRubric(){
  $('rubric').innerHTML=ORDER.map(key=>{const c=RUBRIC[key];return `<fieldset><legend>${escapeHtml(c.label)} <span class="weight">(até ${fmt(c.max)} ponto${c.max>1?'s':''})</span></legend>${[...c.niveis].reverse().map(n=>`<label class="level"><input type="radio" name="rub_${key}" value="${n.pontos}"><span>${escapeHtml(n.desc)}</span><span class="pts">${fmt(n.pontos)} pt${n.pontos>1?'s':''}</span></label>`).join('')}<label>Observação do avaliador</label><textarea id="obs_${key}" placeholder="Evidência, ponto forte, ausência ou orientação personalizada."></textarea></fieldset>`}).join('');
  $('rubric').addEventListener('change',()=>{updateScore();generateLocalFeedback(false);});
  ORDER.forEach(k=>$(`obs_${k}`).addEventListener('input',()=>generateLocalFeedback(false)));
}
function selected(key){const el=document.querySelector(`input[name="rub_${key}"]:checked`);return el?Number(el.value):null;}
function setScore(key,level){const el=document.querySelector(`input[name="rub_${key}"][value="${level}"]`);if(el)el.checked=true;}
function levels(){const o={};ORDER.forEach(k=>o[k]=selected(k));return o;}
function total(){return C.notaFinal(levels());}
function updateScore(){
  $('scoreTotal').textContent=fmt(total());
  $('scoreTable').innerHTML=ORDER.map(k=>{const c=RUBRIC[k],p=selected(k);const cls=p===null?'mid':p===c.max?'max':p===0?'zero':'mid';return `<tr><td>${escapeHtml(c.curto)}</td><td style="text-align:right;white-space:nowrap"><span class="badge ${cls}">${p===null?'—':`${fmt(p)} / ${fmt(c.max)}`}</span></td></tr>`}).join('');
  renderAlerts();
}
function automaticAlerts(){const out=C.alertas(formData());if(ORDER.some(k=>selected(k)===null))out.push({nivel:'aviso',texto:'Há critérios da rubrica ainda não avaliados.'});return out;}
function renderAlerts(){
  const manual=value('manualAlerts').split('\n').map(s=>s.trim()).filter(Boolean).map(texto=>({nivel:'aviso',texto}));
  const all=[...automaticAlerts(),...manual];
  $('alerts').innerHTML=all.length?all.map(a=>`<div class="alert ${a.nivel==='erro'?'':'info'}">${escapeHtml(a.texto)}</div>`).join(''):'<div class="ok">Nenhum alerta pendente.</div>';
  updateCounters();
}
function updateCounters(){
  const props=C.listarPropostas(value('propostasLista')),blocos=C.blocosPropostas(value('propostasDetalhe'));
  const si=v=>v?'<span class="s">✔</span>':'<span class="n">✘</span>';
  $('resumoPropostas').innerHTML=(props.length||blocos.length)?`<div class="counter ${props.length&&blocos.length>=props.length?'okc':'badc'}">${props.length} proposta(s) no item 1 · ${blocos.length} aprofundada(s) no item 2</div>`+(blocos.length?`<table class="mini"><thead><tr><th>Proposta</th><th>Por que</th><th>Público</th><th>Local</th><th>Formal/não formal</th><th>Pois</th><th>Tecnologias</th></tr></thead><tbody>${blocos.map((b,i)=>`<tr><td>${i+1}. ${escapeHtml(b.desejo.slice(0,60))}${b.desejo.length>60?'…':''}</td><td>${si(b.porQue)}</td><td>${si(b.publico)}</td><td>${si(b.local)}</td><td>${b.contexto&&b.contexto!=='ambos'?escapeHtml(b.contexto):si(false)}</td><td>${si(b.pois)}</td><td>${si(b.tecnologias)}</td></tr>`).join('')}</tbody></table>`:''):'';
  const q=C.limpo(value('desafio'));const pc=$('perguntaChecagem');
  if(!q){pc.textContent='';pc.className='counter';}
  else{const ok=[C.comecaComoPodemos(value('desafio')),C.perguntasDesafio(value('desafio'))<=1,C.TEC.test(q),!C.EXEMPLO_PERGUNTA.test(q)];pc.textContent=`${ok[0]?'✔':'✘'} começa com "Como podemos" · ${ok[1]?'✔ uma pergunta':'✘ mais de uma pergunta'} · ${ok[2]?'✔':'✘'} indica tecnologias · ${C.contarPalavras(q)} palavras`;pc.className='counter '+(ok.every(Boolean)?'okc':'badc');}
  renderElementos();
  const j=C.limpo(value('justificativa'));const jc=$('justificativaChecagem');
  jc.textContent=j?`${C.contarPalavras(j)} palavras · ${C.TEM_FUNDAMENTO.test(j)?'✔ há fatos, dados ou referências aparentes':'✘ sem fatos, dados ou referências aparentes'}`:'';jc.className='counter '+(j?(C.TEM_FUNDAMENTO.test(j)?'okc':'badc'):'');
}
/* ---------- elementos da pergunta-desafio ---------- */
const MARCA_EL={sim:'✅',parcial:'⚠️',nao:'❌'};
const PROX_EL={sim:'parcial',parcial:'nao',nao:'sim'};
const ORIGEM_EL={auto:'leitura automática',ia:'leitura da IA',manual:'ajustado pelo professor'};
function elementosAtuais(){if(elementos.origem==='auto'||!elementos.valores)return C.elementosPergunta(value('desafio'));return elementos.valores;}
function renderElementos(){
  const box=$('elementosPergunta');if(!box)return;
  const temPergunta=Boolean(C.limpo(value('desafio')));
  if(!temPergunta&&elementos.origem==='auto'){box.innerHTML='<div class="hint">Aparece quando houver pergunta-desafio.</div>';$('elementosOrigem').textContent='';$('elementosObs').textContent='';return;}
  const v=elementosAtuais();
  box.innerHTML=Object.entries(C.ELEMENTOS).map(([k,rot])=>`<button type="button" class="elemento" data-el="${k}" title="Clique para alterar"><span class="mk">${MARCA_EL[v[k]]||'·'}</span><span>${escapeHtml(rot)}</span></button>`).join('');
  $('elementosOrigem').textContent=`(${ORIGEM_EL[elementos.origem]||ORIGEM_EL.auto})`;
  $('elementosObs').textContent=elementos.obs||'';
}
function definirElementos(valores,origem,obs=''){elementos={valores:valores?{...valores}:null,origem:valores?origem:'auto',obs:valores?obs:''};renderElementos();}
// Feedback no padrão do Prof. Rogério: saudação, reconhecimento, só critérios abaixo do máximo, despedida.
function generateLocalFeedback(overwrite=true){
  if(!overwrite && value('feedback'))return;
  const first=value('nome').split(/\s+/)[0]||'estudante';
  const lines=[`Olá, ${first},`,`Obrigado por compartilhar a definição do seu desafio. A avaliação da sua P1 resultou em ${fmt(total())} de 10 pontos.`];
  const et=value('coerenciaEtiqueta'),mot=value('coerenciaMotivo').replace(/\.?\s*$/,'');
  if(et==='Coerente')lines.push(`A sua pergunta-desafio e os resultados que você espera alcançar estão bem alinhados${mot?`: ${mot.charAt(0).toLowerCase()+mot.slice(1)}`:''}.`);
  else if(et==='Parcial'||et==='Frágil')lines.push(`Observe a ligação entre a sua pergunta-desafio (item 3) e os resultados esperados (item 5)${et==='Frágil'?', que ainda está frágil':', que está apenas parcial'}${mot?`: ${mot.charAt(0).toLowerCase()+mot.slice(1)}`:''}. Os resultados devem descrever mudanças que decorrem diretamente do problema formulado, para o mesmo público.`);
  const abaixo=ORDER.filter(k=>{const p=selected(k);return p!==null&&p<RUBRIC[k].max;});
  if(abaixo.length){lines.push('Para aprimorar a definição do seu desafio, observe os pontos a seguir.');for(const k of abaixo){const p=selected(k);const obs=value(`obs_${k}`);lines.push(`${RUBRIC[k].label}: ${obs||RUBRIC[k].niveis.find(n=>n.pontos===p)?.desc||''}`);}}
  else if(ORDER.every(k=>selected(k)!==null))lines.push('Todos os critérios da rubrica foram atendidos plenamente. Parabéns pela definição clara e bem fundamentada do seu desafio.');
  lines.push('Um abraço,\nProf. Rogério');
  $('feedback').value=lines.join('\n\n').replace(/\s*[—–]\s*/g,', ');
}
function formData(){const d={};FIELD_IDS.forEach(id=>d[id]=value(id));return d;}

async function autoEvaluate(){
  const b=$('autoEvaluate');b.disabled=true;b.textContent='Analisando...';
  try{const r=await api('/api/avaliar',{method:'POST',body:JSON.stringify(formData())});let preenchidos=0;for(const k of ORDER){const x=r.pontuacoes?.[k];if(x&&x.pontos!==null&&x.pontos!==undefined&&Number.isFinite(Number(x.pontos))){setScore(k,Number(x.pontos));$(`obs_${k}`).value=x.justificativa||'';preenchidos++;}}if(preenchidos!==ORDER.length)throw new Error(`a resposta preencheu apenas ${preenchidos} de ${ORDER.length} critérios`);$('manualAlerts').value=(r.alertas||[]).join('\n');$('feedback').value=r.feedback||'';if(r.elementosPergunta)definirElementos(r.elementosPergunta,r.modo==='local'||r.modo==='local-fallback'?'auto':'ia',r.elementosObs||'');if(r.coerenciaEtiqueta&&!value('coerenciaEtiqueta')){$('coerenciaEtiqueta').value=r.coerenciaEtiqueta;$('coerenciaMotivo').value=r.coerenciaMotivo||'';ajustarMotivo();}const nomes={openai:'OpenAI',anthropic:'Claude'};$('autoEvaluateStatus').textContent=r.modo==='local-fallback'?'A IA não concluiu a análise. A rubrica foi preenchida pela avaliação local conservadora; revise as notas.':r.modo==='local'?'Avaliação automática local concluída (verifica presença das partes, não o mérito). Revise cada critério.':`Avaliação com IA (${nomes[r.modo]||'IA'}) concluída. Revise as sugestões antes de salvar.`;updateScore();}
  catch(e){$('autoEvaluateStatus').textContent=`Não foi possível avaliar: ${e.message}`;}finally{b.disabled=false;b.textContent='✨ Avaliar automaticamente';}
}

// Elementos da pergunta e etiqueta de coerência pela IA, logo após importar o PDF.
// Não sobrescreve o que o professor já ajustou (elementos clicados ou etiqueta escolhida).
function ajustarMotivo(){const t=$('coerenciaMotivo');if(!t)return;t.style.height='auto';t.style.height=Math.max(44,t.scrollHeight+2)+'px';}
async function lerDesafioComIA({forcar=false}={}){
  if(!C.limpo(value('desafio')))return;
  const st=$('coerenciaStatus2');st.textContent='Analisando a pergunta e a coerência com os resultados...';
  try{
    const r=await api('/api/leitura-desafio',{method:'POST',body:JSON.stringify(formData())});
    if(r.elementosPergunta&&(forcar||elementos.origem!=='manual'))definirElementos(r.elementosPergunta,'ia',r.elementosObs||'');
    if(r.coerenciaEtiqueta&&(forcar||!value('coerenciaEtiqueta'))){$('coerenciaEtiqueta').value=r.coerenciaEtiqueta;$('coerenciaMotivo').value=r.coerenciaMotivo||'';ajustarMotivo();}
    const v=r.coerenciaVerificacoes;const mk=x=>x?'✔':'✘';
    st.textContent=r.coerenciaEtiqueta?(v?`Sugerido pela IA: ${mk(v.mesmo_publico)} mesmo público · ${mk(v.decorre_do_problema)} resultados decorrem do problema · ${mk(v.especifico)} resultados específicos. Altere se discordar.`:'Sugerido pela IA. Altere se discordar.'):'';
  }catch(e){st.textContent=`Não foi possível sugerir com IA (${e.message}). Escolha manualmente ou use "Avaliar automaticamente".`;}
}
/* ---------- leitura do PDF ---------- */
function normalizePdfText(s){return String(s||'').replace(/​/g,'').replace(/\s+fi\s+/gi,'fi').replace(/desa\s+fi\s+o/gi,'desafio').replace(/[ \t]+$/gm,'');}
function layoutRows(content){const rows=[];for(const item of content.items){const x=item.transform[4],y=item.transform[5],width=item.width||0;let row=rows.find(r=>Math.abs(r.y-y)<2.2);if(!row){row={y,items:[]};rows.push(row);}row.items.push({x,width,text:item.str});}rows.sort((a,b)=>b.y-a.y);for(const row of rows)row.items.sort((a,b)=>a.x-b.x);return rows;}
function rowText(row){let line='',end=null;for(const item of row.items){if(end!==null){const gap=item.x-end;line+=gap>28?'\t':gap>2?' ':'';}line+=item.text;end=item.x+item.width;}return line.trimEnd();}
// Remove rodapés (números de página), cabeçalho do curso e junta linhas de parágrafo.
function cleanBlock(s,{keepLines=false}={}){
  let out=String(s||'').replace(/^\s*\d{1,2}\s*$/gm,'').replace(/^\s*Especializa[cç][aã]o lato sensu[^\n]*$/gim,'');
  out=out.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(keepLines)return out;
  return out.split(/\n\s*\n/).map(p=>p.replace(/\s*\n\s*/g,' ').trim()).filter(Boolean).join('\n\n');
}
function firstIndex(text,res,from=0){let best=-1,len=0;for(const re of res){const r=new RegExp(re.source,re.flags.includes('g')?re.flags:re.flags+'g');r.lastIndex=from;const m=r.exec(text);if(m&&(best<0||m.index<best)){best=m.index;len=m[0].length;}}return {index:best,length:len};}
// Texto entre o marcador inicial e o primeiro dos marcadores finais encontrados depois dele.
function section(text,start,ends,opts){const a=firstIndex(text,[start]);if(a.index<0)return'';const from=a.index+a.length;const b=firstIndex(text,ends,from);return cleanBlock(text.slice(from,b.index<0?undefined:b.index),opts);}
const MARCAS={
  item1:/1\.\s*O que voc[êe] gostaria de melhorar(?:[\s\S]{0,220}?mais de uma ideia\.?|[^\n]*)/i,
  item2:/2\.\s*Transformando desejos em desafios criativos(?:[\s\S]{0,400}?para cada proposta listada na pergunta 1\.?|[^\n]*)/i,
  item3:/3\.\s*Escolhendo um desafio/i, suaVez:/Agora [ée] sua vez[^\n]*/i,
  item4:/4\.\s*Por que voc[êe] escolheu esse desafio(?:[\s\S]{0,260}?refor[çc]em essa argumenta[çc][ãa]o\.?|[^\n]*)/i,
  item5:/5\.\s*O que voc[êe] pretende alcan[çc]ar(?:[\s\S]{0,200}?diferente no seu entorno\??|[^\n]*)/i,
  declaracao:/Declara[çc][ãa]o de transpar[êe]ncia no uso de IA/i, usoIA:/Este trabalho teve uso de IA:?/i, seSim:/Se sim, descreva[^:]*:/i
};
// Remove rodapés institucionais e o cabeçalho do curso repetidos em cada página.
function semRodapes(text){return String(text||'').replace(/^.*Instituto Federal de Santa Catarina.*$/gim,'').replace(/^.*Rua:\s*14 de julho.*$/gim,'').replace(/^.*Fone:\s*\(48\).*$/gim,'').replace(/^\s*Especializa[cç][aã]o\s*lato\s*sensu[^\n]*$/gim,'');}
function applyPreliminaryExtraction(bruto,fileName=''){
  const text=semRodapes(bruto);
  const linha=re=>{const m=text.match(re);return m?m[1].trim():'';};
  let nome=linha(/Nome completo:\s*([^\n]*)/i);if(!nome){const m=String(fileName).match(/\(([^()]+)\)\s*\.pdf$/i);nome=m?.[1]?.trim()||'';}
  $('nome').value=nome;$('matricula').value=linha(/(?:N[úu]mero de matr[íi]cula|Matr[íi]cula):\s*([^\n]*)/i);$('orientador').value=linha(/Orientador\(a\):\s*([^\n]*)/i);
  const M=MARCAS;
  $('propostasLista').value=section(text,M.item1,[M.item2],{keepLines:true});
  $('propostasDetalhe').value=section(text,M.item2,[M.item3],{keepLines:true}).replace(/^\s*Replique a mesma estrutura[^\n]*\n?/im,'');
  const item3=section(text,M.item3,[M.item4],{keepLines:true});
  const sv=item3.search(M.suaVez);
  $('desafio').value=cleanBlock(sv>=0?item3.slice(sv).replace(M.suaVez,''):'');
  $('justificativa').value=section(text,M.item4,[M.item5,M.declaracao]);
  $('resultadosEsperados').value=section(text,M.item5,[M.declaracao]);
  const decl=section(text,M.declaracao,[/$^/],{keepLines:true});
  const linhaUso=(decl.match(/Este trabalho teve uso de IA:?[^\n]*/i)||[''])[0];
  const sim=/\(\s*[xX✓✔•●]\s*\)\s*Sim/i.test(linhaUso),nao=/\(\s*[xX✓✔•●]\s*\)\s*N[ãa]o/i.test(linhaUso);
  $('iaDeclaracao').value=sim&&nao?'Ambos':sim?'Sim':nao?'Não':'';
  $('iaDescricao').value=section(decl,M.seSim,[/$^/]);
}
function renderPageGallery(){$('pageGallery').innerHTML=pagePreviews.map((src,i)=>`<button type="button" class="page-thumb" data-page="${i}"><img src="${src}" alt="Miniatura da página ${i+1}"><span>Página ${i+1} · ampliar</span></button>`).join('');}
function openPage(index){$('modalTitle').textContent=`Página ${index+1} do trabalho`;$('modalImage').src=pagePreviews[index];$('pageModal').classList.remove('hidden');document.body.style.overflow='hidden';}
function closePage(){$('pageModal').classList.add('hidden');$('modalImage').src='';document.body.style.overflow='';}
async function semanticExtract(){
  if(!rawPdfPages.length)return alert('Importe um PDF primeiro.');const b=$('semanticExtract');b.disabled=true;b.textContent='Interpretando...';$('pdfStatus').textContent='Separando as propostas, a pergunta-desafio e as justificativas...';
  try{const result=await api('/api/extrair-relatorio',{method:'POST',body:JSON.stringify({paginas:rawPdfPages,camposPreliminares:formData()})});let mantidos=0;for(const [key,val] of Object.entries(result)){if(!$(key))continue;const novo=String(val||'').trim();if(!novo&&value(key)){mantidos++;continue;}$(key).value=novo;}$('pdfStatus').textContent=`Interpretação semântica concluída${mantidos?` (${mantidos} campo(s) que a IA deixou vazios mantiveram a leitura por seções)`:''}. Revise os campos e confira as marcações (formal/não formal e IA) nas páginas do trabalho.`;checkDuplicate();renderAlerts();lerDesafioComIA();}
  catch(e){lerDesafioComIA();$('pdfStatus').textContent=`Não foi possível interpretar semanticamente: ${e.message}. Os campos preliminares, separados pelos itens do modelo, permanecem disponíveis para revisão.`;}finally{b.disabled=false;b.textContent='Reinterpretar campos com IA';}
}
async function importPdf(file){
  if(!file)return;newEvaluation(false);$('pdfStatus').textContent='Lendo o texto e as páginas do PDF...';rawPdfPages=[];pagePreviews=[];$('semanticActions').classList.add('hidden');$('pageGallery').classList.add('hidden');
  try{
    const bytes=new Uint8Array(await file.arrayBuffer());const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();rawPdfPages.push(normalizePdfText(layoutRows(content).map(rowText).join('\n')));const viewport=page.getViewport({scale:1.25});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pagePreviews.push(canvas.toDataURL('image/jpeg',.82));}
    const text=rawPdfPages.join('\n\n');applyPreliminaryExtraction(text,file.name);renderPageGallery();$('semanticActions').classList.remove('hidden');
    // PDF escaneado: páginas sem texto selecionável não podem ser lidas (só imagem).
    const letras=p=>(String(p).match(/[\p{L}\p{N}]/gu)||[]).length;
    const semTexto=rawPdfPages.map((p,i)=>letras(p)<30?i+1:0).filter(Boolean);
    const avisoScan=$('pdfEscaneado');
    if(letras(text)<200){
      avisoScan.innerHTML='<strong>Este PDF parece ser uma imagem escaneada (ou foto), sem texto selecionável.</strong> O aplicativo não consegue ler as respostas. Abra as páginas abaixo e transcreva os campos à mão, ou peça ao estudante o PDF gerado pelo editor de texto (Word, Google Docs ou LibreOffice → Salvar como PDF).';avisoScan.classList.remove('hidden');
      $('conformidadeModelo').value=`Arquivo PDF com ${pdf.numPages} página(s), sem texto selecionável (imagem escaneada ou foto). Respostas não puderam ser lidas automaticamente.`;
      $('pageGallery').classList.remove('hidden');$('togglePages').textContent='Ocultar páginas';
      $('pdfStatus').textContent=`PDF lido: ${pdf.numPages} página(s), mas sem texto para extrair. A interpretação com IA não foi feita.`;checkDuplicate();updateScore();return;
    }
    if(semTexto.length){avisoScan.innerHTML=`<strong>Página(s) ${semTexto.join(', ')} sem texto selecionável</strong> (imagem escaneada ou foto). As respostas dessas páginas podem ter ficado de fora: confira-as nas páginas do trabalho.`;avisoScan.classList.remove('hidden');}
    const estrutura=/DESCOBRINDO MEU DESAFIO/i.test(text)&&/Escolhendo um desafio/i.test(text);
    $('conformidadeModelo').value=`Arquivo PDF com ${pdf.numPages} página(s); estrutura do modelo P1 ${estrutura?'identificada':'não confirmada'}.${semTexto.length?` Página(s) ${semTexto.join(', ')} sem texto selecionável.`:''} Confira visualmente se a organização, a formatação e o estilo do modelo foram preservados.`;
    $('pdfStatus').textContent=`PDF lido: ${pdf.numPages} página(s). Iniciando a interpretação semântica...`;checkDuplicate();updateScore();await semanticExtract();
  }catch(e){$('pdfStatus').textContent=`Falha ao ler o PDF: ${e.message}`;}
}

function evaluationId(){return currentEvaluationId||slug(value('matricula')||value('nome'))+'-'+Date.now();}
function snapshot(){const scores={};ORDER.forEach(k=>scores[k]={points:selected(k),observation:value(`obs_${k}`)});return {id:evaluationId(),...formData(),elementosPergunta:elementosAtuais(),elementosOrigem:elementos.origem,elementosObs:elementos.obs,scores,manualAlerts:value('manualAlerts'),feedback:value('feedback'),...(window.CoerenciaUI?CoerenciaUI.valores():{}),total:total(),updatedAt:new Date().toISOString()};}
function loadEvaluation(e){newEvaluation(false);currentEvaluationId=e.id;FIELD_IDS.forEach(id=>{if($(id))$(id).value=e[id]||'';});ORDER.forEach(k=>{const p=e.scores?.[k]?.points;if(p!==null&&p!==undefined)setScore(k,p);$(`obs_${k}`).value=e.scores?.[k]?.observation||'';});$('manualAlerts').value=e.manualAlerts||'';$('feedback').value=e.feedback||'';definirElementos(e.elementosPergunta&&e.elementosOrigem&&e.elementosOrigem!=='auto'?e.elementosPergunta:null,e.elementosOrigem,e.elementosObs||'');if(window.CoerenciaUI)CoerenciaUI.definir(e);updateScore();ajustarMotivo();window.scrollTo({top:0,behavior:'smooth'});}
function newEvaluation(confirmFirst=true){if(confirmFirst&&!confirm('Limpar todo o formulário e iniciar nova avaliação?'))return;currentEvaluationId=null;FIELD_IDS.forEach(id=>{if($(id))$(id).value='';});ORDER.forEach(k=>{document.querySelectorAll(`input[name="rub_${k}"]`).forEach(x=>x.checked=false);$(`obs_${k}`).value='';});['manualAlerts','feedback'].forEach(id=>$(id).value='');definirElementos(null);$('pdfEscaneado').classList.add('hidden');if(window.CoerenciaUI)CoerenciaUI.limpar();['autoEvaluateStatus','pdfStatus','coerenciaStatus2'].forEach(id=>$(id).textContent='');$('pdfFile').value='';$('pageGallery').innerHTML='';$('pageGallery').classList.add('hidden');$('semanticActions').classList.add('hidden');rawPdfPages=[];pagePreviews=[];closePage();checkDuplicate();updateScore();}
function checkDuplicate(){const n=value('nome').toLowerCase(),m=value('matricula').toLowerCase();const dup=evaluations.find(e=>e.id!==currentEvaluationId&&((m&&String(e.matricula||'').toLowerCase()===m)||(n&&String(e.nome||'').toLowerCase()===n)));$('nome').classList.toggle('duplicate',!!dup);$('matricula').classList.toggle('duplicate',!!dup);$('duplicidade').classList.toggle('hidden',!dup);$('duplicidade').textContent=dup?`Já existe avaliação para ${dup.nome||'este aluno'} nesta turma.`:'';}

async function loadClasses(preferred){try{classes=await api('/api/turmas');$('classSelect').innerHTML=classes.map(c=>`<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)} (${c.quantidade||0})</option>`).join('');if(preferred&&classes.some(c=>c.id===preferred))$('classSelect').value=preferred;if(classes.length){await loadEvaluations();const ativa=classes.find(c=>c.id===$('classSelect').value);$('classNameInput').value=ativa?.nome||'';}else{evaluations=[];$('classNameInput').value='';renderRoster();$('classStatus').textContent='Crie uma turma para começar.';}}catch(e){$('classStatus').textContent=e.message;}}
async function loadEvaluations(){const id=$('classSelect').value;if(!id)return;evaluations=await api(`/api/turmas/${encodeURIComponent(id)}/avaliacoes`);renderRoster();checkDuplicate();}
function renderRoster(){$('roster').innerHTML=evaluations.length?evaluations.map(e=>`<tr><td>${escapeHtml(e.nome||'Sem nome')}</td><td>${escapeHtml(e.matricula||'—')}</td><td>${fmt(e.total)}</td><td><button class="btn secondary" data-open="${escapeHtml(e.id)}">Abrir</button><button class="btn danger" data-delete="${escapeHtml(e.id)}">Excluir</button></td></tr>`).join(''):'<tr><td colspan="4">Nenhum aluno salvo.</td></tr>';}
function sameStudent(e){const m=value('matricula').toLowerCase(),n=value('nome').toLowerCase(),em=String(e?.matricula||'').trim().toLowerCase(),en=String(e?.nome||'').trim().toLowerCase();return m&&em?m===em:Boolean(n&&en&&n===en);}
async function saveEvaluation(){const cid=$('classSelect').value;if(!cid){$('classStatus').textContent='Crie ou selecione uma turma antes de salvar o aluno.';return;}if(!value('nome')&&!value('matricula')){$('classStatus').textContent='Informe o nome ou a matrícula do aluno.';return;}try{const aberto=evaluations.find(e=>e.id===currentEvaluationId);const novaIdentidade=Boolean(aberto&&!sameStudent(aberto));if(novaIdentidade)currentEvaluationId=null;const data=snapshot();await api(`/api/turmas/${encodeURIComponent(cid)}/avaliacoes/${encodeURIComponent(data.id)}`,{method:'PUT',body:JSON.stringify(data)});currentEvaluationId=data.id;await loadClasses(cid);$('classStatus').textContent=`${novaIdentidade?'Nova avaliação':'Avaliação'} salva com sucesso para ${data.nome||data.matricula}.`;}catch(e){$('classStatus').textContent=`Não foi possível salvar: ${e.message}`;}}

function download(name,content,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
function exportJson(){const c=classes.find(x=>x.id===$('classSelect').value);download(`${slug(c?.nome)}-p1.json`,JSON.stringify({version:2,turma:c,avaliacoes:evaluations},null,2));}
function csvCell(v){return `"${String(v??'').replace(/"/g,'""')}"`;}
function elementosDe(e){return e.elementosPergunta&&e.elementosOrigem&&e.elementosOrigem!=='auto'?C.elementosValidos(e.elementosPergunta):C.elementosPergunta(e.desafio);}
function exportCsv(){const header=['Nome','Matrícula','Nota',...ORDER.map(k=>RUBRIC[k].curto),'Pergunta-desafio','O quê','Para quem','Onde','Tecnologia','Coerência desafio → resultados','Contexto das propostas','Propostas no item 1','Declaração de IA','Alertas','Análise de coerência','Feedback de coerência'];const rows=evaluations.map(e=>[e.nome,e.matricula,fmt(e.total),...ORDER.map(k=>{const p=e.scores?.[k]?.points;return p===null||p===undefined?'':fmt(p);}),C.limpo(e.desafio),...Object.keys(C.ELEMENTOS).map(k=>elementosDe(e)[k]||''),e.coerenciaEtiqueta||'',C.contextoPredominante(e.propostasDetalhe),C.listarPropostas(e.propostasLista).length,e.iaDeclaracao,e.manualAlerts,e.analiseCoerencia,e.feedbackCoerencia]);download('avaliacoes-p1.csv','\ufeff'+[header,...rows].map(r=>r.map(csvCell).join(';')).join('\n'),'text/csv;charset=utf-8');}

function executiveReport(){
  if(!evaluations.length)return alert('A turma não possui avaliações.');

  const turma=classes.find(x=>x.id===$('classSelect').value);
  const temNota=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
  const notas=evaluations.map(e=>Number(e.total)).filter(Number.isFinite);
  const media=notas.reduce((a,b)=>a+b,0)/(notas.length||1);
  const ordenadas=[...notas].sort((a,b)=>a-b);
  const meio=Math.floor(ordenadas.length/2);
  const mediana=ordenadas.length%2?ordenadas[meio]:(ordenadas[meio-1]+ordenadas[meio])/2;
  const minimo=Math.min(...notas),maximo=Math.max(...notas);
  const faixas=[
    {label:'Abaixo de 6,0',count:notas.filter(n=>n<6).length,color:'#b6473f'},
    {label:'6,0 a 7,9',count:notas.filter(n=>n>=6&&n<8).length,color:'#d39a2c'},
    {label:'8,0 a 8,9',count:notas.filter(n=>n>=8&&n<9).length,color:'#4f94a0'},
    {label:'9,0 a 10,0',count:notas.filter(n=>n>=9).length,color:'#28735e'}
  ];
  const criterios=ORDER.map(k=>{
    const valores=evaluations.map(e=>e.scores?.[k]?.points).filter(temNota).map(Number);
    const mediaCriterio=valores.reduce((a,b)=>a+b,0)/(valores.length||1);
    return {k,label:RUBRIC[k].label,max:RUBRIC[k].max,media:mediaCriterio,pct:Math.round((mediaCriterio/RUBRIC[k].max)*100),respondidos:valores.length,peso:RUBRIC[k].peso};
  });
  const completos=evaluations.filter(e=>ORDER.every(k=>temNota(e.scores?.[k]?.points))).length;
  const pendentes=evaluations.length-completos;
  const conclusao=Math.round((completos/evaluations.length)*100);
  const perguntaOk=e=>C.limpo(e.desafio)&&C.comecaComoPodemos(e.desafio)&&C.perguntasDesafio(e.desafio)<=1;
  // Perfil das propostas e da pergunta (indicadores trazidos do Painel de Correção P1)
  const contar=(lista,fn)=>lista.reduce((acc,x)=>{const k=fn(x);acc[k]=(acc[k]||0)+1;return acc;},{});
  const blocosTurma=evaluations.flatMap(e=>C.blocosPropostas(e.propostasDetalhe));
  const ctx=contar(blocosTurma,b=>b.contexto==='formal'?'Formal':b.contexto==='não formal'?'Não formal':b.contexto==='ambos'?'As duas opções marcadas':'Sem marcação');
  const nMarcadas=(ctx['Formal']||0)+(ctx['Não formal']||0);
  const iaCont=contar(evaluations,e=>e.iaDeclaracao==='Sim'?'Sim':e.iaDeclaracao==='Não'?'Não':e.iaDeclaracao==='Ambos'?'Sim e Não assinalados':'Sem marcação');
  const nProps=contar(evaluations,e=>{const n=C.listarPropostas(e.propostasLista).length;return n>=4?'4 ou mais':String(n);});
  const coerCont=contar(evaluations,e=>e.coerenciaEtiqueta||'Não classificada');
  const els=evaluations.map(elementosDe);
  const elemPct=Object.entries(C.ELEMENTOS).map(([k,rot])=>({rot,sim:els.filter(x=>x[k]==='sim').length,parcial:els.filter(x=>x[k]==='parcial').length,nao:els.filter(x=>x[k]==='nao').length}));
  const semTec=evaluations.filter(e=>C.limpo(e.desafio)&&!C.TEC.test(C.limpo(e.desafio))).length;
  const fragilOuParcial=(coerCont['Frágil']||0)+(coerCont['Parcial']||0);
  const resumoOk=evaluations.filter(perguntaOk).length;
  const resumoPct=Math.round((resumoOk/evaluations.length)*100);
  const naoUsouIA=evaluations.filter(e=>e.iaDeclaracao==='Não').length;
  const usouIA=evaluations.filter(e=>e.iaDeclaracao==='Sim').length;
  const coerencia=evaluations.filter(e=>String(e.analiseCoerencia||'').trim()).length;
  const alertas=evaluations.flatMap(e=>String(e.manualAlerts||'').split('\n')).map(s=>s.trim()).filter(Boolean);
  const alertasPrincipais=Object.entries(alertas.reduce((acc,a)=>(acc[a]=(acc[a]||0)+1,acc),{})).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const ranking=[...criterios].sort((a,b)=>b.pct-a.pct);
  const forte=ranking[0],fragil=[...ranking].reverse()[0];
  const pct=n=>Math.round((n/evaluations.length)*100);
  const diagnostico=media>=9?'desempenho geral excelente':media>=8?'desempenho geral muito bom':media>=6?'desempenho geral satisfatório, com oportunidades claras de consolidação':'desempenho geral abaixo do esperado, indicando necessidade de intervenção pedagógica';
  const recomendacoes=[];
  const orientacoes={
    identificacao:'Lembrar de preencher nome, matrícula e orientador(a) e de preservar a organização e o estilo do modelo, salvando em PDF.',
    propostas:'Pedir que cada ideia do item 1 diga com clareza o que se quer melhorar e por que está ao alcance do estudante.',
    aprofundamento:'Reforçar que cada proposta do item 1 precisa de um bloco completo no item 2, com a marcação formal ou não formal justificada.',
    publico:'Orientar a caracterizar o público-alvo do desafio escolhido de modo específico, ligando-o às necessidades que justificam a proposta.',
    tecnologias:'Explicitar com exemplos como o desafio envolve tecnologias digitais na educação profissional, sem fixar uma solução.',
    pergunta:'Trabalhar a reescrita da pergunta "Como podemos..." com foco no problema, distinguindo problema de solução (exemplo da ponte).',
    escopo:'Exercitar a delimitação com fatores espaciais, temporais, de classificação, qualidade e quantidade, verificando a viabilidade no ano.',
    justificativa:'Incentivar a inclusão de fatos, dados e referências na justificativa, articulados à trajetória do estudante.',
    resultados:'Pedir que o item 5 descreva mudanças concretas no entorno e para o público, coerentes com o escopo, sem uma solução pronta.',
    transparencia:'Lembrar que a declaração de IA deve ter uma única marcação e, se "Sim", descrever ferramentas, para quê e como.'
  };
  recomendacoes.push(orientacoes[fragil.k]);
  const segundo=[...ranking].reverse()[1];if(segundo&&segundo.pct<80)recomendacoes.push(orientacoes[segundo.k]);
  if(fragilOuParcial>=Math.max(2,Math.ceil(evaluations.length*.3)))recomendacoes.push('Retomar com a turma a ligação entre a pergunta-desafio e os resultados esperados: o item 5 deve descrever mudanças que decorrem do problema formulado, para o mesmo público.');
  const elFraco=[...elemPct].sort((a,b)=>a.sim-b.sim)[0];if(elFraco&&elFraco.sim<evaluations.length*.6)recomendacoes.push(`Reforçar a delimitação da pergunta-desafio quanto ao elemento "${elFraco.rot}", ausente ou vago em ${evaluations.length-elFraco.sim} trabalho(s).`);
  if(resumoOk<evaluations.length)recomendacoes.push('Incluir na conferência final que a pergunta-desafio seja única e comece com "Como podemos...".');
  if(pendentes)recomendacoes.push(`Concluir os critérios pendentes em ${pendentes} avaliação${pendentes===1?'':'ões'} antes de tomar decisões definitivas sobre a turma.`);
  recomendacoes.push('Reservar um momento de troca entre pares para testar se a pergunta-desafio de cada um está clara, delimitada e sem solução embutida.');
  const unicas=[...new Set(recomendacoes)].slice(0,5);
  const data=new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const info=t=>`<span class="i" tabindex="0">i<span class="tip">${escapeHtml(t)}</span></span>`;
  const barras=(obj,ordem,cores)=>{const max=Math.max(1,...ordem.map(k=>obj[k]||0));return ordem.filter(k=>obj[k]||!['As duas opções marcadas','Sim e Não assinalados','Não avaliável','Não classificada'].includes(k)).map((k,i)=>`<div class="hbar"><span>${escapeHtml(k)}</span><div class="track"><div class="fill" style="width:${Math.round(100*(obj[k]||0)/max)}%;background:${cores[i%cores.length]}"></div></div><b>${obj[k]||0}</b></div>`).join('');};
  const linhas=[...evaluations].sort((a,b)=>Number(b.total||0)-Number(a.total||0)||String(a.nome||'').localeCompare(String(b.nome||''),'pt-BR'));

  const html=`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Relatório Executivo · P1 Descobrindo meu Desafio</title><style>
  :root{--navy:#0F3F46;--teal:#1D7480;--teal2:#4FA7B1;--pale:#D9EFF1;--ink:#20343a;--muted:#61747a;--line:#d6e1e3;--gold:#d89b2b;--red:#b6473f;--green:#28735e}*{box-sizing:border-box}body{margin:0;background:#eef3f7;color:var(--ink);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.page{width:min(1000px,calc(100% - 30px));margin:28px auto;background:#fff;box-shadow:0 12px 42px #173b4526}.hero{position:relative;overflow:hidden;padding:46px 54px 38px;background:linear-gradient(125deg,#0F3F46 0%,#14515A 60%,#1D7480 100%);color:#fff}.hero:after{content:"";position:absolute;width:300px;height:300px;border:60px solid #ffffff12;border-radius:50%;right:-105px;top:-135px}.brand{display:flex;align-items:center;gap:18px;position:relative;z-index:1}.brand img{width:76px;height:76px;object-fit:contain;filter:drop-shadow(0 5px 10px #0b293555)}.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-weight:800;font-size:11px;color:#bcd9ee}.hero h1{font-size:34px;line-height:1.12;margin:5px 0 8px}.hero p{margin:0;color:#dbeaf5}.hero-meta{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:22px;margin-top:27px;padding-top:18px;border-top:1px solid #ffffff38;font-size:13px}.content{padding:40px 54px 55px}.section{margin:0 0 38px}.section h2{margin:0 0 17px;color:var(--navy);font-size:21px;display:flex;gap:10px;align-items:center}.section h2 span{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--pale);color:var(--teal);font-size:13px}.lead{font-size:16px;margin:0}.summary{padding:22px 24px;background:linear-gradient(90deg,#eaf5f5,#f7faf9);border-left:5px solid var(--teal);border-radius:0 10px 10px 0}.summary strong{color:var(--navy)}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.kpi{border:1px solid var(--line);border-radius:12px;padding:18px;background:#fff}.kpi small{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700}.kpi strong{display:block;color:var(--teal);font-size:29px;line-height:1.15;margin:6px 0}.kpi em{font-style:normal;color:var(--muted);font-size:12px}.criterion{display:grid;grid-template-columns:minmax(230px,1.45fr) 2fr 70px;gap:14px;align-items:center;padding:9px 0}.criterion-name{font-size:13px}.track{height:12px;background:#e7edef;border-radius:8px;overflow:hidden}.fill{height:100%;border-radius:8px;background:linear-gradient(90deg,var(--teal),var(--teal2))}.criterion b{text-align:right;color:var(--navy);font-size:13px}.criterion b small{display:block;color:var(--muted);font-weight:500}.split{display:grid;grid-template-columns:1fr 1fr;gap:18px}.card{border:1px solid var(--line);border-radius:12px;padding:20px}.card h3{margin:0 0 13px;color:var(--navy);font-size:16px}.bands{display:flex;align-items:flex-end;height:155px;gap:12px;padding-top:12px}.band{flex:1;text-align:center;color:var(--muted);font-size:10px}.column{min-height:5px;border-radius:7px 7px 0 0;margin-bottom:6px}.band b{display:block;color:var(--navy);font-size:17px}.fact{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #e8edef}.fact:last-child{border:0}.fact strong{color:var(--navy)}.callout{padding:18px 20px;border-radius:10px;background:#fff7e6;border-left:5px solid var(--gold)}.callout p{margin:5px 0 0}.alerts{margin:0;padding-left:20px}.alerts li{margin:8px 0}.alerts b{color:var(--red)}.recommendations{counter-reset:item;list-style:none;padding:0;margin:0}.recommendations li{counter-increment:item;position:relative;padding:0 0 15px 44px;min-height:34px}.recommendations li:before{content:counter(item);position:absolute;left:0;top:0;display:grid;place-items:center;width:29px;height:29px;background:var(--navy);color:#fff;border-radius:50%;font-weight:800;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12px}thead{display:table-header-group}th{background:var(--navy);color:#fff;text-align:left;padding:10px}td{border-bottom:1px solid var(--line);padding:9px 10px}tbody tr:nth-child(even){background:#f7f9f9}.score{font-weight:800;color:var(--navy)}.status{display:inline-block;border-radius:12px;padding:2px 8px;font-size:10px;font-weight:700}.ok{background:#dff1e9;color:#1f644f}.warn{background:#fff0d0;color:#875e0f}.no{background:#f8dfdc;color:#8d3933}.method{color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:18px}.i{position:relative;display:inline-grid;place-items:center;width:16px;height:16px;margin-left:6px;border-radius:50%;border:1px solid var(--teal);color:var(--teal);font:italic 700 10px/1 Georgia,serif;cursor:help;vertical-align:middle;text-transform:none;letter-spacing:0}.i .tip{display:none;position:absolute;z-index:5;left:-12px;top:calc(100% + 6px);width:270px;background:#173a40;color:#fff;font:400 12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;text-align:left;padding:9px 11px;border-radius:8px;box-shadow:0 8px 22px #0004}.i:hover .tip,.i:focus .tip{display:block}.hbar{display:grid;grid-template-columns:150px 1fr 34px;gap:10px;align-items:center;font-size:12px;padding:4px 0}.hbar .track{height:11px}.hbar b{text-align:right;color:var(--navy)}.quad{display:grid;grid-template-columns:1fr 1fr;gap:18px}.el{display:grid;grid-template-columns:90px 1fr;gap:10px;align-items:center;font-size:12px;padding:5px 0}.stack{display:flex;height:13px;border-radius:7px;overflow:hidden;background:#e7edef}.stack div{height:100%}.legend{font-size:11px;color:var(--muted);margin-top:8px}.legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin:0 4px 0 10px;vertical-align:middle}.print{position:fixed;right:25px;bottom:25px;border:0;border-radius:24px;background:var(--gold);color:#172e34;padding:13px 20px;font-weight:800;box-shadow:0 5px 18px #0003;cursor:pointer}@media(max-width:720px){.hero,.content{padding-left:24px;padding-right:24px}.hero h1{font-size:27px}.kpis{grid-template-columns:1fr 1fr}.split{grid-template-columns:1fr}.criterion{grid-template-columns:1fr 75px}.criterion .track{grid-column:1/-1;grid-row:2}.brand img{width:60px;height:60px}}@media(max-width:720px){.quad{grid-template-columns:1fr}.hbar{grid-template-columns:110px 1fr 30px}}@media print{.i{display:none}.quad .card{break-inside:avoid}@page{size:A4;margin:13mm}body{background:#fff;font-size:11px}.page{width:auto;margin:0;box-shadow:none}.hero{padding:25px 30px 22px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.hero h1{font-size:25px}.brand img{width:54px;height:54px}.hero-meta{margin-top:16px;padding-top:10px}.content{padding:25px 30px}.section{margin-bottom:24px}.section h2{font-size:17px;margin-bottom:12px}.kpi,.card,.summary,.callout,.criterion,.recommendations li,tr{break-inside:avoid}.kpi{padding:12px}.kpi strong{font-size:22px}.bands{height:115px}.print{display:none}.section.page-break{break-before:page}table{font-size:9px}th,td{padding:6px}}
  </style></head><body><main class="page"><header class="hero"><div class="brand"><img src="${location.origin}/assets/logo-desafio.png" alt="Definição do desafio"><div><div class="eyebrow">Especialização em Tecnologias para Educação Profissional e Tecnológica</div><h1>Relatório Executivo · P1 Descobrindo meu Desafio</h1><p>Avaliação da definição dos desafios do portfólio</p></div></div><div class="hero-meta"><span><b>Turma:</b> ${escapeHtml(turma?.nome||'Não identificada')}</span><span><b>Emissão:</b> ${data}</span><span><b>Avaliações:</b> ${evaluations.length}</span></div></header><div class="content">
  <section class="section"><h2><span>1</span> Síntese executiva</h2><div class="summary"><p class="lead">A turma apresentou <strong>${diagnostico}</strong>, com média <strong>${media.toFixed(1).replace('.',',')}</strong> e mediana <strong>${mediana.toFixed(1).replace('.',',')}</strong>. As notas variaram de <strong>${minimo.toFixed(1).replace('.',',')}</strong> a <strong>${maximo.toFixed(1).replace('.',',')}</strong>.</p><p>O melhor resultado proporcional ocorreu em <strong>${escapeHtml(forte.label)}</strong> (${forte.pct}%), enquanto <strong>${escapeHtml(fragil.label)}</strong> (${fragil.pct}%) demanda maior atenção. A pergunta-desafio é única e começa com "Como podemos" em ${resumoOk} de ${evaluations.length} trabalhos.</p></div></section>
  <section class="section"><h2><span>2</span> Indicadores principais</h2><div class="kpis"><div class="kpi"><small>Avaliações${info('Quantidade de trabalhos salvos nesta turma.')}</small><strong>${evaluations.length}</strong><em>registros na turma</em></div><div class="kpi"><small>Média geral${info('Média das notas finais. A nota de cada trabalho é a soma dos pontos dos dez critérios da rubrica (0 a 10).')}</small><strong>${media.toFixed(1).replace('.',',')}</strong><em>em uma escala de 0 a 10</em></div><div class="kpi"><small>Avaliações completas${info('Trabalhos com todos os dez critérios da rubrica pontuados. Os demais aparecem como pendentes.')}</small><strong>${conclusao}%</strong><em>${completos} completas · ${pendentes} pendentes</em></div><div class="kpi"><small>Pergunta no formato pedido${info('Pergunta-desafio única que começa com "Como podemos". Letras de lista no início (A., B.) são ignoradas.')}</small><strong>${resumoPct}%</strong><em>${resumoOk} de ${evaluations.length} trabalhos</em></div></div></section>
  <section class="section"><h2><span>3</span> Desempenho por critério</h2>${criterios.map(c=>`<div class="criterion"><div class="criterion-name">${escapeHtml(c.label)}</div><div class="track"><div class="fill" style="width:${Math.max(0,Math.min(100,c.pct))}%"></div></div><b>${c.pct}%<small>${fmt(c.media)} / ${fmt(c.max)} pts</small></b></div>`).join('')}</section>
  <section class="section"><h2><span>4</span> Distribuição e contexto</h2><div class="split"><div class="card"><h3>Distribuição das notas</h3><div class="bands">${faixas.map(f=>`<div class="band"><div class="column" style="height:${Math.max(5,pct(f.count))}%;background:${f.color}"></div><b>${f.count}</b>${f.label}</div>`).join('')}</div></div><div class="card"><h3>Leitura complementar</h3><div class="fact"><span>Mediana da turma</span><strong>${mediana.toFixed(1).replace('.',',')}</strong></div><div class="fact"><span>Amplitude das notas</span><strong>${(maximo-minimo).toFixed(1).replace('.',',')} pontos</strong></div><div class="fact"><span>Declararam uso de IA</span><strong>${usouIA} (${pct(usouIA)}%)</strong></div><div class="fact"><span>Declararam não uso de IA</span><strong>${naoUsouIA} (${pct(naoUsouIA)}%)</strong></div><div class="fact"><span>Com análise de coerência registrada</span><strong>${coerencia}</strong></div></div></div></section>
  <section class="section"><h2><span>5</span> Perfil das propostas e da pergunta-desafio</h2><div class="kpis" style="margin-bottom:18px"><div class="kpi"><small>Sem tecnologia na pergunta${info('Perguntas-desafio sem palavra ligada a tecnologias digitais (digital, tecnologia, plataforma, aplicativo, IA, vídeo, podcast...). É uma busca por palavras, não uma leitura de sentido: use como sinal para conferir.')}</small><strong>${semTec}</strong><em>de ${evaluations.length} trabalhos</em></div><div class="kpi"><small>Propostas em contexto formal${info('Entre as propostas aprofundadas no item 2 de toda a turma com marcação legível, a parte marcada como (X) educação formal. As demais foram marcadas como não formal.')}</small><strong>${nMarcadas?Math.round(100*(ctx['Formal']||0)/nMarcadas):0}%</strong><em>${ctx['Formal']||0} formal · ${ctx['Não formal']||0} não formal</em></div><div class="kpi"><small>Declararam uso de IA${info('Marcação "Sim" na declaração de transparência no uso de IA. Usar ou não usar IA não altera a nota.')}</small><strong>${pct(iaCont['Sim']||0)}%</strong><em>${iaCont['Sim']||0} de ${evaluations.length}</em></div><div class="kpi"><small>Coerência a revisar${info('Trabalhos com a etiqueta Parcial ou Frágil na coerência desafio → resultados (item 3 → item 5). A etiqueta é sugerida pela IA ao avaliar e pode ser alterada pelo professor.')}</small><strong>${fragilOuParcial}</strong><em>${coerCont['Coerente']||0} coerente(s)</em></div></div>
  <div class="quad"><div class="card"><h3>Elementos da pergunta-desafio${info('Para cada pergunta final: o quê (problema ou melhoria), para quem (público), onde (local ou contexto) e tecnologia. Verde: presente; amarelo: vago; vermelho: ausente. Vem da leitura da IA ou do ajuste do professor; nos trabalhos sem essa leitura, da busca automática por palavras.')}</h3>${elemPct.map(x=>`<div class="el"><span>${escapeHtml(x.rot)}</span><div class="stack" title="${x.sim} presente · ${x.parcial} vago · ${x.nao} ausente"><div style="width:${pct(x.sim)}%;background:#28735e"></div><div style="width:${pct(x.parcial)}%;background:#d39a2c"></div><div style="width:${pct(x.nao)}%;background:#b6473f"></div></div></div>`).join('')}<div class="legend"><i style="background:#28735e;margin-left:0"></i>presente<i style="background:#d39a2c"></i>vago<i style="background:#b6473f"></i>ausente</div></div>
  <div class="card"><h3>Coerência desafio → resultados${info('Se o desafio (item 3) leva de fato aos resultados esperados (item 5). Coerente: os resultados respondem ao problema, para o mesmo público. Parcial: relação incompleta ou genérica. Frágil: desafio e resultados desconectados.')}</h3>${barras(coerCont,['Coerente','Parcial','Frágil','Não avaliável','Não classificada'],['#28735e','#d39a2c','#b6473f','#8a9ba0','#c5d0d3'])}</div>
  <div class="card"><h3>Contexto das propostas (item 2)${info('Todas as propostas aprofundadas no item 2 da turma, pela marcação (X) educação formal / não formal de cada bloco. Sem marcação: nenhum X legível no bloco.')}</h3>${barras(ctx,['Formal','Não formal','Sem marcação','As duas opções marcadas'],['#1D7480','#4FA7B1','#c5d0d3','#b6473f'])}<div class="legend" style="margin-top:6px">${blocosTurma.length} proposta(s) em ${evaluations.length} trabalho(s)</div></div>
  <div class="card"><h3>Propostas listadas no item 1${info('Quantas ideias cada estudante listou no item 1. A rubrica não premia nem penaliza a quantidade; o dado ajuda a ver como a turma explorou o entorno.')}</h3>${barras(nProps,['0','1','2','3','4 ou mais'],['#b6473f','#4FA7B1','#1D7480','#14515A','#0F3F46'])}</div>
  <div class="card"><h3>Declaração de uso de IA${info('Marcação na declaração de transparência. Sem marcação ou com as duas opções assinaladas, o critério de transparência fica com zero.')}</h3>${barras(iaCont,['Sim','Não','Sem marcação','Sim e Não assinalados'],['#1D7480','#4FA7B1','#c5d0d3','#b6473f'])}</div></div></section>
  <section class="section"><h2><span>6</span> Padrões e alertas</h2><div class="callout"><strong>Leitura pedagógica</strong><p>Os indicadores automatizados apoiam a visão de conjunto, mas não substituem a leitura docente do trabalho, da delimitação da pergunta-desafio e das marcações no PDF.</p></div>${alertasPrincipais.length?`<h3 style="margin-top:20px">Alertas recorrentes registrados</h3><ul class="alerts">${alertasPrincipais.map(([a,n])=>`<li>${escapeHtml(a)} <b>${n} ocorrência${n===1?'':'s'}</b></li>`).join('')}</ul>`:'<p style="color:var(--muted)">Não há alertas recorrentes registrados nesta turma.</p>'}</section>
  <section class="section"><h2><span>7</span> Recomendações para a próxima oferta</h2><ol class="recommendations">${unicas.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ol></section>
  <section class="section page-break"><h2><span>8</span> Resultados individuais</h2><table><thead><tr><th>#</th><th>Aluno</th><th>Matrícula</th><th>Nota</th><th>Pergunta</th><th>Elementos</th><th>Coerência</th><th>Contexto</th><th>IA</th><th>Avaliação</th></tr></thead><tbody>${linhas.map((e,i)=>{const completo=ORDER.every(k=>temNota(e.scores?.[k]?.points));const q=C.limpo(e.desafio);const ok=perguntaOk(e);const el=elementosDe(e);const mk={sim:'✅',parcial:'⚠️',nao:'❌'};const elTxt=q?Object.keys(C.ELEMENTOS).map(k=>`<span title="${escapeHtml(C.ELEMENTOS[k])}">${mk[el[k]]||'·'}</span>`).join(''):'—';const co=e.coerenciaEtiqueta||'';const coCls=co==='Coerente'?'ok':co==='Parcial'?'warn':co==='Frágil'?'no':'';const classe=ok?'ok':q?'warn':'no';const texto=ok?'No formato':q?'Revisar':'Ausente';return `<tr><td>${i+1}</td><td>${escapeHtml(e.nome||'Sem nome')}</td><td>${escapeHtml(e.matricula||'—')}</td><td class="score">${fmt(e.total)}</td><td><span class="status ${classe}">${texto}</span></td><td style="white-space:nowrap">${elTxt}</td><td>${co?`<span class="status ${coCls}">${escapeHtml(co)}</span>`:'—'}</td><td>${escapeHtml(C.contextoPredominante(e.propostasDetalhe))}</td><td>${escapeHtml(e.iaDeclaracao==='Ambos'?'Sim e Não':(e.iaDeclaracao||'—'))}</td><td><span class="status ${completo?'ok':'warn'}">${completo?'Completa':'Pendente'}</span></td></tr>`}).join('')}</tbody></table></section>
  <section class="section"><h2><span>9</span> Nota metodológica</h2><p class="method">Este relatório consolida as avaliações salvas no aplicativo na data de emissão. Os percentuais por critério representam a média de pontos obtida em relação ao máximo do critério na rubrica oficial. A nota de cada trabalho é a soma dos pontos dos dez critérios. Os elementos da pergunta-desafio e a etiqueta de coerência vêm da leitura da IA ou do ajuste do professor; quando ausentes, os elementos são estimados por busca de palavras. Letras de lista no início das respostas (A., B., C.) são desconsideradas nas verificações. Alertas e observações refletem os registros existentes e podem ser alterados pelo avaliador. A interpretação pedagógica deve considerar o tamanho da turma, a completude das avaliações e a verificação qualitativa dos trabalhos.</p></section>
  </div></main><button class="print" onclick="window.print()">Imprimir / salvar em PDF</button></body></html>`;
  const w=window.open('','_blank');
  if(!w)return alert('O navegador bloqueou a abertura do relatório. Permita janelas pop-up para este site e tente novamente.');
  w.document.open();w.document.write(html);w.document.close();
}

async function importClassJson(file){
  if(!file)return;
  const status=$('importStatus');status.textContent='Lendo e importando o arquivo...';
  try{
    const obj=JSON.parse(await file.text());
    const items=Array.isArray(obj)?obj:(Array.isArray(obj.avaliacoes)?obj.avaliacoes:[obj]);
    if(!items.length)throw new Error('O arquivo não contém avaliações.');
    const turma=obj.turma?.nome?obj.turma:classes.find(c=>c.id===$('classSelect').value);
    if(!turma)throw new Error('Este JSON não informa a turma. Crie ou selecione uma turma antes de importá-lo.');
    const body=JSON.stringify({turma,avaliacoes:items});
    let resultado;
    try{resultado=await api('/api/importar-turma',{method:'POST',body});}
    catch(err){
      if(!/Failed to fetch|Falha de rede|NetworkError/i.test(err.message))throw err;
      status.textContent='A conexão oscilou. Tentando novamente...';
      await new Promise(resolve=>setTimeout(resolve,1800));
      resultado=await api('/api/importar-turma',{method:'POST',body});
    }
    await loadClasses(resultado.id);
    status.textContent=`Importação concluída: ${resultado.inseridas} nova(s), ${resultado.atualizadas} atualizada(s). Turma ${resultado.nome}: ${resultado.quantidade} avaliação(ões).`;
    $('classStatus').textContent=`Turma ${resultado.nome} carregada com ${resultado.quantidade} avaliação(ões).`;
  }catch(err){status.textContent=/Failed to fetch/i.test(err.message)?'O servidor não respondeu. Aguarde alguns segundos e tente novamente; o arquivo não foi alterado.':`Não foi possível importar: ${err.message}`;}
  finally{$('importJson').value='';}
}

function bind(){
  $('pdfFile').addEventListener('change',e=>importPdf(e.target.files[0]));FIELD_IDS.forEach(id=>{$(id)?.addEventListener('input',()=>{if(id==='nome'||id==='matricula')checkDuplicate();renderAlerts();});});$('manualAlerts').addEventListener('input',renderAlerts);
  $('elementosPergunta').onclick=e=>{const b=e.target.closest('[data-el]');if(!b)return;const v={...elementosAtuais()};v[b.dataset.el]=PROX_EL[v[b.dataset.el]]||'sim';elementos={valores:v,origem:'manual',obs:elementos.obs};renderElementos();};
  $('recalcElementos').onclick=()=>definirElementos(null);$('coerenciaMotivo').addEventListener('input',ajustarMotivo);$('coerenciaEtiqueta').addEventListener('change',()=>generateLocalFeedback(false));$('sugerirCoerencia').onclick=()=>lerDesafioComIA({forcar:true});
  $('semanticExtract').onclick=semanticExtract;$('togglePages').onclick=()=>{$('pageGallery').classList.toggle('hidden');$('togglePages').textContent=$('pageGallery').classList.contains('hidden')?'Ver páginas do trabalho':'Ocultar páginas';};$('pageGallery').onclick=e=>{const button=e.target.closest('[data-page]');if(button)openPage(Number(button.dataset.page));};$('closeModal').onclick=closePage;$('pageModal').onclick=e=>{if(e.target===$('pageModal'))closePage();};document.addEventListener('keydown',e=>{if(e.key==='Escape')closePage();});
  $('autoEvaluate').onclick=autoEvaluate;$('refreshFeedback').onclick=()=>generateLocalFeedback(true);$('copyFeedback').onclick=()=>navigator.clipboard.writeText(value('feedback'));$('clearRubric').onclick=()=>{ORDER.forEach(k=>{document.querySelectorAll(`input[name="rub_${k}"]`).forEach(x=>x.checked=false);$(`obs_${k}`).value='';});updateScore();};
  $('classSelect').onchange=async()=>{await loadEvaluations();const c=classes.find(x=>x.id===$('classSelect').value);$('classNameInput').value=c?.nome||'';$('classStatus').textContent='';};$('refreshClasses').onclick=async()=>{const atual=$('classSelect').value;$('classStatus').textContent='Atualizando turmas...';await loadClasses(atual);$('classStatus').textContent=classes.length?`${classes.length} turma(s) carregada(s) do banco.`:'Nenhuma turma encontrada no banco.';};$('newClass').onclick=async()=>{const n=value('classNameInput');if(!n){$('classStatus').textContent='Digite o nome da nova turma no campo acima.';return;}try{const c=await api('/api/turmas',{method:'POST',body:JSON.stringify({nome:n})});await loadClasses(c.id);$('classNameInput').value=c.nome;$('classStatus').textContent='Turma criada com sucesso.';}catch(e){$('classStatus').textContent=`Não foi possível criar a turma: ${e.message}`;}};$('renameClass').onclick=async()=>{const c=classes.find(x=>x.id===$('classSelect').value),n=value('classNameInput');if(!c){$('classStatus').textContent='Selecione uma turma.';return;}if(!n){$('classStatus').textContent='Digite o novo nome da turma.';return;}try{await api(`/api/turmas/${encodeURIComponent(c.id)}`,{method:'PATCH',body:JSON.stringify({nome:n})});await loadClasses(c.id);$('classStatus').textContent='Turma renomeada com sucesso.';}catch(e){$('classStatus').textContent=`Não foi possível renomear: ${e.message}`;}};$('deleteClass').onclick=async()=>{const c=classes.find(x=>x.id===$('classSelect').value),confirmName=value('classNameInput');if(!c){$('classStatus').textContent='Selecione uma turma.';return;}if(confirmName!==c.nome){$('classStatus').textContent=`Para excluir, digite exatamente: ${c.nome}`;return;}try{await api(`/api/turmas/${encodeURIComponent(c.id)}`,{method:'DELETE',body:JSON.stringify({confirmarNome:confirmName})});newEvaluation(false);$('classNameInput').value='';await loadClasses();$('classStatus').textContent='Turma excluída.';}catch(e){$('classStatus').textContent=`Não foi possível excluir: ${e.message}`;}};
  $('saveEvaluation').onclick=saveEvaluation;$('newEvaluation').onclick=()=>newEvaluation(true);$('exportJson').onclick=exportJson;$('exportCsv').onclick=exportCsv;$('executiveReport').onclick=executiveReport;$('githubBackup').onclick=async()=>{try{const r=await api('/api/backup/github',{method:'POST'});$('classStatus').textContent=r.ultimoErro?`Falha: ${r.ultimoErro}`:`Cópia no GitHub atualizada em ${new Date(r.ultimaSincronizacao).toLocaleString('pt-BR')}.`;}catch(e){$('classStatus').textContent=e.message;}};$('clearClass').onclick=async()=>{const c=classes.find(x=>x.id===$('classSelect').value);if(c&&confirm(`Apagar TODAS as avaliações de ${c.nome}?`)){await api(`/api/turmas/${encodeURIComponent(c.id)}/avaliacoes`,{method:'DELETE'});newEvaluation(false);await loadClasses(c.id);}};
  $('roster').onclick=async e=>{const open=e.target.dataset.open,del=e.target.dataset.delete;if(open)loadEvaluation(evaluations.find(x=>x.id===open));if(del&&confirm('Excluir esta avaliação?')){await api(`/api/turmas/${encodeURIComponent($('classSelect').value)}/avaliacoes/${encodeURIComponent(del)}`,{method:'DELETE'});await loadClasses($('classSelect').value);}};
  $('chooseImportJson').onclick=()=>$('importJson').click();$('importJson').onchange=e=>importClassJson(e.target.files[0]);
}

document.addEventListener('DOMContentLoaded',async()=>{if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc='vendor/pdf.worker.min.js';renderRubric();bind();updateScore();try{await loadClasses();}catch{}if('serviceWorker'in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});});
// Bloco de coerência (complementar), logo abaixo do Feedback gerado.
if(window.CoerenciaUI)CoerenciaUI.montar({depoisDe:$('feedback').closest('section'),tagCard:'section',coletar:()=>formData(),api,
  titulo:'Coerência da definição do desafio',produto:'da definição do desafio',
  explicacao:'Uma única análise semântica relaciona a <b>pergunta-desafio</b> escolhida (item 3) com o <b>público-alvo</b>, o local e o contexto da proposta aprofundada (item 2), com a <b>justificativa</b> (item 4) e com os <b>resultados esperados</b> (item 5): o desafio nasce de uma necessidade real desse público e as mudanças esperadas respondem a esse problema? Ela não altera a rubrica, a nota nem o feedback da avaliação.',
  dicaAnalise:'Parecer técnico ao professor sobre a coerência entre problema, público, contexto e mudanças esperadas. Totalmente editável.',
  dicaFeedback:'Mensagem pedagógica ao estudante sobre essa coerência. Totalmente editável.'});
