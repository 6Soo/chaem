import { toBlob } from 'html-to-image'

type ShareResult = 'shared' | 'downloaded'

/** #export-root 노드를 캡처해 기기 공유 시트로 넘기고(카카오톡 선택 가능), 지원 안 되면 다운로드로 대체 */
export async function shareOrDownloadImage(filename: string, shareText: string): Promise<ShareResult> {
  const node = document.getElementById('export-root')
  if (!node) throw new Error('export node not found')
  await document.fonts.ready
  const blob = await toBlob(node, { pixelRatio: 2, backgroundColor: '#F2F4F6', cacheBust: true })
  if (!blob) throw new Error('이미지 생성 실패')

  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: shareText, text: shareText })
    return 'shared'
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
  return 'downloaded'
}
