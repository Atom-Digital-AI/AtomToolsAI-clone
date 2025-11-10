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
- [ ] `DATABASE_URL` - PostgreSQL connection string
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

### 3. Database Configuration
- [ ] Railway Postgres service exists ("attractive-vibrancy" project)
- [ ] Postgres service is linked to AtomToolsAI service
- [ ] `DATABASE_URL` is auto-set by Railway OR manually configured
- [ ] Database has `pgvector` extension installed

### 4. Supabase Status
- [ ] Supabase project URL: `https://nqsuvximwdipyvcxftbo.supabase.co`
- [ ] ⚠️ **ISSUE**: Connection timeout - verify if Supabase is actually being used
- [ ] If using Supabase: Verify connection string in `DATABASE_URL`

### 5. Dependencies Check
- [ ] All packages in `package.json` are installed
- [ ] No missing dependencies in build logs
- [ ] TypeScript compiles without errors

### 6. Connection Points
- [ ] Railway service is deployed and running
- [ ] Domain is accessible: `atomtoolsai-production.up.railway.app`
- [ ] Health check endpoint works: `/health/live`
- [ ] Database connection works (check logs)

### 7. API Keys Test
Test that API keys are working:
- [ ] OpenAI API key is valid (test with a simple request)
- [ ] Brevo API key is valid (check email sending)
- [ ] Anthropic API key is valid (if using brand analysis)

## Common Issues

### Database Connection Timeout
- **Symptom**: Supabase connection times out
- **Possible causes**:
  1. Wrong connection string
  2. Using Railway Postgres instead of Supabase
  3. Database not accessible
- **Solution**: Check which database is actually configured in Railway

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
- Supabase Dashboard: https://supabase.com/dashboard
- Full Configuration Report: See `ENV_CONFIGURATION_CHECK.md`

