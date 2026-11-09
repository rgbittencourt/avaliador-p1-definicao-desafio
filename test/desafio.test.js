const test = require('node:test');
const assert = require('node:assert');
const C = require('../public/desafio-core.js');
const { avaliarLocalmente, montarPrompt, montarPromptExtracao, limparAvaliacao, CAMPOS_P1 } = require('../server');

const detalheBom = `Eu gostaria de reduzir dúvidas dos novos técnicos sobre segurança.
Por que seria bom fazer isso: em 2025 houve 14 incidentes leves com técnicos novos.
Qual é o público-alvo dessa proposta: técnicos de manutenção recém-contratados da oficina.
Em qual local essa ideia se aplica: oficina central da Metalúrgica Sul.
Trata-se de um contexto de ( ) educação formal / (X) não-formal, pois: é formação no trabalho.
Como essa proposta se relaciona com as tecnologias digitais: consulta a recursos digitais no celular.`;

test('rubrica oficial da P1: 10 critérios, níveis em pontos, máximo 10', () => {
  assert.equal(C.ORDEM.length, 10);
  const max = Object.fromEntries(C.ORDEM.map(k => [k, C.maxCriterio(k)]));
  assert.equal(C.notaFinal(max), 10);
  assert.deepEqual(C.RUBRICA.pergunta.niveis.map(n => n.pontos), [0, 0.5, 1, 1.5]);
  assert.deepEqual(C.RUBRICA.propostas.niveis.map(n => n.pontos), [0, 0.375, 0.75]);
  assert.equal(C.nivelValido('propostas', 0.4), 0.375);
  assert.equal(C.nivelValido('pergunta', 9), 1.5);
  assert.equal(C.notaFinal({ pergunta: 1, propostas: 0.375 }), 1.38);
});

test('leitura dos blocos do item 2 e das propostas do item 1', () => {
  const b = C.blocosPropostas(detalheBom);
  assert.equal(b.length, 1);
  assert.equal(b[0].contexto, 'não formal');
  assert.match(b[0].publico, /técnicos de manutenção/);
  assert.match(b[0].tecnologias, /celular/);
  assert.deepEqual(C.listarPropostas('A. Eu gostaria…\nB. Eu gostaria…'), []);
  assert.equal(C.listarPropostas('A. Eu gostaria de reduzir dúvidas dos técnicos\nB. Eu gostaria de melhorar registros dos aprendizes').length, 2);
});

test('alertas da P1', () => {
  const txt = d => C.alertas(d).map(a => a.texto).join(' | ');
  const ruim = txt({ nome: 'SEU NOME', orientador: 'selecione', propostasLista: 'A. Eu gostaria de melhorar o ensino da escola\nB. Eu gostaria de usar aplicativos nas aulas', propostasDetalhe: detalheBom,
    desafio: 'Como podemos aprimorar o processo de ambientação de estudantes da Pós TEDPRO? Como podemos criar um app?', justificativa: 'Porque acho importante.', iaDeclaracao: 'Ambos' });
  assert.match(ruim, /Nome não preenchido/);
  assert.match(ruim, /2 proposta\(s\) no item 1, mas só 1/);
  assert.match(ruim, /mais de uma pergunta/);
  assert.match(ruim, /repetir o exemplo/);
  assert.match(ruim, /sem fatos|não há fatos/);
  assert.match(ruim, /Item 5/);
  assert.match(ruim, /"Sim" e "Não" assinalados/);
  assert.match(txt({ desafio: 'Como podemos … (preencha aqui)' }), /pergunta-desafio ausente/);
  assert.match(txt({ desafio: 'Melhorar o ensino de química.' }), /não começa com "Como podemos/);
  const bom = txt({ nome: 'Ana', matricula: '1', orientador: 'Prof. Rogério', propostasLista: 'A. Eu gostaria de reduzir dúvidas dos técnicos novos', propostasDetalhe: detalheBom,
    desafio: 'Como podemos apoiar técnicos recém-contratados a seguir os procedimentos de segurança usando recursos digitais?', justificativa: 'Em 2025 houve 14 incidentes, segundo o relatório da empresa.', resultadosEsperados: 'Menos incidentes.', iaDeclaracao: 'Não' });
  assert.equal(bom, '');
});

test('avaliação local: modelo em branco zera e IA "Não" vale o máximo', () => {
  const branco = avaliarLocalmente({ nome: 'SEU NOME', matricula: 'MATRÍCULA', orientador: 'selecione', propostasLista: 'A. Eu gostaria…\nB. Eu gostaria…', desafio: 'Como podemos … (preencha aqui)' });
  assert.equal(branco.nota, 0);
  const r = avaliarLocalmente({ iaDeclaracao: 'Não' });
  assert.equal(r.pontuacoes.transparencia.pontos, 0.5);
  assert.equal(avaliarLocalmente({ iaDeclaracao: 'Sim', iaDescricao: 'ChatGPT' }).pontuacoes.transparencia.pontos, 0.25);
  assert.equal(avaliarLocalmente({ iaDeclaracao: 'Ambos' }).pontuacoes.transparencia.pontos, 0);
});

test('prompts de avaliação e extração', () => {
  const p = montarPrompt({ nome: 'Carlos Eduardo' });
  assert.match(p, /Olá, Carlos,/);
  assert.match(p, /0.375 ponto\(s\)/);
  assert.match(p, /não confunda o exemplo do modelo/);
  assert.match(p, /SOMENTE os critérios que não atingiram o valor máximo/);
  const e = montarPromptExtracao({ paginas: ['x'] });
  CAMPOS_P1.forEach(k => assert.ok(e.includes(`"${k}":""`), k));
  assert.match(e, /nunca o exemplo do enunciado/);
});

test('limparAvaliacao: valor fora da rubrica vai ao nível mais próximo; omitido fica sem nível', () => {
  const r = limparAvaliacao({ pontuacoes: { pergunta: { pontos: 1.2, justificativa: 'ok — quase' } }, feedback: 'Olá — Ana' });
  assert.equal(r.pontuacoes.pergunta.pontos, 1);
  assert.equal(r.pontuacoes.identificacao.pontos, null);
  assert.ok(!r.feedback.includes('—'));
  assert.ok(r.feedback.endsWith('Um abraço,\nProf. Rogério'));
});

test('avaliação local não dá o máximo para público e tecnologias muito vagos', () => {
  const vago = `Eu gostaria de melhorar o ensino da escola toda.
Por que seria bom fazer isso: porque é importante.
Qual é o público-alvo dessa proposta: alunos
Em qual local essa ideia se aplica: escola
Trata-se de um contexto de ( ) educação formal / ( ) não-formal, pois:
Como essa proposta se relaciona com as tecnologias digitais: usar tecnologia`;
  const r = avaliarLocalmente({ propostasLista: 'A. Eu gostaria de melhorar o ensino da escola toda', propostasDetalhe: vago, desafio: 'Como podemos melhorar o ensino com tecnologia para os alunos?' });
  assert.equal(r.pontuacoes.publico.pontos, 0.5);
  assert.equal(r.pontuacoes.tecnologias.pontos, 0.625);
});

test('letras de lista (A., b), C -) são descartadas nas checagens da pergunta', () => {
  const txt = d => C.alertas(d).map(a => a.texto).join(' | ');
  for (const q of ['A. Como podemos capacitar professores do IFSC para usar o Moodle?', 'b) Como podemos capacitar professores do IFSC com vídeos?', 'C - "Como podemos apoiar técnicos novos usando recursos digitais?"', '- Como podemos apoiar alunos com podcasts?']) {
    assert.equal(C.comecaComoPodemos(q), true, q);
    assert.doesNotMatch(txt({ desafio: q }), /não começa com/);
  }
  assert.match(txt({ desafio: 'A. Melhorar o ensino de química.' }), /não começa com "Como podemos/);
  assert.match(txt({ desafio: 'A. Como podemos X com IA?\nB. Como podemos Y com IA?' }), /mais de uma pergunta/);
  assert.equal(C.limpo('1. Segundo o IBGE...\n2. Outro ponto'), 'Segundo o IBGE...\nOutro ponto');
  // "1." de uma lista não conta como dado na justificativa
  assert.match(txt({ justificativa: '1. Porque gosto do tema.\n2. Porque é importante.' }), /não há fatos/);
  // blocos do item 2 iniciados com letra
  const b = C.blocosPropostas('A. Eu gostaria de melhorar X\nPor que seria bom fazer isso: ajuda\n\nB. Eu gostaria de Y para alunos\nQual é o público-alvo dessa proposta: alunos do 1º ano');
  assert.equal(b.length, 2);
  assert.match(b[1].publico, /alunos do 1º ano/);
  // avaliação local não penaliza a letra
  const r = avaliarLocalmente({ desafio: 'A. Como podemos ampliar a participação dos estudantes do curso técnico em Eletrotécnica do IFSC nas aulas práticas usando simulações digitais?' });
  assert.match(r.pontuacoes.pergunta.justificativa, /^Começa com/);
});

test('elementos da pergunta-desafio e etiqueta de coerência', () => {
  assert.deepEqual(C.elementosPergunta('A. Como podemos engajar os alunos do 6º ano da Escola Exemplo, em Florianópolis, nas aulas de Ciências, usando simulações digitais?'), { que: 'sim', quem: 'sim', onde: 'sim', tecnologia: 'sim' });
  const vago = C.elementosPergunta('Como podemos melhorar a educação com tecnologia?');
  assert.equal(vago.quem, 'nao'); assert.equal(vago.onde, 'nao'); assert.equal(vago.tecnologia, 'parcial');
  assert.deepEqual(C.elementosPergunta(''), { que: 'nao', quem: 'nao', onde: 'nao', tecnologia: 'nao' });
  assert.deepEqual(C.elementosValidos({ que: 'Sim', quem: 'não', onde: 'PARCIAL', tecnologia: 'x' }), { que: 'sim', quem: 'nao', onde: 'parcial', tecnologia: '' });
  assert.equal(C.etiquetaValida('frágil'), 'Frágil'); assert.equal(C.etiquetaValida('nao avaliavel'), 'Não avaliável'); assert.equal(C.etiquetaValida('?'), '');
  assert.equal(C.contextoPredominante(detalheBom), 'Não formal');
  assert.equal(C.contextoPredominante(''), 'Não identificado');
  const r = limparAvaliacao({ pontuacoes: {}, elementos_pergunta: { que: 'sim', quem: 'parcial', onde: 'nao', tecnologia: 'sim' }, elementos_obs: 'Falta o local — e o público.', coerencia_desafio_resultados: { etiqueta: 'parcial', motivo: 'Resultados genéricos.' }, feedback: 'x' });
  assert.deepEqual(r.elementosPergunta, { que: 'sim', quem: 'parcial', onde: 'nao', tecnologia: 'sim' });
  assert.doesNotMatch(r.elementosObs, /—/);
  assert.equal(r.coerenciaEtiqueta, 'Parcial');
  const p = montarPrompt({ desafio: 'A. Como podemos X?' });
  assert.match(p, /"A\. Como podemos\.\.\." COMEÇA com "Como podemos"/);
  assert.match(p, /"elementos_pergunta"/); assert.match(p, /"coerencia_desafio_resultados"/);
  assert.equal(avaliarLocalmente({ desafio: 'Como podemos X para alunos?' }).coerenciaEtiqueta, 'Não avaliável');
});
