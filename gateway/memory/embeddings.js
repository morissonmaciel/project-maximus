const DEFAULT_EMBEDDING_MODEL =
  process.env.LOCAL_EMBEDDING_MODEL ||
  'hf:ggml-org/embeddinggemma-300M-GGUF/embeddinggemma-300M-Q8_0.gguf';

const DEFAULT_CACHE_DIR = process.env.LOCAL_EMBEDDING_CACHE_DIR || undefined;
const REMOTE_MODEL_PATTERN = /^(hf:|https?:)/i;

async function loadNodeLlamaCpp() {
  try {
    const mod = await import('node-llama-cpp');
    return mod;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(
      `node-llama-cpp not available. Install it to enable local embeddings. (${message})`
    );
    error.cause = err;
    throw error;
  }
}

async function createLocalEmbeddingProvider() {
  const { getLlama, resolveModelFile, LlamaLogLevel } = await loadNodeLlamaCpp();

  let llama = null;
  let embeddingModel = null;
  let embeddingContext = null;

  const ensureContext = async () => {
    if (!llama) {
      llama = await getLlama({ logLevel: LlamaLogLevel.error });
    }
    if (!embeddingModel) {
      const resolved = await resolveModelFile(DEFAULT_EMBEDDING_MODEL, DEFAULT_CACHE_DIR);
      embeddingModel = await llama.loadModel({ modelPath: resolved });
    }
    if (!embeddingContext) {
      embeddingContext = await embeddingModel.createEmbeddingContext();
    }
    return embeddingContext;
  };

  return {
    id: 'local',
    model: DEFAULT_EMBEDDING_MODEL,
    embedQuery: async (text) => {
      const ctx = await ensureContext();
      const embedding = await ctx.getEmbeddingFor(text);
      return Array.from(embedding.vector);
    },
    embedBatch: async (texts) => {
      const ctx = await ensureContext();
      const embeddings = await Promise.all(
        texts.map(async (text) => {
          const embedding = await ctx.getEmbeddingFor(text);
          return Array.from(embedding.vector);
        })
      );
      return embeddings;
    }
  };
}

let embeddingProvider = null;
let embeddingProviderError = null;
let embeddingProviderInitializing = false;

export async function getEmbeddingProvider(onStatus, onState) {
  if (embeddingProvider) return embeddingProvider;
  if (embeddingProviderError) throw embeddingProviderError;
  try {
    if (!embeddingProviderInitializing) {
      embeddingProviderInitializing = true;
      if (onStatus) {
        onStatus('Preparing local embeddings (model download may take a minute).');
      }
      if (onState) {
        const state = REMOTE_MODEL_PATTERN.test(DEFAULT_EMBEDDING_MODEL) ? 'downloading' : 'preparing';
        onState(state);
      }
    }
    embeddingProvider = await createLocalEmbeddingProvider();
    if (onState) {
      onState('ready');
    }
    embeddingProviderInitializing = false;
    return embeddingProvider;
  } catch (err) {
    embeddingProviderError = err;
    embeddingProviderInitializing = false;
    throw err;
  }
}
