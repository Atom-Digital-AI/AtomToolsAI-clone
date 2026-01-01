# Deployment Checklist

Quick reference for verifying deployment configuration.

## Quick Verification Steps

### 1. Railway Dashboard Check
- [ ] Log into Railway dashboard
- [ ] Navigate to "daring-manifestation" project
- [ ] Select "AtomToolsAI" service
- [ ] Go to "Variables" tab
- [ ] Verify all required variables are set (see below)

### 2. Required Environment Variables
Check these are set in Railway Variables:

#### Critical (App won't start without these)
- [ ] `DATABASE_URL` - PostgreSQL connection string (Neon)
- [ ] `SESSION_SECRET` - At least 32 characters
- [ ] `OPENAI_API_KEY` - Starts with `sk-`
- [ ] `BREVO_API_KEY` - Brevo API key

#### Important (Features may not work without these)
- [ ] `ANTHROPIC_API_KEY` - For brand analysis and social content
- [ ] `FRONTEND_URL` - Set to `https://atomtoolsai-production.up.railway.app`

#### Optional (Nice to have)
- [ ] `LANGCHAIN_API_KEY` - For LangSmith tracing
- [ ] `COHERE_API_KEY` - For reranking (if RERANKING_ENABLED=true)
- [ ] `SENTRY_DSN` - For error tracking
- [ ] `NEON_API_KEY` - For Neon project management features

### 3. Database Configuration
- [ ] Neon project exists (EU Frankfurt region recommended)
- [ ] `DATABASE_URL` is set to Neon connection string
- [ ] Database has `pgvector` extension installed
- [ ] Connection string format: `postgres://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### 4. Dependencies Check
- [ ] All packages in `package.json` are installed
- [ ] No missing dependencies in build logs
- [ ] TypeScript compiles without errors

### 5. Connection Points
- [ ] Railway service is deployed and running
- [ ] Domain is accessible: `atomtoolsai-production.up.railway.app`
- [ ] Health check endpoint works: `/health/live`
- [ ] Database connection works (check logs)

### 6. API Keys Test
Test that API keys are working:
- [ ] OpenAI API key is valid (test with a simple request)
- [ ] Brevo API key is valid (check email sending)
- [ ] Anthropic API key is valid (if using brand analysis)

## Common Issues

### Database Connection Timeout
- **Symptom**: Database connection times out
- **Possible causes**:
  1. Wrong connection string
  2. Database not accessible from Railway
  3. SSL mode not set correctly
- **Solution**: Verify DATABASE_URL format and check Neon dashboard

### Missing Environment Variables
- **Symptom**: App fails to start with validation errors
- **Solution**: Add missing variables in Railway dashboard

### API Key Format Errors
- **Symptom**: Validation errors for API keys
- **Solution**:
  - OpenAI key must start with `sk-`
  - Brevo key must be valid API key format
  - Check no extra spaces or quotes

## Verification Commands

```bash
# Check Railway status
railway status

# View Railway logs
railway logs

# Check environment variables (requires Railway CLI)
railway variables

# Test database connection (if DATABASE_URL is set)
psql $DATABASE_URL -c "SELECT 1;"
```

## Next Steps After Verification

1. **If variables are missing**: Add them in Railway dashboard
2. **If database connection fails**: Check connection string format
3. **If API keys are invalid**: Verify keys are correct
4. **After setting variables**: Restart Railway service
5. **Check logs**: Verify no configuration errors

## Support Resources

- Railway Dashboard: https://railway.app
- Neon Dashboard: https://console.neon.tech
- Full Configuration Report: See `ENV_CONFIGURATION_CHECK.md`

