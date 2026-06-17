"use client";

import React from 'react';

interface InfoMenuItemIconProps {
  icon?: string;
  iconImagePath?: string;
}

export default function InfoMenuItemIcon({ icon, iconImagePath }: InfoMenuItemIconProps) {
  if (iconImagePath) {
    return (
      <img
        src={iconImagePath}
        alt=""
        style={{
          width: '1.25rem',
          height: '1.25rem',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
    );
  }

  return <span style={{ fontSize: '1.1em' }}>{icon}</span>;
}
