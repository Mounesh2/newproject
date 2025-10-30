"use client"

import { useState, useEffect } from 'react'

type CopyToClipboardOptions = {
  timeout?: number
}

export const useCopyToClipboard = ({ timeout = 2000 }: CopyToClipboardOptions = {}) => {
  const [isCopied, setIsCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
      return
    }

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true)
    })
  }

  useEffect(() => {
    if (isCopied && timeout) {
      const timer = setTimeout(() => setIsCopied(false), timeout)
      return () => clearTimeout(timer)
    }
  }, [isCopied, timeout])

  return { isCopied, copyToClipboard }
}
