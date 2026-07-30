export interface ResultCardData {
  bracketTitle: string
  winnerName: string
  optionCount: number
  decisionCount: number
}

export interface PreparedResultCard {
  blob: Blob
  fileName: string
}

export type ShareResult =
  | 'shared-link'
  | 'cancelled'
  | 'unavailable'
  | 'failed'

export type DownloadResult = 'downloaded' | 'failed'

export async function prepareResultCard(data: ResultCardData): Promise<PreparedResultCard> {
  const blob = await createResultImage(data)
  return {
    blob,
    fileName: `${slugify(data.bracketTitle)}-resultado.png`,
  }
}

export async function shareResultLink(data: ResultCardData, appUrl: string): Promise<ShareResult> {
  if (!canUseNativeShare()) {
    return 'unavailable'
  }

  const title = `Resultado de ${data.bracketTitle}: ${data.winnerName}`
  const text = buildResultShareText(data)
  const shareData: ShareData = { title, text, url: appUrl }

  try {
    await navigator.share(shareData)
    return 'shared-link'
  } catch (error) {
    if (isCancellation(error)) {
      return 'cancelled'
    }
    return 'failed'
  }
}

export function buildResultShareText(data: ResultCardData): string {
  return `${data.winnerName} ganó en «${data.bracketTitle}» con Duellum.`
}

export function buildWhatsAppShareUrl(data: ResultCardData, appUrl: string): string {
  const message = `${buildResultShareText(data)} ${appUrl}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function buildTelegramShareUrl(data: ResultCardData, appUrl: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(buildResultShareText(data))}`
}

export function downloadPreparedResultCard(prepared: PreparedResultCard): DownloadResult {
  try {
    downloadBlob(prepared.blob, prepared.fileName)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}

function createResultImage(data: ResultCardData): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const context = canvas.getContext('2d')
  if (context === null) {
    return Promise.reject(new Error('Canvas is unavailable.'))
  }

  const background = context.createLinearGradient(0, 0, 1200, 630)
  background.addColorStop(0, '#dfff58')
  background.addColorStop(1, '#a8ff65')
  context.fillStyle = background
  context.fillRect(0, 0, 1200, 630)

  context.globalAlpha = 0.12
  context.fillStyle = '#090b12'
  for (let x = -80; x < 1280; x += 72) {
    context.save()
    context.translate(x, 0)
    context.rotate(-0.25)
    context.fillRect(0, -100, 2, 850)
    context.restore()
  }
  context.globalAlpha = 1

  context.fillStyle = '#090b12'
  context.font = '900 24px Arial, sans-serif'
  context.letterSpacing = '5px'
  context.fillText('DUELLUM / RESULTADO', 72, 78)

  context.fillStyle = 'rgba(9, 11, 18, 0.64)'
  context.font = '700 27px Arial, sans-serif'
  drawWrappedText(context, data.bracketTitle, 72, 142, 790, 36, 2)

  context.fillStyle = '#090b12'
  const winnerFontSize = fitFontSize(context, data.winnerName, 930, 104, 58)
  context.font = `900 ${winnerFontSize}px Arial Black, Arial, sans-serif`
  drawWrappedText(context, data.winnerName, 72, 290, 960, winnerFontSize * 0.92, 2)

  context.fillStyle = '#ff5f57'
  roundedRectangle(context, 944, 62, 188, 188, 28)
  context.fill()
  context.strokeStyle = '#090b12'
  context.lineWidth = 8
  context.stroke()
  context.fillStyle = '#ffffff'
  context.font = '900 82px Arial Black, Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText('01', 1038, 184)
  context.textAlign = 'left'

  context.fillStyle = '#090b12'
  roundedRectangle(context, 72, 540, 1056, 2, 1)
  context.fill()
  context.font = '700 22px Arial, sans-serif'
  const decisionLabel = data.decisionCount === 1 ? 'DECISIÓN' : 'DECISIONES'
  context.fillText(
    `${data.optionCount} OPCIONES / ${data.decisionCount} ${decisionLabel} / DECIDIDO EN TU DISPOSITIVO`,
    72,
    585,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Image encoding failed.'))
      } else {
        resolve(blob)
      }
    }, 'image/png')
  })
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line === '' ? word : `${line} ${word}`
    if (context.measureText(candidate).width <= maxWidth || line === '') {
      line = candidate
    } else {
      lines.push(line)
      line = word
      if (lines.length === maxLines - 1) break
    }
  }
  if (line !== '' && lines.length < maxLines) lines.push(line)

  lines.forEach((currentLine, index) => {
    context.fillText(currentLine, x, y + index * lineHeight, maxWidth)
  })
}

function fitFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  minimumSize: number,
): number {
  let size = initialSize
  while (size > minimumSize) {
    context.font = `900 ${size}px Arial Black, Arial, sans-serif`
    if (context.measureText(text).width <= maxWidth * 1.75) break
    size -= 2
  }
  return size
}

function roundedRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.lineTo(x + width - radius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + radius)
  context.lineTo(x + width, y + height - radius)
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  context.lineTo(x + radius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - radius)
  context.lineTo(x, y + radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.closePath()
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  try {
    anchor.href = url
    anchor.download = fileName
    anchor.style.display = 'none'
    document.body.append(anchor)
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  } finally {
    anchor.remove()
  }
}

function slugify(value: string): string {
  const slug = value
    .toLocaleLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug === '' ? 'duellum' : slug
}

function isCancellation(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}

function canUseNativeShare(): boolean {
  try {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof window === 'undefined' || window.isSecureContext !== false)
    )
  } catch {
    return false
  }
}
