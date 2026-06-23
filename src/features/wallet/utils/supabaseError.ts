interface SupabaseErrorLike {
  message?: string
  details?: string | null
  hint?: string | null
  code?: string | null
}

function getSupabaseErrorLike(error: unknown): SupabaseErrorLike | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  return error as SupabaseErrorLike
}

export function getSupabaseErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  const supabaseError = getSupabaseErrorLike(error)
  if (supabaseError?.message?.trim()) {
    return supabaseError.message
  }

  return fallback
}

export function logSupabaseError(context: string, error: unknown) {
  const supabaseError = getSupabaseErrorLike(error)

  console.error(context, {
    message:
      supabaseError?.message ??
      (error instanceof Error ? error.message : 'Unknown error'),
    details: supabaseError?.details ?? null,
    hint: supabaseError?.hint ?? null,
    code: supabaseError?.code ?? null,
    raw: error,
  })
}
