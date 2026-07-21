export const dynamic = 'force-dynamic';

import Link from "next/link";
import { XCircle, RefreshCw, Home } from "lucide-react";

export default async function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-50 p-4">
      <div className="text-center max-w-md bg-white p-8 rounded-3xl shadow-xl border border-red-100">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Оплата не прошла</h1>
        <p className="text-gray-600 mb-8">
          К сожалению, платёж был отменён или произошла ошибка. Не переживай, средства не списаны. Попробуй ещё раз или выбери другой способ.
        </p>
        
        <div className="space-y-3">
          <Link 
            href="/pricing" 
            className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold text-lg hover:scale-[1.02] transition flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
          >
            <RefreshCw className="w-5 h-5" />
            Вернуться к тарифам
          </Link>
          
          <Link 
            href="/" 
            className="w-full px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}