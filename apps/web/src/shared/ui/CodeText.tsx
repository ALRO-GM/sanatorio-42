/**
 * Un texto con trozos de código entre comillas invertidas (`así`), como los
 * del banco de preguntas: el código se pinta como código y las comillas no se
 * ven. Sin comillas, es el texto tal cual.
 */
export function CodeText({ text }: { text: string }) {
  const parts = text.split('`')

  // Con un número impar de comillas no hay pares que casar: tal cual.
  if (parts.length % 2 === 0) return <>{text}</>

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code key={index}>{part}</code>
        ) : part === '' ? null : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  )
}
