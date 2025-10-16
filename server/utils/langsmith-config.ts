/**
 * LangSmith Configuration for Tracing and Monitoring
 * Optional monitoring - only activates if LANGCHAIN_API_KEY is set
 */

let langSmithEnabled = false;

export function initializeLangSmith() {
  if (process.env.LANGCHAIN_API_KEY) {
    // LangSmith environment variables
    process.env.LANGCHAIN_TRACING_V2 = "true";
    process.env.LANGCHAIN_PROJECT = process.env.LANGCHAIN_PROJECT || "atomtools-rag";
    
    langSmithEnabled = true;
    console.log("✅ LangSmith tracing enabled for project:", process.env.LANGCHAIN_PROJECT);
  } else {
    console.log("ℹ️  LangSmith tracing disabled (LANGCHAIN_API_KEY not set)");
  }
}

export function isLangSmithEnabled(): boolean {
  return langSmithEnabled;
}

// Initialize on module load
initializeLangSmith();
