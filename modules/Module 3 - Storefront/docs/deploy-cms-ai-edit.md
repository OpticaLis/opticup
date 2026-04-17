# Deploy cms-ai-edit Edge Function

## Step 1: Set API Key (one time only, skip if already done)
Open PowerShell:
```
cd C:\Users\User\opticup
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

## Step 2: Deploy
```
cd C:\Users\User\opticup
supabase functions deploy cms-ai-edit --no-verify-jwt
```

## Step 3: Test
```powershell
curl -X POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/cms-ai-edit `
  -H "Content-Type: application/json" `
  -d '{"blocks":[{"id":"text-1","type":"text","data":{"title":"test","body":"hello","alignment":"right"}}],"prompt":"change the title to shalom olam","mode":"page"}'
```
Should return updated blocks with title changed.
