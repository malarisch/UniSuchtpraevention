import React from 'react'

const Arena = () => {
  return (
    <div style={{ height: '100vh', padding: '1rem' }}>
      <iframe
        src="/arena"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
        title="Arena"
      />
    </div>
  )
}

export default Arena