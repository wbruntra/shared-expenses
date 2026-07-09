import { calculateBalances, calculateSettlement } from '../lib/balances.js'
import { formatCurrency } from '../lib/data.js'

export function BalanceSheet({ data }) {
  const peopleById = Object.fromEntries(data.people.map((p) => [p.id, p]))
  const balances = calculateBalances(data)
  const settlements = calculateSettlement(data)

  return (
    <section class="panel">
      <h2>Balances</h2>

      {data.people.length === 0 ? (
        <p class="empty">Add people to see balances.</p>
      ) : (
        <>
          <ul class="balance-list">
            {data.people.map((person) => {
              const balance = balances[person.id] || 0
              const positive = balance > 0
              const negative = balance < 0
              return (
                <li key={person.id} class="balance-row">
                  <span class="balance-name">{person.name}</span>
                  <span
                    class={`balance-value ${
                      positive ? 'positive' : negative ? 'negative' : ''
                    }`}
                  >
                    {positive ? '+' : ''}
                    {formatCurrency(balance)}
                  </span>
                  <span class="balance-label">
                    {positive
                      ? 'is owed'
                      : negative
                      ? 'owes'
                      : 'settled up'}
                  </span>
                </li>
              )
            })}
          </ul>

          <h3>Suggested payments to settle up</h3>
          {settlements.length === 0 ? (
            <p class="empty">Everyone is settled up.</p>
          ) : (
            <ul class="settlement-list">
              {settlements.map((s, index) => (
                <li key={index} class="settlement-row">
                  <span>
                    <strong>{peopleById[s.from]?.name}</strong> pays{' '}
                    <strong>{peopleById[s.to]?.name}</strong>
                  </span>
                  <span class="amount">{formatCurrency(s.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
