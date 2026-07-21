export const dynamic = 'force-dynamic';

import Link from "next/link";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Оплата не прошла</h1>
        <p className="text-gray-600 mb-8">
          К сожалению, платёж был отменён или произошла ошибка. Не переживай, средства не списаны. Попробуй ещё раз или выбери другой способ.
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/schedule" 
            className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Попробовать снова
          </Link>
          
          <Link 
            href="/" 
            className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}