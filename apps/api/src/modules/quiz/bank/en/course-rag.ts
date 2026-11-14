/** Banco de Not-games en inglés: el curso de RAG (`../course-rag.ts`), con la misma forma. */

import type { ConceptText } from '../types.js'

export const COURSE_RAG_EN: Readonly<Record<string, ConceptText>> = {
  'rag-context': {
    forms: [
      {
        ask: [
          'The model learned from version 1 of your project and the guide has changed. With no context, what does it answer?',
          'Without any chunk of the new guide, a model trained on version 1 answers…',
        ],
        right: ['The version 1 fact, with full confidence', 'What it learned: the outdated fact'],
        wrong: [
          'The new fact, read from the guide',
          'The quote from the guide that says it',
          'The new fact, with its source',
          'A chunk of the guide, unchanged',
        ],
      },
      {
        ask: [
          'Your bot answers with facts from an old version and cites nothing. What is it missing?',
          'A bot that answers from memory, with old facts and no sources, needs…',
        ],
        right: ['Chunks of your documents, with their citation', 'Context from your docs, cited'],
        wrong: [
          'A bigger model, with more memory',
          'More example answers in the prompt',
          'Smaller chunks when chunking',
          'A cache for the answers',
        ],
      },
    ],
    wrong: [],
    why: 'With no context, the model answers from memory and with confidence; RAG gives it the right chunks so it answers by reading and cites.',
  },
  'rag-corpus-filter': {
    forms: [
      {
        ask: [
          'You are about to index a repository for your RAG. Which file do you leave out?',
          'When loading the corpus of your RAG, which of these files do you not index?',
        ],
        right: ['`.env`', '`poetry.lock`'],
        wrong: [
          '`README.md`',
          '`docs/install.md`',
          '`src/worker.py`',
          '`docs/deploy.md`',
          '`src/retry.py`',
        ],
      },
      {
        ask: [
          'After indexing the whole repository, your RAG copies the evaluation answers. What got into the index?',
          'Your RAG scores wonderfully because it copies the expected answers. What slipped in while indexing?',
        ],
        right: [
          'The evaluation questions with their answers',
          'The evaluation file, with the solutions',
        ],
        wrong: [
          'A file with passwords',
          'A file that repeats keywords',
          'Chunks repeated by the overlap',
          'Code with no documentation',
        ],
      },
    ],
    wrong: [],
    why: 'Whatever you index can end up in an answer: leave out secrets (.env), noise (.lock) and the evaluation questions, which inflate the score.',
  },
  'rag-chunk-cut': {
    forms: [
      {
        ask: [
          'Your test bench says "Lost while chunking". What does it mean?',
          'A question is lost while chunking. What happened to the chunks?',
        ],
        right: ['The answer sentence was split in two', 'A cut split the answer down the middle'],
        wrong: [
          'The right chunk does not fit in the prompt',
          'The search does not find the right chunk',
          'The model makes up the answer',
          'There are too many chunks to search',
        ],
      },
      {
        ask: [
          'The sentence with an answer falls right between two chunks. Which change fixes it?',
          'A cut splits the sentence with the answer in half. What do you tune?',
        ],
        right: ['A little overlap between chunks', 'Slightly bigger chunks or some overlap'],
        wrong: [
          'Reranking the candidates',
          'Semantic search instead of lexical',
          'Smaller and more numerous chunks',
          'Removing the stop words',
        ],
      },
    ],
    wrong: [],
    why: 'If a cut splits the answer sentence, no chunk holds it whole: raise the size or add just enough overlap.',
  },
  'rag-normalize': {
    forms: [
      {
        ask: [
          'The query "LIMITE DE TAMANO" does not find the chunk that says "Límite de tamaño". What is missing?',
          'With BM25, "LIMITE DE TAMANO" finds nothing, though the document says "Límite de tamaño". What are you missing?',
        ],
        right: [
          'Normalising: lowercase and no accents',
          'Lowercasing everything and dropping accents',
        ],
        wrong: [
          'Raising k1 so repeating adds more',
          'Lowering b so long chunks are not penalised',
          'More overlap between the chunks',
          'Asking for more results (k = 10)',
        ],
      },
      {
        ask: [
          'Why are tokens normalised before indexing?',
          'You normalise the text when tokenising…',
        ],
        right: [
          'So that case, accents and plurals do not count',
          'So that "Límite" and "limite" are the same word',
        ],
        wrong: [
          'So that each word weighs by how rare it is',
          'So that long chunks do not win for being long',
          'So that every chunk has the same length',
          'So that every word becomes a vector',
        ],
      },
    ],
    wrong: [],
    why: 'Normalising removes what does not matter when comparing (case, accents, plurals); without it, "LIMITE" and "Límite" are different words.',
  },
  'rag-idf': {
    forms: [
      {
        ask: [
          'In an index of 40 chunks, "tarea" appears in 30 and "heartbeat" in 2. Which weighs more in BM25?',
          'With 40 chunks, "tarea" is in 30 and "heartbeat" in 2. When scoring with BM25, the one that decides more is…',
        ],
        right: ['"heartbeat", because it is in few chunks', '"heartbeat": it is the rare word'],
        wrong: [
          '"tarea", because it is in many chunks',
          'Both the same: once each',
          '"tarea", because it comes first in the query',
          'Whichever of the two is longer',
        ],
      },
      {
        ask: [
          'A word appears in almost every chunk of the index. How much does it add to the BM25 score?',
          'If a term is in almost every chunk, in BM25 it counts…',
        ],
        right: [
          'Almost nothing: its IDF is very low',
          'Very little, because it tells no chunk apart',
        ],
        wrong: [
          'A lot: it is everywhere',
          'The same as any other word',
          'A lot, if the chunk is short',
          'It depends only on its TF in the chunk',
        ],
      },
    ],
    wrong: [],
    why: 'IDF measures how much a word tells chunks apart: almost zero if it is in every chunk, high if it is in few. The rare word decides.',
  },
  'rag-bm25-k1': {
    forms: [
      {
        ask: ['In BM25, what does the `k1` parameter control?', 'The `k1` of BM25 decides…'],
        right: [
          'How much repeating a word keeps adding',
          'How much repeating the term in the chunk scores',
        ],
        wrong: [
          'How much long chunks are penalised',
          'How many results the search returns',
          'How much the semantic list weighs',
          'How many words two chunks share',
        ],
      },
      {
        ask: [
          'A file that repeats "retry" non-stop comes first in BM25 and you cannot remove it. What do you change?',
          'A noise chunk wins in BM25 just by repeating the search word. What do you tune?',
        ],
        right: ['Lower k1 so repeating adds little', 'Lower k1: repeating saturates sooner'],
        wrong: [
          'Raise k1 so the word counts more',
          'Raise k to see more results',
          'Turn off token normalisation',
          'Raise the overlap between chunks',
        ],
      },
    ],
    wrong: [],
    why: 'k1 says how much repeating a word keeps adding: with a high k1 whoever repeats it most wins, not whoever answers.',
  },
  'rag-search-kind': {
    forms: [
      {
        ask: [
          'The guide says "reintentos" and someone asks how long it takes to "volver a intentarlo". Which search finds the chunk?',
          'If people ask with words other than the ones in your guide, which search finds the right chunk?',
        ],
        right: ['The semantic one, with embeddings', 'The one that compares vectors (cosine)'],
        wrong: [
          'The lexical one, with BM25',
          'The lexical one, if you normalise accents',
          'The lexical one, with a higher k1',
          'Neither: it needs the same words',
        ],
      },
      {
        ask: [
          'You ask where `backoff_seconds` is defined. Which search puts that function chunk first?',
          'With an exact identifier in the query, such as `backoff_seconds`, the one that does better is…',
        ],
        right: ['The lexical one, with BM25', 'The one that compares words (BM25)'],
        wrong: [
          'The semantic one, with embeddings',
          'The one that compares vectors (cosine)',
          'Both, exactly the same',
          'Neither of them finds it',
        ],
      },
      {
        ask: [
          'Some questions use exact names and others, words unlike the guide. Which search do you build?',
          'If your users ask both with identifiers and in their own words, you should use…',
        ],
        right: ['A hybrid that joins lexical and semantic', 'Both, lexical and semantic, fused'],
        wrong: [
          'Only semantic, which gets the meaning',
          'Only lexical, with a higher k',
          'Only lexical, with more overlap',
          'Only semantic, with bigger chunks',
        ],
      },
    ],
    wrong: [],
    why: 'Lexical search gets exact words and identifiers right and semantic search, other wording; hybrid search joins both lists.',
  },
  'rag-rrf': {
    forms: [
      {
        ask: [
          'With RRF and k = 60, a chunk is 1st in the lexical list and 3rd in the semantic one. What does it score?',
          'In RRF (k = 60), a chunk 1st in one list and 3rd in the other scores…',
        ],
        right: ['1/61 + 1/63'],
        wrong: ['1/1 + 1/3', '1/61 + 1/61', '1/(60 + 1 + 3)', '61 + 63', '60/1 + 60/3'],
      },
      {
        ask: [
          'You merge the lists by adding BM25 and cosine, and the fusion comes out equal to the lexical one. Why?',
          'When you add BM25 and cosine as they are, the lexical list decides everything. What is going on?',
        ],
        right: [
          'BM25 gives big numbers and cosine never passes 1',
          'They are on different scales and BM25 rules',
        ],
        wrong: [
          'The semantic search found no chunk',
          'BM25 is computed later and overwrites cosine',
          'The query tokens were not normalised',
          'Cosine only counts for the first chunk',
        ],
      },
    ],
    wrong: [],
    why: 'RRF only looks at ranks: each list adds 1/(k + rank). Adding BM25 and cosine as they are does not work: they are different scales.',
  },
  'rag-prompt-budget': {
    forms: [
      {
        ask: [
          'Budget: 100 tokens. Instructions and question use 40, and each chunk, with its label, 25. How many chunks get in?',
          'With a 100-token budget, 40 for the fixed part and chunks of 25 (label included), how many fit?',
        ],
        right: ['2'],
        wrong: ['3', '4', '1', '0'],
      },
      {
        ask: [
          'You retrieve 5 chunks and the best one, 1st on the list, is left out of the prompt. What happened?',
          'The best-scored chunk does not get into the prompt and the worst ones do. Why?',
        ],
        right: [
          'You filled from worst to best and the cut left it out',
          'They went in reverse order and the budget cut',
        ],
        wrong: [
          'The search never returned it',
          'Chunking split the answer',
          'The model read it and did not cite it',
          'The budget does not count the question',
        ],
      },
    ],
    wrong: [],
    why: 'The prompt is filled in order up to the budget and the first chunk that does not fit cuts: fill it from best to worst and count the fixed part.',
  },
  'rag-idk': {
    forms: [
      {
        ask: [
          'You ask how much the licence costs, which your corpus does not say, and the bot quotes a README sentence. What do you tune?',
          'Faced with a question the corpus does not answer, the bot replies with something merely similar, cited. What do you change?',
        ],
        right: [
          'Raise the minimum support so it says "I do not know"',
          'Demand more support before giving an answer',
        ],
        wrong: [
          'Raise k so it finds the licence',
          'Remove the citations from the answers',
          'Lower the minimum support to 1',
          'Give the prompt a bigger budget',
        ],
      },
      {
        ask: [
          'What is the minimum support for when generating?',
          'The minimum support of the generator is there to…',
        ],
        right: [
          'Say "I do not know" if nothing supports it enough',
          'Stay quiet when the context barely backs the answer',
        ],
        wrong: [
          'Set how many chunks go into the prompt',
          'Discard chunks with a low cosine when searching',
          'Decide how many citations each answer has',
          'Limit how long the model takes to answer',
        ],
      },
    ],
    wrong: [],
    why: 'With a minimum support, if no sentence in the context backs the answer enough, the bot says "I do not know" instead of giving the closest thing.',
  },
  'rag-recall-mrr': {
    forms: [
      {
        ask: [
          'Out of 4 questions, the right chunk is in the top 3 for 3 of them. What recall@3 is that?',
          'Your search brings the right chunk into the top 3 for 3 of 4 questions. Its recall@3 is…',
        ],
        right: ['0.75'],
        wrong: ['0.25', '3', '0.33', '1'],
      },
      {
        ask: [
          'Over 3 questions, the first hit comes at ranks 1, 2 and 4. What MRR is that?',
          'First right chunk at ranks 1, 2 and 4 across three questions: the MRR is…',
        ],
        right: ['0.58'],
        wrong: ['2.33', '0.43', '1.75', '0.25', '0.33'],
      },
      {
        ask: [
          'You retrieve 10 chunks and only 1 has the answer. What precision@10 is that?',
          'With k = 10 and a single right chunk among those retrieved, the precision is…',
        ],
        right: ['0.1'],
        wrong: ['1', '10', '0.9', '0.5'],
      },
    ],
    wrong: [],
    why: 'recall@k counts in how many questions the right chunk is within the top k; MRR rewards it coming early (mean of 1/rank); precision, how much of what came back is useful.',
  },
  'rag-eval-split': {
    forms: [
      {
        ask: [
          'With cross-validation, a configuration scores 1.00, 0.50 and 0.60 on three folds. What score do you give it?',
          'Three folds of questions give 1.00, 0.50 and 0.60 to the same configuration. It is worth…',
        ],
        right: ['0.70'],
        wrong: ['1.00', '0.50', '0.75', '2.10'],
      },
      {
        ask: [
          'You tune the RAG by looking at the test questions until you score 1.00 on them. What did you do wrong?',
          'You pick the configuration by its score on the test questions, the held-out ones. What is wrong?',
        ],
        right: [
          'You tuned on the test set: it no longer measures',
          'Using the held-out set to tune, not to check',
        ],
        wrong: [
          'Trying too few configurations',
          'Not raising k to the maximum',
          'Measuring with recall instead of MRR',
          'Not reranking the search results',
        ],
      },
    ],
    wrong: [],
    why: 'You tune on the development questions and with the mean over several folds; the test questions are looked at once, at the end, or the score stops measuring.',
  },
  'rag-cache': {
    forms: [
      {
        ask: [
          'The guide goes from 5 to 7 retries, you reindex and the bot still says 5. What failed?',
          'After changing a guide and reindexing, the bot repeats the old answer. Why?',
        ],
        right: ['The cache was not cleared on reindexing', 'The cache still serves the old answer'],
        wrong: [
          'The model remembers the previous version',
          'Chunking split the new sentence',
          'BM25 prefers the old number',
          'The search k is too low',
        ],
      },
      {
        ask: [
          'The same question written in capitals misses your cache. What do you change?',
          'Your cache treats "RETRY" and "retry" as two different questions. What do you fix?',
        ],
        right: [
          'Normalise the question before using it as a key',
          'The key: make it the normalised question',
        ],
        wrong: [
          'Clear the cache every time you reindex',
          'Give the cache more room',
          'Store the retrieved chunks too',
          'Index the corpus in capitals too',
        ],
      },
    ],
    wrong: [],
    why: 'The cache saves searching and generating, but it must be cleared on reindexing (or it serves old answers) and keyed by the normalised question.',
  },
  'rag-api': {
    forms: [
      {
        ask: [
          'Your RAG API receives `POST /answer` with `k = 1000`. If it validates before searching, which status does it return?',
          '`POST /answer` arrives with `k = 1000`. An API that validates before searching replies…',
        ],
        right: ['422'],
        wrong: ['200', '500', '404', '405', '413'],
      },
      {
        ask: [
          'Why does your API validate `k` and the query before searching?',
          'Your API checks `q` and `k` before touching the index. It does so…',
        ],
        right: ['So a huge k cannot take the service down', 'So no work is wasted on bad requests'],
        wrong: [
          'So the cache stores more answers',
          'So the search gets a higher recall',
          'So the model cites its sources better',
          'So it always returns a 200 status',
        ],
      },
    ],
    wrong: [],
    why: 'An API validates before working: an empty query or an out-of-range k is a 422, not a search that takes the service down.',
  },
  'rag-stages': {
    forms: [
      {
        ask: [
          'The right chunk is among the k retrieved, but the model never gets to read it. Which stage fails?',
          'The search brings it, but it is not among what the model reads. At which stage is it lost?',
        ],
        right: ['Building the prompt'],
        wrong: ['Chunking', 'The search', 'Generation', 'Loading the corpus'],
      },
      {
        ask: [
          'The answer is whole inside one chunk, but that chunk is not in the top k. Which stage fails?',
          'A chunk holds the whole right sentence and does not show up in the results. Where is it lost?',
        ],
        right: ['The search', 'Retrieval'],
        wrong: ['Chunking', 'Building the prompt', 'Generation', 'Loading the corpus'],
      },
      {
        ask: [
          'No chunk in the index holds the whole sentence with the answer. Which stage fails?',
          'The right sentence is not complete in any chunk. Where is the answer lost?',
        ],
        right: ['Chunking'],
        wrong: ['The search', 'Building the prompt', 'Generation', 'Reranking'],
      },
    ],
    wrong: [],
    why: 'Follow the right chunk: if it is not whole, chunking fails; if it is not in the top k, the search; if it does not get in, the prompt; if it gets in and does not come out, generation.',
  },
}
