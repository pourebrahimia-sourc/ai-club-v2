import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { profile } = req.body || {};

    if (!profile) {
      return res.status(400).json({ error: 'Missing profile' });
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          user_id: user.id,
          age: profile.age || null,
          ethnicity: profile.ethnicity || null,
          body: profile.body || null,
          body_details: profile.bodyDetails || null,
          hair: profile.hair || null,
          appearance_details: profile.appearanceDetails || null,
          personality: profile.personality || null
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
