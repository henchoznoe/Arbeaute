const DEFAULT_COMMIT_SHA = 'local-dev'
const SHA_DISPLAY_LENGTH = 7

export const getCommitHash = (): string => {
  const fullCommitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  // Truncate to 7 characters for standard Git short SHA format
  return fullCommitHash
    ? fullCommitHash.slice(0, SHA_DISPLAY_LENGTH)
    : DEFAULT_COMMIT_SHA
}
