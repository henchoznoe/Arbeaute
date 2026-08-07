interface JsonLdProps {
  readonly data:
    | Readonly<Record<string, unknown>>
    | ReadonlyArray<Readonly<Record<string, unknown>>>
}

export const JsonLd = ({ data }: Readonly<JsonLdProps>) => {
  const serializedData = JSON.stringify(data).replace(/</g, '\\u003c')

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD sérialisé et échappé ci-dessus.
      dangerouslySetInnerHTML={{ __html: serializedData }}
    />
  )
}
