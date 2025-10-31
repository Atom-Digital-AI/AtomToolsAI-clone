# Quality Control (QC) Agents System

A modular, reusable quality control system built on LangGraph for automated content review.

## Architecture

### Sequential Agent Execution
1. **Proofreader** ? Grammar, spelling, punctuation
2. **Brand Guardian** ? Brand guidelines compliance
3. **Fact Checker** ? Factual accuracy & citations
4. **Regulatory** ? Regulatory compliance

### Conflict Resolution
- **Priority-based**: Regulatory (critical) > Brand (critical) > Other critical > High severity
- **User preferences**: Saved user decisions for recurring conflicts
- **Confidence-based**: Auto-resolve if one agent has significantly higher confidence
- **Human review**: Unresolved conflicts flagged for manual resolution

## Usage

```typescript
import { executeQCSubgraph } from './server/langgraph/qc/qc-subgraph';

const result = await executeQCSubgraph({
  content: "Your content here",
  contentType: 'markdown',
  userId: 'user-123',
  guidelineProfileId: 'brand-guid-id',
  enabledAgents: ['proofreader', 'brand_guardian', 'fact_checker', 'regulatory'],
  autoApplyThreshold: 90,
}, {
  threadId: 'thread-123'
});

console.log(result.overallScore); // 0-100
console.log(result.processedContent); // Content with auto-applied changes
console.log(result.unresolvedConflicts); // Conflicts requiring human review
```

## Database Schema

### Tables
- `qc_reports` - Individual agent reports
- `qc_user_decisions` - User conflict resolution preferences
- `qc_configurations` - Per-user/brand/tool QC settings

### Storage Methods
- `createQCReport()` - Save agent report
- `getQCReports()` - Retrieve reports by content
- `createQCUserDecision()` - Save user preference
- `getQCUserDecisions()` - Retrieve learned preferences
- `getQCConfiguration()` - Get user QC settings

## Agent Details

### Proofreader
- Grammar & spelling errors
- Punctuation issues
- Style consistency
- Severity: Grammar/spelling = HIGH, Style = MEDIUM/LOW

### Brand Guardian
- Tone & voice alignment
- Brand terminology
- Visual/verbal identity
- Requires: Brand guidelines profile
- Severity: Incorrect brand assets = CRITICAL, Tone = HIGH

### Fact Checker
- Factual accuracy
- Citation requirements
- Logical consistency
- Severity: False claims = CRITICAL, Missing citations = HIGH

### Regulatory
- Regulatory compliance
- Required disclaimers
- Prohibited claims
- Requires: Regulatory guidelines (attached to brand or specified)
- Severity: All violations = CRITICAL

## Configuration

Users can configure QC per:
- **Global**: Default settings for all tools
- **Tool-specific**: Override for specific tool (e.g., 'content-writer')
- **Brand-specific**: Override per brand guideline profile

Settings:
- `enabled`: Enable/disable QC
- `enabledAgents`: Which agents to run
- `autoApplyThreshold`: Confidence threshold for auto-applying changes (0-100)
- `conflictResolutionStrategy`: 'human_review' | 'learned_preferences' | 'priority_based'

## Future Enhancements

- [ ] Real-time streaming of agent progress
- [ ] Agent-specific settings (e.g., proofreader strictness level)
- [ ] Custom agent prompts per brand
- [ ] A/B testing different agent configurations
- [ ] Performance caching for similar content
- [ ] Agent feedback loop for continuous improvement
