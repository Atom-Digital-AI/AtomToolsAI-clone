# Codebase Dependency Diagrams

## Module-Level Architecture

```mermaid
graph TB
    subgraph "Entry Points"
        ServerEntry[server/index.ts]
        ClientEntry[client/src/main.tsx]
        PythonEntry[Ad Copy Generator App/app.py]
    end

    subgraph "Server Core"
        ServerEntry --> Routes[server/routes.ts]
        ServerEntry --> Auth[server/auth.ts]
        ServerEntry --> Config[server/config.ts]
        ServerEntry --> ErrorLogger[server/errorLogger.ts]
        ServerEntry --> RateLimit[server/rate-limit.ts]
        ServerEntry --> Vite[server/vite.ts]
        
        Routes --> Storage[server/storage.ts]
        Routes --> DB[server/db.ts]
        Routes --> Email[server/email.ts]
        Routes --> CrawlHandler[server/crawl-handler.ts]
        
        Routes --> CMSRoutes[server/cms-routes.ts]
        Routes --> ObjectStorageRoutes[server/object-storage-routes.ts]
        Routes --> SocialContentRoutes[server/social-content-routes.ts]
    end

    subgraph "LangGraph Workflows"
        Routes --> LegacyContentGraph[server/langgraph/content-writer-graph.ts]
        Routes --> LegacySocialGraph[server/langgraph/social-content-graph.ts]
        Routes --> NewContentGraph[tools/headline-tools/content-writer-v2/server/langgraph/content-writer-graph.ts]
        Routes --> NewSocialGraph[tools/headline-tools/social-content-generator/server/langgraph/social-content-graph.ts]
        Routes --> QCGraph[tools/support-tools/quality-control/server/langgraph/qc/qc-subgraph.ts]
        
        LegacyContentGraph --> LegacyNodes[server/langgraph/nodes/]
        NewContentGraph --> NewNodes[tools/headline-tools/content-writer-v2/server/langgraph/nodes/]
        LegacySocialGraph --> LegacySocialNodes[server/langgraph/social-content-nodes/]
        NewSocialGraph --> NewSocialNodes[tools/headline-tools/social-content-generator/server/langgraph/social-content-nodes/]
        QCGraph --> QCNodes[tools/support-tools/quality-control/server/langgraph/qc/nodes/]
    end

    subgraph "Server Utilities"
        Routes --> RAGService[server/utils/rag-service.ts]
        Routes --> BrandAnalyzer[server/utils/brand-analyzer.ts]
        Routes --> FormatGuidelines[server/utils/format-guidelines.ts]
        Routes --> LanguageHelpers[server/utils/language-helpers.ts]
        Routes --> AILogger[server/utils/ai-logger.ts]
        Routes --> Sanitize[server/utils/sanitize.ts]
        
        RAGService --> Embeddings[server/utils/embeddings.ts]
        RAGService --> Chunking[server/utils/chunking.ts]
        RAGService --> HybridSearch[server/utils/hybrid-search-service.ts]
        RAGService --> Reranking[server/utils/reranking-service.ts]
        RAGService --> WebCrawler[server/utils/web-crawler.ts]
        
        BrandAnalyzer --> PDFAnalyzer[server/utils/pdf-brand-analyzer.ts]
        WebCrawler --> HTMLToMarkdown[server/utils/html-to-markdown.ts]
        
        AILogger --> OpenAIClient[server/utils/openai-client.ts]
        AILogger --> APIRetry[server/utils/api-retry.ts]
    end

    subgraph "Tool Routes"
        Routes --> SEORoutes[tools/headline-tools/seo-meta-generator/server/routes.ts]
        Routes --> GoogleAdsRoutes[tools/headline-tools/google-ads-copy-generator/server/routes.ts]
        Routes --> ContentWriterRoutes[tools/headline-tools/content-writer-v2/server/routes.ts]
        Routes --> SocialContentRoutesNew[tools/headline-tools/social-content-generator/server/social-content-routes.ts]
    end

    subgraph "Component Tools"
        LegacyNodes --> ArticleGen[tools/component-tools/article-generator/server/generateArticle.ts]
        LegacyNodes --> BrandGuardian[tools/component-tools/brand-guardian/server/brand-guardian.ts]
        LegacyNodes --> ConceptGen[tools/component-tools/concept-generator/server/generateConcepts.ts]
        LegacyNodes --> FactChecker[tools/component-tools/fact-checker/server/fact-checker.ts]
        LegacyNodes --> Proofreader[tools/component-tools/proofreader/server/proofreader.ts]
        LegacyNodes --> Regulatory[tools/component-tools/regulatory-guardian/server/regulatory.ts]
        LegacyNodes --> SubtopicGen[tools/component-tools/subtopic-generator/server/generateSubtopics.ts]
        LegacyNodes --> URLScraper[tools/component-tools/url-scraper/server/scrapeUrls.ts]
        LegacyNodes --> WireframeGen[tools/component-tools/wireframe-generator/server/generateWireframes.ts]
        
        NewNodes --> ArticleGen
        NewNodes --> BrandGuardian
        NewNodes --> ConceptGen
        NewNodes --> FactChecker
        NewNodes --> Proofreader
        NewNodes --> Regulatory
        NewNodes --> SubtopicGen
    end

    subgraph "Support Tools"
        Routes --> BrandGuidelineCreator[tools/support-tools/brand-guideline-creator/server/utils/]
        Routes --> ContextGenerator[tools/support-tools/context-generator/server/]
        
        BrandGuidelineCreator --> BrandAnalyzer
        ContextGenerator --> WebCrawler
    end

    subgraph "Shared"
        Storage --> SharedSchema[shared/schema.ts]
        DB --> SharedSchema
        Routes --> SharedSchema
        LegacyContentGraph --> SharedSchema
        NewContentGraph --> SharedSchema
    end

    subgraph "Client Architecture"
        ClientEntry --> App[client/src/App.tsx]
        App --> Pages[client/src/pages/]
        App --> Components[client/src/components/]
        App --> Contexts[client/src/contexts/BrandContext.tsx]
        
        Pages --> Components
        Components --> UIComponents[client/src/components/ui/]
    end

    subgraph "Python App"
        PythonEntry --> APIRoutes[Ad Copy Generator App/api/routes.py]
        PythonEntry --> Services[Ad Copy Generator App/services/]
        PythonEntry --> Utils[Ad Copy Generator App/utils/]
        
        Services --> OpenAIService[Ad Copy Generator App/services/openai_service.py]
        Services --> CacheService[Ad Copy Generator App/services/cache_service.py]
        Services --> Monitoring[Ad Copy Generator App/services/monitoring.py]
        Services --> CeleryApp[Ad Copy Generator App/services/celery_app.py]
        Services --> Tasks[Ad Copy Generator App/services/tasks.py]
    end

    style ServerEntry fill:#e1f5ff
    style ClientEntry fill:#e1f5ff
    style PythonEntry fill:#e1f5ff
    style SharedSchema fill:#fff4e1
    style LegacyContentGraph fill:#ffe1e1
    style NewContentGraph fill:#e1ffe1
```

## Authentication Flow (Function-Level)

```mermaid
sequenceDiagram
    participant Client
    participant Routes as server/routes.ts
    participant Auth as server/auth.ts
    participant Storage as server/storage.ts
    participant DB as server/db.ts
    participant Session as Express Session

    Client->>Routes: POST /api/auth/login
    Routes->>Auth: authenticateUser(email, password)
    Auth->>Storage: getUserByEmail(email)
    Storage->>DB: Query users table
    DB-->>Storage: User data
    Storage-->>Auth: User object
    Auth->>Auth: bcrypt.compare(password, hash)
    alt Password valid
        Auth-->>Routes: User object
        Routes->>Session: req.session.regenerate()
        Routes->>Session: req.session.userId = user.id
        Routes-->>Client: { user: {...} }
    else Password invalid
        Auth-->>Routes: null
        Routes-->>Client: 401 Unauthorized
    end

    Note over Client,Session: Subsequent requests use requireAuth middleware
    Client->>Routes: GET /api/auth/me
    Routes->>Auth: requireAuth middleware
    Auth->>Session: Check req.session.userId
    Session-->>Auth: userId
    Auth->>Storage: getUserById(userId)
    Storage->>DB: Query users table
    DB-->>Storage: User data
    Storage-->>Auth: User object
    Auth->>Routes: Attach user to req.user
    Routes-->>Client: User data
```

## Content Generation Flow (Function-Level)

```mermaid
sequenceDiagram
    participant Client
    participant Routes as server/routes.ts
    participant LangGraph as content-writer-graph.ts
    participant Nodes as LangGraph Nodes
    participant AIService as utils/ai-logger.ts
    participant OpenAI as utils/openai-client.ts
    participant RAG as utils/rag-service.ts
    participant Storage as server/storage.ts

    Client->>Routes: POST /api/langgraph/content-writer/start
    Routes->>Routes: Validate input (langgraphStartSchema)
    Routes->>Storage: Get guideline profile (if provided)
    Storage-->>Routes: Guideline data
    Routes->>LangGraph: executeContentWriterGraph(params)
    LangGraph->>Nodes: generateConcepts()
    Nodes->>AIService: loggedOpenAICall() or loggedAnthropicCall()
    AIService->>OpenAI: OpenAI API call
    OpenAI-->>AIService: AI response
    AIService->>Storage: Log AI usage
    AIService-->>Nodes: AI response
    Nodes->>Nodes: Format concepts
    Nodes-->>LangGraph: Concepts array
    LangGraph->>Storage: Save state to database
    LangGraph-->>Routes: Thread ID and state
    Routes-->>Client: { threadId, concepts, ... }

    Note over Client,Storage: User selects concept
    Client->>Routes: POST /api/langgraph/content-writer/resume/:threadId
    Routes->>LangGraph: resumeContentWriterGraph(threadId, selectedConceptId)
    LangGraph->>Storage: Load state from database
    LangGraph->>Nodes: generateSubtopics(concept)
    Nodes->>RAG: ragService.query(context)
    RAG->>RAG: Generate embeddings
    RAG->>RAG: Vector search + fulltext search
    RAG->>RAG: Rerank results
    RAG-->>Nodes: Relevant context
    Nodes->>AIService: loggedOpenAICall()
    AIService->>OpenAI: Generate subtopics with context
    OpenAI-->>AIService: Subtopic suggestions
    AIService-->>Nodes: Subtopic data
    Nodes-->>LangGraph: Subtopics array
    LangGraph->>Storage: Update state
    LangGraph-->>Routes: Updated state
    Routes-->>Client: { subtopics, ... }

    Note over Client,Storage: User selects subtopics, generates article
    Client->>Routes: POST /api/langgraph/content-writer/resume/:threadId
    Routes->>LangGraph: resumeContentWriterGraph(threadId, selectedSubtopicIds)
    LangGraph->>Nodes: generateArticle(subtopics)
    Nodes->>RAG: ragService.query(article context)
    RAG-->>Nodes: Brand context
    Nodes->>Nodes: checkBrandMatch()
    Nodes->>Nodes: verifyFacts()
    Nodes->>AIService: loggedOpenAICall()
    AIService->>OpenAI: Generate article
    OpenAI-->>AIService: Article content
    AIService-->>Nodes: Article
    Nodes-->>LangGraph: Complete article
    LangGraph->>Storage: Save final content
    LangGraph-->>Routes: Article data
    Routes-->>Client: { article, status: 'completed' }
```

## RAG Service Flow (Function-Level)

```mermaid
sequenceDiagram
    participant Caller
    participant RAGService as utils/rag-service.ts
    participant Embeddings as utils/embeddings.ts
    participant HybridSearch as utils/hybrid-search-service.ts
    participant Reranking as utils/reranking-service.ts
    participant Storage as server/storage-rag-extensions.ts
    participant DB as server/db.ts
    participant OpenAI as utils/openai-client.ts

    Caller->>RAGService: ragService.query(query, options)
    RAGService->>Embeddings: generateEmbedding(query)
    Embeddings->>OpenAI: openai.embeddings.create()
    OpenAI-->>Embeddings: Embedding vector
    Embeddings-->>RAGService: Query embedding

    RAGService->>HybridSearch: hybridSearchService.search(query, embedding)
    HybridSearch->>DB: Vector similarity search (pgvector)
    DB-->>HybridSearch: Vector results
    HybridSearch->>DB: Fulltext search (PostgreSQL)
    DB-->>HybridSearch: Fulltext results
    HybridSearch->>HybridSearch: Combine and deduplicate results
    HybridSearch-->>RAGService: Combined results

    RAGService->>Reranking: rerankingService.rerank(query, results)
    Reranking->>Reranking: Score results by relevance
    Reranking-->>RAGService: Reranked results

    RAGService->>Storage: Format results with metadata
    Storage-->>RAGService: Formatted chunks
    RAGService-->>Caller: Relevant context chunks
```

## Error Handling Flow (Function-Level)

```mermaid
sequenceDiagram
    participant Route
    participant ErrorHandler as Global Error Handler
    participant ErrorLogger as server/errorLogger.ts
    participant Sentry as @sentry/node
    participant Storage as server/storage.ts
    participant DB as server/db.ts

    Route->>Route: throw Error
    Route->>ErrorHandler: Express error middleware
    ErrorHandler->>ErrorHandler: Extract error details
    ErrorHandler->>Sentry: Sentry.captureException(err)
    Sentry-->>ErrorHandler: Error logged
    ErrorHandler->>ErrorLogger: logToolError({...})
    ErrorLogger->>DB: Insert into error_logs table
    DB-->>ErrorLogger: Error saved
    ErrorLogger-->>ErrorHandler: Success
    ErrorHandler->>ErrorHandler: Format error response
    ErrorHandler-->>Route: res.status(500).json({ message })
    Route-->>Client: Error response
```

## Social Content Generation Flow

```mermaid
graph LR
    A[Client Request] --> B[server/routes.ts or<br/>tools/.../social-content-routes.ts]
    B --> C{Which Route?}
    C -->|Legacy| D[server/social-content-routes.ts]
    C -->|New| E[tools/.../social-content-routes.ts]
    D --> F[server/langgraph/social-content-graph.ts]
    E --> G[tools/.../social-content-graph.ts]
    F --> H[server/langgraph/social-content-nodes/]
    G --> I[tools/.../social-content-nodes/]
    H --> J[scrapeUrls]
    H --> K[generateWireframes]
    H --> L[awaitApproval]
    H --> M[handleApproval]
    I --> J
    I --> K
    I --> L
    I --> M
    J --> N[server/utils/web-crawler.ts]
    K --> O[tools/component-tools/wireframe-generator/]
    L --> P[Database State]
    M --> Q[Update Database]
    
    style D fill:#ffe1e1
    style E fill:#e1ffe1
    style F fill:#ffe1e1
    style G fill:#e1ffe1
```

## Redundancy Detection Map

```mermaid
graph TB
    subgraph "Duplicate LangGraph Implementations"
        LegacyContent[server/langgraph/content-writer-graph.ts] -.->|DUPLICATE| NewContent[tools/headline-tools/content-writer-v2/server/langgraph/content-writer-graph.ts]
        LegacySocial[server/langgraph/social-content-graph.ts] -.->|DUPLICATE| NewSocial[tools/headline-tools/social-content-generator/server/langgraph/social-content-graph.ts]
        LegacyNodes[server/langgraph/nodes/] -.->|DUPLICATE| NewNodes[tools/headline-tools/content-writer-v2/server/langgraph/nodes/]
        LegacySocialNodes[server/langgraph/social-content-nodes/] -.->|DUPLICATE| NewSocialNodes[tools/.../social-content-nodes/]
    end

    subgraph "Duplicate Route Handlers"
        LegacySocialRoutes[server/social-content-routes.ts] -.->|DUPLICATE| NewSocialRoutes[tools/.../social-content-routes.ts]
    end

    subgraph "Duplicate Utilities"
        ServerWebCrawler[server/utils/web-crawler.ts] -.->|DUPLICATE| ToolsWebCrawler[tools/support-tools/context-generator/server/utils/web-crawler.ts]
        ServerBrandAnalyzer[server/utils/brand-analyzer.ts] -.->|DUPLICATE| ToolsBrandAnalyzer[tools/support-tools/brand-guideline-creator/server/utils/brand-analyzer.ts]
        ServerPDFAnalyzer[server/utils/pdf-brand-analyzer.ts] -.->|DUPLICATE| ToolsPDFAnalyzer[tools/support-tools/brand-guideline-creator/server/utils/pdf-brand-analyzer.ts]
        ServerFormatGuidelines[server/utils/format-guidelines.ts] -.->|DUPLICATE| ToolsFormatGuidelines[tools/support-tools/brand-guideline-creator/server/utils/format-guidelines.ts]
        ServerSocialAccess[server/utils/social-content-access.ts] -.->|DUPLICATE| ToolsSocialAccess[tools/headline-tools/social-content-generator/server/utils/social-content-access.ts]
        ServerAdSpecValidator[server/utils/ad-spec-validator.ts] -.->|DUPLICATE| ToolsAdSpecValidator[tools/headline-tools/social-content-generator/server/utils/ad-spec-validator.ts]
    end

    style LegacyContent fill:#ffe1e1
    style NewContent fill:#e1ffe1
    style LegacySocial fill:#ffe1e1
    style NewSocial fill:#e1ffe1
```

## External Dependencies

```mermaid
graph LR
    subgraph "NPM Packages"
        Express[express]
        Drizzle[drizzle-orm]
        Zod[zod]
        LangChain[@langchain/*]
        OpenAI[openai]
        Anthropic[@anthropic-ai/sdk]
        Sentry[@sentry/node]
        React[react]
        Vite[vite]
    end

    subgraph "Python Packages"
        Flask[flask]
        Requests[requests]
        Pandas[pandas]
        BeautifulSoup[bs4]
        LangDetect[langdetect]
        Celery[celery]
    end

    Server[Server Code] --> Express
    Server --> Drizzle
    Server --> Zod
    Server --> LangChain
    Server --> OpenAI
    Server --> Anthropic
    Server --> Sentry
    
    Client[Client Code] --> React
    Client --> Vite
    
    Python[Python App] --> Flask
    Python --> Requests
    Python --> Pandas
    Python --> BeautifulSoup
    Python --> LangDetect
    Python --> Celery
```

