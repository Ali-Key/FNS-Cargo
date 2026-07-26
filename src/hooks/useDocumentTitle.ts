import { useEffect } from 'react'

function setMetaTag(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let tag = document.querySelector(`meta[${attr}="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function useDocumentTitle(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title
    if (description) {
      setMetaTag('description', description)
      setMetaTag('og:title', title, 'property')
      setMetaTag('og:description', description, 'property')
    }
    return () => {
      document.title = previousTitle
    }
  }, [title, description])
}
