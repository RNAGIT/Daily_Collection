import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/db';
import { Customer } from '@/models/Customer';
import { Loan } from '@/models/Loan';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import NoticeBanner from '@/components/ui/notice-banner';
import { formatCustomerCode, formatLoanCode } from '@/lib/formatters';

function statusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success';
    case 'warning':
      return 'warning';
    case 'inactive':
      return 'secondary';
    default:
      return 'secondary';
  }
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { notice?: string };
}) {
  await connectDB();

  const customer = await Customer.findById(params.id).lean();

  if (!customer) {
    notFound();
  }

  const loans = await Loan.find({ customer: customer._id }).sort({ createdAt: -1 }).lean();
  const noticeMap: Record<string, string> = {
    'customer-updated': 'Customer details updated successfully.',
  };
  const noticeMessage = searchParams?.notice ? noticeMap[searchParams.notice] : undefined;

  return (
    <div className="space-y-6">
      {noticeMessage ? (
        <NoticeBanner message={noticeMessage} href={`/customers/${params.id}`} />
      ) : null}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">{customer.name}</h1>
          <p className="text-sm text-slate-400">
            Customer {formatCustomerCode(customer.customerNumber)} • Created{' '}
            {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link href={`/loans/create?customerId=${customer._id.toString()}`}>New loan</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/customers">Back to customers</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Profile</h2>
              <Badge variant={statusVariant(customer.status)}>{customer.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-200">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase text-slate-400">Phone</p>
                <p className="mt-1">{customer.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Email</p>
                <p className="mt-1">{customer.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">NIC</p>
                <p className="mt-1">{customer.nic || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Electricity account</p>
                <p className="mt-1">{customer.electricityAccount || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Water bill</p>
                <p className="mt-1">{customer.waterAccount || '—'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Grama Niladhari</p>
              <p className="mt-1">
                {customer.gramaNiladhariName || '—'}{' '}
                {customer.gramaNiladhariPhone ? `• ${customer.gramaNiladhariPhone}` : ''}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-400">Special note</p>
              <p className="mt-1 text-slate-300">{customer.specialNote || 'No notes recorded.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader>
            <h2 className="text-lg font-semibold text-white">Loans</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {loans.length === 0 ? (
              <p className="text-sm text-slate-400">No loans recorded yet for this customer.</p>
            ) : (
              loans.map((loan) => (
                <div
                  key={loan._id.toString()}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Loan {formatLoanCode(loan.loanNumber)}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(loan.startDate).toLocaleDateString()} →{' '}
                        {new Date(loan.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={statusVariant(loan.status)}>{loan.status}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs uppercase text-slate-400">
                    <div className="text-slate-200">
                      <p className="text-[10px] text-slate-500">Principal</p>
                      <p className="text-sm text-white">{loan.principal.toFixed(2)}</p>
                    </div>
                    <div className="text-slate-200">
                      <p className="text-[10px] text-slate-500">Daily</p>
                      <p className="text-sm text-white">{loan.dailyAmount.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/loans/${loan._id.toString()}`}>View loan</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

