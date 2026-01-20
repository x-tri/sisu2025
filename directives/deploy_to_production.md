# Deploy to Production

## Goal
Deploy the SISU web application to Vercel production environment.

## When to Run
- After merging features to `main` branch
- For urgent hotfixes

## Prerequisites
- All changes committed and pushed to `main`
- Local build passes (`npm run build`)
- Vercel project connected to GitHub repo

## Execution Steps
1. Commit changes:
   ```bash
   git add -A && git commit -m "description"
   ```

2. Push to GitHub:
   ```bash
   git push origin main
   ```

3. Vercel auto-deploys from `main` branch (typically 1-2 minutes)

## Verification
- Check Vercel dashboard for deploy status
- Test production URL after deploy completes
- Verify critical flows: course selection, score display, chart rendering

## Rollback
If issues found in production:
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

## Edge Cases
- **Build fails**: Check Vercel logs, usually TypeScript or dependency issues
- **API 500 errors**: Check Supabase connection and environment variables in Vercel
