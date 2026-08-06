# Deploy to Production

## Goal
Deploy the SISU web application to the Coolify production environment at `xtrisisu.com`.

## When to Run
- After merging features to `main` branch
- For urgent hotfixes

## Prerequisites
- All changes committed and pushed to `main`
- Local build passes (`npm run build`)
- Coolify application `sisu-frontend` connected to the GitHub repository
- Production domain configured as `xtrisisu.com`

## Execution Steps
1. Commit changes:
   ```bash
   git add -A && git commit -m "description"
   ```

2. Push to GitHub:
   ```bash
   git push origin main
   ```

3. Trigger the `sisu-frontend` deployment in Coolify from the `main` branch
4. Wait for the deployment to finish and confirm the running image uses the expected commit

## Verification
- Check Coolify for the deployment status and logs
- Test `https://xtrisisu.com` after the deployment completes
- Verify critical flows: course selection, score display, chart rendering

## Rollback
If issues found in production:
```bash
# Revert to previous commit
git revert HEAD
git push origin main
```

## Edge Cases
- **Build fails**: Check Coolify build logs, usually TypeScript or dependency issues
- **API 500 errors**: Check Supabase connection and environment variables in Coolify
