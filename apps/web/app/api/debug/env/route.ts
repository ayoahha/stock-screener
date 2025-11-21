/**
 * Debug endpoint to verify environment variables
 * DELETE THIS FILE BEFORE DEPLOYING TO PRODUCTION
 */

export async function GET() {
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `✅ Set (${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 20)}...)`
      : '❌ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `✅ Set (${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...)`
      : '❌ Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? `✅ Set (${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...)`
      : '❌ Missing',
    FMP_API_KEY: process.env.FMP_API_KEY
      ? `✅ Set (${process.env.FMP_API_KEY.substring(0, 10)}...)`
      : '⚠️  Optional - Not set',
  };

  return Response.json({
    message: 'Environment Variables Check',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    variables: envCheck,
  });
}
