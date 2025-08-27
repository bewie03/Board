// DEPRECATED: This duplicate admin API has been removed to prevent conflicts
// The main admin API is located at /api/admin/index.ts
// This file was causing routing conflicts and had incomplete verification logic

export default async function handler(req: any, res: any) {
  res.status(410).json({ 
    error: 'This admin API endpoint has been deprecated. Use /api/admin instead.',
    redirect: '/api/admin'
  });
}
