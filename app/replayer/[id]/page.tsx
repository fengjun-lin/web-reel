'use client';

import { use } from 'react';

import ReplayerContent from '../ReplayerContent';

export default function ReplayerPageWithId({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 16: Use React.use() to unwrap the params Promise in client component
  const { id } = use(params);

  return <ReplayerContent sessionId={id} />;
}
