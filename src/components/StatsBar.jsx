import { formatBtc, formatCount, formatSats } from '../lib/format';

function StatCard({ label, value, sub }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub ? <p className="stat-sub">{sub}</p> : null}
    </div>
  );
}

export default function StatsBar({ stats }) {
  const statuses = Object.fromEntries((stats?.statuses || []).map((row) => [row.status, row.count]));
  const confirmed = statuses.confirmed || 0;
  const pending = statuses.pending || 0;
  const failed = statuses.failed || 0;

  return (
    <section className="stats" aria-label="Summary">
      <StatCard
        label="Transactions"
        value={formatCount(stats?.count)}
        sub={`${formatCount(confirmed)} confirmed · ${formatCount(pending)} pending · ${formatCount(failed)} failed`}
      />
      <StatCard
        label="Total volume"
        value={formatBtc(stats?.totalAmount)}
        sub={formatSats(stats?.totalAmount)}
      />
      <StatCard label="Total fees" value={formatSats(stats?.totalFees)} sub={formatBtc(stats?.totalFees)} />
      <StatCard
        label="Addresses"
        value={formatCount(stats?.uniqueAddresses)}
        sub={stats?.lastBlock ? `Last block #${formatCount(stats.lastBlock)}` : 'No confirmed blocks yet'}
      />
    </section>
  );
}
