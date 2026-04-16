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

  const { type, email, password, name, profile, returnTo } = req.body || {};

  if ((type === 'signup' || type === 'login') && (!email || !password)) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  if (type === 'signup') {
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const trimmedName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: trimmedName }
      }
    });

    if (error) return res.status(400).json({ error: error.message });
    if (!data?.user?.id) return res.status(400).json({ error: 'Signup failed' });

    const { data: existingWallet } = await supabaseAdmin
      .from('wallets')
      .select('id')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!existingWallet) {
      await supabaseAdmin.from('wallets').insert([
        { user_id: data.user.id, balance: 10 }
      ]);
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!existingUser) {
      await supabaseAdmin.from('users').insert([
        {
          id: data.user.id,
          name: trimmedName
        }
      ]);
    }
if (data.session && profile && data.user?.id) {
  await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: data.user.id,
      age: profile.age || null,
      ethnicity: profile.ethnicity || null,
      body: profile.body || null,
      body_details: profile.bodyDetails || null,
      hair: profile.hair || null,
      appearance_details: profile.appearanceDetails || null,
      personality: profile.personality || null
    });
}
    return res.json({
      user: data.user,
      session: data.session || null
    });
  }

  if (type === 'login') {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

if (error) return res.status(400).json({ error: error.message });

if (data.session && profile && data.user?.id) {
  await supabaseAdmin
    .from('user_profiles')
    .upsert({
      user_id: data.user.id,
      age: profile.age || null,
      ethnicity: profile.ethnicity || null,
      body: profile.body || null,
      body_details: profile.bodyDetails || null,
      hair: profile.hair || null,
      appearance_details: profile.appearanceDetails || null,
      personality: profile.personality || null
    });
}
    return res.json({
      user: data.user,
      session: data.session || null
    });
  }

  if (type === 'update-name') {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trimmedName = (name || '').trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const token = authHeader.replace('Bearer ', '');

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .upsert(
        {
          id: user.id,
          name: trimmedName
        },
        { onConflict: 'id' }
      );

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.json({ success: true });
  }

  if (type === 'forgot') {
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://ai-club-one-iota.vercel.app/reset-password.html'
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ success: true });
  }

  if (type === 'update-password') {
    const { access_token, refresh_token, password: newPassword } = req.body || {};

    if (!access_token || !refresh_token || !newPassword) {
      return res.status(400).json({ error: 'Missing token or password' });
    }

    const tempSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const {
      data: { session },
      error: sessionError
    } = await tempSupabase.auth.setSession({
      access_token,
      refresh_token
    });

    if (sessionError || !session) {
      return res.status(400).json({ error: 'Invalid session' });
    }

    const { error } = await tempSupabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ success: true });
  }

  if (type === 'google') {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `https://ai-club-one-iota.vercel.app/${returnTo || 'index.html'}`
      }
    });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ url: data.url });
  }

  return res.status(400).json({ error: 'Invalid type' });
}
