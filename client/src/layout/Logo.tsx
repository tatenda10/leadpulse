import React from 'react'
import logoSrc from '../images/logo (2).png'

type LogoProps = {
  size?: 'default' | 'small'
}

export const Logo: React.FC<LogoProps> = ({ size = 'default' }) => {
  const height = size === 'small' ? 72 : 104
  return (
    <img
      src={logoSrc}
      alt="Logo"
      className="logo-img"
      style={{ height, width: 'auto' }}
    />
  )
}
