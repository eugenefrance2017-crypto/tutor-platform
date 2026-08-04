import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

const ClientPage = dynamic(() => import('./client-page'), { ssr: false });

export const metadata: Metadata = {
  title: 'Домашние задания | Jenyawisch',
  description: 'Список домашних заданий, проверка и статистика',
};

export default function Page() {
  return <ClientPage />;
}