import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ۱. بررسی هویت کاربر (فقط کاربران لاگین شده)
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Unauthorized' });

  const { type } = req.body;

  try {
    // الف) جایزه روزانه (۱۰ توکن)
    if (type === 'daily') {
      const today = new Date().toISOString().split('T')[0];

      // چک کردن تاریخ آخرین جایزه از دیتابیس
      const { data: wallet } = await supabase
        .from('wallets')
        .select('last_claim_date')
        .eq('user_id', user.id)
        .single();

      if (wallet?.last_claim_date === today) {
        return res.status(400).json({ error: 'Already claimed today' });
      }

      // اضافه کردن توکن با استفاده از تابع امنی که در دیتابیس ساختیم
      const { data: newBalance, error: rpcError } = await supabase.rpc('add_tokens', {
        user_id_input: user.id,
        amount_input: 10
      });

      if (rpcError) throw rpcError;

      // بروزرسانی تاریخ آخرین دریافت جایزه
      await supabase
        .from('wallets')
        .update({ last_claim_date: today })
        .eq('user_id', user.id);

      return res.json({ success: true, balance: newBalance });
    }

    // ب) جایزه تماشای تبلیغ (۵ توکن)
    if (type === 'ad') {
      const { data: newBalance } = await supabase.rpc('add_tokens', {
        user_id_input: user.id,
        amount_input: 5
      });
      return res.json({ success: true, balance: newBalance });
    }

    // ج) جایزه اشتراک‌گذاری (۲ توکن)
    if (type === 'share') {
      const { data: newBalance } = await supabase.rpc('add_tokens', {
        user_id_input: user.id,
        amount_input: 2
      });
      return res.json({ success: true, balance: newBalance });
    }

    return res.status(400).json({ error: 'Invalid type' });

  } catch (e) {
    return res.status(500).json({ error: 'Server error' });
  }
}
