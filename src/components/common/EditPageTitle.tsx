// Titre des pages de modification d'un client, d'un membre ou d'une prestation : l'action et le type d'élément en
// petit au-dessus, le nom en gras dessous. Sur deux lignes, rien n'est coupé à côté de la flèche et des icônes.
export function EditPageTitle({ kind, name }: { kind: string; name: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{kind}</p>
      <h1 className="truncate text-lg font-bold leading-tight">{name}</h1>
    </div>
  )
}
