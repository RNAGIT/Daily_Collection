import { connectDB } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { Payment } from '@/models/Payment';
import { User } from '@/models/User';
import { Customer } from '@/models/Customer';

export interface DashboardOverview {
  summary: {
    totalCapitalWithInterest: number;
    totalCapitalWithoutInterest: number;
    totalProfit: number;
    totalPaid: number;
    outstanding: number;
  };
  users: {
    total: number;
    breakdown: Record<string, number>;
  };
  customers: {
    total: number;
    breakdown: Record<string, number>;
  };
  loans: {
    total: number;
    breakdown: Record<string, number>;
  };
}

const STATUS_REMAP: Record<string, string> = {
  closed: 'completed',
};

function mapCounts(stats: any[]) {
  return stats.reduce<Record<string, number>>((acc, stat) => {
    if (!stat?._id) return acc;
    const key = STATUS_REMAP[stat._id as string] ?? stat._id;
    acc[key] = stat.count;
    return acc;
  }, {});
}

export async function getDashboardOverviewData(): Promise<DashboardOverview> {
  await connectDB();

  const [userStats, loanStats, paymentStats, customerStats] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
    Loan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalPrincipal: { $sum: '$principal' },
          totalAmount: { $sum: '$totalAmount' },
          totalInterest: { $sum: '$totalInterest' },
        },
      },
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amountPaid' },
        },
      },
    ]),
    Customer.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const totalPrincipal = loanStats.reduce((sum, stat) => sum + (stat.totalPrincipal || 0), 0);
  const totalAmount = loanStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0);
  const totalInterest = loanStats.reduce((sum, stat) => sum + (stat.totalInterest || 0), 0);
  const totalPaid = paymentStats[0]?.totalPaid ?? 0;

  return {
    summary: {
      totalCapitalWithInterest: totalAmount,
      totalCapitalWithoutInterest: totalPrincipal,
      totalProfit: totalInterest,
      totalPaid,
      outstanding: Math.max(totalAmount - totalPaid, 0),
    },
    users: {
      total: userStats.reduce((sum, stat) => sum + stat.count, 0),
      breakdown: mapCounts(userStats),
    },
    customers: {
      total: customerStats.reduce((sum, stat) => sum + stat.count, 0),
      breakdown: mapCounts(customerStats),
    },
    loans: {
      total: loanStats.reduce((sum, stat) => sum + stat.count, 0),
      breakdown: mapCounts(loanStats),
    },
  };
}

