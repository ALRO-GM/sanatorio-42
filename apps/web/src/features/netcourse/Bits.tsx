import { useState } from 'react'

import { bitsOf, formatIp, fromBits, maskOf, subnetOf } from '@sanatorio/netsim'

import { useI18n } from '../../shared/i18n'

const OCTETS = [0, 1, 2, 3] as const
const PLACES = [0, 1, 2, 3, 4, 5, 6, 7] as const

/** Los 32 bits en cuatro octetos, con la parte de red y la de máquina de distinto color. */
function Board({
  bits,
  prefix,
  label,
  onToggle,
}: {
  bits: string
  prefix: number
  label: string
  /** Si se pueden tocar los bits, qué pasa al tocar uno. */
  onToggle?: (index: number) => void
}) {
  const { t } = useI18n()

  return (
    <div className="net-bits-board" role="group" aria-label={label}>
      {OCTETS.map((octet) => (
        <div key={octet} className="net-octet">
          <div className="net-octet-bits">
            {PLACES.map((place) => {
              const index = octet * 8 + place
              const bit = bits.charAt(index)
              const part = index < prefix ? 'net' : 'host'
              const name = `${t('net.bits.bit', { n: index + 1, value: bit })} (${t(`net.bits.${part}`)})`
              // La raya entre la red y la máquina va delante del primer bit de máquina.
              const className = `net-bit ${part} ${index === prefix ? 'cut' : ''} ${bit === '1' ? 'on' : ''}`

              return onToggle === undefined ? (
                <span key={place} className={className} title={name}>
                  {bit}
                </span>
              ) : (
                <button
                  key={place}
                  type="button"
                  className={className}
                  aria-label={name}
                  aria-pressed={bit === '1'}
                  onClick={() => {
                    onToggle(index)
                  }}
                >
                  {bit}
                </button>
              )
            })}
          </div>
          <span className="net-octet-value">
            {Number.parseInt(bits.slice(octet * 8, octet * 8 + 8), 2)}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * La ayuda de las cuentas: los 32 bits de una dirección, que se pueden tocar.
 * Cada bit cambia al pulsarlo y debajo se ve el número de su octeto; dos
 * botones ponen la parte de máquina toda a 0 o toda a 1, que es justo lo que
 * son la dirección de red y la de broadcast. No da la respuesta escrita: deja
 * verla salir de los bits.
 */
export function AddressBits({ ip, prefix }: { ip: number; prefix: number }) {
  const { t } = useI18n()
  const original = bitsOf(ip)
  const [bits, setBits] = useState(original)
  const host = (bit: '0' | '1') => bits.slice(0, prefix) + bit.repeat(32 - prefix)

  return (
    <div className="net-bits">
      <Board
        bits={bits}
        prefix={prefix}
        label={t('net.bits.title')}
        onToggle={(index) => {
          setBits(
            bits.slice(0, index) + (bits.charAt(index) === '1' ? '0' : '1') + bits.slice(index + 1),
          )
        }}
      />
      <p className="net-bits-now" aria-live="polite">
        <span className="net-bits-key net">{t('net.bits.net')}</span>
        <span className="net-bits-key host">{t('net.bits.host')}</span>
        <output>{t('net.bits.now', { ip: formatIp(fromBits(bits)) })}</output>
      </p>
      <div className="net-bits-actions">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setBits(host('0'))
          }}
        >
          {t('net.bits.host0')}
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setBits(host('1'))
          }}
        >
          {t('net.bits.host1')}
        </button>
        <button
          type="button"
          className="ghost"
          disabled={bits === original}
          onClick={() => {
            setBits(original)
          }}
        >
          ↺ {t('net.bits.reset')}
        </button>
      </div>
    </div>
  )
}

/**
 * La ayuda de las máscaras: se mueve cuántos bits son de red y se ve la
 * máscara en sus dos formas y cuántas máquinas caben.
 */
export function MaskBits({ start }: { start: number }) {
  const { t } = useI18n()
  const [prefix, setPrefix] = useState(start)
  const subnet = subnetOf(0, prefix)

  return (
    <div className="net-bits">
      <Board
        bits={'1'.repeat(prefix).padEnd(32, '0')}
        prefix={prefix}
        label={t('net.bits.title')}
      />
      <label className="net-bits-slider">
        <span>{t('net.bits.prefix')}</span>
        <input
          type="range"
          min={8}
          max={30}
          value={prefix}
          onChange={(event) => {
            setPrefix(Number(event.target.value))
          }}
        />
      </label>
      <p className="net-bits-now" aria-live="polite">
        <output>
          /{prefix} = {maskOf(prefix)} · {t('net.bits.fit', { n: subnet.hosts })}
        </output>
      </p>
    </div>
  )
}
