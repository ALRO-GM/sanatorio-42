import { useState } from 'react'

import { photoUrl } from '../../shared/api'
import { useI18n } from '../../shared/i18n'
import { Avatar } from '../../shared/ui/Avatar'
import { Modal } from '../../shared/ui/Modal'

type RecordPhotoProps = {
  login: string
  image: string | null
}

/**
 * La foto de la cabecera del perfil, que se puede pulsar para verla en grande
 * (#105 del buzón): a 72 px apenas se reconoce a nadie. La ventana se cierra
 * como todas (botón, Escape o el fondo). Sin foto no hay nada que ampliar: la
 * inicial se queda como estaba, sin botón.
 */
export function RecordPhoto({ login, image }: RecordPhotoProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const src = photoUrl(login, image)

  if (src === null) return <Avatar login={login} image={image} size={72} />

  return (
    <>
      <button
        type="button"
        className="record-photo"
        aria-label={t('record.photo.open', { login })}
        title={t('record.photo.open', { login })}
        onClick={() => {
          setOpen(true)
        }}
      >
        <Avatar login={login} image={image} size={72} />
      </button>
      {open && (
        <Modal
          label={t('record.photo.title', { login })}
          title={t('record.photo.title', { login })}
          className="record-photo-dialog"
          portal
          onClose={() => {
            setOpen(false)
          }}
        >
          <img className="record-photo-big" src={src} alt={login} />
        </Modal>
      )}
    </>
  )
}
