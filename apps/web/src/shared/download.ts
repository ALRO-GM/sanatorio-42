/**
 * Guarda en el equipo un fichero que ya está en memoria (lo que devuelve una
 * petición `POST`, que un enlace no puede hacer).
 */
export function saveFile(data: Blob, fileName: string): void {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  link.click()
  // El navegador ya ha empezado la descarga: la dirección no hace falta más.
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}
