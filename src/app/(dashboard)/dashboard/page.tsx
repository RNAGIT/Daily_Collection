import { getDashboardOverviewData } from '@/lib/dashboard';
import { StatCard } from '@/components/dashboard/stat-card';
import { UsersIcon, CurrencyDollarIcon, BanknotesIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function DashboardPage() {
  const overview = await getDashboardOverviewData();

  const totalLoans = overview.loans.total;
  const activeLoans = overview.loans.breakdown.active ?? 0;
  const completedLoans = overview.loans.breakdown.completed ?? 0;
  const warningLoans = overview.loans.breakdown.warning ?? 0;

  const activeCustomers = overview.customers.breakdown.active ?? 0;

  const completionRate = totalLoans ? Math.round((completedLoans / totalLoans) * 100) : 0;
  const warningRate = totalLoans ? Math.round((warningLoans / totalLoans) * 100) : 0;
  const collectionCoverage = overview.summary.totalCapitalWithInterest
    ? Math.min(100, Math.round((overview.summary.totalPaid / overview.summary.totalCapitalWithInterest) * 100))
    : 0;
  const profitMargin = overview.summary.totalCapitalWithInterest
    ? Math.round((overview.summary.totalProfit / overview.summary.totalCapitalWithInterest) * 100)
    : 0;

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl md:p-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              Arunalu Collections
            </span>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold text-white md:text-4xl">
                A modern control room for Mr. Rashith Abeywickrama&apos;s lending fleet.
              </h1>
              <p className="max-w-xl text-sm text-white/70">
                Monitor capital recovery, celebrate completed loans, and intervene on risk accounts without leaving a
                single, responsive dashboard.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-white/70 shadow">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Completion rate</p>
                <p className="mt-3 text-3xl font-semibold text-white">{completionRate}%</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-400 to-sky-400"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-white/60">{completedLoans} loans repaid in full</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-white/70 shadow">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Collection coverage</p>
                <p className="mt-3 text-3xl font-semibold text-white">{collectionCoverage}%</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    style={{ width: `${collectionCoverage}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-white/60">{formatCurrency(overview.summary.totalPaid)} collected</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/30 via-sky-500/20 to-cyan-500/10 p-6 text-sm text-white/80 shadow-2xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-32 w-28 translate-x-8 translate-y-10 rounded-full bg-white/10 blur-2xl" />
            <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Arrears outlook</h3>
            <div className="mt-5 space-y-4 text-sm text-white/80">
              <div className="flex items-center justify-between">
                <span>Warning exposure</span>
                <span className="rounded-full bg-rose-500/25 px-3 py-1 text-xs font-semibold text-rose-100">
                  {warningRate}%
                </span>
              </div>
              <p className="text-xs text-white/70">
                Manage {warningLoans} warning loans today to keep arrears below 10% of the book.
              </p>
              <div className="flex items-center justify-between">
                <span>Interest margin</span>
                <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100">
                  {profitMargin}%
                </span>
              </div>
              <p className="text-xs text-white/70">
                Interest earnings relative to deployed capital remain strong. Maintain momentum with disciplined
                follow-ups.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs text-white/80">
                <p className="font-semibold text-white">Next best action</p>
                <p className="mt-2 text-white/70">
                  Prioritise household visits for warning accounts before midday and lock in digital receipts the moment
                  payments clear.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-heading">Growth snapshot</h2>
        <p className="mt-1 text-sm text-white/60">Capital, profitability, and customer momentum at a glance.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            label="Capital + Interest"
            value={formatCurrency(overview.summary.totalCapitalWithInterest)}
            helper={`Outstanding ${formatCurrency(overview.summary.outstanding)}`}
            icon={<ChartBarIcon className="h-6 w-6" />}
            color="sky"
          />
          <StatCard
            label="Capital"
            value={formatCurrency(overview.summary.totalCapitalWithoutInterest)}
            helper={`Paid ${formatCurrency(overview.summary.totalPaid)}`}
            icon={<BanknotesIcon className="h-6 w-6" />}
            color="emerald"
          />
          <StatCard
            label="Interest Profit"
            value={formatCurrency(overview.summary.totalProfit)}
            helper={`${profitMargin}% margin`}
            icon={<CurrencyDollarIcon className="h-6 w-6" />}
            color="amber"
          />
          <StatCard
            label="Total Customers"
            value={overview.customers.total}
            helper={`${activeCustomers} active`}
            icon={<UsersIcon className="h-6 w-6" />}
            color="slate"
          />
          <StatCard
            label="Total Loans"
            value={totalLoans}
            helper={`${completedLoans} completed`}
            icon={<ShieldCheckIcon className="h-6 w-6" />}
            color="violet"
          />
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white">Loan health distribution</h3>
          <p className="mt-1 text-sm text-white/60">
            Pulse check on active, completed, and watch-list portfolios across Arunalu Collections.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Active loans',
                value: activeLoans,
                percent: totalLoans ? Math.round((activeLoans / totalLoans) * 100) : 0,
                accent: 'from-sky-500 to-cyan-400',
                target: 'Keep cycle discipline high',
              },
              {
                title: 'Completed',
                value: completedLoans,
                percent: completionRate,
                accent: 'from-emerald-500 to-lime-400',
                target: 'Celebrate repayments',
              },
              {
                title: 'Warning',
                value: warningLoans,
                percent: warningRate,
                accent: 'from-rose-500 to-orange-400',
                target: 'Hold below 10%',
              },
            ].map((item) => (
              <div key={item.title} className="space-y-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white/90">{item.title}</span>
                  <span className="text-xs text-white/60">{item.percent}%</span>
                </div>
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.accent}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="text-xs text-white/60">{item.target}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}


