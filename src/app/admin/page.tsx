'use client'

import dynamic from 'next/dynamic'

const AdminContent = dynamic(() => import('./AdminContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-mim-purple text-4xl mb-4">🔮</p>
        <p className="text-mim-ash text-sm uppercase tracking-wider">Loading tower...</p>
      </div>
    </div>
  ),
})

export default function AdminPage() {
  return <AdminContent />
}
