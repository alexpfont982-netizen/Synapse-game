import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../../supabaseClient'

const AVATARS = [
  { id: 'avatar_scientist_01', label: 'Scientist',  src: '/assets/avatars/avatar_scientist_01.png' },
  { id: 'avatar_scientist_02', label: 'Scientist F', src: '/assets/avatars/avatar_scientist_02.png' },
  { id: 'avatar_hacker_01',    label: 'Hacker',     src: '/assets/avatars/avatar_hacker_01.png' },
  { id: 'avatar_engineer_01',  label: 'Engineer',   src: '/assets/avatars/avatar_engineer_01.png' },
  { id: 'avatar_ai_01',        label: 'AI Robot',   src: '/assets/avatars/avatar_ai_01.png' },
]

const COUNTRIES = [
  'Argentina','Bolivia','Brasil','Chile','Colombia','Costa Rica','Cuba','Ecuador',
  'El Salvador','España','Guatemala','Honduras','México','Nicaragua','Panamá',
  'Paraguay','Perú','República Dominicana','Uruguay','Venezuela',
  'United States','Canada','United Kingdom','Germany','France','Japan','Other',
]

interface ProfileData {
  username: string
  avatar_url: string | null
  country: string | null
  age: number | null
  gender: string | null
}

interface ProfilePageProps {
  userId: string
  onBack: () => void
}

export default function ProfilePage({ userId, onBack }: ProfilePageProps) {
  const [profile, setProfile]       = useState<ProfileData>({ username: '', avatar_url: null, country: null, age: null, gender: null })
  const [original, setOriginal]     = useState<ProfileData>({ username: '', avatar_url: null, country: null, age: null, gender: null })
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [feedback, setFeedback]     = useState<{ type: 'success' | 'error'; msg: string } | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile]   = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('user_profiles')
      .select('username, avatar_url, country, age, gender')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const p: ProfileData = {
            username:   data.username ?? '',
            avatar_url: data.avatar_url ?? null,
            country:    data.country ?? null,
            age:        data.age ?? null,
            gender:     data.gender ?? null,
          }
          setProfile(p)
          setOriginal(p)
        }
        setLoading(false)
      })
  }, [userId])

  const isDirty = JSON.stringify(profile) !== JSON.stringify(original) || photoFile !== null

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    // Clear selected avatar since we have a custom photo
    setProfile(p => ({ ...p, avatar_url: null }))
  }

  const handleSave = async () => {
    if (!profile.username.trim()) {
      setFeedback({ type: 'error', msg: 'Username cannot be empty' })
      return
    }
    setSaving(true)
    setFeedback(null)

    let finalAvatarUrl = profile.avatar_url

    // Upload custom photo if selected
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const path = `avatars/${userId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(path, photoFile, { upsert: true })
      if (uploadError) {
        setFeedback({ type: 'error', msg: 'Error uploading photo. Try again.' })
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('user-avatars').getPublicUrl(path)
      finalAvatarUrl = urlData.publicUrl
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        username:   profile.username.trim(),
        avatar_url: finalAvatarUrl,
        country:    profile.country,
        age:        profile.age,
        gender:     profile.gender,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setSaving(false)
    if (error) {
      setFeedback({ type: 'error', msg: 'Error saving. Try again.' })
    } else {
      const updated = { ...profile, avatar_url: finalAvatarUrl }
      setOriginal(updated)
      setProfile(updated)
      setPhotoFile(null)
      setPhotoPreview(null)
      setFeedback({ type: 'success', msg: 'Profile updated successfully!' })
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  // Current avatar to display
  const displayAvatar = photoPreview
    ?? (profile.avatar_url?.startsWith('http') ? profile.avatar_url : null)
    ?? (profile.avatar_url ? AVATARS.find(a => a.src === profile.avatar_url)?.src : null)
    ?? AVATARS[0].src

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-[12px] uppercase tracking-widest text-slate-500 animate-pulse">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 animate-in fade-in duration-300">

      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-[10px] border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-400 transition hover:text-slate-100"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-[18px] font-bold text-slate-100 tracking-wide">Agent Profile</h1>
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Synapse World Grid</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">

        {/* Avatar section */}
        <div className="rounded-2xl border border-white/[0.07] bg-slate-900/60 p-6">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Avatar</p>

          {/* Current avatar preview */}
          <div className="mb-5 flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-indigo-400/40 bg-slate-800 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <img src={displayAvatar} alt="avatar" className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-200">{profile.username || '—'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Current avatar</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 rounded-[8px] border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
              >
                Upload photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          {/* Avatar grid */}
          <p className="mb-3 text-[10px] text-slate-500 uppercase tracking-widest">Or choose an avatar</p>
          <div className="grid grid-cols-5 gap-3">
            {AVATARS.map((av) => {
              const isSelected = !photoPreview && profile.avatar_url === av.src
              return (
                <button
                  key={av.id}
                  onClick={() => { setProfile(p => ({ ...p, avatar_url: av.src })); setPhotoPreview(null); setPhotoFile(null) }}
                  className={`group flex flex-col items-center gap-1.5 rounded-[12px] border p-2 transition ${
                    isSelected
                      ? 'border-indigo-400/60 bg-indigo-500/10 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-indigo-400/30 hover:bg-indigo-500/5'
                  }`}
                >
                  <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10">
                    <img src={av.src} alt={av.label} className="h-full w-full object-cover" />
                  </div>
                  <span className="text-[9px] text-slate-400 group-hover:text-slate-200 transition">{av.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Info section */}
        <div className="rounded-2xl border border-white/[0.07] bg-slate-900/60 p-6">
          <p className="mb-5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Agent Info</p>

          <div className="flex flex-col gap-4">

            {/* Username */}
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Username</label>
              <input
                type="text"
                value={profile.username}
                onChange={e => setProfile(p => ({ ...p, username: e.target.value }))}
                maxLength={32}
                placeholder="CyberMiner_99"
                className="w-full rounded-[10px] border border-white/[0.08] bg-slate-800/60 px-3 py-2.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/20"
              />
            </div>

            {/* Country */}
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Country</label>
              <select
                value={profile.country ?? ''}
                onChange={e => setProfile(p => ({ ...p, country: e.target.value || null }))}
                className="w-full rounded-[10px] border border-white/[0.08] bg-slate-800/60 px-3 py-2.5 text-[13px] text-slate-100 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/20"
              >
                <option value="">Select country...</option>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Age + Gender row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Age</label>
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={profile.age ?? ''}
                  onChange={e => setProfile(p => ({ ...p, age: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="—"
                  className="w-full rounded-[10px] border border-white/[0.08] bg-slate-800/60 px-3 py-2.5 text-[13px] text-slate-100 placeholder-slate-600 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] uppercase tracking-[0.18em] text-slate-500">Gender</label>
                <select
                  value={profile.gender ?? ''}
                  onChange={e => setProfile(p => ({ ...p, gender: e.target.value || null }))}
                  className="w-full rounded-[10px] border border-white/[0.08] bg-slate-800/60 px-3 py-2.5 text-[13px] text-slate-100 outline-none transition focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/20"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`rounded-[10px] border px-4 py-2.5 text-[12px] font-semibold ${
            feedback.type === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
              : 'border-red-400/30 bg-red-400/10 text-red-300'
          }`}>
            {feedback.msg}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={`w-full rounded-[12px] py-3 text-[13px] font-black uppercase tracking-widest transition ${
            isDirty && !saving
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

      </div>
    </div>
  )
}