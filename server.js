require('dotenv').config();
const express = require('express');
const path = require('path');
const Core = require('./public/desafio-core.js');
const { RUBRICA, ORDEM } = Core;
const db = require('./db');
const {configIA, configDaRequisicao, chamarIA, statusIA} = require('./ia');
const { montarPromptCoerencia, limparSaidaCoerencia } = require('./coerencia');

const app = express();
const PORT = process.env.PORT || 3000;
const IA = configIA();
const APP_USERNAME = process.env.APP_USERNAME || 'professor';
const APP_PASSWORD = process.env.APP_PASSWORD || '';

if(process.env.NODE_ENV === 'production' && !APP_PASSWORD){
  throw new Error('APP_PASSWORD é obrigatória em produção.');
}
if(process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL){
  throw new Error('DATABASE_URL é obrigatória em produção para impedir perda de turmas em armazenamento temporário.');
}

app.use((req,res,next)=>{
  if(!APP_PASSWORD || req.path === '/api/health' || !req.path.startsWith('/api/')) return next();
  const header = req.headers.authorization || '';
  let usuario='', senha='';
  try{ [usuario,senha] = Buffer.from(header.replace(/^Basic\s+/i,''),'base64').toString('utf8').split(':'); }catch{}
  if(usuario === APP_USERNAME && senha === APP_PASSWORD) return next();
  res.set('X-Login-Necessario', '1'); // sem WWW-Authenticate: a janela de login é a do app, não a do navegador
  return res.status(401).send('Autenticação necessária.');
});

app.use(express.json({limit:'4mb'}));
app.use((req,_res,next)=>{req.ia=configDaRequisicao(req);next();});
const chamarIAReq=(req,prompt,temperatura)=>chamarIA(prompt,temperatura,{config:req.ia});
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/health',(_req,res)=>res.json({ok:true,openaiConfigurada:IA.configurada,...statusIA(IA),postgresConfigurado:Boolean(process.env.DATABASE_URL),backupGitHubConfigurado:Boolean(db.statusBackupGitHub().configurado)}));

function precisaChave(res){
  if(res.req.ia.configurada) return false;
  res.status(401).json({erro:`${res.req.ia.variavelChave} não configurada no servidor.`});
  return true;
}

app.get('/api/turmas',async(_req,res)=>{try{res.json(await db.listarTurmas());}catch(e){res.status(500).json({erro:e.message});}});
app.post('/api/turmas',async(req,res)=>{try{res.status(201).json(await db.criarTurma(req.body?.nome));}catch(e){res.status(400).json({erro:e.message});}});
app.patch('/api/turmas/:id',async(req,res)=>{try{res.json(await db.renomearTurma(req.params.id,req.body?.nome));}catch(e){res.status(400).json({erro:e.message});}});
app.delete('/api/turmas/:id',async(req,res)=>{try{res.json(await db.excluirTurma(req.params.id,req.body?.confirmarNome));}catch(e){res.status(400).json({erro:e.message});}});
app.get('/api/turmas/:id/avaliacoes',async(req,res)=>{try{res.json(await db.listarAvaliacoes(req.params.id));}catch(e){res.status(404).json({erro:e.message});}});
app.put('/api/turmas/:id/avaliacoes/:avaliacaoId',async(req,res)=>{try{res.json(await db.upsertAvaliacao(req.params.id,req.params.avaliacaoId,req.body));}catch(e){res.status(500).json({erro:e.message});}});
app.post('/api/importar-turma',async(req,res)=>{try{res.json(await db.importarTurma(req.body||{}));}catch(e){res.status(400).json({erro:e.message});}});
app.delete('/api/turmas/:id/avaliacoes/:avaliacaoId',async(req,res)=>{try{await db.removerAvaliacao(req.params.id,req.params.avaliacaoId);res.json({ok:true});}catch(e){res.status(500).json({erro:e.message});}});
app.delete('/api/turmas/:id/avaliacoes',async(req,res)=>{try{await db.limparAvaliacoes(req.params.id);res.json({ok:true});}catch(e){res.status(500).json({erro:e.message});}});
app.get('/api/backup/github',(_req,res)=>res.json(db.statusBackupGitHub()));
app.post('/api/backup/github',async(_req,res)=>{try{res.json(await db.sincronizarBackupGitHub());}catch(e){res.status(503).json({erro:e.message,...db.statusBackupGitHub()});}});

function textoCampo(valor){
  const s=String(valor||'').trim();
  return s || '(não preenchido)';
}

// Campos da P1 extraídos do PDF (modelo oficial "Descobrindo meu desafio").
const CAMPOS_P1 = ['nome','matricula','orientador','propostasLista','propostasDetalhe','desafio','justificativa','resultadosEsperados','iaDeclaracao','iaDescricao'];

function blocoDados(c={}){
  const blocos = Core.blocosPropostas(c.propostasDetalhe);
  const resumoBlocos = blocos.length ? blocos.map((b,i)=>`Proposta ${i+1}: contexto marcado = ${b.contexto||'nenhum'}`).join('; ') : 'nenhum bloco identificado';
  return `Nome: ${textoCampo(c.nome)}
Matrícula: ${textoCampo(c.matricula)}
Orientador(a): ${textoCampo(c.orientador)}
Formato da entrega e observações do professor: ${textoCampo(c.conformidadeModelo)}

ITEM 1 - O que gostaria de melhorar ou resolver no seu entorno (propostas listadas):
${textoCampo(c.propostasLista)}

ITEM 2 - Aprofundamento de cada proposta (por que seria bom, público-alvo, local, educação formal/não formal e por quê, relação com tecnologias digitais):
${textoCampo(c.propostasDetalhe)}
(Leitura automática das marcações: ${resumoBlocos})

ITEM 3 - Pergunta-desafio escolhida:
${textoCampo(c.desafio)}

ITEM 4 - Por que escolheu esse desafio:
${textoCampo(c.justificativa)}

ITEM 5 - O que pretende alcançar resolvendo o desafio:
${textoCampo(c.resultadosEsperados)}

DECLARAÇÃO DE TRANSPARÊNCIA NO USO DE IA
Marcação: ${textoCampo(c.iaDeclaracao)}
Descrição: ${textoCampo(c.iaDescricao)}`;
}

const INSTRUCOES_LEITURA_DESAFIO = `ELEMENTOS DA PERGUNTA-DESAFIO (campo "elementos_pergunta")
Para a pergunta final do item 3, indique se cada elemento está presente: "sim" (explícito e específico), "parcial" (vago ou genérico) ou "nao" (ausente).
- "que": o problema ou a melhoria desejada.
- "quem": o público-alvo.
- "onde": o local ou contexto (instituição, curso, setor, cidade...).
- "tecnologia": a relação com tecnologias digitais (sem precisar fixar uma solução).
Em "elementos_obs", uma frase curta dizendo o que falta, ou "" se todos estiverem presentes.

COERÊNCIA DESAFIO -> RESULTADOS (campo "coerencia_desafio_resultados")
Classifique se o desafio (item 3) leva de fato aos resultados esperados (item 5), considerando também a justificativa (item 4):
- "Coerente": os resultados respondem diretamente ao problema formulado, para o mesmo público.
- "Parcial": há relação, mas parte dos resultados não decorre do problema, muda de público ou fica genérica.
- "Frágil": desafio e resultados são genéricos demais ou desconectados.
- "Não avaliável": falta o item 3 ou o item 5.
Em "motivo", uma frase curta.`;

function montarPrompt(campos={}){
  const rubrica = ORDEM.map(chave=>{
    const c=RUBRICA[chave];
    return `${chave} — ${c.label} (escolha um dos valores previstos; máximo ${c.max}):\n${c.niveis.map(n=>`- ${n.pontos} ponto(s): ${n.desc}`).join('\n')}`;
  }).join('\n\n');
  const alertas = Core.alertas(campos).map(a=>`- ${a.texto}`).join('\n') || '- nenhum';
  return `Você auxilia o Prof. Rogério a avaliar a atividade P1 - Descobrindo meu desafio (Portfólio I) do TEDPRO/IFSC. Nela o estudante lista desejos de melhoria do seu entorno (item 1), aprofunda cada um (item 2), escolhe um e o transforma em pergunta-desafio iniciada por "Como podemos..." (item 3), justifica a escolha (item 4) e descreve o que pretende alcançar (item 5). O desafio deve envolver tecnologias digitais na educação profissional, formal ou não formal, e ser viável durante o curso, na abordagem do Design Thinking. Aplique SOMENTE a rubrica oficial abaixo. Em cada critério, escolha exatamente um dos valores previstos.

REGRAS DE EVIDÊNCIA
- O texto vem de um PDF lido automaticamente. Formatação visual não é visível: use as observações do professor sobre o formato quando houver.
- Marcadores do modelo não substituídos ("Eu gostaria…", "Como podemos … (preencha aqui)", "SEU NOME", "selecione") contam como não preenchidos.
- No item 3, não confunda o exemplo do modelo ("aprimorar o processo de ambientação de estudantes da Pós TEDPRO") com a pergunta do estudante.
- Uma boa pergunta-desafio foca no problema ou na melhoria e não impõe uma solução (ex.: "construir uma ponte" já é solução). Delimitação pode usar fatores espaciais, temporais, de classificação, qualidade ou quantidade, sem exigir todos.
- A quantidade de propostas, por si só, não aumenta nem reduz a pontuação.
- Usar ou não usar IA não altera a pontuação; vale a clareza da declaração.
- Letras ou números de lista no início das linhas ("A.", "B)", "C -", "1.") são apenas marcadores de lista: ignore-os. Uma pergunta escrita como "A. Como podemos..." COMEÇA com "Como podemos".
- Produza justificativas específicas, citando evidências ou ausências concretas.

ALERTAS AUTOMÁTICOS DO APLICATIVO (verificações de forma; confirme no texto)
${alertas}

RUBRICA OFICIAL
${rubrica}

TRABALHO EXTRAÍDO E REVISTO
${blocoDados(campos)}

${INSTRUCOES_LEITURA_DESAFIO}
FEEDBACK AO ESTUDANTE (campo "feedback")
- Comece exatamente com "Olá, ${String(campos.nome||'').trim().split(/\s+/)[0]||'estudante'},".
- Uma frase de reconhecimento específica sobre o desafio escolhido, sem elogios vazios.
- Comente SOMENTE os critérios que não atingiram o valor máximo, dizendo com clareza o que faltou e como melhorar (por exemplo, como delimitar melhor a pergunta). Não comente os critérios com valor máximo.
- Escreva em parágrafos, em segunda pessoa, sem listas e sem travessão (—).
- Termine exatamente com: Um abraço,\nProf. Rogério

Responda APENAS em JSON válido:
{"pontuacoes":{${ORDEM.map(k=>`"${k}":{"pontos":0,"justificativa":""}`).join(',')}},"elementos_pergunta":{"que":"sim","quem":"sim","onde":"sim","tecnologia":"sim"},"elementos_obs":"","coerencia_desafio_resultados":{"etiqueta":"Coerente","motivo":""},"alertas":[""],"feedback":""}`;
}

const semTravessao = (s) => String(s||'').replace(/\s*[—–]\s*/g, ', ').replace(/,\s*,/g, ',');

function limparAvaliacao(resultado={}){
  const pontuacoes={};
  const niveis={};
  for(const chave of ORDEM){
    const item=resultado.pontuacoes?.[chave]||{};
    const informado = item.pontos !== null && item.pontos !== undefined && item.pontos !== '' && Number.isFinite(Number(item.pontos));
    const pontos = informado ? Core.nivelValido(chave,item.pontos) : null; // critério omitido pela IA fica sem nível
    pontuacoes[chave]={pontos,justificativa:semTravessao(String(item.justificativa||'').trim())};
    niveis[chave]=pontos;
  }
  let feedback=semTravessao(String(resultado.feedback||'').trim()).replace(/\s*Um abraço,\s*Prof\. Rogério\s*$/i,'').trim();
  feedback += '\n\nUm abraço,\nProf. Rogério';
  const elementos=Core.elementosValidos(resultado.elementos_pergunta||{});
  const coer=resultado.coerencia_desafio_resultados||{};
  return {pontuacoes,nota:Core.notaFinal(niveis),
    elementosPergunta:Object.values(elementos).some(Boolean)?elementos:null,
    elementosObs:semTravessao(String(resultado.elementos_obs||'').trim()),
    coerenciaEtiqueta:Core.etiquetaValida(coer.etiqueta),
    coerenciaMotivo:semTravessao(String(coer.motivo||'').trim()),
    alertas:Array.isArray(resultado.alertas)?resultado.alertas.map(String).map(semTravessao).filter(Boolean):[],feedback};
}

// Leitura rápida do desafio: elementos da pergunta e coerência item 3 -> item 5 (feita logo após importar o PDF).
function montarPromptLeituraDesafio(c={}){
  return `Você auxilia o Prof. Rogério a ler a P1 - Descobrindo meu desafio (TEDPRO/IFSC). Faça uma leitura semântica, não por palavras-chave.
- Letras ou números de lista no início das linhas ("A.", "B)", "1.") são apenas marcadores: ignore-os.
- No item 3, não confunda o exemplo do modelo ("aprimorar o processo de ambientação de estudantes da Pós TEDPRO") com a pergunta do estudante.
- Não use travessão (—).

${INSTRUCOES_LEITURA_DESAFIO}

TRABALHO
${blocoDados(c)}

Responda APENAS em JSON válido:
{"elementos_pergunta":{"que":"sim","quem":"sim","onde":"sim","tecnologia":"sim"},"elementos_obs":"","coerencia_desafio_resultados":{"etiqueta":"Coerente","motivo":""}}`;
}
app.post('/api/leitura-desafio',async(req,res)=>{
  if(precisaChave(res)) return;
  try{
    const r=limparAvaliacao({...(await chamarIAReq(req,montarPromptLeituraDesafio(req.body||{}),0.1)),pontuacoes:{}});
    res.json({elementosPergunta:r.elementosPergunta,elementosObs:r.elementosObs,coerenciaEtiqueta:r.coerenciaEtiqueta,coerenciaMotivo:r.coerenciaMotivo,modo:req.ia.provedor});
  }catch(e){res.status(502).json({erro:e.message});}
});

app.post('/api/avaliar',async(req,res)=>{
  if(!req.ia.configurada) return res.json(avaliarLocalmente(req.body||{}));
  try{res.json({...limparAvaliacao(await chamarIAReq(req,montarPrompt(req.body||{}))),modo:req.ia.provedor});}
  catch(e){
    const fallback=avaliarLocalmente(req.body||{});
    fallback.modo='local-fallback';
    fallback.alertas.unshift(`A avaliação com IA não pôde ser concluída (${e.message}). A rubrica foi preenchida pela análise local conservadora; revise as notas.`);
    res.json(fallback);
  }
});

// Avaliação local conservadora: verifica presença e completude das partes, não o mérito.
function avaliarLocalmente(c={}){
  const so = (k) => Core.semOrientacoes(c[k]);
  const pal = (x) => Core.contarPalavras(x);
  const nivel = (k, i) => RUBRICA[k].niveis[i].pontos; // i: índice do nível (0 = mais baixo)
  const topo = (k) => RUBRICA[k].niveis.length - 1;
  const props = Core.listarPropostas(c.propostasLista);
  const blocos = Core.blocosPropostas(c.propostasDetalhe);
  const completo = (b) => b.porQue && b.publico && b.local && (b.contexto === 'formal' || b.contexto === 'não formal') && b.pois && b.tecnologias;
  const pergunta = Core.limpo(c.desafio);
  const nPerguntas = Core.perguntasDesafio(c.desafio);
  const comecaCerto = Core.comecaComoPodemos(c.desafio);
  const just = Core.limpo(c.justificativa), result = Core.limpo(c.resultadosEsperados);
  const n = {};
  const ident = [c.nome, c.matricula].every(x => String(x||'').trim() && !/^\s*(seu nome|matr[ií]cula)\s*$/i.test(x)) && !Core.orientadorVazio(c.orientador);
  n.identificacao = ident ? (/PDF/i.test(c.conformidadeModelo||'') ? topo('identificacao') : 1) : ((String(c.nome||'').trim() && !/^\s*seu nome\s*$/i.test(c.nome)) ? 1 : 0);
  n.propostas = !props.length ? 0 : props.every(p => pal(p) >= 8) ? 2 : 1;
  n.aprofundamento = !blocos.length ? 0 : (blocos.every(completo) && blocos.length >= props.length) ? 2 : 1;
  const publicos = blocos.filter(b => b.publico).length;
  n.publico = !publicos ? 0 : (publicos === blocos.length && blocos.every(b => pal(b.publico) >= 4) && /público|alunos|estudantes|professores|servidores|trabalhadores|profissionais|equipe|turma/i.test(pergunta + ' ' + just)) ? 2 : 1;
  const tecBlocos = blocos.filter(b => b.tecnologias).length;
  n.tecnologias = !tecBlocos && !Core.TEC.test(pergunta) ? 0 : (tecBlocos === blocos.length && blocos.every(b => pal(b.tecnologias) >= 6) && Core.TEC.test(pergunta)) ? 2 : 1;
  n.pergunta = !pergunta ? 0 : (!comecaCerto || nPerguntas > 1 || Core.EXEMPLO_PERGUNTA.test(pergunta)) ? 1 : pal(pergunta) >= 12 ? 2 : 1;
  n.escopo = !pergunta ? 0 : 1; // delimitação e viabilidade exigem leitura docente: nível intermediário
  n.justificativa = !just ? 0 : (pal(just) >= 80 && Core.TEM_FUNDAMENTO.test(just)) ? 2 : 1;
  n.resultados = !result ? 0 : pal(result) >= 40 ? 2 : 1;
  const ia = String(c.iaDeclaracao||'').trim();
  n.transparencia = !ia || ia === 'Ambos' ? 0 : ia === 'Não' ? 2 : pal(c.iaDescricao) >= 12 ? 2 : 1;
  const just_ = {
    identificacao: ident ? 'Nome, matrícula e orientador(a) preenchidos. Confira no PDF se a organização e o estilo do modelo foram preservados.' : 'Identificação incompleta ou com o texto do modelo.',
    propostas: `${props.length} proposta(s) identificada(s) no item 1.`,
    aprofundamento: `${blocos.length} proposta(s) aprofundada(s) no item 2; ${blocos.filter(completo).length} com todos os campos, incluindo a marcação formal/não formal justificada.`,
    publico: `Público-alvo informado em ${publicos} de ${blocos.length} proposta(s). A caracterização do público do desafio escolhido exige leitura docente.`,
    tecnologias: `Relação com tecnologias digitais descrita em ${tecBlocos} de ${blocos.length} proposta(s); a pergunta ${Core.TEC.test(pergunta)?'indica':'não indica'} tecnologias.`,
    pergunta: !pergunta ? 'Pergunta-desafio ausente.' : `${comecaCerto?'Começa':'Não começa'} com "Como podemos"; ${nPerguntas} pergunta(s) no item 3. Se a pergunta impõe uma solução, só a leitura docente identifica.`,
    escopo: 'A delimitação e a viabilidade dependem de leitura docente; nível intermediário provisório.',
    justificativa: just ? `Justificativa com cerca de ${pal(just)} palavras; ${Core.TEM_FUNDAMENTO.test(just)?'há':'não há'} fatos, dados ou referências aparentes.` : 'Justificativa ausente.',
    resultados: result ? `Resultados esperados com cerca de ${pal(result)} palavras.` : 'Resultados esperados ausentes.',
    transparencia: !ia ? 'Declaração de IA sem marcação.' : ia === 'Ambos' ? 'Marcações contraditórias na declaração de IA.' : ia === 'Não' ? 'Declara não ter usado IA.' : `Declara uso de IA; descrição com cerca de ${pal(c.iaDescricao)} palavras.`
  };
  const pontuacoes = {};
  ORDEM.forEach(k => { pontuacoes[k] = { pontos: nivel(k, Math.min(n[k], topo(k))), justificativa: just_[k] }; });
  const resultado = limparAvaliacao({pontuacoes, elementos_pergunta: Core.elementosPergunta(c.desafio), coerencia_desafio_resultados: {etiqueta: (!pergunta || !result) ? 'Não avaliável' : '', motivo: (!pergunta || !result) ? 'Falta o item 3 ou o item 5.' : ''}, alertas:['Avaliação automática local: verifica presença e completude das partes, não o mérito. Revise cada critério lendo o trabalho.'], feedback:'A avaliação automática local verificou o preenchimento das partes da P1. Revise as justificativas da rubrica e ajuste a pontuação após a leitura do trabalho.'});
  return {...resultado, modo:'local'};
}

function montarPromptExtracao({paginas=[],camposPreliminares={}}={}){
  const textoPaginas=(Array.isArray(paginas)?paginas:[]).slice(0,20).map((p,i)=>`\n===== PÁGINA ${i+1} =====\n${String(p||'').slice(0,30000)}`).join('\n');
  return `Extraia fielmente as respostas de um trabalho preenchido da atividade P1 - Descobrindo meu desafio (Portfólio I, TEDPRO/IFSC), escrito no modelo oficial.

ESTRUTURA DO MODELO
Identificação: Nome completo, Número de matrícula, Orientador(a).
1. "O que você gostaria de melhorar ou resolver no seu entorno (especialmente profissional) e que está ao seu alcance?" Lista de ideias, no modelo "A. Eu gostaria…", "B. Eu gostaria…".
2. "Transformando desejos em desafios criativos": um bloco por proposta, com "Eu gostaria…", "Por que seria bom fazer isso:", "Qual é o público-alvo dessa proposta:", "Em qual local essa ideia se aplica:", "Trata-se de um contexto de ( ) educação formal / ( ) não-formal, pois:", "Como essa proposta se relaciona com as tecnologias digitais:".
3. "Escolhendo um desafio": texto explicativo fixo com um EXEMPLO de pergunta ("Como podemos aprimorar o processo de ambientação de estudantes da Pós TEDPRO do IFSC..."), seguido de "Agora é sua vez..." e da caixa com a pergunta do estudante ("Como podemos … (preencha aqui)" no modelo).
4. "Por que você escolheu esse desafio, em específico?" (enunciado fixo + texto do estudante).
5. "O que você pretende alcançar resolvendo esse desafio?" (enunciado fixo + texto do estudante).
Declaração de transparência no uso de IA: "Este trabalho teve uso de IA: ( ) Sim ( ) Não" e "Se sim, descreva quais ferramentas de IA você utilizou, para quê e como:".

REGRAS OBRIGATÓRIAS
- Copie o texto do estudante sem resumir, melhorar ou inventar. Remova cabeçalhos, rodapés do IFSC, títulos dos itens e enunciados fixos.
- "propostasLista": as ideias do item 1, uma por linha, mantendo as letras (A., B., ...). Se só houver "Eu gostaria…" do modelo, mantenha assim.
- "propostasDetalhe": os blocos do item 2, cada um começando por "Eu gostaria ...", mantendo os rótulos do modelo em linhas próprias ("Por que seria bom fazer isso: ...", "Qual é o público-alvo dessa proposta: ...", "Em qual local essa ideia se aplica: ...", "Trata-se de um contexto de (X) educação formal / ( ) não-formal, pois: ...", "Como essa proposta se relaciona com as tecnologias digitais: ..."), preservando exatamente onde está o X da marcação. Separe os blocos com uma linha em branco.
- Letras ou números de lista no início das respostas ("A.", "B)", "1.") podem ser mantidos; o aplicativo os descarta nas análises.
- "desafio": SOMENTE a pergunta do estudante na caixa após "Agora é sua vez", nunca o exemplo do enunciado. Se houver várias perguntas do estudante, copie todas.
- "justificativa" e "resultadosEsperados": os textos do estudante nos itens 4 e 5.
- "iaDeclaracao": "Sim", "Não", "Ambos" (se os dois estiverem assinalados) ou "" (se nenhum). "iaDescricao": a descrição após "Se sim, descreva...".
- Campo ausente ou só com o marcador do modelo deve ficar com o marcador ou "".

CAMPOS PRELIMINARES (podem estar errados; use apenas como pista)
${JSON.stringify(camposPreliminares)}

TEXTO EXTRAÍDO POR PÁGINA
${textoPaginas}

Responda APENAS com JSON válido, contendo todas estas chaves:
{${CAMPOS_P1.map(k=>`"${k}":""`).join(',')}}`;
}

function limparExtracaoSemantica(resultado={}){
  const saida={};
  for(const chave of CAMPOS_P1) saida[chave]=String(resultado?.[chave]||'').trim();
  if(!['Sim','Não','Ambos'].includes(saida.iaDeclaracao)) saida.iaDeclaracao='';
  return saida;
}

app.post('/api/extrair-relatorio',async(req,res)=>{
  if(precisaChave(res)) return;
  try{res.json(limparExtracaoSemantica(await chamarIAReq(req,montarPromptExtracao(req.body||{}),0)));}
  catch(e){res.status(502).json({erro:e.message});}
});

// ---------- Coerência (complementar, sem pontuação) ----------
const ASSINATURA_COERENCIA = () => 'Prof. Rogério';
function atividadeCoerencia(c = {}) {
  return {
    nome: 'P1 - Descobrindo meu desafio (definição do desafio)',
    produto: 'pergunta-desafio escolhida, com a justificativa e os resultados esperados',
    cadeia: 'entorno e propostas do item 1 -> aprofundamento (por que, público, local, contexto educativo, tecnologias) -> pergunta-desafio escolhida -> justificativa -> resultados esperados',
    criterios: [
      'Pergunte se a pergunta-desafio escolhida nasce de uma necessidade real do público indicado, ou se é um tema genérico que não muda a vida daquele grupo.',
      'Verifique se o público, o local e o contexto da proposta aprofundada no item 2 aparecem de fato na pergunta escolhida, e se a justificativa (item 4) mostra por que esse problema importa para esse público.',
      'Verifique se os resultados esperados (item 5) respondem ao problema formulado e são proporcionais ao escopo e ao público, sem depender de uma solução já escolhida.',
      'Letras ou números de lista no início das linhas ("A.", "B)") são só marcadores: ignore-os.',
      'Não repita a análise de forma do documento: concentre-se na coerência entre problema, público, contexto e mudanças esperadas.'
    ],
    evidencia: 'Diferencie o que o estudante afirma do que demonstra com fatos, dados ou referências. Não invente características do público.',
    campos: [
      ['Nome', c.nome], ['Propostas do item 1', c.propostasLista], ['Aprofundamento das propostas (item 2)', c.propostasDetalhe],
      ['Desafio', c.desafio], ['Justificativa (item 4)', c.justificativa], ['Resultados esperados (item 5)', c.resultadosEsperados]
    ]
  };
}

app.post('/api/analisar-coerencia', async (req, res) => {
  if (!req.ia.configurada) return res.status(401).json({ erro: `${req.ia.variavelChave} não configurada no servidor. A análise de coerência precisa de IA.` });
  const campos = req.body || {};
  try { res.json(limparSaidaCoerencia(await chamarIAReq(req, montarPromptCoerencia(atividadeCoerencia(campos)), 0.25), ASSINATURA_COERENCIA(campos))); }
  catch (e) { res.status(e.status || 502).json({ erro: e.message }); }
});

app.use((err,_req,res,_next)=>res.status(500).json({erro:err.message||'Erro interno.'}));

if(require.main===module) app.listen(PORT,()=>console.log(`Avaliador P1 em http://localhost:${PORT}`));
module.exports={app,montarPromptLeituraDesafio,atividadeCoerencia,montarPrompt,montarPromptExtracao,limparExtracaoSemantica,limparAvaliacao,avaliarLocalmente,CAMPOS_P1};
