import DOMPurify from 'dompurify'

export const sanitize = (str) => {
  if (typeof str !== 'string') return str
  return DOMPurify.sanitize(str.trim())
}