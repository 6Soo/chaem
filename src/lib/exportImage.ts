import { toPng } from 'html-to-image'

/** #export-root 노드를 PNG로 저장 */
export async function saveExportImage(filename: string): Promise<void> {
  const node = document.getElementById('export-root')
  if (!node) throw new Error('export node not found')
  await document.fonts.ready
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#F2F4F6',
    cacheBust: true,
  })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

/** 클립보드 복사 (구형 브라우저 폴백 포함) */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  ta.remove()
}
