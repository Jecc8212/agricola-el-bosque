/**
 * Qué versión se está viendo y cuándo se compiló.
 *
 * Existe para responder una pregunta concreta: «¿subió o no subió?». Por eso
 * la hora es la de compilación y no la del reloj del navegador — una hora que
 * siempre dice «ahora» no prueba nada. Si después de publicar este pie sigue
 * mostrando lo mismo, el despliegue no llegó.
 *
 * Va en el login también, a propósito: así se puede comprobar sin entrar.
 */
export function PieVersion() {
  return (
    <footer className="px-4 py-3 text-center sm:px-6">
      <p className="text-2xs text-ink-disabled">
        <span className="mono">v{__VERSION__}</span>
        <span aria-hidden="true"> · </span>
        <span>compilado el {__COMPILADO__}</span>
        {__COMMIT__ && (
          <>
            <span aria-hidden="true"> · </span>
            <span className="mono">{__COMMIT__}</span>
          </>
        )}
      </p>
    </footer>
  )
}
