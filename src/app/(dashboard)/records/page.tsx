'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/api-client';
import { formatCustomerCode, formatLoanCode } from '@/lib/formatters';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/payment-receipt';

type RecordsResponse = {
  customers: RecordCustomer[];
  generatedAt: string;
  scope: string;
};

type RecordCustomer = {
  id: string;
  customerNumber: number;
  customerCode?: string;
  name: string;
  phone?: string;
  nic?: string;
  email?: string;
  electricityAccount?: string;
  waterAccount?: string;
  gramaNiladhariName?: string;
  gramaNiladhariPhone?: string;
  specialNote?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  loans: RecordLoan[];
  aggregates: {
    totalLoans: number;
    activeLoans: number;
    totalPrincipal: number;
    totalOutstanding: number;
    totalPaid: number;
  };
};

type RecordLoan = {
  id: string;
  loanNumber: number;
  loanCode?: string;
  principal: number;
  interestRate: number;
  termDays: number;
  startDate: string;
  endDate: string;
  totalAmount: number;
  dailyAmount: number;
  status: string;
  totalPaid: number;
  outstanding: number;
  payments: Array<{
    id: string;
    dayNumber: number;
    amountPaid: number;
    scheduledAmount: number;
    previousPending: number;
    newPending: number;
    paidAt: string;
    note?: string;
  }>;
};

export default function RecordsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState<'excel' | 'pdf' | 'backup' | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(handle);
  }, [search]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['records', debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) {
        params.set('query', debouncedSearch);
      }
      const url = params.toString() ? `/api/records?${params.toString()}` : '/api/records';
      return apiFetch<RecordsResponse>(url);
    },
  });

  const customers = useMemo(() => data?.customers ?? [], [data?.customers]);

  const totals = useMemo(() => {
    return customers.reduce(
      (acc, customer) => {
        acc.totalCustomers += 1;
        acc.totalLoans += customer.aggregates.totalLoans;
        acc.totalOutstanding += customer.aggregates.totalOutstanding;
        acc.totalCollected += customer.aggregates.totalPaid;
        return acc;
      },
      {
        totalCustomers: 0,
        totalLoans: 0,
        totalOutstanding: 0,
        totalCollected: 0,
      },
    );
  }, [customers]);

  const buildExportDatasets = (records: RecordCustomer[]) => {
    const customerRows = records.map((customer) => ({
      'Customer Code': customer.customerCode ?? formatCustomerCode(customer.customerNumber),
      Name: customer.name,
      Phone: customer.phone ?? '',
      NIC: customer.nic ?? '',
      Email: customer.email ?? '',
      Status: customer.status,
      'Total Loans': customer.aggregates.totalLoans,
      'Active Loans': customer.aggregates.activeLoans,
      'Total Principal': customer.aggregates.totalPrincipal,
      'Total Outstanding': customer.aggregates.totalOutstanding,
      'Total Paid': customer.aggregates.totalPaid,
      'Electricity Account': customer.electricityAccount ?? '',
      'Water Account': customer.waterAccount ?? '',
      'Grama Niladhari Name': customer.gramaNiladhariName ?? '',
      'Grama Niladhari Phone': customer.gramaNiladhariPhone ?? '',
      'Special Note': customer.specialNote ?? '',
      'Created At': format(new Date(customer.createdAt), 'dd MMM yyyy, hh:mm a'),
      'Updated At': format(new Date(customer.updatedAt), 'dd MMM yyyy, hh:mm a'),
    }));

    const loanRows: Array<Record<string, string | number>> = [];
    const paymentRows: Array<Record<string, string | number>> = [];

    records.forEach((customer) => {
      customer.loans.forEach((loan) => {
        loanRows.push({
          'Customer Code': customer.customerCode ?? formatCustomerCode(customer.customerNumber),
          Customer: customer.name,
          'Loan Code': loan.loanCode ?? formatLoanCode(loan.loanNumber),
          Status: loan.status,
          Principal: loan.principal,
          'Total Amount': loan.totalAmount,
          'Daily Amount': loan.dailyAmount,
          'Term Days': loan.termDays,
          'Start Date': format(new Date(loan.startDate), 'dd MMM yyyy'),
          'End Date': format(new Date(loan.endDate), 'dd MMM yyyy'),
          'Total Paid': loan.totalPaid,
          Outstanding: loan.outstanding,
        });

        loan.payments.forEach((payment) => {
          paymentRows.push({
            'Customer Code': customer.customerCode ?? formatCustomerCode(customer.customerNumber),
            Customer: customer.name,
            'Loan Code': loan.loanCode ?? formatLoanCode(loan.loanNumber),
            Day: payment.dayNumber,
            'Paid At': format(new Date(payment.paidAt), 'dd MMM yyyy, hh:mm a'),
            'Amount Paid': payment.amountPaid,
            'Scheduled Amount': payment.scheduledAmount,
            'Previous Pending': payment.previousPending,
            'New Pending': payment.newPending,
            Note: payment.note ?? '',
          });
        });
      });
    });

    return { customerRows, loanRows, paymentRows };
  };

  const loadXlsx = async () => {
    const mod = await import('xlsx');
    return mod.default ?? mod;
  };
  const loadJsPdf = async () => {
    const mod = await import('jspdf');
    return mod.default ?? mod;
  };
  const loadAutoTable = async () => {
    const mod = await import('jspdf-autotable');
    return mod.default ?? mod;
  };

  const exportAsExcel = async (records: RecordCustomer[], filename: string) => {
    if (records.length === 0) return;
    const XLSX = await loadXlsx();
    const workbook = XLSX.utils.book_new();
    const { customerRows, loanRows, paymentRows } = buildExportDatasets(records);

    const customersSheet = XLSX.utils.json_to_sheet(customerRows);
    XLSX.utils.book_append_sheet(workbook, customersSheet, 'Customers');

    const loansSheet = XLSX.utils.json_to_sheet(loanRows);
    XLSX.utils.book_append_sheet(workbook, loansSheet, 'Loans');

    const paymentsSheet = XLSX.utils.json_to_sheet(paymentRows);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Payments');

    XLSX.writeFile(workbook, filename);
  };

  const exportAsPdf = async (records: RecordCustomer[], filename: string) => {
    if (records.length === 0) return;
    const JsPdfConstructor = await loadJsPdf();
    const autoTable = await loadAutoTable();
    const doc = new JsPdfConstructor({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    records.forEach((customer, customerIndex) => {
      if (customerIndex > 0) {
        doc.addPage();
      }

      doc.setFontSize(16);
      doc.text(
        `Customer ${customer.customerCode ?? formatCustomerCode(customer.customerNumber)}: ${
          customer.name
        }`,
        40,
        50,
      );
      doc.setFontSize(11);
      doc.text(`Phone: ${customer.phone ?? 'N/A'} | Email: ${customer.email ?? 'N/A'}`, 40, 70);
      doc.text(
        `Loans: ${customer.aggregates.totalLoans} • Outstanding: ${formatCurrency(
          customer.aggregates.totalOutstanding,
        )} • Paid: ${formatCurrency(customer.aggregates.totalPaid)}`,
        40,
        86,
      );

      const loanTableBody = customer.loans.map((loan) => [
        loan.loanCode ?? formatLoanCode(loan.loanNumber),
        loan.status,
        formatCurrency(loan.totalAmount),
        formatCurrency(loan.totalPaid),
        formatCurrency(loan.outstanding),
        `Term ${loan.termDays} days`,
      ]);

      autoTable(doc, {
        startY: 100,
        head: [['Loan', 'Status', 'Total', 'Collected', 'Outstanding', 'Term']],
        body: loanTableBody,
        styles: { fontSize: 9 },
      });

      customer.loans.forEach((loan) => {
        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY + 20,
          head: [[`Loan ${loan.loanCode ?? formatLoanCode(loan.loanNumber)} payments`]],
          body: [],
          theme: 'plain',
          styles: { fontStyle: 'bold' },
        });

        const paymentBody =
          loan.payments.length > 0
            ? loan.payments.map((payment) => [
                `Day ${payment.dayNumber}`,
                format(new Date(payment.paidAt), 'dd MMM yyyy'),
                formatCurrency(payment.amountPaid),
                formatCurrency(payment.scheduledAmount),
                formatCurrency(payment.newPending),
                payment.note ?? '',
              ])
            : [['—', '—', '—', '—', '—', 'No payments recorded']];

        autoTable(doc, {
          startY: (doc as any).lastAutoTable.finalY,
          head: [['Day', 'Date', 'Paid', 'Scheduled', 'Pending', 'Note']],
          body: paymentBody,
          styles: { fontSize: 8 },
          headStyles: { fillColor: [14, 116, 144] },
        });
      });
    });

    doc.save(filename);
  };

  const handleBackupExport = async (exportFormat: 'excel' | 'pdf') => {
    setExporting('backup');
    try {
      const backup = await apiFetch<RecordsResponse>('/api/records?scope=full');
      const filenameBase = `arunalu-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}`;
      if (exportFormat === 'excel') {
        await exportAsExcel(backup.customers, `${filenameBase}.xlsx`);
      } else {
        await exportAsPdf(backup.customers, `${filenameBase}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  };

  const handleCurrentExport = async (exportFormat: 'excel' | 'pdf') => {
    if (customers.length === 0) return;
    setExporting(exportFormat);
    try {
      const filenameBase = `records-${format(new Date(), 'yyyy-MM-dd-HHmm')}`;
      if (exportFormat === 'excel') {
        await exportAsExcel(customers, `${filenameBase}.xlsx`);
      } else {
        await exportAsPdf(customers, `${filenameBase}.pdf`);
      }
    } finally {
      setExporting(null);
    }
  };

  const isExporting = Boolean(exporting);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Records</h1>
          <p className="text-sm text-slate-400">
            Explore customer profiles, loans, and payment history. Export filtered data or a full
            daily backup for safekeeping.
          </p>
          {data?.generatedAt ? (
            <p className="text-xs text-slate-500">
              Snapshot generated {format(new Date(data.generatedAt), 'dd MMM yyyy, hh:mm a')}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={isExporting || customers.length === 0}
            onClick={() => handleCurrentExport('excel')}
          >
            Export current view (Excel)
          </Button>
          <Button
            variant="secondary"
            disabled={isExporting || customers.length === 0}
            onClick={() => handleCurrentExport('pdf')}
          >
            Export current view (PDF)
          </Button>
          <Button
            variant="secondary"
            disabled={isExporting}
            onClick={() => handleBackupExport('excel')}
          >
            Full backup (Excel)
          </Button>
          <Button
            variant="secondary"
            disabled={isExporting}
            onClick={() => handleBackupExport('pdf')}
          >
            Full backup (PDF)
          </Button>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Search records</h2>
          <p className="text-sm text-slate-400">
            Type a customer name, phone, NIC, or email to filter. Leave empty to view the latest
            batch of customers.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={search}
            placeholder="Search customers…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex flex-wrap gap-4 text-sm text-slate-300">
            <span>
              Customers:{' '}
              <strong className="text-white">{totals.totalCustomers.toLocaleString()}</strong>
            </span>
            <span>
              Loans: <strong className="text-white">{totals.totalLoans.toLocaleString()}</strong>
            </span>
            <span>
              Outstanding:{' '}
              <strong className="text-amber-200">{formatCurrency(totals.totalOutstanding)}</strong>
            </span>
            <span>
              Collected:{' '}
              <strong className="text-emerald-200">{formatCurrency(totals.totalCollected)}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              Refresh snapshot
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-8 text-center text-sm text-slate-400">
            Loading records…
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/60">
          <CardContent className="py-8 text-center text-sm text-slate-400">
            No customers found. Try adjusting your search query.
          </CardContent>
        </Card>
      ) : (
        customers.map((customer) => (
          <Card key={customer.id} className="border-slate-800 bg-slate-900/60">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {customer.customerCode ?? formatCustomerCode(customer.customerNumber)} •{' '}
                    {customer.name}
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                    {customer.phone ? <span>📞 {customer.phone}</span> : null}
                    {customer.email ? <span>✉️ {customer.email}</span> : null}
                    {customer.nic ? <span>NIC: {customer.nic}</span> : null}
                    <span>
                      Loans: {customer.aggregates.totalLoans} • Outstanding:{' '}
                      {formatCurrency(customer.aggregates.totalOutstanding)}
                    </span>
                  </div>
                </div>
                <Badge variant="default">{customer.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {customer.loans.length === 0 ? (
                <p className="text-sm text-slate-400">No loans recorded for this customer.</p>
              ) : (
                customer.loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm shadow-sky-500/5"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-white">
                          Loan {loan.loanCode ?? formatLoanCode(loan.loanNumber)}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Term: {loan.termDays} days • Daily instalment:{' '}
                          {formatCurrency(loan.dailyAmount)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                        <span>Total: {formatCurrency(loan.totalAmount)}</span>
                        <span>Paid: {formatCurrency(loan.totalPaid)}</span>
                        <span className="text-amber-200">
                          Outstanding: {formatCurrency(loan.outstanding)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
                      <table className="min-w-full divide-y divide-slate-800 text-sm text-slate-200">
                        <thead className="bg-slate-900/70 text-xs uppercase text-slate-400">
                          <tr>
                            <th className="px-3 py-2 text-left">Day</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-right">Paid</th>
                            <th className="px-3 py-2 text-right">Scheduled</th>
                            <th className="px-3 py-2 text-right">Pending</th>
                            <th className="px-3 py-2 text-left">Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {loan.payments.length === 0 ? (
                            <tr>
                              <td
                                className="px-3 py-2 text-center text-sm text-slate-500"
                                colSpan={6}
                              >
                                No payments yet.
                              </td>
                            </tr>
                          ) : (
                            loan.payments.map((payment) => (
                              <tr key={payment.id}>
                                <td className="px-3 py-2 text-slate-300">Day {payment.dayNumber}</td>
                                <td className="px-3 py-2 text-slate-400">
                                  {format(new Date(payment.paidAt), 'dd MMM yyyy, hh:mm a')}
                                </td>
                                <td className="px-3 py-2 text-right text-emerald-200">
                                  {formatCurrency(payment.amountPaid)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-300">
                                  {formatCurrency(payment.scheduledAmount)}
                                </td>
                                <td className="px-3 py-2 text-right text-amber-200">
                                  {formatCurrency(payment.newPending)}
                                </td>
                                <td className="px-3 py-2 text-slate-400">{payment.note ?? '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}


