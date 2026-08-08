// Компресира снимка на клиентско ниво преди качване в Supabase Storage —
// смалява размера (макс. 1920px по дългата страна) и компресира JPEG до 85%.
// Типична снимка от телефон (3-8MB) излиза ~150-500KB. PNG файлове (напр. лога
// с прозрачен фон) се пазят като PNG, за да не се загуби прозрачността.
export async function compressImage(file: File, maxSize = 1920): Promise<File> {
  // SVG/GIF (анимирани) не пипаме — рискови за пренкодиране.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file
  }

  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width)
          width = maxSize
        } else {
          width = Math.round((width * maxSize) / height)
          height = maxSize
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }
      ctx.drawImage(img, 0, 0, width, height)

      const isPng = file.type === 'image/png'
      const outputType = isPng ? 'image/png' : 'image/jpeg'

      canvas.toBlob(
        blob => {
          if (!blob) { resolve(file); return }
          // Ако компресираният файл излезе по-голям (рядко, при вече малки снимки) — пазим оригинала.
          if (blob.size >= file.size) { resolve(file); return }
          const newName = isPng ? file.name : file.name.replace(/\.[^.]+$/, '.jpg')
          resolve(new File([blob], newName, { type: outputType, lastModified: Date.now() }))
        },
        outputType,
        isPng ? undefined : 0.85
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
