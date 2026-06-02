import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from './supabaseClient';
import DashboardPage from './features/dashboard/DashboardPage';

interface UserSession {
  id: string;
  email?: string;
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        const currentSession = data?.session;
        if (currentSession?.user) {
          setSession({
            id: currentSession.user.id,
            email: currentSession.user.email,
          });
        }
        setIsInitializing(false);
      })
      .catch((err) => {
        console.error('Error retrieving session:', err);
        setIsInitializing(false);
      });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (currentSession?.user) {
          setSession({
            id: currentSession.user.id,
            email: currentSession.user.email,
          });
        } else {
          setSession(null);
        }
        setIsInitializing(false);
      },
    );

    const subscription = data?.subscription;

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleAuth = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!username.trim()) {
          throw new Error('Username is required for profile initialization.');
        }

        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError) throw signUpError;

        if (authData?.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{ id: authData.user.id, username: username.trim() }]);

          if (profileError) throw profileError;

          const { error: labError } = await supabase.from('ia_labs').insert([
            {
              user_id: authData.user.id,
              room_name: 'Garage Lab',
              infrastructure_level: 1,
              computing_power_tps: 0.08,
              available_energy: 67,
            },
          ]);

          if (labError) throw labError;
        }
      } else {
        const { error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An error occurred during authentication.';
      console.error('Neural Authentication Failed:', errorMessage);
      setAuthError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setSession(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#030712] p-6 font-sans text-slate-100 selection:bg-indigo-500/30">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-500/20 border-t-indigo-500" />
          <div className="text-center">
            <h2
              className="animate-pulse text-sm font-bold uppercase tracking-widest text-indigo-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Synchronizing Neural Link
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
              Establishing connection to secure cluster...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (session) {
    return <DashboardPage session={session} onSignOut={handleSignOut} />;
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#030712] p-4 font-sans text-slate-100 selection:bg-indigo-500/30"
      style={{
        backgroundImage:
          'radial-gradient(circle at center, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
      }}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/80 p-8 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:20px_20px]" />

        <div className="relative z-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-3.5 shadow-lg shadow-indigo-500/20">
              <svg
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h1
              className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-2xl font-black uppercase tracking-wider text-transparent"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Synapse Game
            </h1>
            <p
              className="mt-1 text-[10px] font-bold uppercase tracking-widest text-indigo-400"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              Neural Mining Network v2.0
            </p>
          </div>

          {authError && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
              <span className="mt-0.5 shrink-0 font-bold">[!]</span>
              <p>{authError}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., CyberMiner_99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-xs text-white transition duration-150 hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Neural Access Email
              </label>
              <input
                type="email"
                required
                placeholder="name@provider.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-xs text-white transition duration-150 hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Access Password
              </label>
              <input
                type="password"
                required
                placeholder="........"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-xs text-white transition duration-150 hover:border-indigo-500/50 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-indigo-500/20 transition duration-150 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-800 disabled:to-purple-800"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {loading
                ? 'Processing Protocol...'
                : isSignUp
                  ? 'Initialize Profile'
                  : 'Access Network'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-xs font-semibold text-slate-400 transition duration-150 hover:text-indigo-400"
            >
              {isSignUp
                ? 'Already initialized? Access neural terminal'
                : 'Request new terminal access node'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
