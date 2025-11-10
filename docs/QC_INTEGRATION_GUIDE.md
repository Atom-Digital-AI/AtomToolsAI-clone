# QC Integration Guide

## Quick Start

### 1. Database Migration (REQUIRED FIRST)
```bash
npm install
npm run db:push
```

This creates the 3 new QC tables in your database.

### 2. Using QC in Content Writer

QC is now integrated into the content writer workflow. To enable it:

#### Backend (Already Done ?)
- QC runs automatically after `generateArticle` node
- Checks user's QC configuration
- Applies high-confidence changes
- Stores results in state metadata

#### Frontend Integration

Add to your content writer page (e.g., `/client/src/pages/app/tools/content-writer-v2.tsx`):

```tsx
import { QCDashboard } from "@/components/qc/QCDashboard";
import { QCSettings } from "@/components/qc/QCSettings";

// In your component, after article generation:
function ContentWriterPage() {
  const [threadState, setThreadState] = useState<any>(null);
  
  // ... your existing code ...
  
  return (
    <div>
      {/* Your existing content */}
      
      {/* Show QC Results */}
      {threadState?.metadata?.qcReports && (
        <QCDashboard
          reports={threadState.metadata.qcReports}
          overallScore={threadState.metadata.qcOverallScore}
          requiresReview={threadState.articleDraft?.metadata?.qcRequiresReview}
          conflicts={threadState.metadata.qcConflicts}
        />
      )}
      
      {/* QC Settings (in a tab or modal) */}
      <QCSettings
        guidelineProfileId={guidelineProfileId}
        toolType="content-writer"
        onSave={() => {
          // Optionally reload or show success message
        }}
      />
    </div>
  );
}
```

### 3. API Usage

#### Get QC Configuration
```typescript
const config = await apiRequest('/api/qc/config?toolType=content-writer&guidelineProfileId=xxx');
// Returns: { enabled: false, enabledAgents: [...], autoApplyThreshold: 90, ... }
```

#### Update QC Configuration
```typescript
await apiRequest('/api/qc/config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toolType: 'content-writer',
    guidelineProfileId: 'xxx',
    enabled: true,
    enabledAgents: ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'],
    autoApplyThreshold: 90,
  }),
});
```

#### Get QC Reports
```typescript
const reports = await apiRequest(`/api/qc/reports/${threadId}`);
// Returns array of QCReport objects
```

#### Save Conflict Decision
```typescript
await apiRequest('/api/qc/decisions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    guidelineProfileId: 'xxx',
    conflictType: 'proofreader_vs_brand',
    conflictDescription: 'Grammar correction vs brand voice',
    option1: { /* QCChange object */ },
    option2: { /* QCChange object */ },
    selectedOption: 1,
    applyToFuture: true,
  }),
});
```

## Configuration Hierarchy

QC configurations are checked in this order:
1. **Tool + Brand specific**: Most specific (e.g., content-writer + Brand X)
2. **Brand specific**: Applies to all tools for this brand
3. **Tool specific**: Applies to tool across all brands
4. **Global**: User's default for everything
5. **System default**: QC disabled, all agents available

## Workflow Integration

### Content Writer Flow (Current)
```
generateConcepts
  ?
awaitConceptApproval
  ?
generateSubtopics
  ?
awaitSubtopicApproval
  ?
generateArticle
  ?
qualityControl ? NEW!
  ?
checkBrandMatch (existing)
  ?
verifyFacts (existing)
  ?
qualityDecision
```

### What QC Does
1. **Checks Configuration**: Loads user's QC settings
2. **Runs Agents** (if enabled): Proofreader ? Brand Guardian ? Fact Checker ? Regulatory
3. **Detects Conflicts**: Identifies overlapping suggestions
4. **Resolves**: Uses learned preferences or priority rules
5. **Applies Changes**: Auto-applies high-confidence fixes
6. **Stores Results**: Saves all data to state and database

## Data Structure

### In ContentWriterState
```typescript
{
  articleDraft: {
    finalArticle: "...",  // Updated with QC changes
    metadata: {
      qcOverallScore: 85,
      qcRequiresReview: true,
    }
  },
  metadata: {
    currentStep: 'qc',
    qcEnabled: true,
    qcReports: {
      proofreader: { score: 92, issues: [...], suggestions: [...] },
      brandGuardian: { score: 78, issues: [...], suggestions: [...] },
      factChecker: { score: 95, issues: [...], suggestions: [...] },
      regulatory: { score: 100, issues: [...], suggestions: [...] },
    },
    qcConflicts: [
      {
        id: "...",
        type: "proofreader_vs_brand",
        conflictingChanges: [...],
      }
    ],
    qcChangesApplied: true,
    qcOverallScore: 85,
  }
}
```

## Agent Details

### Proofreader
- **Checks**: Grammar, spelling, punctuation, style
- **Severity**: Grammar/spelling = HIGH, Style = MEDIUM/LOW
- **Model**: GPT-4o-mini (temp: 0.2)

### Brand Guardian
- **Checks**: Tone, voice, brand terminology, style alignment
- **Requires**: Brand guideline profile
- **Uses**: RAG for style matching
- **Severity**: Incorrect assets = CRITICAL, Tone = HIGH
- **Model**: GPT-4o-mini (temp: 0.3)

### Fact Checker
- **Checks**: Factual accuracy, citations, logical consistency
- **Severity**: False claims = CRITICAL, Missing citations = HIGH
- **Model**: GPT-4o-mini (temp: 0.2)

### Regulatory
- **Checks**: Regulatory compliance, required disclaimers
- **Supports**: Multiple regulatory rulesets
- **Severity**: ALL violations = CRITICAL
- **Model**: GPT-4o-mini (temp: 0.1)

## Conflict Resolution Priority

```
1. User's saved preferences (learned from past decisions)
2. CRITICAL regulatory violations
3. CRITICAL brand violations
4. Any CRITICAL severity
5. HIGH regulatory violations
6. HIGH brand violations
7. Any HIGH severity
8. Confidence threshold (>= autoApplyThreshold)
9. Human review required
```

## Cost Estimates

- **Per QC Run**: 4 API calls (one per agent)
- **Tokens**: ~2,000-4,000 per agent
- **Cost**: ~$0.01-0.03 per full QC run
- **Time**: ~8-15 seconds for all 4 agents (sequential)

## Performance Tips

1. **Selective Agents**: Only enable agents you need
2. **Higher Threshold**: Increase auto-apply threshold to reduce manual reviews
3. **Learn from Conflicts**: Always save decisions to "apply to future"
4. **Disable for Drafts**: Only enable QC for final content

## Troubleshooting

### QC Not Running
- Check user has enabled QC in settings
- Verify `enabledAgents` array is not empty
- Check `articleDraft.finalArticle` exists
- Look for errors in `state.errors` array

### Changes Not Applied
- Check `autoApplyThreshold` setting
- Verify change confidence meets threshold
- Check for conflicts (requires manual resolution)

### Agent Scores Low
- Review `issues` and `suggestions` arrays
- Check if content matches brand guidelines (Brand Guardian)
- Verify regulatory guidelines are attached (Regulatory)
- Review factual claims and citations (Fact Checker)

## Next Steps

1. ? Database migration
2. Add QC UI to content-writer-v2.tsx
3. Test with real content
4. Build conflict resolver interface
5. Add to other tools (Google Ads, SEO Meta)
6. Gather user feedback
7. Iterate and improve agent prompts

## Support

- QC documentation: `/server/langgraph/qc/README.md`
- Implementation status: `/QC_IMPLEMENTATION_STATUS.md`
- Agent code: `/server/langgraph/qc/agents/`
- UI components: `/client/src/components/qc/`
