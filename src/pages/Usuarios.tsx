import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Field } from '@/components/ui/Field'
import { Pagina } from '@/components/Pagina'
import { Modal, ModalConfirmar } from '@/components/ui/Modal'
import { PERMISOS, ROLES, ROL_NOMBRE, SECCIONES, nombreRol, seccionesDe, useAuth } from '@/lib/auth'
import type { Rol, Usuario } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { aplanar, useMaestros } from '@/lib/maestros'

const control =
  'h-8 w-full rounded-sm border border-line-strong bg-surface px-2 text-base text-ink transition-colors duration-150 ease-out'

/** Alta y edición comparten formulario: cambian los campos, no la maqueta. */
function FormularioUsuario({
  usuario, onCerrar, onGuardar,
}: {
  usuario?: Usuario
  onCerrar: () => void
  onGuardar: (
    datos: { usuario: string; nombre: string; rol: Rol; secciones: string[]; campoId?: string },
    clave: string,
  ) => Promise<string | null>
}) {
  const { maestros } = useMaestros()
  const esNuevo = !usuario
  const [nombreUsuario, setNombreUsuario] = useState(usuario?.usuario ?? '')
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? 'JEFE')
  const [secciones, setSecciones] = useState<string[]>(
    usuario ? seccionesDe(usuario) : PERMISOS.JEFE,
  )
  const [campoId, setCampoId] = useState(usuario?.campoId ?? '')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const nombreCampo = aplanar(maestros.campos).find((f) => f.nodo.id === campoId)?.nodo.nombre

  /** Al cambiar el rol se proponen sus accesos; después se ajustan a mano. */
  function cambiarRol(nuevo: Rol) {
    setRol(nuevo)
    setSecciones(PERMISOS[nuevo])
  }

  const alternar = (clave: string) =>
    setSecciones((s) => (s.includes(clave) ? s.filter((x) => x !== clave) : [...s, clave]))

  async function guardar() {
    if (!nombre.trim()) return setError('Falta el nombre de la persona.')
    if (!confirmando) return setConfirmando(true)
    const err = await onGuardar(
      { usuario: nombreUsuario, nombre: nombre.trim(), rol, secciones, campoId: campoId || undefined },
      clave,
    )
    // Si el alta falla, se vuelve al formulario con el motivo a la vista.
    if (err) {
      setConfirmando(false)
      setError(err)
    }
  }

  if (confirmando) {
    const nombresAccesos = SECCIONES.filter((s) => secciones.includes(s.clave)).map((s) => s.nombre)
    return (
      <Modal
        titulo={esNuevo ? '¿Crear este usuario?' : '¿Guardar los cambios?'}
        descripcion={
          esNuevo
            ? `Se creará la cuenta «${nombreUsuario}» para ${nombre.trim()}, con clave provisoria.`
            : `Se guardarán los cambios de ${nombre.trim()}.`
        }
        onCerrar={() => setConfirmando(false)}
        pie={
          <>
            <Button onClick={() => setConfirmando(false)}>Volver</Button>
            <Button variant="primary" onClick={guardar}>{esNuevo ? 'Sí, crear' : 'Sí, guardar'}</Button>
          </>
        }
      >
        <p className="text-base">
          <span className="text-ink-faint">Podrá ver: </span>
          {nombresAccesos.length ? nombresAccesos.join(', ') : 'ninguna sección'}
        </p>
        <p className="mt-1.5 text-base">
          <span className="text-ink-faint">Campo: </span>
          {nombreCampo ?? 'todos (sin acotar)'}
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      titulo={esNuevo ? 'Nuevo usuario' : `Editar ${usuario.nombre}`}
      onCerrar={onCerrar}
      ancho="max-w-lg"
      pie={
        <>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button variant="primary" onClick={guardar}>{esNuevo ? 'Crear' : 'Guardar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {esNuevo && (
          <>
            <Field
              label="Usuario" placeholder="nombre.apellido" autoFocus
              hint="3 a 20 caracteres: letras, números, punto, guion o guion bajo."
              value={nombreUsuario}
              onChange={(e) => { setNombreUsuario(e.target.value); setError('') }}
            />
            <Field
              label="Contraseña provisoria" type="password"
              hint="La persona deberá cambiarla la primera vez que entre."
              value={clave} onChange={(e) => { setClave(e.target.value); setError('') }}
            />
          </>
        )}

        <Field label="Nombre de la persona" value={nombre}
          onChange={(e) => { setNombre(e.target.value); setError('') }} />

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Rol</span>
          <select className={cn(control, 'cursor-pointer')} value={rol}
            onChange={(e) => cambiarRol(e.target.value as Rol)}>
            {ROLES.map((r) => <option key={r} value={r}>{ROL_NOMBRE[r]}</option>)}
          </select>
          <p className="text-2xs text-ink-faint">
            El rol propone accesos; abajo se ajustan uno por uno.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Campo que administra</span>
          <select className={cn(control, 'cursor-pointer')} value={campoId}
            onChange={(e) => { setCampoId(e.target.value); setError('') }}>
            <option value="">Todos los campos (sin acotar)</option>
            {aplanar(maestros.campos).map(({ nodo, nivel }) => (
              <option key={nodo.id} value={nodo.id}>
                {`${'— '.repeat(nivel)}${nodo.nombre}`}
              </option>
            ))}
          </select>
          <p className="text-2xs text-ink-faint">
            Con un campo elegido, la persona sólo verá ese campo y sólo podrá pasar
            lista de sus trabajadores. El filtro le queda fijo.
          </p>
        </div>

        <fieldset className="rounded-md border border-line p-3">
          <legend className="px-1 text-2xs font-medium tracking-wide text-ink-faint">
            QUÉ PUEDE VER
          </legend>
          <div className="flex flex-col gap-2">
            {SECCIONES.map((s) => (
              <label key={s.clave} className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox" className="mt-0.5 cursor-pointer"
                  checked={secciones.includes(s.clave)}
                  onChange={() => alternar(s.clave)}
                />
                <span className="min-w-0">
                  <span className="block text-base">{s.nombre}</span>
                  <span className="block text-2xs text-ink-faint">{s.detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

function ModalClave({ usuario, onCerrar, onGuardar }: {
  usuario: Usuario
  onCerrar: () => void
  onGuardar: (clave: string) => Promise<string | null>
}) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [confirmando, setConfirmando] = useState(false)

  async function aplicar() {
    if (!clave) return setError('Falta la nueva contraseña.')
    if (!confirmando) return setConfirmando(true)
    const err = await onGuardar(clave)
    if (err) {
      setConfirmando(false)
      setError(err)
    }
  }

  if (confirmando) {
    return (
      <Modal
        titulo="¿Restablecer la contraseña?"
        descripcion={`${usuario.nombre} dejará de poder entrar con su clave actual y deberá cambiar la nueva al entrar.`}
        onCerrar={() => setConfirmando(false)}
        pie={
          <>
            <Button onClick={() => setConfirmando(false)}>Volver</Button>
            <Button variant="primary" onClick={aplicar}>Sí, restablecer</Button>
          </>
        }
      />
    )
  }

  return (
    <Modal
      titulo={`Restablecer la contraseña de ${usuario.nombre}`}
      descripcion="La nueva clave nace provisoria: la persona deberá cambiarla al entrar."
      onCerrar={onCerrar}
      pie={
        <>
          <Button onClick={onCerrar}>Cancelar</Button>
          <Button variant="primary" onClick={aplicar}>Restablecer</Button>
        </>
      }
    >
      <Field label="Nueva contraseña provisoria" type="password" autoFocus
        hint="Al menos 8 caracteres." value={clave}
        onChange={(e) => { setClave(e.target.value); setError('') }} />
      {error && (
        <p role="alert" className="mt-2 rounded-sm bg-danger-tint px-2 py-1.5 text-sm text-danger-text">
          {error}
        </p>
      )}
    </Modal>
  )
}

export default function Usuarios() {
  const {
    sesion, usuarios, crearUsuario, actualizarUsuario, eliminarUsuario, restablecerClave,
  } = useAuth()
  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [cambiandoClave, setCambiandoClave] = useState<Usuario | null>(null)
  const [borrando, setBorrando] = useState<Usuario | null>(null)
  const [avisoBorrado, setAvisoBorrado] = useState('')

  return (
    <Pagina
      titulo="Usuarios y accesos"
      descripcion="Quién entra al sistema y qué módulos ve cada uno. Las contraseñas se guardan cifradas; mientras no exista servidor, esto organiza el trabajo pero no protege los datos del equipo."
      acciones={<Button variant="primary" onClick={() => setCreando(true)}>Nuevo usuario</Button>}
    >
      {avisoBorrado && (
        <p role="alert" className="mb-4 rounded-md bg-danger-tint px-3 py-2 text-sm text-danger-text">
          {avisoBorrado}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-sunken text-2xs tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">USUARIO</th>
              <th className="px-3 py-2 text-left font-medium">NOMBRE</th>
              <th className="px-3 py-2 text-left font-medium">ROL</th>
              <th className="px-3 py-2 text-left font-medium">ACCESOS</th>
              <th className="w-64 px-3 py-2 text-right font-medium">ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.usuario} className="border-b border-line last:border-0">
                <td className="mono whitespace-nowrap px-3 py-1.5">
                  {u.usuario}
                  {sesion?.usuario === u.usuario && (
                    <span className="ml-2 text-2xs text-ink-faint">(tú)</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 font-medium">{u.nombre}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-ink-faint">{nombreRol(u.rol)}</td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {seccionesDe(u).map((s) => {
                      // Un acceso a una sección que ya no existe se marca en vez
                      // de disimularse: así quien administra sabe qué recolocar.
                      const conocida = SECCIONES.find((x) => x.clave === s)
                      return (
                        <Chip key={s} tone={conocida ? 'primary' : 'warning'}>
                          {conocida ? conocida.nombre : `${s} (ya no existe)`}
                        </Chip>
                      )
                    })}
                    {u.provisoria && <Chip tone="warning">Clave provisoria</Chip>}
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" onClick={() => setEditando(u)}>Editar</Button>
                    <Button size="sm" onClick={() => setCambiandoClave(u)}>Clave</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setBorrando(u); setAvisoBorrado('') }}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && (
        <FormularioUsuario
          onCerrar={() => setCreando(false)}
          onGuardar={async (datos, clave) => {
            const r = await crearUsuario(datos, clave)
            if (!r.ok) return r.error ?? 'No se pudo crear'
            setCreando(false)
            return null
          }}
        />
      )}
      {editando && (
        <FormularioUsuario
          usuario={editando}
          onCerrar={() => setEditando(null)}
          onGuardar={async (datos) => {
            const r = actualizarUsuario(editando.usuario, {
              nombre: datos.nombre, rol: datos.rol, secciones: datos.secciones,
              campoId: datos.campoId,
            })
            if (!r.ok) return r.error ?? 'No se pudo guardar'
            setEditando(null)
            return null
          }}
        />
      )}
      {cambiandoClave && (
        <ModalClave
          usuario={cambiandoClave}
          onCerrar={() => setCambiandoClave(null)}
          onGuardar={async (clave) => {
            const r = await restablecerClave(cambiandoClave.usuario, clave)
            if (!r.ok) return r.error ?? 'No se pudo restablecer'
            setCambiandoClave(null)
            return null
          }}
        />
      )}
      {borrando && (
        <ModalConfirmar
          titulo={`Eliminar a ${borrando.nombre}`}
          descripcion="La cuenta deja de poder entrar. Los registros que haya creado se conservan."
          onCerrar={() => setBorrando(null)}
          onConfirmar={() => {
            const r = eliminarUsuario(borrando.usuario)
            if (!r.ok) setAvisoBorrado(r.error ?? 'No se pudo eliminar')
            setBorrando(null)
          }}
        />
      )}
    </Pagina>
  )
}
