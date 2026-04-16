import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { amount } = req.body || {};
    const deductAmount = Number(amount);

    if (!deductAmount || deductAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const { data: newBalance, error: deductError } = await supabase.rpc('deduct_tokens', {
      user_id_input: userData.user.id,
      amount_input: deductAmount
    });

    if (deductError) {
      return res.status(400).json({ error: deductError.message });
    }

    if (newBalance === null) {
      return res.status(400).json({ error: 'Not enough tokens' });
    }

    return res.status(200).json({
      balance: newBalance
    });

  } catch (e) {
    return res.status(500).json({
      error: String(e)
    });
  }
}
