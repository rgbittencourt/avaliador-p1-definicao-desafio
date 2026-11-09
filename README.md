# Avaliador P1 · Descobrindo meu Desafio (TEDPRO)

PWA para apoiar a avaliação da atividade **P1 - Descobrindo meu desafio** (UC Portfólio I) do TEDPRO/IFSC. Segue a rubrica oficial da P1: dez critérios cujos níveis já valem os pontos indicados (máximo 10).

## Aplicativo publicado

- **App (P1 Descobrindo meu Desafio):** https://avaliador-p1-definicao-desafio.onrender.com
- **Verificação do servidor:** https://avaliador-p1-definicao-desafio.onrender.com/api/health
- Hospedagem: Render (serviço `avaliador-p1-definicao-desafio`). O plano gratuito "dorme" sem uso: a primeira abertura pode levar uns 50 segundos.

## Funcionalidades

- importação da P1 em PDF no modelo oficial (lido no navegador com pdf.js, separado pelos itens 1 a 5 e pela declaração de IA, e interpretado com IA);
- resumo ao vivo das propostas: quantas há no item 1, quantas foram aprofundadas no item 2 e, em cada bloco, se há por que, público-alvo, local, marcação formal/não formal, justificativa ("pois") e relação com tecnologias;
- checagens da pergunta-desafio (começa com "Como podemos", uma única pergunta, indica tecnologias, não repete o exemplo do modelo) e da justificativa (fatos, dados ou referências aparentes);
- alertas automáticos de identificação, marcadores do modelo não substituídos ("Eu gostaria…", "Como podemos … (preencha aqui)") e marcações da declaração de IA (nenhuma ou as duas);
- rubrica oficial em pontos (0,375, 0,625, 1,25...), nota = soma dos níveis;
- avaliação automática com IA (OpenAI ou Anthropic) ou local conservadora;
- feedback no padrão do Prof. Rogério: saudação, reconhecimento, comentários só dos critérios abaixo do máximo, sem travessão, "Um abraço, Prof. Rogério";
- bloco complementar de **coerência da definição do desafio** (sem pontuação): problema, público, contexto e mudanças esperadas;
- turmas no PostgreSQL (Neon), backup no repositório privado `avaliador-p1-definicao-desafio-dados`, exportação JSON/CSV, importação de turma e relatório executivo.

## Rubrica

| Critério | Até |
|---|---|
| 1. Identificação e apresentação no modelo solicitado | 0,5 |
| 2. Levantamento de propostas de desafios do entorno (item 1) | 0,75 |
| 3. Aprofundamento das propostas e caracterização do contexto educativo (item 2) | 1,0 |
| 4. Definição do público-alvo e justificativa de sua pertinência (itens 2 e 4) | 1,0 |
| 5. Articulação entre tecnologias digitais e educação profissional (itens 2 e 3) | 1,25 |
| 6. Seleção e formulação da pergunta-desafio (item 3) | 1,5 |
| 7. Delimitação do escopo e viabilidade do desafio (itens 2, 3 e 4) | 1,25 |
| 8. Justificativa da escolha com contextualização e fundamentação (item 4) | 1,25 |
| 9. Clareza dos resultados e das mudanças esperadas (item 5) | 1,0 |
| 10. Transparência no uso de inteligência artificial | 0,5 |

A rubrica, o cálculo da nota, a leitura das propostas e os alertas ficam em `public/desafio-core.js`, usado pela tela e pelo servidor.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha as chaves que quiser usar
npm start
```

Abra `http://localhost:3000`. Testes: `npm test`.

## Variáveis de ambiente

- `IA_PROVEDOR`: `openai` ou `anthropic` (vazio: OpenAI se houver chave, senão Anthropic);
- `OPENAI_API_KEY` / `OPENAI_MODEL` (padrão `gpt-4o-mini`) e `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (padrão `claude-haiku-5-5`);
- `APP_USERNAME` e `APP_PASSWORD`: proteção das APIs (janela de login do próprio app);
- `DATABASE_URL`: PostgreSQL/Neon (projeto `avaliador-p1-definicao-desafio`); sem ela, usa `data/turmas.json`;
- `GITHUB_DATA_*`: repositório privado de backup das turmas (`avaliador-p1-definicao-desafio-dados`).

## Seletor de IA

Com as duas chaves configuradas, a janela de login tem o campo **Inteligência artificial** e o topo da página tem o seletor **IA**. `IA_PROVEDOR` define só a opção inicial.
