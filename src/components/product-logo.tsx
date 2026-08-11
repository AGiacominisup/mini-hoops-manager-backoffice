import { translate } from '../utils/translations'

interface ProductLogoProps {
  compact?: boolean
}

export function ProductLogo({ compact = false }: ProductLogoProps) {
  return (
    <img
      className={`product-logo${compact ? ' product-logo--compact' : ''}`}
      src="/minihmlogo.png"
      alt={translate('app.name')}
    />
  )
}