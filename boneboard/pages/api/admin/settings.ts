// DEPRECATED: This duplicate admin settings API has been removed to prevent conflicts
// The main admin API is located at /api/admin/index.ts and handles settings via ?type=settings
// This file was causing routing conflicts and had hardcoded database credentials

export default async function handler(req: any, res: any) {
  res.status(410).json({ 
    error: 'This admin settings endpoint has been deprecated. Use /api/admin?type=settings instead.',
    redirect: '/api/admin?type=settings'
  });
}
