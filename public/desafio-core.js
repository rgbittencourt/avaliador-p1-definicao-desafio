/* Núcleo do Avaliador P1 · Descobrindo meu desafio (TEDPRO/IFSC).
   Usado no navegador (window.DesafioCore) e no servidor (require).
   Fonte única da rubrica oficial, do cálculo da nota e das verificações automáticas. */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.DesafioCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Rubrica oficial (exportada em 09/11/2026). Cada nível já vale os pontos indicados na rubrica;
  // a nota é a soma dos níveis escolhidos (máximo 10). O peso é o valor máximo do critério em 100.
  const RUBRICA = {
  "identificacao": {
    "label": "Identificação e apresentação no modelo solicitado",
    "curto": "Identificação e modelo",
    "peso": 5,
    "max": 0.5,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não apresenta documento avaliável ou entrega material sem identificação e sem a estrutura do modelo solicitado."
      },
      {
        "pontos": 0.25,
        "desc": "Apresenta documento reconhecível como a P1, mas deixa campos de identificação incompletos ou altera a organização e o estilo do modelo de modo a dificultar a localização das respostas."
      },
      {
        "pontos": 0.5,
        "desc": "Entrega o documento em PDF, com nome completo, matrícula e orientador(a), preservando a organização, a formatação e o estilo do modelo, ressalvados os ajustes necessários ao preenchimento."
      }
    ]
  },
  "propostas": {
    "label": "Levantamento de propostas de desafios do entorno — item 1",
    "curto": "Propostas do entorno (item 1)",
    "peso": 7.5,
    "max": 0.75,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não apresenta ideias de melhoria ou resolução de problemas, ou registra propostas sem relação identificável com seu entorno."
      },
      {
        "pontos": 0.375,
        "desc": "Apresenta uma ou mais ideias, mas descreve de maneira vaga o que deseja melhorar ou resolver e sua relação com o próprio contexto."
      },
      {
        "pontos": 0.75,
        "desc": "Apresenta com clareza uma ou mais ideias de melhoria ou resolução de problemas do seu entorno, relacionadas a possibilidades de atuação ao seu alcance. Quando registra várias propostas, distingue o foco de cada uma; a quantidade, por si só, não aumenta nem reduz a pontuação."
      }
    ]
  },
  "aprofundamento": {
    "label": "Aprofundamento das propostas e caracterização do contexto educativo — item 2",
    "curto": "Aprofundamento e contexto educativo (item 2)",
    "peso": 10,
    "max": 1,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não aprofunda as propostas listadas nem caracteriza seu contexto de aplicação."
      },
      {
        "pontos": 0.5,
        "desc": "Preenche parcialmente os campos sobre benefícios, local de aplicação e educação formal ou não formal, ou deixa alguma proposta listada sem aprofundamento. A justificativa da classificação educativa é ausente ou pouco coerente."
      },
      {
        "pontos": 1,
        "desc": "Para cada proposta listada, explica por que seria bom desenvolvê-la, informa o local de aplicação e identifica o contexto como educação formal ou não formal, justificando a classificação de maneira coerente com a situação descrita."
      }
    ]
  },
  "publico": {
    "label": "Definição do público-alvo e justificativa de sua pertinência — itens 2 e 4",
    "curto": "Público-alvo (itens 2 e 4)",
    "peso": 10,
    "max": 1,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não identifica o público-alvo ou indica um público sem relação com o desafio apresentado."
      },
      {
        "pontos": 0.5,
        "desc": "Identifica o público-alvo, mas utiliza uma descrição ampla ou explica pouco por que o desafio é relevante para esse grupo."
      },
      {
        "pontos": 1,
        "desc": "Identifica o público-alvo das propostas e, para o desafio escolhido, caracteriza o grupo de modo suficiente para compreender quem será contemplado. Nas explicações dos itens 2 ou 4, relaciona esse público às necessidades e aos benefícios que justificam a proposta."
      }
    ]
  },
  "tecnologias": {
    "label": "Articulação entre tecnologias digitais e educação profissional — itens 2 e 3",
    "curto": "Tecnologias e educação profissional (itens 2 e 3)",
    "peso": 12.5,
    "max": 1.25,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não estabelece relação do desafio com tecnologias digitais e educação profissional."
      },
      {
        "pontos": 0.625,
        "desc": "Menciona tecnologias digitais ou educação profissional, mas a articulação entre esses elementos e o desafio permanece genérica, incompleta ou pouco coerente."
      },
      {
        "pontos": 1.25,
        "desc": "Explica a relação das propostas com tecnologias digitais e evidencia que o desafio escolhido envolve sua utilização em um contexto de educação profissional, formal ou não formal, incluindo formação para o mundo do trabalho. A indicação de tecnologias mantém espaço para explorar diferentes soluções."
      }
    ]
  },
  "pergunta": {
    "label": "Seleção e formulação da pergunta-desafio — item 3",
    "curto": "Pergunta-desafio (item 3)",
    "peso": 15,
    "max": 1.5,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não apresenta pergunta-desafio ou registra uma formulação que não permite identificar o problema a trabalhar."
      },
      {
        "pontos": 0.5,
        "desc": "Apresenta uma intenção ou proposta, mas não a transforma adequadamente em pergunta iniciada por “Como podemos...”, ou mantém vários desafios sem selecionar um para a versão final."
      },
      {
        "pontos": 1,
        "desc": "Seleciona uma proposta e formula uma pergunta iniciada por “Como podemos...”, mas a redação ainda confunde o problema com uma solução previamente escolhida ou deixa pouco clara a melhoria buscada."
      },
      {
        "pontos": 1.5,
        "desc": "Seleciona uma das propostas exploradas e apresenta uma única pergunta final iniciada por “Como podemos...”, com foco claro no problema ou na melhoria desejada e sem impor uma solução específica. Caso tenha elaborado várias perguntas durante a exploração, deixa inequívoca a escolhida."
      }
    ]
  },
  "escopo": {
    "label": "Delimitação do escopo e viabilidade do desafio — itens 2, 3 e 4",
    "curto": "Escopo e viabilidade (itens 2 a 4)",
    "peso": 12.5,
    "max": 1.25,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Apresenta desafio sem recorte identificável, de abrangência incompatível com a atuação do estudante ou sem condições de desenvolvimento no período do curso."
      },
      {
        "pontos": 0.625,
        "desc": "Delimita parte do desafio, mas ainda deixa indefinidos aspectos importantes do que será trabalhado, com quem ou em qual contexto. O conjunto das respostas oferece poucos elementos para compreender sua viabilidade durante o ano."
      },
      {
        "pontos": 1.25,
        "desc": "Delimita o que pretende melhorar, para quem e em qual contexto ou local, com escopo compatível com sua atuação, condições tecnológicas e período do curso. Utiliza fatores espaciais, temporais, de classificação, qualidade ou quantidade conforme a pertinência ao desafio, sem necessidade de empregar todos."
      }
    ]
  },
  "justificativa": {
    "label": "Justificativa da escolha com contextualização e fundamentação — item 4",
    "curto": "Justificativa da escolha (item 4)",
    "peso": 12.5,
    "max": 1.25,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não justifica a escolha ou apresenta texto sem relação com o desafio selecionado."
      },
      {
        "pontos": 0.625,
        "desc": "Explica seu interesse pelo desafio e menciona aspectos do próprio contexto, mas a argumentação é genérica ou apresenta fatos, dados e referências de maneira incompleta ou pouco articulada à escolha."
      },
      {
        "pontos": 1.25,
        "desc": "Explica por que escolheu esse desafio, relacionando sua trajetória ou situação atual ao contexto apresentado. Inclui fatos, dados e referências pertinentes e os articula à argumentação, permitindo compreender a relevância da escolha."
      }
    ]
  },
  "resultados": {
    "label": "Clareza dos resultados e das mudanças esperadas — item 5",
    "curto": "Resultados esperados (item 5)",
    "peso": 10,
    "max": 1,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não descreve o que pretende alcançar ou apresenta expectativas desconectadas do desafio."
      },
      {
        "pontos": 0.5,
        "desc": "Indica benefícios esperados, mas de forma genérica, sem esclarecer suficientemente o que mudaria no entorno caso o desafio fosse solucionado."
      },
      {
        "pontos": 1,
        "desc": "Descreve com clareza o que pretende alcançar e quais diferenças visualiza no entorno e para o público-alvo caso o desafio seja solucionado, mantendo coerência com o problema e com o escopo escolhido, sem precisar apresentar uma solução pronta."
      }
    ]
  },
  "transparencia": {
    "label": "Transparência no uso de inteligência artificial",
    "curto": "Transparência no uso de IA",
    "peso": 5,
    "max": 0.5,
    "niveis": [
      {
        "pontos": 0,
        "desc": "Não preenche a declaração de transparência no uso de IA ou apresenta marcações contraditórias que impedem compreender o que declarou."
      },
      {
        "pontos": 0.25,
        "desc": "Declara que utilizou IA, mas informa de modo incompleto quais ferramentas empregou, para quais finalidades ou como as utilizou na elaboração do trabalho."
      },
      {
        "pontos": 0.5,
        "desc": "Preenche a declaração de forma inequívoca: assinala “Não”, quando declara não ter utilizado IA, ou assinala “Sim” e descreve as ferramentas utilizadas, para quê e como foram empregadas. O uso ou o não uso de IA, por si só, não altera a pontuação."
      }
    ]
  }
};
  const ORDEM = Object.keys(RUBRICA);

  const arred = (n) => Math.round(n * 1000) / 1000;
  const numero = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v))) ? null : Number(v);
  // Pontos obtidos num critério: o próprio valor do nível escolhido.
  function pontosCriterio(chave, nivel) { const v = numero(nivel); return v === null ? 0 : arred(v); }
  const maxCriterio = (chave) => RUBRICA[chave].max;
  function notaFinal(niveis) {
    return Math.round(ORDEM.reduce((soma, k) => soma + pontosCriterio(k, niveis ? niveis[k] : null), 0) * 100) / 100;
  }
  // Ajusta qualquer valor ao nível mais próximo previsto na rubrica.
  function nivelValido(chave, valor) {
    const niveis = RUBRICA[chave].niveis.map((n) => n.pontos);
    const v = numero(valor);
    if (v === null) return niveis[0];
    return niveis.reduce((m, n) => (Math.abs(n - v) < Math.abs(m - v) ? n : m), niveis[0]);
  }
  const formatar = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });

  // ---------- leitura do texto do estudante ----------
  const t = (v) => String(v == null ? '' : v).trim();
  function contarPalavras(texto) { const m = t(texto).match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu); return m ? m.length : 0; }
  // Marcadores do modelo que deveriam ter sido substituídos.
  const MARCADORES = [/^\s*eu gostaria\s*(?:…|\.\.\.)?\s*$/i, /\(preencha aqui\)/i, /^\s*como podemos\s*(?:…|\.\.\.)\s*$/i];
  // Remove marcadores e enunciados fixos, deixando só o texto do estudante.
  function semOrientacoes(texto) {
    return t(texto).replace(/\(preencha aqui\)/gi, ' ').split(/\n+/)
      .filter((l) => l.trim() && !MARCADORES.some((re) => re.test(l)) && !/^\s*[A-Z][.)]\s*eu gostaria\s*(?:…|\.\.\.)?\s*$/i.test(l))
      .join('\n').trim();
  }
  // Marcadores de lista no início da linha ("A. ", "b) ", "C - ", "1. ", "- ", "• ") não fazem parte da resposta:
  // são descartados antes das checagens e buscas.
  const MARCADOR_LISTA = /^[ \t]*(?:(?:[A-Za-z]|\d{1,2})[ \t]*[.)\-–:][ \t]+|[-–•●▪*][ \t]+)/;
  const semMarcadorLista = (linha) => String(linha == null ? '' : linha).replace(MARCADOR_LISTA, '');
  function semMarcadores(texto) { return t(texto).split('\n').map(semMarcadorLista).join('\n').trim(); }
  // Texto do estudante sem enunciados do modelo e sem marcadores de lista: base das análises.
  const limpo = (texto) => semMarcadores(semOrientacoes(texto));
  const PLACEHOLDER_NOME =/^\s*(seu nome|nome completo:?)\s*$/i;
  const PLACEHOLDER_MATRICULA = /^\s*(matr[ií]cula|n[uú]mero de matr[ií]cula:?)\s*$/i;
  const orientadorVazio = (v) => !t(v) || /^\s*selecione\s*$/i.test(v);

  // Itens listados no item 1 (linhas "A. ...", "B. ...", "- ..." ou "Eu gostaria ...").
  function listarPropostas(texto) {
    const linhas = semOrientacoes(texto).split('\n').map((l) => l.trim())
      .filter((l) => l && !/listar mais de uma ideia|que est[áa] ao seu alcance\?|^\(?especialmente profissional/i.test(l));
    const itens = [];
    for (const l of linhas) {
      if (/^([A-Za-z]|\d{1,2})[.)]\s+|^[-•●]\s+|^eu gostaria/i.test(l) || !itens.length) itens.push(l.replace(/^([A-Za-z]|\d{1,2})[.)]\s+|^[-•●]\s+/, ''));
      else itens[itens.length - 1] += ' ' + l;
    }
    return itens.filter((i) => contarPalavras(i) >= 3);
  }
  const marcado = (s) => /\(\s*[xX✓✔•●]\s*\)/.test(s);
  // Blocos do item 2: cada um começa em "Eu gostaria".
  function blocosPropostas(texto) {
    const s = semMarcadores(texto);
    if (!s) return [];
    const partes = s.split(/\n(?=\s*eu gostaria)/i).map((p) => p.trim()).filter(Boolean);
    return partes.map((p) => {
      const campo = (re) => { const m = p.match(re); return m ? m[1].trim() : ''; };
      const ateProximo = '([\\s\\S]*?)(?=\\n\\s*(?:Por que seria bom|Qual [ée] o p[úu]blico|Em qual local|Trata-se de um contexto|Como essa proposta)|$)';
      const linhaContexto = (p.match(/Trata-se de um contexto[^\n]*/i) || [''])[0];
      const formal = /\(\s*[xX✓✔•●]\s*\)\s*educa[çc][ãa]o formal/i.test(linhaContexto);
      const naoFormal = /\(\s*[xX✓✔•●]\s*\)\s*n[ãa]o[- ]formal/i.test(linhaContexto);
      return {
        desejo: (p.match(/^\s*eu gostaria[^\n]*/i) || [''])[0].trim(),
        porQue: campo(new RegExp('Por que seria bom fazer isso:?[ \\t]*' + ateProximo, 'i')),
        publico: campo(new RegExp('Qual [ée] o p[úu]blico-alvo dessa proposta:?[ \\t]*' + ateProximo, 'i')),
        local: campo(new RegExp('Em qual local essa ideia se aplica:?[ \\t]*' + ateProximo, 'i')),
        contexto: formal && naoFormal ? 'ambos' : formal ? 'formal' : naoFormal ? 'não formal' : '',
        pois: campo(new RegExp('n[ãa]o[- ]formal,?\\s*pois:?[ \\t]*' + ateProximo, 'i')),
        tecnologias: campo(new RegExp('Como essa proposta se relaciona com as tecnologias digitais:?[ \\t]*' + ateProximo, 'i'))
      };
    }).filter((b) => contarPalavras(b.desejo) > 2 || b.porQue || b.publico);
  }
  const TEC = /tecnolog|digita|online|on-line|virtual|aplicativ|plataforma|ambiente virtual|ava\b|moodle|intelig[êe]ncia artificial|\bia\b|v[íi]deo|podcast|software|internet|recurso/i;
  const EXEMPLO_PERGUNTA = /aprimorar o processo de ambienta[çc][ãa]o/i;
  const TEM_FUNDAMENTO = /\d|segundo |de acordo com|conforme |dados|pesquisa|estudo|levantamento|IBGE|INEP|censo|relat[óo]rio|\(\s*[A-ZÁÉÍÓÚ][^()]*\d{4}\s*\)|refer[êe]ncia/i;

  function perguntasDesafio(texto) { return (semOrientacoes(texto).match(/como podemos/gi) || []).length; }
  // A pergunta começa com "Como podemos", ignorando marcadores de lista ("A. Como podemos...") e aspas.
  const comecaComoPodemos = (texto) => /^\s*["“'‘]?\s*como podemos/i.test(limpo(texto));

  // ---------- os 4 elementos da pergunta-desafio (leitura automática, sinal para conferir) ----------
  const PUBLICO_ESPECIFICO = /\b(alun[oa]s?|estudantes?|discentes?|professor(?:es|as?)?|docentes?|servidor(?:es|as?)?|trabalhador(?:es|as?)?|profissionais|profissional|t[ée]cnic[oa]s|equipes?|turmas?|egress[oa]s|colaborador(?:es|as?)|gestor(?:es|as?)|jovens|adultos|crian[çc]as|idosos|mulheres|cursistas|aprendizes|bolsistas|estagi[áa]ri[oa]s|funcion[áa]ri[oa]s|coordenador(?:es|as?)|tutor(?:es|as?)|ingressantes|formand[oa]s|volunt[áa]ri[oa]s|agricultor(?:es|as)|enfermeir[oa]s|educador(?:es|as)|instrutor(?:es|as)|empreendedor(?:es|as)|pais|fam[íi]lias|calouros|agentes|operador(?:es|as)|atendentes|vendedor(?:es|as)|recém-contratad[oa]s)\b/i;
  const PUBLICO_GENERICO = /\b(pessoas|comunidade|p[úu]blico|usu[áa]ri[oa]s|participantes|sociedade|popula[çc][ãa]o|todos)\b/i;
  const LOCAL = /\b(escolas?|institutos?|ifsc|if[a-z]{1,3}|campus|c[âa]mpus|universidades?|faculdades?|cursos?|empresas?|ongs?|secretarias?|prefeituras?|hospita(?:l|is)|unidades?|setor(?:es)?|departamentos?|laborat[óo]rios?|bibliotecas?|rede|munic[íi]pios?|cidades?|bairros?|estados?|cooperativas?|associa[çc][õo]es|associa[çc][ãa]o|centros?|polos?|senai|senac|sesi|sesc|sala de aula|oficinas?|cl[íi]nicas?|ind[úu]strias?|f[áa]bricas?|lojas?|creches?|ambiente de trabalho|programas?|projetos?|organiza[çc][ãa]o|organiza[çc][õo]es|institui[çc][ãa]o|institui[çc][õo]es|regi[ãa]o|resid[êe]ncias?|grupos?|aldeias?|comunidades? (?:quilombola|ind[íi]gena|rural))\b/i;
  const TEC_ESPECIFICA = /aplicativ|\bapps?\b|plataforma|ambiente virtual|\bava\b|moodle|intelig[êe]ncia artificial|\bia\b|v[íi]deos?|podcasts?|software|simula[çc]|gamifica|jogos? digita|realidade (?:virtual|aumentada)|redes sociais|whatsapp|instagram|youtube|chatbot|rob[óo]tica|programa[çc][ãa]o|sistema|planilha|formul[áa]rio|e-?book|site|portal|tecnologias digitais|recursos digitais|ferramentas digitais|m[íi]dias digitais|meios digitais|ensino h[íi]brido|ead\b|educa[çc][ãa]o a dist[âa]ncia|online|on-line|internet|computador|celular|tablet|lms|3d|impressora/i;
  const TEC_GENERICA = /tecnolog|digita|virtual|recurso/i;
  // Nome próprio ou sigla depois da primeira palavra (indício de lugar ou instituição identificados).
  const NOME_PROPRIO = /\s(?:[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+(?:\s+(?:d[aeo]s?\s+)?[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+)*|(?!(?:IA|TI|EAD|AVA)\b)[A-Z]{2,})\b/;
  function elementosPergunta(texto) {
    const q = limpo(texto).split(/\n+/)[0] || '';
    if (!q) return { que: 'nao', quem: 'nao', onde: 'nao', tecnologia: 'nao' };
    const depois = q.replace(/^\s*["“'‘]?\s*como podemos\s*/i, '');
    const palavrasDepois = contarPalavras(depois);
    const que = palavrasDepois >= 5 ? 'sim' : palavrasDepois >= 2 ? 'parcial' : 'nao';
    const quem = PUBLICO_ESPECIFICO.test(q) ? 'sim' : PUBLICO_GENERICO.test(q) ? 'parcial' : 'nao';
    const semInicio = q.replace(/^\s*["“'‘]?\s*como\s+/i, ' ');
    const onde = LOCAL.test(q) ? (NOME_PROPRIO.test(semInicio) ? 'sim' : 'parcial') : (/\b(?:em|no|na|nos|nas)\s+[A-ZÁÉÍÓÚ]/.test(semInicio) ? 'parcial' : 'nao');
    const tecnologia = TEC_ESPECIFICA.test(q) ? 'sim' : TEC_GENERICA.test(q) ? 'parcial' : 'nao';
    return { que, quem, onde, tecnologia };
  }
  const ELEMENTOS = { que: 'o quê', quem: 'para quem', onde: 'onde', tecnologia: 'tecnologia' };
  const VALOR_ELEMENTO = ['sim', 'parcial', 'nao'];
  function elementosValidos(e) {
    const out = {};
    for (const k of Object.keys(ELEMENTOS)) {
      const v = String(e && e[k] || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
      out[k] = VALOR_ELEMENTO.includes(v) ? v : (/^s/.test(v) ? 'sim' : /^p/.test(v) ? 'parcial' : /^n/.test(v) ? 'nao' : '');
    }
    return out;
  }

  // ---------- coerência desafio (item 3) -> resultados esperados (item 5) ----------
  const ETIQUETAS_COERENCIA = ['Coerente', 'Parcial', 'Frágil', 'Não avaliável'];
  function etiquetaValida(v) {
    const s = String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    if (!s) return '';
    if (/^coer/.test(s)) return 'Coerente';
    if (/^parc/.test(s)) return 'Parcial';
    if (/^frag/.test(s)) return 'Frágil';
    if (/^nao/.test(s)) return 'Não avaliável';
    return '';
  }

  // Etiqueta calculada sempre pela mesma regra, a partir de três verificações objetivas (sim/não):
  // mesmo público, resultados decorrem do problema, resultados específicos.
  function etiquetaPorVerificacoes(v, temItem3, temItem5) {
    if (!temItem3 || !temItem5) return 'Não avaliável';
    const b = (x) => x === true || /^(sim|true|s)$/i.test(String(x || '').trim());
    const publico = b(v && v.mesmo_publico), decorre = b(v && v.decorre_do_problema), especifico = b(v && v.especifico);
    if (!decorre && !publico) return 'Frágil';
    if (!decorre && !especifico) return 'Frágil';
    if (publico && decorre && especifico) return 'Coerente';
    return 'Parcial';
  }

  // ---------- indicadores por trabalho (usados no relatório da turma) ----------
  // Contexto predominante das propostas do item 2.
  function contextoPredominante(propostasDetalhe) {
    const b = blocosPropostas(propostasDetalhe);
    const f = b.filter((x) => x.contexto === 'formal').length, nf = b.filter((x) => x.contexto === 'não formal').length;
    if (!f && !nf) return 'Não identificado';
    if (f && nf) return f === nf ? 'Misto' : f > nf ? 'Formal' : 'Não formal';
    return f ? 'Formal' : 'Não formal';
  }

  function alertas(d) {
    const out = [];
    const add = (nivel, texto) => out.push({ nivel, texto });
    if (!t(d.nome) || PLACEHOLDER_NOME.test(d.nome)) add('erro', 'Nome não preenchido (consta o texto do modelo ou está vazio).');
    if (!t(d.matricula) || PLACEHOLDER_MATRICULA.test(d.matricula)) add('erro', 'Matrícula não preenchida.');
    if (orientadorVazio(d.orientador)) add('erro', 'Orientador(a) não selecionado(a) no documento.');

    const props = listarPropostas(d.propostasLista);
    if (!props.length) add('erro', 'Item 1: nenhuma proposta identificada (ou só "Eu gostaria…" do modelo).');
    const blocos = blocosPropostas(d.propostasDetalhe);
    if (!blocos.length) add('erro', 'Item 2: nenhuma proposta aprofundada.');
    else {
      if (props.length > blocos.length) add('aviso', `Item 2: ${props.length} proposta(s) no item 1, mas só ${blocos.length} aprofundada(s) no item 2.`);
      blocos.forEach((b, i) => {
        const falta = [];
        if (!b.porQue) falta.push('por que seria bom');
        if (!b.publico) falta.push('público-alvo');
        if (!b.local) falta.push('local');
        if (!b.contexto) falta.push('marcação formal/não formal');
        if (b.contexto === 'ambos') falta.push('marcação única (formal e não formal assinalados)');
        if (!b.pois) falta.push('justificativa da classificação ("pois")');
        if (!b.tecnologias) falta.push('relação com tecnologias digitais');
        if (falta.length) add('aviso', `Item 2, proposta ${i + 1}: falta ${falta.join(', ')}.`);
      });
    }

    const pergunta = limpo(d.desafio);
    if (!pergunta) add('erro', 'Item 3: pergunta-desafio ausente (ou ainda "Como podemos … (preencha aqui)").');
    else {
      if (!comecaComoPodemos(d.desafio)) add('aviso', 'Item 3: a pergunta-desafio não começa com "Como podemos...".');
      if (perguntasDesafio(d.desafio) > 1) add('aviso', 'Item 3: há mais de uma pergunta "Como podemos"; a versão final deve ter uma só.');
      if (EXEMPLO_PERGUNTA.test(pergunta)) add('aviso', 'Item 3: a pergunta parece repetir o exemplo do modelo.');
      if (!TEC.test(pergunta)) add('aviso', 'Item 3: a pergunta não indica relação com tecnologias digitais.');
    }
    const just = limpo(d.justificativa);
    if (!just) add('erro', 'Item 4: justificativa da escolha ausente.');
    else if (!TEM_FUNDAMENTO.test(just)) add('aviso', 'Item 4: não há fatos, dados ou referências aparentes na justificativa.');
    if (!limpo(d.resultadosEsperados)) add('erro', 'Item 5: resultados esperados ausentes.');

    const ia = t(d.iaDeclaracao);
    if (!ia) add('erro', 'Declaração de IA sem marcação (Sim ou Não).');
    else if (ia === 'Ambos') add('erro', 'Declaração de IA com "Sim" e "Não" assinalados ao mesmo tempo.');
    else if (ia === 'Sim' && contarPalavras(d.iaDescricao) < 5) add('aviso', 'Declara uso de IA, mas não descreve ferramentas, para quê e como.');
    return out;
  }

  return { RUBRICA, ORDEM, pontosCriterio, maxCriterio, notaFinal, nivelValido, formatar, contarPalavras, semOrientacoes,
    semMarcadorLista, semMarcadores, limpo, comecaComoPodemos, elementosPergunta, elementosValidos, ELEMENTOS,
    ETIQUETAS_COERENCIA, etiquetaValida, etiquetaPorVerificacoes, contextoPredominante,
    listarPropostas, blocosPropostas, perguntasDesafio, orientadorVazio, alertas, TEC, TEM_FUNDAMENTO, EXEMPLO_PERGUNTA, marcado };
});
